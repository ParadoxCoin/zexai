const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying ZexStaking Contract with the account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // TODO: Replace with your actual ZEX Token address deployed on the network
    const ZEX_TOKEN_ADDRESS = process.env.VITE_ZEX_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";

    // In this ecosystem, ZEX token is used for both staking and rewards.
    const REWARD_TOKEN_ADDRESS = ZEX_TOKEN_ADDRESS;

    if (ZEX_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
        console.warn("\n⚠️ WARNING: You are deploying with a zero address for the token!");
        console.warn("Please update the ZEX_TOKEN_ADDRESS variable in deploy_staking.js before Mainnet deployment.\n");
    }

    console.log(`\nStaking Token: ${ZEX_TOKEN_ADDRESS}`);
    console.log(`Reward Token:  ${REWARD_TOKEN_ADDRESS}`);

    console.log("\nDeploying ZexStaking...");
    const ZexStaking = await ethers.getContractFactory("ZexStaking");

    // Constructor requires: stakingToken address, rewardToken address
    const staking = await ZexStaking.deploy(ZEX_TOKEN_ADDRESS, REWARD_TOKEN_ADDRESS);
    await staking.waitForDeployment();

    const stakingAddress = await staking.getAddress();
    console.log("✅ ZexStaking deployed to:", stakingAddress);

    console.log("\n=======================================================");
    console.log("🎉 Staking Deployment Successful!");
    console.log(`Staking Contract Address: ${stakingAddress}`);
    console.log("=======================================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Staking Deployment Failed:", error);
        process.exit(1);
    });
