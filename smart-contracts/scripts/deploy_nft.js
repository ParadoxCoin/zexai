const { ethers } = require("hardhat");

// ✅ ZexToken was already deployed successfully at this address:
const ZEX_TOKEN_ADDRESS = "0x5566234b86d4e0ee49bacf1DbCB3B914456511B3";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying NFT contract with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "MATIC");

    // Deploy ZexAIEcosystemNFT using the already-deployed ZEX token address
    console.log("\nDeploying ZexAIEcosystemNFT...");
    const mintFee = ethers.parseEther("100"); // 100 ZEX per mint

    const ZexNFT = await ethers.getContractFactory("ZexAIEcosystemNFT");
    const zexNFT = await ZexNFT.deploy(deployer.address, ZEX_TOKEN_ADDRESS, mintFee);
    await zexNFT.waitForDeployment();

    const nftAddress = await zexNFT.getAddress();
    console.log("✅ ZexAIEcosystemNFT deployed to:", nftAddress);

    // Set Contract URI for OpenSea/Zora
    const defaultContractURI = "ipfs://QmYourZexMetadataHashHere";
    await zexNFT.setContractURI(defaultContractURI);
    console.log("✅ Contract URI set.");

    console.log("\n=======================================================");
    console.log("🎉 ALL DEPLOYMENTS COMPLETE!");
    console.log(`ZEX Token:    ${ZEX_TOKEN_ADDRESS}`);
    console.log(`NFT Contract: ${nftAddress}`);
    console.log("=======================================================\n");
    console.log("👉 Copy these addresses to Web3Context.tsx!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment Failed:", error);
        process.exit(1);
    });
