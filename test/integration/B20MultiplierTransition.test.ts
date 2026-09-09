const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: B20 Multiplier Transition (Eventless Lazy Maturity)", function () {
  let mockAsset;
  let owner;
  let user;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const MockB20 = await ethers.getContractFactory("MockB20Asset");
    mockAsset = await MockB20.deploy("Apple Tokenized Stock", "AAPLc", 18);
    await mockAsset.mint(user.address, 1000n * WAD);
  });

  it("should demonstrate that uiMultiplier() updates lazily at effectiveAt with zero transition transactions", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
    const effectiveAt = currentTimestamp + 3600; // 1 hour in future

    // 1. Schedule a 2-for-1 forward stock split (1.0x -> 2.0x)
    await mockAsset.updateUIMultiplier(2n * WAD, effectiveAt);

    // 2. Before effectiveAt (T - 1): multiplier must be 1.0x
    await ethers.provider.send("evm_setNextBlockTimestamp", [effectiveAt - 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await mockAsset.uiMultiplier()).to.equal(1n * WAD);
    expect(await mockAsset.balanceOf(user.address)).to.equal(1000n * WAD);
    expect(await mockAsset.balanceOfUI(user.address)).to.equal(1000n * WAD);

    // 3. Exactly at effectiveAt (T): multiplier transitions to 2.0x without any state-changing transaction!
    await ethers.provider.send("evm_setNextBlockTimestamp", [effectiveAt]);
    await ethers.provider.send("evm_mine", []);

    // Raw balance is completely unchanged:
    expect(await mockAsset.balanceOf(user.address)).to.equal(1000n * WAD);
    // UI Multiplier lazily evaluates to 2.0x on read:
    expect(await mockAsset.uiMultiplier()).to.equal(2n * WAD);
    // UI Balance automatically scales to 2,000 shares:
    expect(await mockAsset.balanceOfUI(user.address)).to.equal(2000n * WAD);
  });
});
