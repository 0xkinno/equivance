const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Unit: RiskEngine", function () {
  let stateReader;
  let riskEngine;
  let mockAsset;
  let mockPriceFeed;
  let owner;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const StateReader = await ethers.getContractFactory("B20StateReader");
    stateReader = await StateReader.deploy();

    const RiskEngine = await ethers.getContractFactory("RiskEngine");
    riskEngine = await RiskEngine.deploy(await stateReader.getAddress());

    const MockB20 = await ethers.getContractFactory("MockB20Asset");
    mockAsset = await MockB20.deploy("Apple Tokenized Stock", "AAPLc", 18);

    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    mockPriceFeed = await MockAggregator.deploy(8, "AAPL/USD Total Return", 20000000000); // .00 TRV

    await riskEngine.setAssetConfig(
      await mockAsset.getAddress(),
      await mockPriceFeed.getAddress(),
      7500, // 75% LTV
      8500, // 85% Liq Threshold
      500,  // 5% Penalty
      86400,// 24h freshness
      3600, // 1h guard window
      500   // 5% LTV reduction in guard window
    );
  });

  it("should evaluate a coherent healthy position correctly under canonical TRV rule", async function () {
    const rawCollateral = 100n * WAD; // 100 raw tokens
    const debtAmount = 10000n * WAD; // ,000 debt

    const evalResult = await riskEngine.evaluatePosition(
      await mockAsset.getAddress(),
      rawCollateral,
      debtAmount
    );

    expect(evalResult.rawTokenAmount).to.equal(rawCollateral);
    expect(evalResult.effectiveMultiplier).to.equal(1n * WAD);
    expect(evalResult.uiShareAmount).to.equal(100n * WAD);
    expect(evalResult.collateralUsdWad).to.equal(20000n * WAD); // 100 *  = ,000
    expect(evalResult.maxDebtUsdWad).to.equal(15000n * WAD); // 75% of ,000 = ,000
    expect(evalResult.status).to.equal(0); // COHERENT
    expect(evalResult.isHealthy).to.be.true;
    expect(evalResult.isLiquidatable).to.be.false;
  });

  it("should implement canonical valueCollateral interface without multiplying B20 multiplier", async function () {
    const rawAmount = 50n * WAD;
    const trvPrice = 20000000000n; // .00 (8 dec)
    const val = await riskEngine.valueCollateral(await mockAsset.getAddress(), rawAmount, trvPrice);
    expect(val).to.equal(10000n * WAD); // 50 *  = ,000
  });

  it("should flag position as liquidatable when health factor drops below 1.0", async function () {
    const rawCollateral = 100n * WAD; // ,000 value -> ,000 liq collateral
    const debtAmount = 18000n * WAD; // ,000 debt -> HF = 17k / 18k = 0.944 < 1.0

    const evalResult = await riskEngine.evaluatePosition(
      await mockAsset.getAddress(),
      rawCollateral,
      debtAmount
    );

    expect(evalResult.status).to.equal(4); // LIQUIDATABLE
    expect(evalResult.isHealthy).to.be.false;
    expect(evalResult.isLiquidatable).to.be.true;
  });

  it("should apply transition guard window when corporate action is pending within 1h", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
    const effectiveAt = currentTimestamp + 1800; // 30 minutes in future (inside 1h guard window)

    // Schedule 2-for-1 forward split
    await mockAsset.updateUIMultiplier(2n * WAD, effectiveAt);

    const rawCollateral = 100n * WAD;
    const debtAmount = 5000n * WAD;

    const evalResult = await riskEngine.evaluatePosition(
      await mockAsset.getAddress(),
      rawCollateral,
      debtAmount
    );

    expect(evalResult.status).to.equal(2); // TRANSITION
    // LTV reduced from 75% to 70% during guard window (500 BPS buffer)
    expect(evalResult.maxDebtUsdWad).to.equal(14000n * WAD); // 70% of ,000
  });

  it("should mark position as BLOCKED if asset transfer is paused", async function () {
    await mockAsset.setPaused(true);

    const evalResult = await riskEngine.evaluatePosition(
      await mockAsset.getAddress(),
      100n * WAD,
      5000n * WAD
    );

    expect(evalResult.status).to.equal(3); // BLOCKED
  });
});
