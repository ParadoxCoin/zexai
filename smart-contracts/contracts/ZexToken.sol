// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZexToken
 * @dev ERC20 Token for the ZexAI Ecosystem.
 * Used for generative AI API payments and utility within the platform.
 */
contract ZexToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    // V3 Transfer Tax: 0.5% (5 basis points out of 1000)
    uint256 public transferFeeBasisPoints = 5; 
    mapping(address => bool) public isExcludedFromFee;

    constructor(address initialOwner) ERC20("ZexToken", "ZEX") Ownable(initialOwner) {
        // Exclude owner/deployer from fee
        isExcludedFromFee[initialOwner] = true;
        isExcludedFromFee[address(this)] = true;
        
        _mint(initialOwner, MAX_SUPPLY);
    }

    function setExcludeFromFee(address account, bool excluded) external onlyOwner {
        isExcludedFromFee[account] = excluded;
    }

    function setTransferFee(uint256 basisPoints) external onlyOwner {
        require(basisPoints <= 100, "Tax cannot exceed 10%");
        transferFeeBasisPoints = basisPoints;
    }

    // Override the core openzeppelin v5 _update function to apply deflationary burn
    function _update(address from, address to, uint256 value) internal virtual override {
        // If minting, burning, or either sender/receiver is whitelisted, do normal transfer
        if (from == address(0) || to == address(0) || isExcludedFromFee[from] || isExcludedFromFee[to]) {
            super._update(from, to, value);
        } else {
            // Apply 0.5% Burn Penalty on all normal transfers
            uint256 burnAmount = (value * transferFeeBasisPoints) / 1000;
            uint256 sendAmount = value - burnAmount;
            
            if (burnAmount > 0) {
                // Burn the tokens from sender (updates total supply and emits transfer to 0x0)
                super._update(from, address(0), burnAmount);
            }
            
            // Transfer the remaining amount to receiver
            super._update(from, to, sendAmount);
        }
    }
}
