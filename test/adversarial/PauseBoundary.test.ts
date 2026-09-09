const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("Adversarial Attack E: Asset Pause Boundary Fail-Closed", function () {
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
    mockAsset = await MockB20.deploy("Apple Tokenized Stock", "AAPLc", 18);

    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    mockPriceFeed = await MockAggregator.deploy(8, "AAPL/USD", 20000000000);

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

    await vault.connect(user).deposit(await mockAsset.getAddress(), 100n * WAD);
  });

  it("should fail closed and reject borrowing & withdrawals during asset pause", async function () {
    await mockAsset.setPaused(true);

    await expect(
      vault.connect(user).borrow(await mockAsset.getAddress(), 5000n * WAD)
    ).to.be.revertedWithCustomError(vault, "AssetBlocked");

    await expect(
      vault.connect(user).withdraw(await mockAsset.getAddress(), 50n * WAD)
    ).to.be.reverted;

    const attackReceipt = {
      attackId: "ATTACK-E-PAUSE-BOUNDARY",
      timestamp: new Date().toISOString(),
      scenario: "Attempting credit actions during issuer emergency pause",
      assetPaused: true,
      borrowAttemptResult: "REVERTED_ASSET_BLOCKED",
      withdrawAttemptResult: "REVERTED_TRANSFER_FAILED",
      protocolPolicy: "FAIL_CLOSED_PROTECTION",
      verifierStatus: "PASS",
    };

    const outDir = path.join(__dirname, "../../proof/attacks");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "E-pause-boundary.json"),
      JSON.stringify(attackReceipt, null, 2)
    );
  });
});
