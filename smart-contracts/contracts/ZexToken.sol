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
    uint256 public constant MIN_SUPPLY = 50_000_000 * 10**18; // Cease deflationary burn below this
    
    // V3 Base Transfer Tax: 0.5% (5 basis points out of 1000)
    uint256 public transferFeeBasisPoints = 5; 
    mapping(address => bool) public isExcludedFromFee;

    // V3 Anti-Whale max tx amount (1% of MAX_SUPPLY)
    uint256 public maxTxAmount = 1_000_000 * 10**18;

    // V3 Staking Rewards / Auto-Liquidity Wallet
    address public stakingRewardWallet;

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

    function setMaxTxAmount(uint256 amount) external onlyOwner {
        maxTxAmount = amount;
    }

    function setStakingRewardWallet(address wallet) external onlyOwner {
        stakingRewardWallet = wallet;
    }

    // Dynamic fee calculation based on shrinking supply
    function getCurrentFeeBasisPoints() public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        if (currentSupply <= MIN_SUPPLY) {
            return 0; // No deflationary fee once min supply is reached
        } else if (currentSupply <= 60_000_000 * 10**18) {
            return 1; // 0.1% (1 basis point)
        } else if (currentSupply <= 75_000_000 * 10**18) {
            return 3; // 0.3% (3 basis points)
        } else {
            return transferFeeBasisPoints; // Base fee (usually 5 = 0.5%)
        }
    }

    // Override the core openzeppelin v5 _update function to apply dynamic deflationary & reward split fee
    function _update(address from, address to, uint256 value) internal virtual override {
        // If minting, burning, or either sender/receiver is whitelisted, do normal transfer
        if (from == address(0) || to == address(0) || isExcludedFromFee[from] || isExcludedFromFee[to]) {
            super._update(from, to, value);
        } else {
            // Anti-Whale Check
            require(value <= maxTxAmount, "Transfer amount exceeds max tx limit");

            // Dynamic Fee Calculation
            uint256 currentFeeBps = getCurrentFeeBasisPoints();
            
            if (currentFeeBps > 0) {
                uint256 feeAmount = (value * currentFeeBps) / 1000;
                uint256 sendAmount = value - feeAmount;
                
                // Split fee: Half to burn, half to staking rewards
                uint256 burnAmount = feeAmount / 2;
                uint256 rewardAmount = feeAmount - burnAmount;
                
                // Burn the tokens from sender
                super._update(from, address(0), burnAmount);
                
                // Send to staking rewards wallet
                if (stakingRewardWallet != address(0)) {
                    super._update(from, stakingRewardWallet, rewardAmount);
                } else {
                    // If no reward wallet is set yet, we just burn the other half too to ensure no unbacked tokens
                    super._update(from, address(0), rewardAmount);
                }
                
                // Transfer the remaining amount to receiver
                super._update(from, to, sendAmount);
            } else {
                // Transfer without fee if supply went under MIN_SUPPLY
                super._update(from, to, value);
            }
        }
    }
}
