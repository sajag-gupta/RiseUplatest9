// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RiseUpNFT.sol";

contract RiseUpAdvancedMarketplace is ReentrancyGuard, Ownable {
    RiseUpNFT public nftContract;

    // Collection structure
    struct Collection {
        uint256 id;
        string name;
        string description;
        address creator;
        uint256 createdAt;
        bool isActive;
        uint256[] tokenIds; // NFTs in this collection
    }

    // Advanced listing with filters
    struct AdvancedListing {
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 minPrice;
        uint256 maxPrice;
        string category;
        string[] tags;
        uint256 rarity; // 1-100 scale
        bool isActive;
        uint256 listedAt;
        uint256 collectionId;
    }

    // Price history tracking
    struct PriceHistory {
        uint256 tokenId;
        uint256 price;
        address seller;
        address buyer;
        uint256 timestamp;
        string transactionType; // "sale", "auction", "transfer"
    }

    // Platform fees
    uint256 public platformFee = 250; // 2.5% in basis points
    address public platformWallet;

    // Storage
    mapping(uint256 => Collection) public collections;
    mapping(uint256 => AdvancedListing) public advancedListings;
    mapping(uint256 => PriceHistory[]) public priceHistories;
    mapping(uint256 => uint256) public collectionTokenCount;

    uint256 public nextCollectionId = 1;
    uint256 public nextListingId = 1;

    // Events
    event CollectionCreated(uint256 indexed collectionId, string name, address indexed creator);
    event NFTAddedToCollection(uint256 indexed collectionId, uint256 indexed tokenId);
    event AdvancedListingCreated(uint256 indexed listingId, uint256 indexed tokenId, uint256 price);
    event AdvancedListingUpdated(uint256 indexed listingId, uint256 newPrice);
    event AdvancedListingCancelled(uint256 indexed listingId);
    event NFTSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event PriceHistoryRecorded(uint256 indexed tokenId, uint256 price, string transactionType);

    constructor(address _nftContract, address _platformWallet) Ownable(msg.sender) {
        require(_nftContract != address(0), "Invalid NFT contract");
        require(_platformWallet != address(0), "Invalid platform wallet");

        nftContract = RiseUpNFT(_nftContract);
        platformWallet = _platformWallet;
    }

    // Create new collection
    function createCollection(
        string memory name,
        string memory description
    ) public returns (uint256) {
        uint256 collectionId = nextCollectionId++;

        collections[collectionId] = Collection({
            id: collectionId,
            name: name,
            description: description,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true,
            tokenIds: new uint256[](0)
        });

        emit CollectionCreated(collectionId, name, msg.sender);
        return collectionId;
    }

    // Add NFT to collection
    function addNFTToCollection(uint256 collectionId, uint256 tokenId) public {
        require(collections[collectionId].isActive, "Collection not active");
        require(collections[collectionId].creator == msg.sender, "Not collection creator");
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");

        collections[collectionId].tokenIds.push(tokenId);
        collectionTokenCount[collectionId]++;

        emit NFTAddedToCollection(collectionId, tokenId);
    }

    // Create advanced listing
    function createAdvancedListing(
        uint256 tokenId,
        uint256 price,
        uint256 minPrice,
        uint256 maxPrice,
        string memory category,
        string[] memory tags,
        uint256 rarity,
        uint256 collectionId
    ) public returns (uint256) {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(price > 0, "Price must be greater than 0");
        require(rarity <= 100, "Rarity must be 0-100");

        uint256 listingId = nextListingId++;

        advancedListings[listingId] = AdvancedListing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            minPrice: minPrice,
            maxPrice: maxPrice,
            category: category,
            tags: tags,
            rarity: rarity,
            isActive: true,
            listedAt: block.timestamp,
            collectionId: collectionId
        });

        emit AdvancedListingCreated(listingId, tokenId, price);
        return listingId;
    }

    // Update advanced listing
    function updateAdvancedListing(
        uint256 listingId,
        uint256 newPrice,
        string memory newCategory,
        string[] memory newTags
    ) public {
        AdvancedListing storage listing = advancedListings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender, "Not listing seller");

        listing.price = newPrice;
        listing.category = newCategory;
        listing.tags = newTags;

        emit AdvancedListingUpdated(listingId, newPrice);
    }

    // Cancel advanced listing
    function cancelAdvancedListing(uint256 listingId) public {
        AdvancedListing storage listing = advancedListings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender, "Not listing seller");

        listing.isActive = false;

        emit AdvancedListingCancelled(listingId);
    }

    // Buy NFT from advanced listing
    function buyFromAdvancedListing(uint256 listingId) public payable nonReentrant {
        AdvancedListing storage listing = advancedListings[listingId];
        require(listing.isActive, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        uint256 price = listing.price;
        uint256 tokenId = listing.tokenId;

        // Get NFT metadata for royalty calculation
        (, address creator, , uint256 royaltyPercentage, , , , , , , , ) = nftContract.nftMetadata(tokenId);

        // Calculate fees
        uint256 platformAmount = (price * platformFee) / 10000;
        uint256 royaltyAmount = (price * royaltyPercentage) / 10000;
        uint256 sellerAmount = price - platformAmount - royaltyAmount;

        // Transfer NFT
        nftContract.transferFrom(seller, msg.sender, tokenId);

        // Deactivate listing
        listing.isActive = false;

        // Record price history
        _recordPriceHistory(tokenId, price, seller, msg.sender, "sale");

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

    // Bulk operations
    function batchCreateListings(
        uint256[] memory tokenIds,
        uint256[] memory prices,
        string[] memory categories
    ) public returns (uint256[] memory) {
        require(tokenIds.length == prices.length && prices.length == categories.length, "Array length mismatch");

        uint256[] memory listingIds = new uint256[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            listingIds[i] = createAdvancedListing(
                tokenIds[i],
                prices[i],
                0,
                prices[i] * 2,
                categories[i],
                new string[](0),
                50, // Default rarity
                0   // No collection
            );
        }

        return listingIds;
    }

    // Advanced search and filtering
    function getListingsByFilters(
        string memory category,
        uint256 minPrice,
        uint256 maxPrice,
        uint256 minRarity,
        uint256 maxRarity,
        uint256 collectionId,
        uint256 limit,
        uint256 offset
    ) public view returns (AdvancedListing[] memory, uint256) {
        uint256 totalListings = nextListingId - 1;
        uint256 resultCount = 0;

        // First pass: count matching listings
        for (uint256 i = 1; i <= totalListings; i++) {
            AdvancedListing memory listing = advancedListings[i];
            if (_matchesFilters(listing, category, minPrice, maxPrice, minRarity, maxRarity, collectionId)) {
                resultCount++;
            }
        }

        // Second pass: collect matching listings
        AdvancedListing[] memory results = new AdvancedListing[](resultCount > limit ? limit : resultCount);
        uint256 resultIndex = 0;
        uint256 skipCount = 0;

        for (uint256 i = 1; i <= totalListings && resultIndex < results.length; i++) {
            AdvancedListing memory listing = advancedListings[i];
            if (_matchesFilters(listing, category, minPrice, maxPrice, minRarity, maxRarity, collectionId)) {
                if (skipCount >= offset) {
                    results[resultIndex] = listing;
                    resultIndex++;
                } else {
                    skipCount++;
                }
            }
        }

        return (results, resultCount);
    }

    // Get price history for NFT
    function getPriceHistory(uint256 tokenId) public view returns (PriceHistory[] memory) {
        return priceHistories[tokenId];
    }

    // Get collection details
    function getCollection(uint256 collectionId) public view returns (Collection memory) {
        return collections[collectionId];
    }

    // Get NFTs in collection
    function getCollectionNFTs(uint256 collectionId) public view returns (uint256[] memory) {
        return collections[collectionId].tokenIds;
    }

    // Internal helper functions
    function _matchesFilters(
        AdvancedListing memory listing,
        string memory category,
        uint256 minPrice,
        uint256 maxPrice,
        uint256 minRarity,
        uint256 maxRarity,
        uint256 collectionId
    ) internal pure returns (bool) {
        if (!listing.isActive) return false;
        if (bytes(category).length > 0 && keccak256(bytes(listing.category)) != keccak256(bytes(category))) return false;
        if (listing.price < minPrice || listing.price > maxPrice) return false;
        if (listing.rarity < minRarity || listing.rarity > maxRarity) return false;
        if (collectionId > 0 && listing.collectionId != collectionId) return false;
        return true;
    }

    function _recordPriceHistory(
        uint256 tokenId,
        uint256 price,
        address seller,
        address buyer,
        string memory transactionType
    ) internal {
        priceHistories[tokenId].push(PriceHistory({
            tokenId: tokenId,
            price: price,
            seller: seller,
            buyer: buyer,
            timestamp: block.timestamp,
            transactionType: transactionType
        }));

        emit PriceHistoryRecorded(tokenId, price, transactionType);
    }

    // Admin functions
    function updatePlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }

    function updatePlatformWallet(address newWallet) public onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }
}
