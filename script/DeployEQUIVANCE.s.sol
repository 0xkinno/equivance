// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/PositionMath.sol";
import "../contracts/B20StateReader.sol";
import "../contracts/RiskEngine.sol";
import "../contracts/EQUIVANCEVault.sol";
import "../contracts/mock/MockB20Asset.sol";
import "../contracts/mock/MockAggregatorV3.sol";
import "../contracts/mock/MockDebtToken.sol";
import "../contracts/mock/NaiveVault.sol";

contract DeployEQUIVANCE {
    struct DeploymentManifest {
        address stateReader;
        address riskEngine;
        address vault;
        address debtToken;
        address mockAAPLc;
        address mockAAPLFeed;
        address naiveVault;
    }

    function run(address debtTokenAddress, address priceFeedAddress) external returns (DeploymentManifest memory manifest) {
        // 1. Deploy B20StateReader
        B20StateReader stateReader = new B20StateReader();
        manifest.stateReader = address(stateReader);

        // 2. Deploy RiskEngine
        RiskEngine riskEngine = new RiskEngine(address(stateReader));
        manifest.riskEngine = address(riskEngine);

        // 3. Resolve or deploy debt token (USDC)
        if (debtTokenAddress == address(0)) {
            MockDebtToken mockUsdc = new MockDebtToken("USD Coin", "USDC", 6);
            manifest.debtToken = address(mockUsdc);
        } else {
            manifest.debtToken = debtTokenAddress;
        }

        // 4. Deploy EQUIVANCEVault
        EQUIVANCEVault vault = new EQUIVANCEVault(
            address(riskEngine),
            address(stateReader),
            manifest.debtToken
        );
        manifest.vault = address(vault);

        // 5. Deploy controlled test B20 asset for scheduled multiplier demonstration
        MockB20Asset mockAAPLc = new MockB20Asset("Apple Tokenized Stock (B20)", "AAPLc", 18);
        manifest.mockAAPLc = address(mockAAPLc);

        // 6. Deploy or use price feed ($200.00 initial equity price, 8 decimals)
        if (priceFeedAddress == address(0)) {
            MockAggregatorV3 mockFeed = new MockAggregatorV3(8, "AAPL / USD", 20000000000);
            manifest.mockAAPLFeed = address(mockFeed);
        } else {
            manifest.mockAAPLFeed = priceFeedAddress;
        }

        // 7. Configure RiskEngine for AAPLc
        riskEngine.setAssetConfig(
            manifest.mockAAPLc,
            manifest.mockAAPLFeed,
            7500, // 75% LTV
            8500, // 85% Liquidation Threshold
            500,  // 5% Liquidation Penalty
            86400,// 24h oracle freshness
            3600, // 1h guard window
            500   // 5% LTV buffer in guard window
        );

        // 8. Deploy NaiveVault baseline for benchmark comparison
        NaiveVault naiveVault = new NaiveVault(
            manifest.debtToken,
            manifest.mockAAPLFeed,
            7500,
            8500
        );
        manifest.naiveVault = address(naiveVault);
    }
}
