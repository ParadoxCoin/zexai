// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ZexVesting
 * @dev Highly secure and transparent vesting contract for ZexAI Ecosystem.
 * Allows tracking linear unlocks after a cliff period for Team, Advisors, and Marketing.
 */
contract ZexVesting is Ownable, ReentrancyGuard {
    IERC20 public immutable zexToken;

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 amountReleased;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        bool isRevocable;
        bool revoked;
    }

    mapping(address => VestingSchedule) public vestingSchedules;
    uint256 public totalVestingAmount;

    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 amountRefunded);

    constructor(address _zexToken) Ownable(msg.sender) {
        require(_zexToken != address(0), "Invalid token address");
        zexToken = IERC20(_zexToken);
    }

    /**
     * @dev Creates a new vesting schedule for a beneficiary.
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool isRevocable
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule already exists");
        require(vestingDuration > 0, "Vesting duration must be > 0");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            amountReleased: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            isRevocable: isRevocable,
            revoked: false
        });

        totalVestingAmount += amount;

        // Ensure the contract actually holds enough tokens to cover this new schedule
        require(
            zexToken.balanceOf(address(this)) >= totalVestingAmount,
            "Contract does not have enough tokens to back this schedule"
        );

        emit VestingScheduleCreated(beneficiary, amount, startTime, cliffDuration, vestingDuration);
    }

    /**
     * @dev Calculates the vested amount that has been unlocked so far.
     */
    function vestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        if (schedule.totalAmount == 0) {
            return 0; // No schedule
        }
        
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0; // Still in cliff
        } else if (
            block.timestamp >= schedule.startTime + schedule.cliffDuration + schedule.vestingDuration || 
            schedule.revoked
        ) {
            return schedule.totalAmount; // Fully vested or revoked (capped at what was vested before revocation)
        } else {
            // Linear vesting
            uint256 timePassed = block.timestamp - (schedule.startTime + schedule.cliffDuration);
            return (schedule.totalAmount * timePassed) / schedule.vestingDuration;
        }
    }

    /**
     * @dev Releases the unlocked tokens to the beneficiary.
     */
    function release() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(!schedule.revoked, "Vesting schedule revoked");

        uint256 vested = vestedAmount(msg.sender);
        uint256 unreleased = vested - schedule.amountReleased;

        require(unreleased > 0, "No tokens are due to be released");

        schedule.amountReleased += unreleased;
        totalVestingAmount -= unreleased;

        require(zexToken.transfer(msg.sender, unreleased), "Token transfer failed");

        emit TokensReleased(msg.sender, unreleased);
    }

    /**
     * @dev Revokes the vesting schedule, retaining unvested tokens for the owner.
     */
    function revoke(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(schedule.isRevocable, "Vesting is not revocable");
        require(!schedule.revoked, "Already revoked");

        uint256 vested = vestedAmount(beneficiary);
        uint256 refund = schedule.totalAmount - vested;

        schedule.revoked = true;
        // The total amount is adjusted to what they actually earned
        schedule.totalAmount = vested;
        
        // Remove unvested part from total liabilities
        totalVestingAmount -= refund;

        // Refund unvested tokens to the owner
        require(zexToken.transfer(owner(), refund), "Token refund transfer failed");

        emit VestingRevoked(beneficiary, refund);
    }
}
