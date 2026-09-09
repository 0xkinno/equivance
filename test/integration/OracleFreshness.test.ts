const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: Oracle Freshness Protection", function () {
  let stateReader;
  let riskEngine;
  let vault;
  let mockAsset;
  let mockPriceFeed;
  let mockDebtToken;
  let borrower;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    const [, b] = await ethers.getSigners();
    borrower = b;

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

    // Max oracle delay set to 1 hour (3600 seconds)
    await riskEngine.setAssetConfig(
      await mockAsset.getAddress(),
      await mockPriceFeed.getAddress(),
      7500,
      8500,
      500,
      3600, // 1 hour max delay
      1800,
      500
    );

    const Vault = await ethers.getContractFactory("EQUIVANCEVault");
    vault = await Vault.deploy(
      await riskEngine.getAddress(),
      await stateReader.getAddress(),
      await mockDebtToken.getAddress()
    );

    await mockDebtToken.mint(await vault.getAddress(), 1000000n * (10n ** 6n));
    await mockAsset.mint(borrower.address, 100n * WAD);
    await mockAsset.connect(borrower).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("should reject borrowing when oracle price timestamp is stale", async function () {
    await vault.connect(borrower).deposit(await mockAsset.getAddress(), 100n * WAD);

    // Advance time past the 3600s oracle freshness window (e.g. 2 hours)
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
    
    // Set oracle timestamp back in time
    await mockPriceFeed.setTimestamp(currentTimestamp - 7200);

    // Borrow should revert with OracleStale error
    await expect(
      vault.connect(borrower).borrow(await mockAsset.getAddress(), 5000n * WAD)
    ).to.be.revertedWithCustomError(vault, "OracleStale");
  });
});
