const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("Adversarial Attack B: Raw vs UI Unit Confusion & Multiplier Isolation", function () {
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

    const MockB20 = await ethers.getContractFactory("MockB20Asset");
    mockAsset = await MockB20.deploy("Apple Tokenized Stock (B20)", "AAPLc", 18);

    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    mockPriceFeed = await MockAggregator.deploy(8, "AAPL/USD Total Return", 20000000000); // .00

    await riskEngine.setAssetConfig(
      await mockAsset.getAddress(),
      await mockPriceFeed.getAddress(),
      7500,
      8500,
      500,
      86400,
      3600,
      500
    );

    const Vault = await ethers.getContractFactory("EQUIVANCEVault");
    vault = await Vault.deploy(
      await riskEngine.getAddress(),
      await stateReader.getAddress(),
      await mockDebtToken.getAddress()
    );

    await mockDebtToken.mint(await vault.getAddress(), 1000000n * (10n ** 6n));
    await mockAsset.mint(user.address, 100n * WAD);
    await mockAsset.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("test_RawAndUIUnitsCannotBeMixed", async function () {
    await mockAsset.updateUIMultiplier((1n * WAD) / 10n, 0); // 0.1x multiplier

    await vault.connect(user).deposit(await mockAsset.getAddress(), 100n * WAD);

    const evalResult = await riskEngine.evaluatePosition(
      await mockAsset.getAddress(),
      100n * WAD,
      0n
    );

    expect(evalResult.rawTokenAmount).to.equal(100n * WAD);
    expect(evalResult.uiShareAmount).to.equal(10n * WAD);
    expect(evalResult.collateralUsdWad).to.equal(20000n * WAD); // 100 raw *  TRV = ,000
    expect(evalResult.maxDebtUsdWad).to.equal(15000n * WAD);

    const attackReceipt = {
      attackId: "ATTACK-B-RAW-UI-MISMATCH",
      timestamp: new Date().toISOString(),
      scenario: "Unit separation between raw transferable balance and UI share representation",
      inputRawAmount: (100n * WAD).toString(),
      multiplier: ((1n * WAD) / 10n).toString(),
      computedUIShareAmount: (10n * WAD).toString(),
      collateralValueEnforcedUsd: (20000n * WAD).toString(),
      maxDebtAllowedUsd: (15000n * WAD).toString(),
      defenseStatus: "DEFENDED",
      verifierStatus: "PASS",
    };

    const outDir = path.join(__dirname, "../../proof/attacks");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "B-raw-ui-mismatch.json"),
      JSON.stringify(attackReceipt, null, 2)
    );
  });
});
