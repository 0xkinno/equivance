const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("Adversarial Attack C: Pending Multiplier Transition Boundary & Leverage Race", function () {
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
    mockPriceFeed = await MockAggregator.deploy(8, "AAPL/USD Total Return", 20000000000); // .00 (8 dec)

    await riskEngine.setAssetConfig(
      await mockAsset.getAddress(),
      await mockPriceFeed.getAddress(),
      7500,
      8500,
      500,
      86400,
      3600, // 1 hour guard window
      500   // 5% LTV reduction in guard window
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

  it("test_PositionRevaluesAtEffectiveAt", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
    const effectiveAt = currentTimestamp + 3600;

    await vault.connect(user).deposit(await mockAsset.getAddress(), 100n * WAD);
    await mockAsset.updateUIMultiplier(2n * WAD, effectiveAt);

    // 1. Immediately before effectiveAt (T - 1) - Guard Window Active
    await ethers.provider.send("evm_setNextBlockTimestamp", [effectiveAt - 1]);
    await ethers.provider.send("evm_mine", []);

    const evalBefore = await riskEngine.evaluatePosition(await mockAsset.getAddress(), 100n * WAD, 0n);
    expect(evalBefore.effectiveMultiplier).to.equal(1n * WAD);
    expect(evalBefore.uiShareAmount).to.equal(100n * WAD);
    // 70% LTV applied during guard window (,000 max debt)
    expect(evalBefore.maxDebtUsdWad).to.equal(14000n * WAD);

    // 2. Exactly at effectiveAt (T) - Multiplier matured lazily
    await ethers.provider.send("evm_setNextBlockTimestamp", [effectiveAt]);
    await ethers.provider.send("evm_mine", []);

    const evalAfter = await riskEngine.evaluatePosition(await mockAsset.getAddress(), 100n * WAD, 0n);
    expect(evalAfter.effectiveMultiplier).to.equal(2n * WAD);
    expect(evalAfter.uiShareAmount).to.equal(200n * WAD);
    // Collateral value strictly conserved under TRV: 100 raw *  = ,000
    expect(evalAfter.collateralUsdWad).to.equal(20000n * WAD);
    expect(evalAfter.maxDebtUsdWad).to.equal(15000n * WAD); // 75% normal LTV restored

    const attackReceipt = {
      attackId: "ATTACK-C-EFFECTIVEAT-BOUNDARY",
      timestamp: new Date().toISOString(),
      scenario: "Dynamic evaluation across exact timestamp T with zero keeper transaction",
      effectiveAt: effectiveAt,
      beforeTransition: {
        timestamp: effectiveAt - 1,
        effectiveMultiplier: (1n * WAD).toString(),
        uiShareAmount: (100n * WAD).toString(),
        maxDebtUsd: (14000n * WAD).toString(),
      },
      atTransition: {
        timestamp: effectiveAt,
        effectiveMultiplier: (2n * WAD).toString(),
        uiShareAmount: (200n * WAD).toString(),
        maxDebtUsd: (15000n * WAD).toString(),
      },
      transitionType: "EVENTLESS_LAZY_EVALUATION",
      verifierStatus: "PASS",
    };

    const outDir = path.join(__dirname, "../../proof/attacks");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "C-effectiveAt-boundary.json"),
      JSON.stringify(attackReceipt, null, 2)
    );
  });
});
