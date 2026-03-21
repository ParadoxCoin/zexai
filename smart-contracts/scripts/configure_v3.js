const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Configuring contracts with account:", deployer.address);

  const TOKEN_ADDRESS = "0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a";
  const STAKING_ADDRESS = "0xbee8cb1f28Dfd0713311f3b46bFf3F24eAc72733";
  const VESTING_ADDRESS = "0x93467b1eBd6215Bc1810488C98eCad787B59101c";
  const PRESALE_ADDRESS = "0x37CAd7cf190059c6716967CB429cD4CD13c390fC";

  const token = await hre.ethers.getContractAt("ZexToken", TOKEN_ADDRESS);

  console.log("Whitelisting infrastructure contracts from 0.5% Transfer Tax...");
  
  let tx1 = await token.setExcludeFromFee(STAKING_ADDRESS, true);
  await tx1.wait();
  console.log("✅ Staking whitelisted.");

  let tx2 = await token.setExcludeFromFee(VESTING_ADDRESS, true);
  await tx2.wait();
  console.log("✅ Vesting whitelisted.");

  let tx3 = await token.setExcludeFromFee(PRESALE_ADDRESS, true);
  await tx3.wait();
  console.log("✅ Presale whitelisted.");

  let tx4 = await token.setStakingRewardWallet(deployer.address);
  await tx4.wait();
  console.log("✅ Staking Reward Wallet set.");

  console.log("\n✅ ALL CONFIGURATIONS COMPLETE ON POLYGON MAINNET!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
