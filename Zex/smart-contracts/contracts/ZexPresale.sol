// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBurnableERC20 is IERC20 {
    function burn(uint256 amount) external;
}

/**
 * @title ZexPresale
 * @dev ICO Contract handling direct POL to ZEX purchases.
 * Features an innovative 15% penalty Buyback (Refund) option for early exiters, 
 * destroying the penalized ZEX completely to enforce deflation.
 */
contract ZexPresale is Ownable, ReentrancyGuard {
    IBurnableERC20 public zexToken;

    bool public presaleActive;
    
    // Limits & Tracking
    uint256 public constant MAX_PRIVATE_SALE_POOL = 10_000_000 * 10**18;
    uint256 public totalZexSold;

    // Fixed Presale Rates (assuming 1 POL = $1 for simplicity)
    uint256 public constant PRIVATE_SALE_RATE = 333; // 1 POL = 333 ZEX ($0.003)
    uint256 public constant PUBLIC_SALE_RATE = 200;  // 1 POL = 200 ZEX ($0.005)

    uint256 public penaltyPercent = 15; // 15% penalty for early refunds

    struct Contribution {
        uint256 zexPurchased;
        uint256 polSpent;
    }

    mapping(address => Contribution) public contributions;

    event TokensPurchased(address indexed buyer, uint256 polAmount, uint256 zexAmount);
    event TokensRefunded(address indexed seller, uint256 zexReturned, uint256 polRefunded, uint256 zexBurned);
    event PresaleStateChanged(bool isActive);

    constructor(address _zexToken) Ownable(msg.sender) {
        zexToken = IBurnableERC20(_zexToken);
    }

    function togglePresale(bool _active) external onlyOwner {
        presaleActive = _active;
        emit PresaleStateChanged(_active);
    }

    /**
     * @dev Buy ZEX tokens directly using Native network coin (POL or MATIC)
     */
    receive() external payable {
        buyTokens();
    }

    function buyTokens() public payable nonReentrant {
        require(presaleActive, "Presale is not active");
        require(msg.value > 0, "Must send POL");

        // Determine which phase we are in (Private vs Public) based on tokens sold
        uint256 rate = (totalZexSold < MAX_PRIVATE_SALE_POOL) ? PRIVATE_SALE_RATE : PUBLIC_SALE_RATE;
        
        // Calculate ZEX to mint/send
        uint256 zexAmount = msg.value * rate;

        require(
            zexToken.balanceOf(address(this)) >= zexAmount,
            "Insufficient ZEX left in presale contract"
        );

        // Update tracking states BEFORE external transfer
        totalZexSold += zexAmount;
        contributions[msg.sender].zexPurchased += zexAmount;
        contributions[msg.sender].polSpent += msg.value;

        // Immediately transfer ZEX to the buyer
        require(zexToken.transfer(msg.sender, zexAmount), "Token transfer failed");

        emit TokensPurchased(msg.sender, msg.value, zexAmount);
    }

    /**
     * @dev The revolutionary 15% penalty refund/buyback feature.
     * Allows anyone to exit their ICO position before listing, but burns 15% to create deflation.
     */
    function refund(uint256 zexAmount) external nonReentrant {
        require(presaleActive, "Refunds only allowed while Presale is active");
        require(zexAmount > 0, "Amount must be > 0");
        require(contributions[msg.sender].zexPurchased >= zexAmount, "Cannot refund more than acquired here");

        // Calculate Average Price Paid: Proportion of POL to refund = (zexAmount / totalZexPurchased) * totalPolSpent
        uint256 polToRefundFull = (contributions[msg.sender].polSpent * zexAmount) / contributions[msg.sender].zexPurchased;

        // Calculate 15% penalty on the POL and the ZEX
        uint256 polToRefund = (polToRefundFull * (100 - penaltyPercent)) / 100;
        uint256 zexToBurn = (zexAmount * penaltyPercent) / 100;
        
        // Update user state BEFORE external calls
        contributions[msg.sender].zexPurchased -= zexAmount;
        contributions[msg.sender].polSpent -= polToRefundFull;

        // Substract from total sold so the remaining unburned part can be bought by others
        totalZexSold -= zexAmount;

        // The user must have approved this contract to take the ZEX back
        require(zexToken.transferFrom(msg.sender, address(this), zexAmount), "Failed to return ZEX. Ensure allowance is set.");

        // Burn the penalty portion natively from the smart contract balance (Kara Delik / Blackhole)
        zexToken.burn(zexToBurn);

        // Send the POL refund back to the user
        (bool success, ) = payable(msg.sender).call{value: polToRefund}("");
        require(success, "POL refund failed");

        emit TokensRefunded(msg.sender, zexAmount, polToRefund, zexToBurn);
    }

    /**
     * @dev Allows the owner to withdraw the collected POL funds (the 100% minus refunds, and the 15% penalty POL margins remain in balance).
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Fund withdrawal failed");
    }

    /**
     * @dev Withdraw unsold tokens (or remaining after presale concludes).
     */
    function retrieveUnsoldTokens() external onlyOwner {
        uint256 balance = zexToken.balanceOf(address(this));
        require(balance > 0, "No ZEX left");
        require(zexToken.transfer(owner(), balance), "Token retrieval failed");
    }
}
