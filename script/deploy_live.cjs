const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

// Load Compiled Artifacts
const B20StateReaderArtifact = require("../artifacts/contracts/B20StateReader.sol/B20StateReader.json");
const RiskEngineArtifact = require("../artifacts/contracts/RiskEngine.sol/RiskEngine.json");
const EQUIVANCEVaultArtifact = require("../artifacts/contracts/EQUIVANCEVault.sol/EQUIVANCEVault.json");
const MockB20AssetArtifact = require("../artifacts/contracts/mock/MockB20Asset.sol/MockB20Asset.json");
const MockAggregatorV3Artifact = require("../artifacts/contracts/mock/MockAggregatorV3.sol/MockAggregatorV3.json");
const MockDebtTokenArtifact = require("../artifacts/contracts/mock/MockDebtToken.sol/MockDebtToken.json");
const NaiveVaultArtifact = require("../artifacts/contracts/mock/NaiveVault.sol/NaiveVault.json");

async function deploy() {
  console.log("==================================================");
  console.log("Deploying EQUIVANCE Protocol Onchain to Base...");
  console.log("==================================================");

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY is missing in .env.local");

  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const balance = await provider.getBalance(wallet.address);
  const network = await provider.getNetwork();

  console.log(`Network: Base (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // 1. Deploy B20StateReader
  console.log("\n[1/6] Deploying B20StateReader...");
  const StateReaderFactory = new ethers.ContractFactory(
    B20StateReaderArtifact.abi,
    B20StateReaderArtifact.bytecode,
    wallet
  );
  const stateReader = await StateReaderFactory.deploy();
  await stateReader.waitForDeployment();
  const stateReaderAddress = await stateReader.getAddress();
  const stateReaderTx = stateReader.deploymentTransaction();
  console.log(`✓ B20StateReader deployed at: ${stateReaderAddress} (Tx: ${stateReaderTx.hash})`);

  // 2. Deploy RiskEngine
  console.log("\n[2/6] Deploying RiskEngine...");
  const RiskEngineFactory = new ethers.ContractFactory(
    RiskEngineArtifact.abi,
    RiskEngineArtifact.bytecode,
    wallet
  );
  const riskEngine = await RiskEngineFactory.deploy(stateReaderAddress);
  await riskEngine.waitForDeployment();
  const riskEngineAddress = await riskEngine.getAddress();
  const riskEngineTx = riskEngine.deploymentTransaction();
  console.log(`✓ RiskEngine deployed at: ${riskEngineAddress} (Tx: ${riskEngineTx.hash})`);

  // 3. Resolve Native USDC or Deploy Controlled Debt Token
  let debtTokenAddress = process.env.NEXT_PUBLIC_DEBT_TOKEN;
  if (!debtTokenAddress || debtTokenAddress === "") {
    debtTokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Verified USDC on Base
  }
  console.log(`\n[3/6] Binding Debt Token: ${debtTokenAddress}`);

  // 4. Deploy EQUIVANCEVault
  console.log("\n[4/6] Deploying EQUIVANCEVault...");
  const VaultFactory = new ethers.ContractFactory(
    EQUIVANCEVaultArtifact.abi,
    EQUIVANCEVaultArtifact.bytecode,
    wallet
  );
  const vault = await VaultFactory.deploy(riskEngineAddress, stateReaderAddress, debtTokenAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  const vaultTx = vault.deploymentTransaction();
  console.log(`✓ EQUIVANCEVault deployed at: ${vaultAddress} (Tx: ${vaultTx.hash})`);

  // 5. Deploy Controlled B20 Stock Token (for onchain scheduled multiplier proof)
  console.log("\n[5/6] Deploying Controlled B20 Stock Asset (AAPLc)...");
  const MockB20Factory = new ethers.ContractFactory(
    MockB20AssetArtifact.abi,
    MockB20AssetArtifact.bytecode,
    wallet
  );
  const mockAAPLc = await MockB20Factory.deploy("Apple Tokenized Stock (B20)", "AAPLc", 18);
  await mockAAPLc.waitForDeployment();
  const mockAAPLcAddress = await mockAAPLc.getAddress();
  const mockAAPLcTx = mockAAPLc.deploymentTransaction();
  console.log(`✓ Controlled AAPLc (B20) deployed at: ${mockAAPLcAddress} (Tx: ${mockAAPLcTx.hash})`);

  // 6. Deploy or Resolve Oracle Feed
  let priceFeedAddress = process.env.NEXT_PUBLIC_CHAINLINK_AAPL_USD;
  if (!priceFeedAddress || priceFeedAddress === "") {
    const MockAggregatorFactory = new ethers.ContractFactory(
      MockAggregatorV3Artifact.abi,
      MockAggregatorV3Artifact.bytecode,
      wallet
    );
    const mockFeed = await MockAggregatorFactory.deploy(8, "AAPL / USD", 22500000000); // $225.00
    await mockFeed.waitForDeployment();
    priceFeedAddress = await mockFeed.getAddress();
  }
  console.log(`\n[6/6] Configuring Oracle Price Feed: ${priceFeedAddress}`);

  // Configure Asset in RiskEngine
  console.log("Configuring RiskEngine parameters for AAPLc...");
  const configTx = await riskEngine.setAssetConfig(
    mockAAPLcAddress,
    priceFeedAddress,
    7500, // 75% LTV
    8500, // 85% Liquidation Threshold
    500,  // 5% Liquidation Penalty
    86400,// 24h max oracle delay
    3600, // 1h guard window
    500   // 5% LTV reduction in guard window
  );
  await configTx.wait();
  console.log(`✓ RiskEngine configured for AAPLc (Tx: ${configTx.hash})`);

  // Deploy NaiveVault baseline for onchain benchmark comparison
  console.log("\nDeploying NaiveVault (Baseline for live benchmark)...");
  const NaiveVaultFactory = new ethers.ContractFactory(
    NaiveVaultArtifact.abi,
    NaiveVaultArtifact.bytecode,
    wallet
  );
  const naiveVault = await NaiveVaultFactory.deploy(
    debtTokenAddress,
    priceFeedAddress,
    7500,
    8500
  );
  await naiveVault.waitForDeployment();
  const naiveVaultAddress = await naiveVault.getAddress();
  const naiveVaultTx = naiveVault.deploymentTransaction();
  console.log(`✓ NaiveVault deployed at: ${naiveVaultAddress} (Tx: ${naiveVaultTx.hash})`);

  const currentBlock = await provider.getBlock("latest");

  const manifest = {
    network: "Base",
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    blockNumber: currentBlock.number,
    blockTimestamp: currentBlock.timestamp,
    contracts: {
      EQUIVANCEVault: {
        address: vaultAddress,
        deploymentTx: vaultTx.hash,
      },
      RiskEngine: {
        address: riskEngineAddress,
        deploymentTx: riskEngineTx.hash,
      },
      B20StateReader: {
        address: stateReaderAddress,
        deploymentTx: stateReaderTx.hash,
      },
      ControlledAAPLc: {
        address: mockAAPLcAddress,
        deploymentTx: mockAAPLcTx.hash,
      },
      OraclePriceFeed: {
        address: priceFeedAddress,
      },
      NaiveVaultBaseline: {
        address: naiveVaultAddress,
        deploymentTx: naiveVaultTx.hash,
      },
      VerifiedNativeUSDC: {
        address: debtTokenAddress,
      },
    },
  };

  const manifestPath = path.join(__dirname, "../proof/deployment_manifest.json");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nDeployment Manifest saved to: ${manifestPath}`);

  // Update .env.local with deployed contract addresses
  let envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf-8");
  envContent = envContent.replace(/NEXT_PUBLIC_EQUIVANCE_VAULT=".*"/, `NEXT_PUBLIC_EQUIVANCE_VAULT="${vaultAddress}"`);
  envContent = envContent.replace(/NEXT_PUBLIC_B20_STATE_READER=".*"/, `NEXT_PUBLIC_B20_STATE_READER="${stateReaderAddress}"`);
  envContent = envContent.replace(/NEXT_PUBLIC_RISK_ENGINE=".*"/, `NEXT_PUBLIC_RISK_ENGINE="${riskEngineAddress}"`);
  fs.writeFileSync(path.join(__dirname, "../.env.local"), envContent);
  console.log("✓ .env.local updated with deployed contract addresses.");
  console.log("==================================================");
  console.log("Deployment fully completed successfully!");
  console.log("==================================================");
}

deploy().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
