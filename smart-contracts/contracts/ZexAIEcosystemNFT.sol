// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ZexAIEcosystemNFT is ERC1155, Ownable {
    using Strings for uint256;

    // The token used for paying mint fees (MANUS Token)
    IERC20 public manusToken;

    // Fixed mint fee in MANUS (e.g. 10 MANUS)
    uint256 public mintFee;

    // Optional treasury address to receive the fees (if not burned or kept in contract)
    address public treasury;

    // To keep track of the current token ID
    uint256 private _currentTokenID = 0;

    // Mapping to store individual URIs per token ID since ERC1155 defaults to a single URI template
    mapping(uint256 => string) private _tokenURIs;

    // Events
    event NFTMinted(address indexed minter, uint256 indexed tokenId, string uri, uint256 amount);
    event MintFeeUpdated(uint256 newFee);
    event TreasuryUpdated(address newTreasury);

    /**
     * @dev Constructor
     * @param initialOwner Address of the contract owner
     * @param _manusTokenAddress Address of the MANUS ERC20 token contract
     * @param _initialMintFee Initial fee required to mint in MANUS (in wei format, e.g. 10 * 10**18)
     */
    constructor(
        address initialOwner, 
        address _manusTokenAddress, 
        uint256 _initialMintFee
    ) ERC1155("") Ownable(initialOwner) {
        manusToken = IERC20(_manusTokenAddress);
        mintFee = _initialMintFee;
        treasury = initialOwner; // Default treasury is owner
    }

    /**
     * @dev Mint a new ZexAI NFT by paying the MANUS fee
     * @param metadataURI The IPFS URI containing the JSON metadata (image url, prompt, maker info)
     * @param amount The number of copies to mint (1 for unique art, >1 for packs/editions)
     */
    function mintWithManus(string memory metadataURI, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 totalCost = mintFee * amount;

        // 1. Transfer MANUS from user to the treasury
        // User MUST have called approve() on the MANUS token contract first
        bool success = manusToken.transferFrom(msg.sender, treasury, totalCost);
        require(success, "MANUS token transfer failed. Check allowance and balance.");

        // 2. Increment token ID and set URI
        _currentTokenID++;
        uint256 newItemId = _currentTokenID;
        _tokenURIs[newItemId] = metadataURI;

        // 3. Mint the ERC1155 NFT
        _mint(msg.sender, newItemId, amount, "");

        emit NFTMinted(msg.sender, newItemId, metadataURI, amount);
    }

    /**
     * @dev Override URI function to return individual URI per token ID
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    // --- Admin Functions ---

    function setMintFee(uint256 newFee) external onlyOwner {
        mintFee = newFee;
        emit MintFeeUpdated(newFee);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setManusToken(address _manusTokenAddress) external onlyOwner {
        manusToken = IERC20(_manusTokenAddress);
    }
}
