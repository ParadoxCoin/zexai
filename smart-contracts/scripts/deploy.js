const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Get deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH/MATIC");

    // ========== 1. Deploy $ZEX Token ==========
    console.log("\nDeploying ZexToken...");
    const ZexToken = await ethers.getContractFactory("ZexToken");
    const zexToken = await ZexToken.deploy(deployer.address);
    await zexToken.waitForDeployment();

    const zexAddress = await zexToken.getAddress();
    console.log("✅ ZexToken deployed to:", zexAddress);

    // ========== 2. Deploy ZexAIEcosystemNFT ==========
    console.log("\nDeploying ZexAIEcosystemNFT...");
    const mintFee = ethers.parseEther("100"); // 100 ZEX per mint

    const ZexNFT = await ethers.getContractFactory("ZexAIEcosystemNFT");
    const zexNFT = await ZexNFT.deploy(deployer.address, zexAddress, mintFee);
    await zexNFT.waitForDeployment();

    const nftAddress = await zexNFT.getAddress();
    console.log("✅ ZexAIEcosystemNFT deployed to:", nftAddress);

    // ========== 3. Set Collection URI for OpenSea/Zora ==========
    const defaultContractURI = "ipfs://QmYourZexMetadataHashHere";
    await zexNFT.setContractURI(defaultContractURI);
    console.log("✅ Contract URI set to:", defaultContractURI);

    // ========== Summary ==========
    console.log("\n=======================================================");
    console.log("🎉 Deployment Successful!");
    console.log(`ZEX Token Address:  ${zexAddress}`);
    console.log(`NFT Contract Address: ${nftAddress}`);
    console.log("=======================================================\n");
    console.log("👉 Copy these addresses to your Web3Context.tsx file!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment Failed:", error);
        process.exit(1);
    });
