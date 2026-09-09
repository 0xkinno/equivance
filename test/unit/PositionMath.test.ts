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

  it("should correctly convert raw amounts to UI amounts using multiplier", async function () {
    const rawAmount = 1000n * WAD; // 1,000 tokens
    const multiplier = 2n * WAD; // 2.0x multiplier
    const uiAmount = await positionMathHarness.toUIAmount(rawAmount, multiplier);
    expect(uiAmount).to.equal(2000n * WAD);
  });

  it("should correctly convert UI amounts to raw amounts using multiplier", async function () {
    const uiAmount = 2000n * WAD;
    const multiplier = 2n * WAD;
    const rawAmount = await positionMathHarness.toRawAmount(uiAmount, multiplier);
    expect(rawAmount).to.equal(1000n * WAD);
  });

  it("should calculate collateral valuation with mixed decimals", async function () {
    const uiAmount = 100n * WAD; // 100 shares (18 decimals)
    const price = 20000000000n; // $200.00 (8 decimals)
    const oracleDecimals = 8;
    const assetDecimals = 18;

    const val = await positionMathHarness.calculateCollateralValue(
      uiAmount,
      price,
      oracleDecimals,
      assetDecimals
    );
    // 100 shares * $200 = $20,000 USD WAD
    expect(val).to.equal(20000n * WAD);
  });

  it("should calculate max debt based on LTV basis points", async function () {
    const collateralValueUsd = 20000n * WAD; // $20,000
    const ltvBps = 7500; // 75%
    const maxDebt = await positionMathHarness.calculateMaxDebt(collateralValueUsd, ltvBps);
    expect(maxDebt).to.equal(15000n * WAD); // $15,000
  });

  it("should calculate health factor accurately", async function () {
    const collateralValueUsd = 20000n * WAD;
    const liqThresholdBps = 8500; // 85% = $17,000 liquidation collateral
    const totalDebtUsd = 10000n * WAD; // $10,000 debt

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

  it("should calculate liquidation seized collateral including penalty bonus", async function () {
    const debtToRepay = 5000n * WAD; // $5,000 debt being repaid
    const price = 20000000000n; // $200.00 (8 dec)
    const oracleDecimals = 8;
    const assetDecimals = 18;
    const penaltyBps = 500; // 5% bonus ($5,250 worth of collateral)
    const multiplier = 1n * WAD; // 1.0x

    const [rawCollateral, uiCollateral] = await positionMathHarness.calculateLiquidationCollateral(
      debtToRepay,
      price,
      oracleDecimals,
      assetDecimals,
      penaltyBps,
      multiplier
    );

    // $5,250 / $200 = 26.25 shares
    expect(uiCollateral).to.equal((2625n * WAD) / 100n);
    expect(rawCollateral).to.equal((2625n * WAD) / 100n);
  });
});
