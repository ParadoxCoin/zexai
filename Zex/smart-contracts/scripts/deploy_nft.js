const { ethers } = require("hardhat");

// ✅ V3 ZexToken deployed address (1 Billion supply - Polygon Mainnet)
const ZEX_TOKEN_ADDRESS = "0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying NFT contract with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "POL");

    // Deploy ZexAIEcosystemNFT using the V3 ZEX token address
    console.log("\nDeploying ZexAIEcosystemNFT (V3)...");
    const mintFee = ethers.parseEther("100"); // 100 ZEX per mint

    const ZexNFT = await ethers.getContractFactory("ZexAIEcosystemNFT");
    const zexNFT = await ZexNFT.deploy(deployer.address, ZEX_TOKEN_ADDRESS, mintFee);
    await zexNFT.waitForDeployment();

    const nftAddress = await zexNFT.getAddress();
    console.log("✅ ZexAIEcosystemNFT V3 deployed to:", nftAddress);

    // Exclude NFT contract from the 5% Transfer Tax to prevent double-taxation during mint
    console.log("\nExcluding NFT contract from 5% Transfer Tax...");
    const tokenABI = ["function setExcludeFromFee(address account, bool excluded) external"];
    const tokenContract = new ethers.Contract(ZEX_TOKEN_ADDRESS, tokenABI, deployer);
    await tokenContract.setExcludeFromFee(nftAddress, true);
    console.log("✅ NFT contract excluded from transfer tax.");

    // Set Contract URI for OpenSea/Zora
    const defaultContractURI = "ipfs://QmYourZexMetadataHashHere";
    await zexNFT.setContractURI(defaultContractURI);
    console.log("✅ Contract URI set.");

    console.log("\n=======================================================");
    console.log("🎉 NFT V3 DEPLOYMENT COMPLETE!");
    console.log(`ZEX Token (V3): ${ZEX_TOKEN_ADDRESS}`);
    console.log(`NFT Contract:   ${nftAddress}`);
    console.log("=======================================================\n");
    console.log("👉 UPDATE Web3Context.tsx with the new NFT address!");
    console.log(`   export const ZEXAI_NFT_ADDRESS = "${nftAddress}";`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment Failed:", error);
        process.exit(1);
    });
