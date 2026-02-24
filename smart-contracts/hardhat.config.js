require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        // Basic config for later deploying to Polygon Amoy/Mainnet
        // polygonAmoy: {
        //   url: process.env.AMOY_RPC_URL || "",
        //   accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        // }
    }
};
