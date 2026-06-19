const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Triggering Reward Epoch from account:", deployer.address);

    const STAKING_ADDRESS = "0x489e0a853C051684C680b431e0737fA5ba84335a";

    // Standard ERC20 ABI has no setRewardRate, we must use the Staking ABI...
    const STAKING_ABI = [
        "function setRewardRate(uint256 _rewardRate) external",
        "function rewardRate() view returns (uint256)"
    ];

    const stakingContract = await ethers.getContractAt(STAKING_ABI, STAKING_ADDRESS, deployer);
    
    // We already have 100 as the rate, but resetting it triggers the `updateReward` 
    // modifier which syncs `lastUpdateTime` to `block.timestamp` and unlocks the yield.
    console.log(`Setting new Reward Rate to kickstart the Yield Engine...`);
    const tx = await stakingContract.setRewardRate(100);
    await tx.wait();

    const newRate = await stakingContract.rewardRate();
    console.log("✅ Reward Rate synced at:", newRate.toString(), "ZEX/sec");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
