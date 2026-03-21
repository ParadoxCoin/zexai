const hre = require("hardhat");

async function main() {
  console.log("============================================");
  console.log("Starting ZexAI V3 Ecosystem Deployment...");
  console.log("============================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH/POL");

  // 1. ZexToken
  console.log("\n1. Deploying ZexToken...");
  const Token = await hre.ethers.getContractFactory("ZexToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ ZexToken V3 deployed to:", tokenAddress);

  // 2. ZexStaking
  console.log("\n2. Deploying ZexStaking...");
  const Staking = await hre.ethers.getContractFactory("ZexStaking");
  const staking = await Staking.deploy(tokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ ZexStaking V3 deployed to:", stakingAddress);

  // 3. ZexVesting
  console.log("\n3. Deploying ZexVesting (The Vault)...");
  const Vesting = await hre.ethers.getContractFactory("ZexVesting");
  const vesting = await Vesting.deploy(tokenAddress);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("✅ ZexVesting deployed to:", vestingAddress);

  // 4. ZexPresale
  console.log("\n4. Deploying ZexPresale (ICO)...");
  const Presale = await hre.ethers.getContractFactory("ZexPresale");
  const presale = await Presale.deploy(tokenAddress);
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log("✅ ZexPresale deployed to:", presaleAddress);

  // Configuration
  console.log("\n============================================");
  console.log("Configuring Ecosystem Integrations...");
  console.log("============================================");
  
  // Whitelist the contract architectures from the 5% deflatonary Tax
  console.log("Whitelisting infrastructure contracts from 5% Transfer Tax...");
  await token.setExcludeFromFee(stakingAddress, true);
  await token.setExcludeFromFee(vestingAddress, true);
  await token.setExcludeFromFee(presaleAddress, true);
  
  // The %2.5 staking reward fee is routed to a master treasury wallet.
  await token.setStakingRewardWallet(deployer.address);
  
  console.log("✅ Integrations Configured Successfully!");

  console.log("\n============================================");
  console.log("DEVOPS SUMMARY: UPDATE FRONTEND WITH THESE:");
  console.log("VITE_ZEX_TOKEN_ADDRESS=" + tokenAddress);
  console.log("VITE_ZEX_STAKING_ADDRESS=" + stakingAddress);
  console.log("VITE_ZEX_VESTING_ADDRESS=" + vestingAddress);
  console.log("VITE_ZEX_PRESALE_ADDRESS=" + presaleAddress);
  console.log("============================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
