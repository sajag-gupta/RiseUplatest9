// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RiseUpNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    // Content types supported by the platform
    enum ContentType { SONG, VIDEO, MERCH, EVENT, ARTWORK }

    struct NFTMetadata {
        ContentType contentType;
        address creator;
        address platform;
        uint256 royaltyPercentage; // in basis points (e.g., 500 = 5%)
        uint256 platformFee; // in basis points (e.g., 250 = 2.5%)
        string contentHash; // IPFS hash of the actual content
        uint256 originalContentId; // Reference to platform content ID
        bool isListed;
        uint256 price;
        uint256 auctionEndTime;
        address highestBidder;
        uint256 highestBid;
    }

    // Mapping from token ID to metadata
    mapping(uint256 => NFTMetadata) public nftMetadata;

    // Platform fee recipient
    address public platformWallet;

    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, ContentType contentType, string tokenURI);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 amount);

    constructor(address _platformWallet) ERC721("RiseUp NFT", "RUP") Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    // Mint new NFT
    function mintNFT(
        address to,
        string memory _tokenURI,
        ContentType contentType,
        uint256 royaltyPercentage,
        uint256 platformFee,
        string memory contentHash,
        uint256 originalContentId
    ) public returns (uint256) {
        require(royaltyPercentage <= 10000, "Royalty too high"); // Max 100%
        require(platformFee <= 10000, "Platform fee too high"); // Max 100%

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        nftMetadata[tokenId] = NFTMetadata({
            contentType: contentType,
            creator: msg.sender,
            platform: platformWallet,
            royaltyPercentage: royaltyPercentage,
            platformFee: platformFee,
            contentHash: contentHash,
            originalContentId: originalContentId,
            isListed: false,
            price: 0,
            auctionEndTime: 0,
            highestBidder: address(0),
            highestBid: 0
        });

        emit NFTMinted(tokenId, msg.sender, contentType, _tokenURI);
        return tokenId;
    }

    // List NFT for sale
    function listNFT(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(price > 0, "Price must be greater than 0");

        nftMetadata[tokenId].isListed = true;
        nftMetadata[tokenId].price = price;

        emit NFTListed(tokenId, price);
    }

    // Buy NFT
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        NFTMetadata storage metadata = nftMetadata[tokenId];
        require(metadata.isListed, "NFT not listed");
        require(msg.value >= metadata.price, "Insufficient payment");

        address seller = ownerOf(tokenId);
        uint256 price = metadata.price;

        // Calculate fees
        uint256 platformAmount = (price * metadata.platformFee) / 10000;
        uint256 royaltyAmount = (price * metadata.royaltyPercentage) / 10000;
        uint256 sellerAmount = price - platformAmount - royaltyAmount;

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Reset listing
        metadata.isListed = false;
        metadata.price = 0;

        // Transfer payments
        payable(platformWallet).transfer(platformAmount);
        payable(metadata.creator).transfer(royaltyAmount);
        payable(seller).transfer(sellerAmount);

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit NFTPurchased(tokenId, msg.sender, seller, price);
    }

    // Start auction
    function startAuction(uint256 tokenId, uint256 startingPrice, uint256 duration) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");

        NFTMetadata storage metadata = nftMetadata[tokenId];
        metadata.isListed = true;
        metadata.price = startingPrice;
        metadata.auctionEndTime = block.timestamp + duration;
        metadata.highestBid = 0;
        metadata.highestBidder = address(0);
    }

    // Place bid
    function placeBid(uint256 tokenId) public payable nonReentrant {
        NFTMetadata storage metadata = nftMetadata[tokenId];
        require(metadata.isListed, "NFT not in auction");
        require(block.timestamp < metadata.auctionEndTime, "Auction ended");
        require(msg.value > metadata.highestBid, "Bid too low");

        // Refund previous bidder
        if (metadata.highestBidder != address(0)) {
            payable(metadata.highestBidder).transfer(metadata.highestBid);
        }

        metadata.highestBidder = msg.sender;
        metadata.highestBid = msg.value;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    // End auction
    function endAuction(uint256 tokenId) public nonReentrant {
        NFTMetadata storage metadata = nftMetadata[tokenId];
        require(metadata.isListed, "NFT not in auction");
        require(block.timestamp >= metadata.auctionEndTime, "Auction not ended");
        require(metadata.highestBidder != address(0), "No bids placed");

        address seller = ownerOf(tokenId);
        uint256 finalPrice = metadata.highestBid;

        // Calculate fees
        uint256 platformAmount = (finalPrice * metadata.platformFee) / 10000;
        uint256 royaltyAmount = (finalPrice * metadata.royaltyPercentage) / 10000;
        uint256 sellerAmount = finalPrice - platformAmount - royaltyAmount;

        // Transfer NFT
        _transfer(seller, metadata.highestBidder, tokenId);

        // Reset auction data
        metadata.isListed = false;
        metadata.price = 0;
        metadata.auctionEndTime = 0;
        metadata.highestBid = 0;
        metadata.highestBidder = address(0);

        // Transfer payments
        payable(platformWallet).transfer(platformAmount);
        payable(metadata.creator).transfer(royaltyAmount);
        payable(seller).transfer(sellerAmount);

        emit AuctionEnded(tokenId, metadata.highestBidder, finalPrice);
    }

    // Get NFT metadata
    function getNFTMetadata(uint256 tokenId) public view returns (NFTMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftMetadata[tokenId];
    }

    // Update platform wallet
    function updatePlatformWallet(address newWallet) public onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }

    // Override functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
