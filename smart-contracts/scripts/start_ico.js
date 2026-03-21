const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("Starting ICO with account:", owner.address);

  const TOKEN_ADDRESS = "0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a";
  const PRESALE_ADDRESS = "0x37CAd7cf190059c6716967CB429cD4CD13c390fC";

  const token = await hre.ethers.getContractAt("ZexToken", TOKEN_ADDRESS);
  const presale = await hre.ethers.getContractAt("ZexPresale", PRESALE_ADDRESS);

  // 1. Transfer 50 Million ZEX to the Presale Contract for ICO Inventory
  console.log("Funding Presale Contract with 50,000,000 ZEX...");
  const fundAmount = hre.ethers.parseEther("50000000"); // 50 Million
  const tx1 = await token.transfer(PRESALE_ADDRESS, fundAmount);
  await tx1.wait();
  console.log("✅ Presale Funded.");

  // 2. Toggle Presale Active
  console.log("Activating Presale...");
  const tx2 = await presale.togglePresale(true);
  await tx2.wait();
  console.log("✅ Presale is now ACTIVE!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
