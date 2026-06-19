const { ethers } = require("hardhat");

// ✅ V3 ZexToken deployed address (1 Billion supply - Polygon Mainnet)
const ZEX_TOKEN_ADDRESS = "0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("====================================================");
    console.log("Deploying AI NFT Collection Factory with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "POL");
    console.log("====================================================");

    // 1. Deploy Factory
    console.log("\nDeploying ZexCollectionFactory...");
    
    // We use the deployer wallet as the initial treasury for collected fees
    const treasuryAddress = deployer.address;

    const Factory = await ethers.getContractFactory("ZexCollectionFactory");
    const factory = await Factory.deploy(ZEX_TOKEN_ADDRESS, treasuryAddress);
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log("✅ ZexCollectionFactory deployed to:", factoryAddress);
    console.log("   Treasury Address:", treasuryAddress);

    // 2. We don't need to whitelist the Factory from the 5% ZexToken tax because the 
    //    factory uses `transferFrom(user, treasury)`. The Factory is neither the sender 
    //    nor the recipient, so the standard user 5% tax correctly applies to mints!
    
    console.log("\n=======================================================");
    console.log("🎉 FACTORY DEPLOYMENT COMPLETE!");
    console.log(`Factory Contract:  ${factoryAddress}`);
    console.log(`ZEX Token (V3):    ${ZEX_TOKEN_ADDRESS}`);
    console.log("=======================================================\n");
    console.log("👉 UPDATE Web3Context.tsx with the new Factory address!");
    console.log(`   export const ZEXAI_FACTORY_ADDRESS = "${factoryAddress}";`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment Failed:", error);
        process.exit(1);
    });
