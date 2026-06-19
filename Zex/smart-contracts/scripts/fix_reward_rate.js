const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Fixing Reward Rate decimals from account:", deployer.address);

    const STAKING_ADDRESS = "0x489e0a853C051684C680b431e0737fA5ba84335a";

    const STAKING_ABI = [
        "function setRewardRate(uint256 _rewardRate) external",
        "function rewardRate() view returns (uint256)"
    ];

    const stakingContract = await ethers.getContractAt(STAKING_ABI, STAKING_ADDRESS, deployer);
    
    // We want 100 ZEX per second. ZEX has 18 decimals.
    // So 100 ZEX = 100 * 10^18 wei.
    const actualRewardRate = ethers.parseEther("100");
    
    console.log(`Setting Reward Rate to ${actualRewardRate.toString()} (100 ZEX/sec)...`);
    const tx = await stakingContract.setRewardRate(actualRewardRate);
    await tx.wait();

    const newRate = await stakingContract.rewardRate();
    console.log("✅ Reward Rate fixed at:", ethers.formatEther(newRate), "ZEX/sec");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
