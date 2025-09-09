// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RiseUpNFT.sol";

contract RiseUpMarketplace is ReentrancyGuard, Ownable {
    RiseUpNFT public nftContract;

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 listedAt;
    }

    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool isActive;
        uint256 startedAt;
    }

    // Platform fees
    uint256 public platformFee = 250; // 2.5% in basis points
    address public platformWallet;

    // Listings and auctions
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;

    // Events
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event NFTUnlisted(uint256 indexed tokenId, address indexed seller);
    event AuctionStarted(uint256 indexed tokenId, address indexed seller, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 amount);

    constructor(address _nftContract, address _platformWallet) Ownable(msg.sender) {
        require(_nftContract != address(0), "Invalid NFT contract address");
        require(_platformWallet != address(0), "Invalid platform wallet");

        nftContract = RiseUpNFT(_nftContract);
        platformWallet = _platformWallet;
    }

    // List NFT for sale
    function listNFT(uint256 tokenId, uint256 price) public nonReentrant {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(price > 0, "Price must be greater than 0");
        require(!listings[tokenId].isActive, "Already listed");
        require(!auctions[tokenId].isActive, "In auction");

        // Transfer NFT to marketplace
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            isActive: true,
            listedAt: block.timestamp
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    // Buy listed NFT
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.isActive, "NFT not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Get NFT metadata for royalty calculation
        (, address creator, , uint256 royaltyPercentage, , , , , , , , ) = nftContract.nftMetadata(tokenId);

        // Calculate fees
        uint256 platformAmount = (price * platformFee) / 10000;
        uint256 royaltyAmount = (price * royaltyPercentage) / 10000;
        uint256 sellerAmount = price - platformAmount - royaltyAmount;

        // Transfer NFT to buyer
        nftContract.transferFrom(address(this), msg.sender, tokenId);

        // Remove listing
        delete listings[tokenId];

        // Transfer payments
        payable(platformWallet).transfer(platformAmount);
        payable(creator).transfer(royaltyAmount);
        payable(seller).transfer(sellerAmount);

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit NFTSold(tokenId, msg.sender, seller, price);
    }

    // Unlist NFT
    function unlistNFT(uint256 tokenId) public nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.isActive, "NFT not listed");
        require(listing.seller == msg.sender, "Not seller");

        // Transfer NFT back to seller
        nftContract.transferFrom(address(this), msg.sender, tokenId);

        // Remove listing
        delete listings[tokenId];

        emit NFTUnlisted(tokenId, msg.sender);
    }

    // Start auction
    function startAuction(uint256 tokenId, uint256 startingPrice, uint256 duration) public nonReentrant {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(!listings[tokenId].isActive, "Already listed");
        require(!auctions[tokenId].isActive, "Already in auction");

        // Transfer NFT to marketplace
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        auctions[tokenId] = Auction({
            tokenId: tokenId,
            seller: msg.sender,
            startingPrice: startingPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            isActive: true,
            startedAt: block.timestamp
        });

        emit AuctionStarted(tokenId, msg.sender, startingPrice, block.timestamp + duration);
    }

    // Place bid
    function placeBid(uint256 tokenId) public payable nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value >= auction.startingPrice, "Bid below starting price");
        require(msg.value > auction.highestBid, "Bid too low");

        // Refund previous bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    // End auction
    function endAuction(uint256 tokenId) public nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp >= auction.endTime || msg.sender == auction.seller, "Auction not ended");

        address winner = auction.highestBidder;
        uint256 finalPrice = auction.highestBid;

        if (winner != address(0) && finalPrice > 0) {
            // Get NFT metadata for royalty calculation
            (, address creator, , uint256 royaltyPercentage, , , , , , , , ) = nftContract.nftMetadata(tokenId);

            // Calculate fees
            uint256 platformAmount = (finalPrice * platformFee) / 10000;
            uint256 royaltyAmount = (finalPrice * royaltyPercentage) / 10000;
            uint256 sellerAmount = finalPrice - platformAmount - royaltyAmount;

            // Transfer NFT to winner
            nftContract.transferFrom(address(this), winner, tokenId);

            // Transfer payments
            payable(platformWallet).transfer(platformAmount);
            payable(creator).transfer(royaltyAmount);
            payable(auction.seller).transfer(sellerAmount);

            emit AuctionEnded(tokenId, winner, finalPrice);
        } else {
            // No bids, return NFT to seller
            nftContract.transferFrom(address(this), auction.seller, tokenId);
        }

        // Remove auction
        delete auctions[tokenId];
    }

    // Get listing details
    function getListing(uint256 tokenId) public view returns (Listing memory) {
        return listings[tokenId];
    }

    // Get auction details
    function getAuction(uint256 tokenId) public view returns (Auction memory) {
        return auctions[tokenId];
    }

    // Update platform fee
    function updatePlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }

    // Update platform wallet
    function updatePlatformWallet(address newWallet) public onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }

    // Emergency withdraw (only owner)
    function emergencyWithdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
