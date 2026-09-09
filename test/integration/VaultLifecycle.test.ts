const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: Vault Full Lifecycle", function () {
  let stateReader;
  let riskEngine;
  let vault;
  let mockAsset;
  let mockPriceFeed;
  let mockDebtToken;
  let owner;
  let borrower;
  let liquidator;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    [owner, borrower, liquidator] = await ethers.getSigners();

    const StateReader = await ethers.getContractFactory("B20StateReader");
    stateReader = await StateReader.deploy();

    const RiskEngine = await ethers.getContractFactory("RiskEngine");
    riskEngine = await RiskEngine.deploy(await stateReader.getAddress());

    const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
    mockDebtToken = await MockDebtToken.deploy("USD Coin", "USDC", 6);

    const MockB20 = await ethers.getContractFactory("MockB20Asset");
    mockAsset = await MockB20.deploy("Apple Tokenized Stock", "AAPLc", 18);

    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    mockPriceFeed = await MockAggregator.deploy(8, "AAPL/USD", 20000000000); // $200.00 (8 decimals)

    await riskEngine.setAssetConfig(
      await mockAsset.getAddress(),
      await mockPriceFeed.getAddress(),
      7500, // 75% LTV
      8500, // 85% Liq Threshold
      500,  // 5% Penalty
      86400,// 24h max delay
      3600, // 1h guard
      500   // 5% reduction
    );

    const Vault = await ethers.getContractFactory("EQUIVANCEVault");
    vault = await Vault.deploy(
      await riskEngine.getAddress(),
      await stateReader.getAddress(),
      await mockDebtToken.getAddress()
    );

    // Fund vault with USDC liquidity to lend out
    await mockDebtToken.mint(await vault.getAddress(), 1000000n * (10n ** 6n));

    // Mint collateral to borrower
    await mockAsset.mint(borrower.address, 1000n * WAD);
    await mockAsset.connect(borrower).approve(await vault.getAddress(), ethers.MaxUint256);

    // Mint debt tokens to liquidator & borrower for repayments
    await mockDebtToken.mint(borrower.address, 100000n * (10n ** 6n));
    await mockDebtToken.connect(borrower).approve(await vault.getAddress(), ethers.MaxUint256);

    await mockDebtToken.mint(liquidator.address, 100000n * (10n ** 6n));
    await mockDebtToken.connect(liquidator).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("should complete end-to-end lifecycle: deposit -> borrow -> repay -> withdraw", async function () {
    // 1. Deposit 100 raw AAPLc ($20,000 collateral value)
    await vault.connect(borrower).deposit(await mockAsset.getAddress(), 100n * WAD);

    const posAfterDeposit = await vault.getPosition(borrower.address, await mockAsset.getAddress());
    expect(posAfterDeposit.rawCollateral).to.equal(100n * WAD);
    expect(posAfterDeposit.debtAmountUsd).to.equal(0n);

    // 2. Borrow $10,000 USDC against collateral (Max is $15,000 at 75% LTV)
    await vault.connect(borrower).borrow(await mockAsset.getAddress(), 10000n * WAD);

    const posAfterBorrow = await vault.getPosition(borrower.address, await mockAsset.getAddress());
    expect(posAfterBorrow.debtAmountUsd).to.equal(10000n * WAD);
    // Verify user received 10,000 USDC (6 decimals)
    expect(await mockDebtToken.balanceOf(borrower.address)).to.equal(110000n * (10n ** 6n));

    // 3. Repay $5,000 USDC
    await vault.connect(borrower).repay(await mockAsset.getAddress(), 5000n * WAD);

    const posAfterRepay = await vault.getPosition(borrower.address, await mockAsset.getAddress());
    expect(posAfterRepay.debtAmountUsd).to.equal(5000n * WAD);

    // 4. Withdraw 50 AAPLc (Remaining 50 AAPLc @ $200 = $10,000 collateral -> Max debt $7,500 > $5,000 current debt)
    await vault.connect(borrower).withdraw(await mockAsset.getAddress(), 50n * WAD);

    const posAfterWithdraw = await vault.getPosition(borrower.address, await mockAsset.getAddress());
    expect(posAfterWithdraw.rawCollateral).to.equal(50n * WAD);
    expect(await mockAsset.balanceOf(borrower.address)).to.equal(950n * WAD);
  });

  it("should prevent withdraw if it would make the position unhealthy", async function () {
    await vault.connect(borrower).deposit(await mockAsset.getAddress(), 100n * WAD);
    await vault.connect(borrower).borrow(await mockAsset.getAddress(), 14000n * WAD);

    // Attempting to withdraw 50 raw shares would leave 50 * $200 = $10,000 collateral against $14,000 debt
    await expect(
      vault.connect(borrower).withdraw(await mockAsset.getAddress(), 50n * WAD)
    ).to.be.revertedWithCustomError(vault, "UnhealthyPositionAfterAction");
  });
});
