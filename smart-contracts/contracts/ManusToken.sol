// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ManusToken
 * @dev ERC20 Token for the ZexAI Ecosystem.
 * Used for generative AI API payments and utility within the platform.
 */
contract ManusToken is ERC20, ERC20Burnable, Ownable {
    // Initial max supply (e.g., 100,000,000 MANUS)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;

    /**
     * @dev Constructor mints the initial supply to the owner (deployer)
     */
    constructor(address initialOwner) ERC20("Manus Token", "MANUS") Ownable(initialOwner) {
        // Mint the entire max supply to the deployer initially
        // In a real scenario, this would be distributed to vesting contracts, a DAO treasury, LP, etc.
        _mint(initialOwner, MAX_SUPPLY);
    }

    /**
     * @dev Overriding mint to ensure we don't exceed MAX_SUPPLY (if we ever want to allow minting)
     * Currently not implemented as initial supply = max supply.
     * But useful if we want a different tokenomics model later.
     */
    // function mint(address to, uint256 amount) public onlyOwner {
    //     require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
    //     _mint(to, amount);
    // }
}
