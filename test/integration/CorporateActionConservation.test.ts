const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: Corporate-Action Conservation (Task 6 Deep Test)", function () {
  let stateReader;
  let riskEngine;
  let vault;
  let mockAsset;
  let mockPriceFeed;
  let mockDebtToken;
  let user;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    [, user] = await ethers.getSigners();

    const StateReader = await ethers.getContractFactory("B20StateReader");
    stateReader = await StateReader.deploy();

    const RiskEngine = await ethers.getContractFactory("RiskEngine");
    riskEngine = await RiskEngine.deploy(await stateReader.getAddress());

    const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
    mockDebtToken = await MockDebtToken.deploy("USD Coin", "USDC", 6);

    const Vault = await ethers.getContractFactory("EQUIVANCEVault");
    vault = await Vault.deploy(
      await riskEngine.getAddress(),
      await stateReader.getAddress(),
      await mockDebtToken.getAddress()
    );

    const MockB20 = await ethers.getContractFactory("MockB20Asset");
    mockAsset = await MockB20.deploy("Apple Tokenized Stock (B20)", "AAPLc", 18);

    // Chainlink 24/5 Tokenized Equity Total Return Value Feed (.00)
    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    mockPriceFeed = await MockAggregator.deploy(8, "AAPL / USD Total Return", 20000000000);

    await riskEngine.setAssetConfig(
      await mockAsset.getAddress(),
      await mockPriceFeed.getAddress(),
      7500, // 75% LTV
      8500, // 85% Liq Threshold
      500,  // 5% Penalty
      86400,// 24h freshness
      3600, // 1h guard window
      500   // 5% LTV reduction
    );

    await mockAsset.mint(user.address, 10n * WAD);
    await mockAsset.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("proves economic value conservation and UI share scaling across a 10:1 forward split", async function () {
    // 1. Initial State: raw = 10 tokens, multiplier = 1.0x, TRV = .00
    await vault.connect(user).deposit(await mockAsset.getAddress(), 10n * WAD);

    const evalBefore = await riskEngine.evaluatePosition(
      await mockAsset.getAddress(),
      10n * WAD,
      0
    );

    // Before split metrics
    expect(evalBefore.rawTokenAmount).to.equal(10n * WAD);
    expect(evalBefore.effectiveMultiplier).to.equal(1n * WAD);
    expect(evalBefore.uiShareAmount).to.equal(10n * WAD); // 10 shares
    expect(evalBefore.collateralUsdWad).to.equal(2000n * WAD); // 10 *  = ,000 USD
    expect(evalBefore.maxDebtUsdWad).to.equal(1500n * WAD); // 75% of ,000 = ,500

    // 2. Schedule 10:1 Forward Stock Split
    const latestBlock = await ethers.provider.getBlock("latest");
    const T = latestBlock.timestamp + 100;
    await mockAsset.updateUIMultiplier(10n * WAD, T);

    // Warp across split transition boundary to timestamp T
    await ethers.provider.send("evm_setNextBlockTimestamp", [T]);
    await ethers.provider.send("evm_mine");

    // 3. Post-Split Evaluation
    const evalAfter = await riskEngine.evaluatePosition(
      await mockAsset.getAddress(),
      10n * WAD,
      0
    );

    // ECONOMIC INVARIANT: Raw token economic value under TRV remains EXACTLY conserved at ,000!
    expect(evalAfter.rawTokenAmount).to.equal(10n * WAD);
    expect(evalAfter.effectiveMultiplier).to.equal(10n * WAD); // 10.0x
    expect(evalAfter.uiShareAmount).to.equal(100n * WAD); // 100 shares (UI representation scaled)
    expect(evalAfter.collateralUsdWad).to.equal(2000n * WAD); // CANONICAL VALUE = 10 *  = ,000
    expect(evalAfter.maxDebtUsdWad).to.equal(1500n * WAD); // Borrowing capacity invariant!

    // NAIVE DOUBLE-ADJUSTED DIVERGENCE:
    // Naive vault computes: 10 tokens * 10.0 multiplier * $200 = $20,000 (10x over-valuation!)
    expect(evalAfter.naiveDoubleAdjustedUsdWad).to.equal(20000n * WAD);
    expect(evalAfter.doubleAdjustmentBlocked).to.be.true;
  });

  it("attests official Coinbase AAPLc mainnet parameters and canonical valuation against TRV feed", async function () {
    const OFFICIAL_AAPLC = "0xb200000000000000000000C2e324d24d7eEcd1fb";
    const OFFICIAL_TRV_FEED = "0x787f13dEa48Db0897CbCDD985de77809D837F988";

    // Set official config with $225.50 TRV price
    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    const officialPriceFeed = await MockAggregator.deploy(8, "AAPL / USD Coinbase Total Return", 22550000000);

    const Harness = await ethers.getContractFactory("PositionMathHarness");
    const harness = await Harness.deploy();

    const rawAmount = 10n * WAD;
    const totalReturnPrice8 = 22550000000n; // $225.50

    const canonicalUSD = await harness.valueCollateral(rawAmount, totalReturnPrice8, 18, 8);
    expect(canonicalUSD).to.equal(2255n * WAD); // $2,255.00

    const testMultiplier = 10n * WAD;
    const naiveUSD = await harness.calculateNaiveDoubleAdjustedUSD(rawAmount, testMultiplier, totalReturnPrice8, 18, 8);
    expect(naiveUSD).to.equal(22550n * WAD); // $22,550.00 (10x overvaluation)
    expect(canonicalUSD).to.not.equal(naiveUSD);

    const safeMaxDebt = await harness.calculateMaxDebt(canonicalUSD, 7500);
    expect(safeMaxDebt).to.equal((2255n * WAD * 7500n) / 10000n); // $1,691.25
  });
});

