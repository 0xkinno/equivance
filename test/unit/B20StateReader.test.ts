const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Unit: B20StateReader", function () {
  let stateReader;
  let mockAsset;
  let owner;
  let user;

  const WAD = 10n ** 18n;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const StateReader = await ethers.getContractFactory("B20StateReader");
    stateReader = await StateReader.deploy();

    const MockB20 = await ethers.getContractFactory("MockB20Asset");
    mockAsset = await MockB20.deploy("NVIDIA Tokenized Stock", "NVDAc", 18);

    await mockAsset.mint(user.address, 500n * WAD);
  });

  it("should extract correct initial state from B20 asset", async function () {
    const state = await stateReader.getB20State(await mockAsset.getAddress(), user.address);
    expect(state.rawTokenAmount).to.equal(500n * WAD);
    expect(state.effectiveMultiplier).to.equal(1n * WAD);
    expect(state.uiShareAmount).to.equal(500n * WAD);
    expect(state.pendingMultiplier).to.equal(0n);
    expect(state.hasLivePending).to.be.false;
    expect(state.transferPaused).to.be.false;
    expect(state.supports8056).to.be.true;
    expect(state.decimals).to.equal(18);
  });

  it("should detect scheduled multiplier and pending status", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
    const effectiveAt = currentTimestamp + 7200;

    await mockAsset.updateUIMultiplier(3n * WAD, effectiveAt);

    const state = await stateReader.getB20State(await mockAsset.getAddress(), user.address);
    expect(state.effectiveMultiplier).to.equal(1n * WAD);
    expect(state.pendingMultiplier).to.equal(3n * WAD);
    expect(state.effectiveAt).to.equal(BigInt(effectiveAt));
    expect(state.hasLivePending).to.be.true;
  });
});
