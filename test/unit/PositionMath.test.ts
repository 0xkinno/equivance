const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Unit: PositionMath", function () {
  let positionMathHarness;
  const WAD = 10n ** 18n;

  before(async function () {
    const HarnessFactory = await ethers.getContractFactory("PositionMathHarness");
    positionMathHarness = await HarnessFactory.deploy();
    await positionMathHarness.waitForDeployment();
  });

  it("should correctly convert raw amounts to UI share amounts using multiplier", async function () {
    const rawAmount = 1000n * WAD; // 1,000 tokens
    const multiplier = 2n * WAD; // 2.0x multiplier
    const uiAmount = await positionMathHarness.toUIShareAmount(rawAmount, multiplier);
    expect(uiAmount).to.equal(2000n * WAD);
  });

  it("should correctly convert UI share amounts to raw amounts using multiplier", async function () {
    const uiAmount = 2000n * WAD;
    const multiplier = 2n * WAD;
    const rawAmount = await positionMathHarness.toRawTokenAmount(uiAmount, multiplier);
    expect(rawAmount).to.equal(1000n * WAD);
  });

  it("should calculate canonical collateral valuation (rawTokenAmount * totalReturnPrice8)", async function () {
    const rawAmount = 100n * WAD; // 100 raw tokens (18 decimals)
    const totalReturnPrice = 20000000000n; // .00 (8 decimals)
    const oracleDecimals = 8;
    const assetDecimals = 18;

    const val = await positionMathHarness.valueCollateral(
      rawAmount,
      totalReturnPrice,
      oracleDecimals,
      assetDecimals
    );
    // 100 tokens *  = ,000 USD WAD
    expect(val).to.equal(20000n * WAD);
  });

  it("should demonstrate naive double-adjusted valuation (raw * multiplier * TRV)", async function () {
    const rawAmount = 100n * WAD; // 100 raw tokens
    const totalReturnPrice = 20000000000n; // .00
    const multiplier = 10n * WAD; // 10.0x forward split
    const oracleDecimals = 8;
    const assetDecimals = 18;

    const naiveVal = await positionMathHarness.calculateNaiveDoubleAdjustedUSD(
      rawAmount,
      totalReturnPrice,
      multiplier,
      oracleDecimals,
      assetDecimals
    );
    // 100 *  * 10 = ,000 (10x overvaluation!)
    expect(naiveVal).to.equal(200000n * WAD);
  });

  it("should calculate max debt based on LTV basis points", async function () {
    const collateralValueUsd = 20000n * WAD; // ,000
    const ltvBps = 7500; // 75%
    const maxDebt = await positionMathHarness.calculateMaxDebt(collateralValueUsd, ltvBps);
    expect(maxDebt).to.equal(15000n * WAD); // ,000
  });

  it("should calculate health factor accurately", async function () {
    const collateralValueUsd = 20000n * WAD;
    const liqThresholdBps = 8500; // 85% = ,000 liquidation collateral
    const totalDebtUsd = 10000n * WAD; // ,000 debt

    const hf = await positionMathHarness.calculateHealthFactor(
      collateralValueUsd,
      liqThresholdBps,
      totalDebtUsd
    );
    // 17,000 / 10,000 = 1.7 WAD
    expect(hf).to.equal((17n * WAD) / 10n);
  });

  it("should return max uint256 for health factor when debt is zero", async function () {
    const collateralValueUsd = 20000n * WAD;
    const liqThresholdBps = 8500;
    const totalDebtUsd = 0n;

    const hf = await positionMathHarness.calculateHealthFactor(
      collateralValueUsd,
      liqThresholdBps,
      totalDebtUsd
    );
    expect(hf).to.equal(ethers.MaxUint256);
  });

  it("should calculate liquidation seized raw collateral under TRV pricing", async function () {
    const debtToRepay = 5000n * WAD; // ,000 debt being repaid
    const price = 20000000000n; // .00 (8 dec)
    const oracleDecimals = 8;
    const assetDecimals = 18;
    const penaltyBps = 500; // 5% bonus (,250 worth of collateral)

    const rawCollateral = await positionMathHarness.calculateLiquidationCollateral(
      debtToRepay,
      price,
      oracleDecimals,
      assetDecimals,
      penaltyBps
    );

    // ,250 /  = 26.25 raw tokens
    expect(rawCollateral).to.equal((2625n * WAD) / 100n);
  });
});
