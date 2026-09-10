// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PositionMath.sol";
import "./B20StateReader.sol";
import "./interfaces/IAggregatorV3.sol";

/**
 * @title RiskEngine
 * @notice Centralized valuation and underwriting kernel enforcing Valuation-Basis Integrity
 * @dev Single-source-of-truth ensuring canonical Total Return Value (TRV) pricing:
 *      canonicalCollateralUSD = rawTokenAmount * totalReturnPrice
 *      NEVER compounds B20 multiplier into Total Return Price.
 */
contract RiskEngine {
    using PositionMath for uint256;

    uint256 public constant WAD = 1e18;
    uint256 public constant BPS_DENOMINATOR = 10000;

    enum PositionStatus {
        COHERENT,
        PENDING_ACTION,
        TRANSITION,
        BLOCKED,
        LIQUIDATABLE,
        STALE_ORACLE
    }

    struct AssetRiskConfig {
        address priceFeed;
        uint16 ltvBps;                    // e.g. 7500 = 75%
        uint16 liquidationThresholdBps;  // e.g. 8500 = 85%
        uint16 liquidationPenaltyBps;    // e.g. 500 = 5%
        uint32 maxOracleDelay;           // max age of oracle price in seconds (e.g. 86400)
        uint32 transitionGuardWindow;    // guard window before effectiveAt in seconds (e.g. 3600)
        uint16 guardLtvReductionBps;     // reduction in LTV during guard window (e.g. 500)
        bool isSupported;
    }

    struct EvaluationResult {
        uint256 rawTokenAmount;
        uint256 effectiveMultiplier;
        uint256 uiShareAmount;
        uint256 totalReturnPrice8;
        uint8 oracleDecimals;
        uint8 assetDecimals;
        uint256 collateralUsdWad;
        uint256 naiveDoubleAdjustedUsdWad;
        uint256 maxDebtUsdWad;
        uint256 totalDebtUsdWad;
        uint256 healthFactor;
        PositionStatus status;
        bool isHealthy;
        bool isLiquidatable;
        bool doubleAdjustmentBlocked;
    }

    address public owner;
    B20StateReader public immutable stateReader;
    mapping(address => AssetRiskConfig) public assetConfigs;

    event AssetConfigUpdated(
        address indexed asset,
        address priceFeed,
        uint16 ltvBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationPenaltyBps
    );

    error Unauthorized();
    error AssetNotSupported(address asset);
    error StaleOraclePrice(address asset, uint256 updatedAt, uint256 currentTimestamp);
    error InvalidOraclePrice(address asset);
    error AssetPaused(address asset);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _stateReader) {
        owner = msg.sender;
        stateReader = B20StateReader(_stateReader);
    }

    function setAssetConfig(
        address asset,
        address priceFeed,
        uint16 ltvBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationPenaltyBps,
        uint32 maxOracleDelay,
        uint32 transitionGuardWindow,
        uint16 guardLtvReductionBps
    ) external onlyOwner {
        require(ltvBps < liquidationThresholdBps, "LTV must be < LiqThreshold");
        require(liquidationThresholdBps <= 9500, "LiqThreshold max 95%");
        require(priceFeed != address(0), "Invalid feed");

        assetConfigs[asset] = AssetRiskConfig({
            priceFeed: priceFeed,
            ltvBps: ltvBps,
            liquidationThresholdBps: liquidationThresholdBps,
            liquidationPenaltyBps: liquidationPenaltyBps,
            maxOracleDelay: maxOracleDelay == 0 ? 86400 : maxOracleDelay,
            transitionGuardWindow: transitionGuardWindow == 0 ? 3600 : transitionGuardWindow,
            guardLtvReductionBps: guardLtvReductionBps,
            isSupported: true
        });

        emit AssetConfigUpdated(asset, priceFeed, ltvBps, liquidationThresholdBps, liquidationPenaltyBps);
    }

    /**
     * @notice Canonical collateral valuation function (Task 1 interface requirement)
     * @dev Never receives or multiplies the B20 multiplier into the Total Return Price.
     * @param asset Asset address
     * @param rawTokenAmount Raw token units
     * @param totalReturnPrice Oracle total return price
     * @return collateralUsdWad Normalized 18-decimal USD collateral value
     */
    function valueCollateral(
        address asset,
        uint256 rawTokenAmount,
        uint256 totalReturnPrice
    ) public view returns (uint256 collateralUsdWad) {
        AssetRiskConfig memory config = assetConfigs[asset];
        if (!config.isSupported) revert AssetNotSupported(asset);
        
        B20StateReader.B20State memory b20State = stateReader.getB20State(asset, address(this));
        (, uint8 oracleDecimals, ) = _fetchPrice(config.priceFeed, config.maxOracleDelay);
        
        collateralUsdWad = PositionMath.valueCollateral(
            rawTokenAmount,
            totalReturnPrice,
            oracleDecimals,
            b20State.decimals
        );
    }

    /**
     * @notice Canonical position evaluation called prior to ANY risk mutation
     * @param asset Address of the collateral asset
     * @param rawTokenAmount Raw deposited token balance
     * @param debtAmountUsdWad Current outstanding debt in USD WAD
     * @return res Detailed EvaluationResult struct
     */
    function evaluatePosition(
        address asset,
        uint256 rawTokenAmount,
        uint256 debtAmountUsdWad
    ) public view returns (EvaluationResult memory res) {
        AssetRiskConfig memory config = assetConfigs[asset];
        if (!config.isSupported) revert AssetNotSupported(asset);

        // 1. Extract live B20 state at current block.timestamp
        B20StateReader.B20State memory b20State = stateReader.getB20State(asset, address(this));
        
        // 2. Read and validate oracle total return price
        (uint256 price, uint8 oracleDecimals, bool oracleStale) = _fetchPrice(config.priceFeed, config.maxOracleDelay);

        res.rawTokenAmount = rawTokenAmount;
        res.effectiveMultiplier = b20State.effectiveMultiplier;
        res.assetDecimals = b20State.decimals;
        res.totalReturnPrice8 = price;
        res.oracleDecimals = oracleDecimals;
        res.totalDebtUsdWad = debtAmountUsdWad;

        // 3. Compute live UI share-equivalent amount (for UI presentation and reporting ONLY)
        res.uiShareAmount = PositionMath.toUIShareAmount(rawTokenAmount, b20State.effectiveMultiplier);

        // 4. Compute canonical collateral valuation: rawTokenAmount * totalReturnPrice
        // IMPORTANT: NEVER multiply effectiveMultiplier into totalReturnPrice!
        res.collateralUsdWad = PositionMath.valueCollateral(
            rawTokenAmount,
            price,
            oracleDecimals,
            res.assetDecimals
        );

        // 5. Compute naive double-adjusted valuation (for baseline comparison & attack detection)
        res.naiveDoubleAdjustedUsdWad = PositionMath.calculateNaiveDoubleAdjustedUSD(
            rawTokenAmount,
            price,
            b20State.effectiveMultiplier,
            oracleDecimals,
            res.assetDecimals
        );

        res.doubleAdjustmentBlocked = (b20State.effectiveMultiplier != WAD);

        // 6. Check Transition Guard Window
        uint16 activeLtv = config.ltvBps;
        bool inGuardWindow = false;
        if (b20State.hasLivePending) {
            uint256 timeToEffective = b20State.effectiveAt > block.timestamp ? b20State.effectiveAt - block.timestamp : 0;
            if (timeToEffective <= config.transitionGuardWindow) {
                inGuardWindow = true;
                if (activeLtv > config.guardLtvReductionBps) {
                    activeLtv -= config.guardLtvReductionBps;
                }
            }
        }

        // 7. Calculate Max Debt
        res.maxDebtUsdWad = PositionMath.calculateMaxDebt(res.collateralUsdWad, activeLtv);

        // 8. Calculate Health Factor
        res.healthFactor = PositionMath.calculateHealthFactor(
            res.collateralUsdWad,
            config.liquidationThresholdBps,
            debtAmountUsdWad
        );

        // 9. Determine Status
        if (b20State.transferPaused) {
            res.status = PositionStatus.BLOCKED;
        } else if (oracleStale) {
            res.status = PositionStatus.STALE_ORACLE;
        } else if (res.healthFactor < WAD && debtAmountUsdWad > 0) {
            res.status = PositionStatus.LIQUIDATABLE;
        } else if (inGuardWindow) {
            res.status = PositionStatus.TRANSITION;
        } else if (b20State.hasLivePending) {
            res.status = PositionStatus.PENDING_ACTION;
        } else {
            res.status = PositionStatus.COHERENT;
        }

        res.isHealthy = res.healthFactor >= WAD;
        res.isLiquidatable = res.healthFactor < WAD && debtAmountUsdWad > 0;
    }

    /**
     * @notice Internal price fetcher with sanity and freshness checks
     */
    function _fetchPrice(
        address priceFeed,
        uint32 maxOracleDelay
    ) internal view returns (uint256 price, uint8 decimals, bool isStale) {
        IAggregatorV3 feed = IAggregatorV3(priceFeed);
        decimals = feed.decimals();

        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = feed.latestRoundData();

        if (answer <= 0) revert InvalidOraclePrice(priceFeed);
        price = uint256(answer);

        if (updatedAt > block.timestamp || block.timestamp - updatedAt > maxOracleDelay) {
            isStale = true;
        } else {
            isStale = false;
        }
    }
}
