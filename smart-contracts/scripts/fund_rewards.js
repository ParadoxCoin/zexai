const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Funding ZexStaking Contract with rewards from account:", deployer.address);

    const ZEX_TOKEN_ADDRESS = "0x65970F056193A468F9C0a90B2e1B205a1a92a885";
    const STAKING_ADDRESS = "0x588D627cC515c80f4Dd8D01319c0D486024C186D";
    const FUND_AMOUNT = "1000000"; // 1 million ZEX to fund the reward pool

    const Token = await ethers.getContractAt("IERC20", ZEX_TOKEN_ADDRESS, deployer);

    console.log(`Approving and transferring ${FUND_AMOUNT} ZEX to Staking Contract...`);
    const amountInWei = ethers.parseEther(FUND_AMOUNT);

    // Transfer tokens to the staking contract to act as the reward pool
    const tx = await Token.transfer(STAKING_ADDRESS, amountInWei);
    await tx.wait();

    console.log("✅ Successfully funded the Reward Pool!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
