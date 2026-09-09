const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("Adversarial Attack D: Policy Approval / Transfer Preflight Trap", function () {
  let stateReader;
  let riskEngine;
  let vault;
  let mockAsset;
  let mockPriceFeed;
  let mockDebtToken;
  let restrictedUser;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    [, restrictedUser] = await ethers.getSigners();

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

    await mockAsset.mint(restrictedUser.address, 100n * WAD);
    await mockAsset.connect(restrictedUser).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("test_AllowanceDoesNotImplyTransferEligibility", async function () {
    await mockAsset.setEnforceAllowlist(true);

    await expect(
      vault.connect(restrictedUser).deposit(await mockAsset.getAddress(), 100n * WAD)
    ).to.be.reverted;

    const pos = await vault.getPosition(restrictedUser.address, await mockAsset.getAddress());
    expect(pos.rawCollateral).to.equal(0n);
    expect(pos.debtAmountUsd).to.equal(0n);

    const attackReceipt = {
      attackId: "ATTACK-D-POLICY-ALLOWANCE-TRAP",
      timestamp: new Date().toISOString(),
      scenario: "ERC-20 approval granted but transfer fails due to compliance allowlist",
      userAddress: restrictedUser.address,
      allowanceSet: ethers.MaxUint256.toString(),
      isAllowlisted: false,
      result: "REVERTED_SAFELY_PREFLIGHT",
      internalStateCorrupted: false,
      verifierStatus: "PASS",
    };

    const outDir = path.join(__dirname, "../../proof/attacks");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "D-policy-allowance.json"),
      JSON.stringify(attackReceipt, null, 2)
    );
  });
});
