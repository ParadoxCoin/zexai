const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing withdraw with penalty for account:", deployer.address);

    const STAKING_ADDRESS = "0x588D627cC515c80f4Dd8D01319c0D486024C186D";
    const STAKING_ABI = [
        "function withdraw(uint256 amount) external",
        "function stake(uint256 amount) external",
        "function getStakerInfo(address account) external view returns (uint256 balance, uint256 currentEarned, uint256 lockupEnd, bool isLocked)"
    ];

    const stakingContract = await ethers.getContractAt(STAKING_ABI, STAKING_ADDRESS, deployer);
    
    const info = await stakingContract.getStakerInfo(deployer.address);
    console.log("Current Staker Info:", info.balance.toString(), "isLocked:", info.isLocked);

    if (info.balance > 0n) {
        console.log("Attempting to withdraw 1 wei to test penalty...");
        try {
            const tx = await stakingContract.withdraw(100n);
            const receipt = await tx.wait();
            console.log("✅ Withdraw succeeded! TxHash:", receipt.hash);
        } catch (e) {
            console.error("❌ Withdraw failed:", e.message);
        }
    } else {
        console.log("No balance to withdraw.");
    }
}

main().catch(console.error);
