// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ZexAICollection
 * @dev ERC721A implementation for gas-optimized batch minting of AI NFT Collections.
 * Supports EIP-2981 royalties. Ownership is assigned to the creator (user) by the Factory.
 */
contract ZexAICollection is ERC721A, ERC2981, Ownable {
    using Strings for uint256;

    string private _baseTokenURI;
    string private _contractURIData;

    event BaseURIChanged(string newBaseURI);
    event ContractURIChanged(string newContractURI);
    event BatchMinted(address indexed to, uint256 quantity);

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        uint96 royaltyReceiverFeeNumerator_
    ) ERC721A(name_, symbol_) Ownable(owner_) {
        // Set standard ERC2981 royalty structure for secondary sales (e.g., 500 = 5%)
        // The royalties go straight to the user who created the collection
        _setDefaultRoyalty(owner_, royaltyReceiverFeeNumerator_);
    }

    /**
     * @dev Mints a batch of NFTs to consecutive token IDs. 
     * Gas optimized by ERC721A. Only the collection owner (the user) can mint.
     * @param to Address to receive the NFTs
     * @param quantity Number of NFTs to mint
     */
    function mintBatch(address to, uint256 quantity) external onlyOwner {
        require(quantity > 0, "Quantity must be > 0");
        _mint(to, quantity);
        emit BatchMinted(to, quantity);
    }

    // --- Metadata URIs ---

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Sets the base URI for all tokens. Ex: "ipfs://QmYourHash/"
     */
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }

    /**
     * @dev OpenSea contract metadata URI
     */
    function setContractURI(string calldata newContractURI) external onlyOwner {
        _contractURIData = newContractURI;
        emit ContractURIChanged(newContractURI);
    }

    function contractURI() public view returns (string memory) {
        return _contractURIData;
    }

    /**
     * @dev Override tokenURI to append ".json" as is standard for IPFS folders
     */
    function tokenURI(uint256 tokenId) public view virtual override(ERC721A) returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        string memory baseURI = _baseURI();
        return bytes(baseURI).length != 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json")) : "";
    }

    // --- Royalty Interface ---

    /**
     * @dev Supports mapping for ERC721A and ERC2981
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721A, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
