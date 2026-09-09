import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==================================================");
  console.log("Deploying EQUIVANCE Protocol to network...");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  // 1. Deploy B20StateReader
  const StateReader = await ethers.getContractFactory("B20StateReader");
  const stateReader = await StateReader.deploy();
  await stateReader.waitForDeployment();
  const stateReaderAddress = await stateReader.getAddress();
  console.log(`B20StateReader deployed to: ${stateReaderAddress}`);

  // 2. Deploy RiskEngine
  const RiskEngine = await ethers.getContractFactory("RiskEngine");
  const riskEngine = await RiskEngine.deploy(stateReaderAddress);
  await riskEngine.waitForDeployment();
  const riskEngineAddress = await riskEngine.getAddress();
  console.log(`RiskEngine deployed to: ${riskEngineAddress}`);

  // 3. Resolve or deploy debt token (USDC)
  let debtTokenAddress = process.env.NEXT_PUBLIC_DEBT_TOKEN;
  if (!debtTokenAddress || debtTokenAddress === "") {
    const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
    const mockDebtToken = await MockDebtToken.deploy("USD Coin", "USDC", 6);
    await mockDebtToken.waitForDeployment();
    debtTokenAddress = await mockDebtToken.getAddress();
    console.log(`Mock USDC deployed to: ${debtTokenAddress}`);
  } else {
    console.log(`Using verified USDC at: ${debtTokenAddress}`);
  }

  // 4. Deploy EQUIVANCEVault
  const Vault = await ethers.getContractFactory("EQUIVANCEVault");
  const vault = await Vault.deploy(riskEngineAddress, stateReaderAddress, debtTokenAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`EQUIVANCEVault deployed to: ${vaultAddress}`);

  // 5. Deploy Mock B20 Asset (AAPLc) for scheduled multiplier proof
  const MockB20 = await ethers.getContractFactory("MockB20Asset");
  const mockAAPLc = await MockB20.deploy("Apple Tokenized Stock (B20)", "AAPLc", 18);
  await mockAAPLc.waitForDeployment();
  const mockAAPLcAddress = await mockAAPLc.getAddress();
  console.log(`Mock AAPLc (B20) deployed to: ${mockAAPLcAddress}`);

  // 6. Deploy Mock Oracle Feed ($200.00 initial, 8 decimals)
  const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
  const mockAAPLFeed = await MockAggregator.deploy(8, "AAPL / USD", 20000000000);
  await mockAAPLFeed.waitForDeployment();
  const mockAAPLFeedAddress = await mockAAPLFeed.getAddress();
  console.log(`Mock AAPL/USD Feed deployed to: ${mockAAPLFeedAddress}`);

  // 7. Configure RiskEngine
  console.log("Configuring RiskEngine for AAPLc...");
  const tx = await riskEngine.setAssetConfig(
    mockAAPLcAddress,
    mockAAPLFeedAddress,
    7500, // 75% LTV
    8500, // 85% Liquidation Threshold
    500,  // 5% Liquidation Penalty
    86400,// 24h oracle max delay
    3600, // 1h guard window
    500   // 5% LTV buffer in guard window
  );
  await tx.wait();
  console.log("RiskEngine configured successfully.");

  // 8. Deploy NaiveVault for benchmark comparison
  const NaiveVault = await ethers.getContractFactory("NaiveVault");
  const naiveVault = await NaiveVault.deploy(debtTokenAddress, mockAAPLFeedAddress, 7500, 8500);
  await naiveVault.waitForDeployment();
  const naiveVaultAddress = await naiveVault.getAddress();
  console.log(`NaiveVault (Baseline) deployed to: ${naiveVaultAddress}`);

  const deployedManifest = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    timestamp: new Date().toISOString(),
    contracts: {
      EQUIVANCEVault: vaultAddress,
      RiskEngine: riskEngineAddress,
      B20StateReader: stateReaderAddress,
      DebtToken: debtTokenAddress,
      MockAAPLc: mockAAPLcAddress,
      MockAAPLFeed: mockAAPLFeedAddress,
      NaiveVault: naiveVaultAddress,
    },
  };

  const manifestPath = path.join(__dirname, "../proof/deployment_manifest.json");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(deployedManifest, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
