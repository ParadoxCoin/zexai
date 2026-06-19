// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBurnableERC20 is IERC20 {
    function burn(uint256 amount) external;
}

contract ZexStaking is ReentrancyGuard, Ownable {
    IBurnableERC20 public token;

    uint256 public apy = 50; // 50% Annual Percentage Yield
    uint256 public lockupDuration = 30 days;
    uint256 public earlyPenalty = 10; // 10% penalty
    uint256 public constant SECONDS_IN_YEAR = 31536000;

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    struct Staker {
        uint256 balance;
        uint256 lastStakeTime;
        uint256 lockupEndTime;
        uint256 pendingRewards;
        uint256 rewardDebt; // Added for O(1) redistributed penalty bonus
    }

    mapping(address => Staker) public stakers;
    uint256 public totalStaked;
    
    // Global accumulator for redistributed penalty tokens
    uint256 public penaltyAccumulatorPerShare;

    event Staked(address indexed user, uint256 amount, uint256 lockupEndTime);
    event Withdrawn(address indexed user, uint256 amount, uint256 penalty);
    event RewardClaimed(address indexed user, uint256 reward);
    event APYUpdated(uint256 newAPY);

    constructor(address _token) Ownable(msg.sender) {
        token = IBurnableERC20(_token);
    }

    function earned(address account) public view returns (uint256) {
        Staker memory staker = stakers[account];
        if (staker.balance == 0) {
            return staker.pendingRewards;
        }
        
        // 1. Calculate Fixed APY Reward
        uint256 timeStaked = block.timestamp - staker.lastStakeTime;
        uint256 fixedReward = (staker.balance * apy * timeStaked) / (100 * SECONDS_IN_YEAR);
        
        // 2. Calculate Redistributed Bonus Reward
        uint256 bonusReward = (staker.balance * (penaltyAccumulatorPerShare - staker.rewardDebt)) / 1e18;
        
        return staker.pendingRewards + fixedReward + bonusReward;
    }

    modifier updateReward(address account) {
        if (account != address(0)) {
            stakers[account].pendingRewards = earned(account);
            stakers[account].lastStakeTime = block.timestamp;
            stakers[account].rewardDebt = penaltyAccumulatorPerShare;
        }
        _;
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        
        stakers[msg.sender].balance += amount;
        stakers[msg.sender].lockupEndTime = block.timestamp + lockupDuration;
        totalStaked += amount;

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        emit Staked(msg.sender, amount, stakers[msg.sender].lockupEndTime);
    }

    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(stakers[msg.sender].balance >= amount, "Insufficient balance");

        stakers[msg.sender].balance -= amount;
        totalStaked -= amount;

        uint256 penalty = 0;
        if (block.timestamp < stakers[msg.sender].lockupEndTime) {
            penalty = (amount * earlyPenalty) / 100;
        }

        uint256 payout = amount - penalty;

        if (penalty > 0) {
            // Split penalty: 50% burned, 50% redistributed
            uint256 burnAmount = penalty / 2;
            uint256 distAmount = penalty - burnAmount;
            
            token.burn(burnAmount);
            
            // Redistribute to remaining stakers to increase their APY
            if (totalStaked > 0) {
                penaltyAccumulatorPerShare += (distAmount * 1e18) / totalStaked;
            } else {
                // If no one is staking anymore, just burn it all to prevent getting stuck
                token.burn(distAmount);
            }
        }
        
        require(token.transfer(msg.sender, payout), "Payout transfer failed");

        emit Withdrawn(msg.sender, amount, penalty);
    }

    // Legacy support for frontend ABI
    function getReward() external {
        claimReward();
    }

    function claimReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = stakers[msg.sender].pendingRewards;
        require(reward > 0, "No rewards to claim");

        stakers[msg.sender].pendingRewards = 0;
        require(token.transfer(msg.sender, reward), "Reward transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }

    function setAPY(uint256 _apy) external onlyOwner {
        apy = _apy;
        emit APYUpdated(_apy);
    }

    function setLockupDuration(uint256 _days) external onlyOwner {
        lockupDuration = _days * 1 days;
    }

    function getStakerInfo(address account) external view returns (
        uint256 balance,
        uint256 currentEarned,
        uint256 lockupEnd,
        bool isLocked
    ) {
        Staker memory s = stakers[account];
        return (
            s.balance,
            earned(account),
            s.lockupEndTime,
            block.timestamp < s.lockupEndTime
        );
    }

    // Keep legacy view functions for standard ABI frontend compatibility
    function rewardRate() external view returns (uint256) {
        return apy;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return stakers[account].balance;
    }
    
    function totalSupply() external view returns (uint256) {
        return totalStaked;
    }
}
