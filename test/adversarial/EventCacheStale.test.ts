const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("Adversarial Attack A: Stale Event/Indexer State Exploitation", function () {
  let stateReader;
  let riskEngine;
  let equivanceVault;
  let naiveVault;
  let mockAsset;
  let mockPriceFeed;
  let mockDebtToken;
  let attacker;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    const [, att] = await ethers.getSigners();
    attacker = att;

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
      7500, // 75% LTV
      8500, // 85% Liq Threshold
      500,
      86400,
      3600,
      500
    );

    const Vault = await ethers.getContractFactory("EQUIVANCEVault");
    equivanceVault = await Vault.deploy(
      await riskEngine.getAddress(),
      await stateReader.getAddress(),
      await mockDebtToken.getAddress()
    );

    const NaiveVault = await ethers.getContractFactory("NaiveVault");
    naiveVault = await NaiveVault.deploy(
      await mockDebtToken.getAddress(),
      await mockPriceFeed.getAddress(),
      7500,
      8500
    );

    await mockDebtToken.mint(await equivanceVault.getAddress(), 1000000n * (10n ** 6n));
    await mockDebtToken.mint(await naiveVault.getAddress(), 1000000n * (10n ** 6n));

    // Mint 2,000 raw tokens to attacker (1,000 for each vault)
    await mockAsset.mint(attacker.address, 2000n * WAD);
    await mockAsset.connect(attacker).approve(await equivanceVault.getAddress(), ethers.MaxUint256);
    await mockAsset.connect(attacker).approve(await naiveVault.getAddress(), ethers.MaxUint256);
  });

  it("test_EventOnlyCacheCannotControlCollateralValuation", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
    const effectiveAt = currentTimestamp + 3600;

    await equivanceVault.connect(attacker).deposit(await mockAsset.getAddress(), 1000n * WAD);
    await naiveVault.connect(attacker).deposit(await mockAsset.getAddress(), 1000n * WAD);

    // Schedule 1-for-2 reverse split (0.5x)
    await mockAsset.updateUIMultiplier((5n * WAD) / 10n, effectiveAt);

    // Advance time past effectiveAt
    await ethers.provider.send("evm_setNextBlockTimestamp", [effectiveAt + 10]);
    await ethers.provider.send("evm_mine", []);

    // 1. Naive Vault permits unbacked borrow ($150,000 against $100,000 real value)
    await naiveVault.connect(attacker).borrow(await mockAsset.getAddress(), 150000n * WAD);
    const naiveDebt = (await naiveVault.positions(attacker.address, await mockAsset.getAddress())).debtAmountUsd;
    expect(naiveDebt).to.equal(150000n * WAD);

    // 2. EQUIVANCE rejects unbacked borrow
    await expect(
      equivanceVault.connect(attacker).borrow(await mockAsset.getAddress(), 150000n * WAD)
    ).to.be.revertedWithCustomError(equivanceVault, "InsufficientCollateral");

    // Borrowing true safe amount ($75,000) succeeds
    await equivanceVault.connect(attacker).borrow(await mockAsset.getAddress(), 75000n * WAD);
    const equivancePos = await equivanceVault.getPosition(attacker.address, await mockAsset.getAddress());
    expect(equivancePos.debtAmountUsd).to.equal(75000n * WAD);

    // Evidence Receipt
    const attackReceipt = {
      attackId: "ATTACK-A-STALE-EVENT-CACHE",
      timestamp: new Date().toISOString(),
      scenario: "Reverse stock split (1.0x -> 0.5x) with eventless timestamp maturity",
      initialState: {
        rawCollateral: (1000n * WAD).toString(),
        initialMultiplier: (1n * WAD).toString(),
        scheduledMultiplier: ((5n * WAD) / 10n).toString(),
        effectiveAt: effectiveAt,
        equityPrice: "20000000000",
      },
      naiveBaselineResult: {
        vulnerability: "CRITICAL_INSOLVENCY",
        cachedMultiplierUsed: (1n * WAD).toString(),
        unbackedDebtMintedUsd: (150000n * WAD).toString(),
        realCollateralBackingUsd: (100000n * WAD).toString(),
        badDebtCreatedUsd: (75000n * WAD).toString(),
      },
      equivanceDefenseResult: {
        status: "DEFENDED",
        liveMultiplierEvaluated: ((5n * WAD) / 10n).toString(),
        rejectionReason: "InsufficientCollateral",
        enforcedMaxDebtUsd: (75000n * WAD).toString(),
        solvencyPreserved: true,
      },
      verifierStatus: "PASS",
    };

    const outDir = path.join(__dirname, "../../proof/attacks");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "A-stale-event-cache.json"),
      JSON.stringify(attackReceipt, null, 2)
    );
  });
});
