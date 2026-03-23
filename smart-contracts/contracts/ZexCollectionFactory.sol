// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ZexAICollection.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ZexCollectionFactory
 * @dev Factory pattern contract for deploying user-owned ERC721A Collections.
 * Charges a hybrid ZEX token fee: Base Fee + Per-NFT Capacity Fee.
 */
contract ZexCollectionFactory is Ownable {
    IERC20 public zexToken;
    address public treasury;

    // Fees in ZEX Token (18 decimals)
    // Hybrid pricing: 250 ZEX base + 25 ZEX per NFT
    uint256 public baseFee = 250 * 10**18;
    uint256 public perNftFee = 25 * 10**18;

    event CollectionCreated(
        address indexed owner, 
        address collectionAddress, 
        string name, 
        string symbol, 
        uint256 maxSupply,
        uint96 royaltyBps
    );
    event FeesUpdated(uint256 newBaseFee, uint256 newPerNftFee);
    event TreasuryUpdated(address newTreasury);

    constructor(address _zexToken, address _treasury) Ownable(msg.sender) {
        zexToken = IERC20(_zexToken);
        treasury = _treasury;
    }

    /**
     * @dev Creates a new ERC721A collection.
     * User pays the ZEX fee and immediately receives ownership of the new contract.
     * @param name Name of the collection
     * @param symbol Symbol of the collection
     * @param maxSupply Total size of the collection the user plans to generate
     * @param royaltyBasisPoints EIP-2981 royalty percentage (e.g., 500 = 5%)
     */
    function createCollection(
        string memory name, 
        string memory symbol, 
        uint256 maxSupply,
        uint96 royaltyBasisPoints
    ) external returns (address) {
        require(maxSupply > 0, "Supply must be > 0");
        require(royaltyBasisPoints <= 10000, "Royalty cannot exceed 100%");

        // 1. Calculate ZEX Fee
        uint256 totalCost = baseFee + (perNftFee * maxSupply);

        // 2. Transfer ZEX from user directly to Treasury
        // Note: The ZexToken's built-in 5% deflationary tax will automatically apply 
        // to this transfer, sending 2.5% to Staking and burning 2.5%.
        // The user must have approved the Factory to spend `totalCost` amount of ZEX.
        bool success = zexToken.transferFrom(msg.sender, treasury, totalCost);
        require(success, "ZEX fee transfer failed");

        // 3. Deploy the new ERC721A collection 
        // We pass msg.sender as the owner so the user has full control to set URIs and mint
        ZexAICollection newCollection = new ZexAICollection(
            name,
            symbol,
            msg.sender,
            royaltyBasisPoints
        );

        emit CollectionCreated(
            msg.sender, 
            address(newCollection), 
            name, 
            symbol, 
            maxSupply, 
            royaltyBasisPoints
        );

        return address(newCollection);
    }

    // --- Admin Functions ---

    function updateFees(uint256 _newBaseFee, uint256 _newPerNftFee) external onlyOwner {
        baseFee = _newBaseFee;
        perNftFee = _newPerNftFee;
        emit FeesUpdated(_newBaseFee, _newPerNftFee);
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid address");
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    function setZexToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Invalid address");
        zexToken = IERC20(_newToken);
    }
}
