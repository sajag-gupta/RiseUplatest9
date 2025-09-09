// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RiseUpNFT.sol";

contract RiseUpRoyalty is ReentrancyGuard, Ownable {
    RiseUpNFT public nftContract;

    // Royalty distribution structure
    struct RoyaltySplit {
        address recipient;
        uint256 percentage; // in basis points (e.g., 500 = 5%)
        bool isActive;
    }

    // Streaming royalty structure
    struct StreamingRoyalty {
        uint256 tokenId;
        address streamer;
        uint256 totalStreams;
        uint256 totalEarnings;
        uint256 lastClaimTime;
        mapping(address => uint256) recipientEarnings;
    }

    // Multi-recipient royalty settings
    mapping(uint256 => RoyaltySplit[]) public royaltySplits;
    mapping(uint256 => uint256) public totalRoyaltyPercentage;

    // Streaming royalties
    mapping(uint256 => StreamingRoyalty) public streamingRoyalties;
    mapping(uint256 => mapping(address => uint256)) public streamCounts;

    // Platform settings
    uint256 public platformFee = 250; // 2.5% in basis points
    address public platformWallet;

    // Events
    event RoyaltySplitSet(uint256 indexed tokenId, address indexed recipient, uint256 percentage);
    event RoyaltyClaimed(uint256 indexed tokenId, address indexed recipient, uint256 amount);
    event StreamingRoyaltyRecorded(uint256 indexed tokenId, address indexed streamer, uint256 streams);
    event StreamingRoyaltyClaimed(uint256 indexed tokenId, address indexed recipient, uint256 amount);

    constructor(address _nftContract, address _platformWallet) Ownable(msg.sender) {
        require(_nftContract != address(0), "Invalid NFT contract");
        require(_platformWallet != address(0), "Invalid platform wallet");

        nftContract = RiseUpNFT(_nftContract);
        platformWallet = _platformWallet;
    }

    // Set multi-recipient royalty splits for an NFT
    function setRoyaltySplits(
        uint256 tokenId,
        address[] memory recipients,
        uint256[] memory percentages
    ) public {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(recipients.length == percentages.length, "Array length mismatch");
        require(recipients.length > 0, "At least one recipient required");

        // Clear existing splits
        delete royaltySplits[tokenId];
        uint256 totalPercentage = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(percentages[i] > 0 && percentages[i] <= 10000, "Invalid percentage");

            royaltySplits[tokenId].push(RoyaltySplit({
                recipient: recipients[i],
                percentage: percentages[i],
                isActive: true
            }));

            totalPercentage += percentages[i];

            emit RoyaltySplitSet(tokenId, recipients[i], percentages[i]);
        }

        require(totalPercentage <= 10000, "Total percentage exceeds 100%");
        totalRoyaltyPercentage[tokenId] = totalPercentage;
    }

    // Claim royalties for multiple recipients
    function claimRoyalties(uint256 tokenId) public nonReentrant {
        RoyaltySplit[] memory splits = royaltySplits[tokenId];
        require(splits.length > 0, "No royalty splits set");

        // Get contract balance (royalties accumulated)
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No royalties to claim");

        for (uint256 i = 0; i < splits.length; i++) {
            if (splits[i].isActive) {
                uint256 recipientAmount = (contractBalance * splits[i].percentage) / 10000;

                if (recipientAmount > 0) {
                    payable(splits[i].recipient).transfer(recipientAmount);
                    emit RoyaltyClaimed(tokenId, splits[i].recipient, recipientAmount);
                }
            }
        }
    }

    // Record streaming data for royalties
    function recordStreamingRoyalty(
        uint256 tokenId,
        address streamer,
        uint256 streams,
        uint256 earnings
    ) public onlyOwner {
        StreamingRoyalty storage royalty = streamingRoyalties[tokenId];

        if (royalty.tokenId == 0) {
            // Initialize streaming royalty
            royalty.tokenId = tokenId;
            royalty.streamer = streamer;
        }

        royalty.totalStreams += streams;
        royalty.totalEarnings += earnings;

        // Distribute earnings to recipients
        RoyaltySplit[] memory splits = royaltySplits[tokenId];
        if (splits.length > 0) {
            for (uint256 i = 0; i < splits.length; i++) {
                if (splits[i].isActive) {
                    uint256 recipientEarnings = (earnings * splits[i].percentage) / 10000;
                    royalty.recipientEarnings[splits[i].recipient] += recipientEarnings;
                }
            }
        }

        emit StreamingRoyaltyRecorded(tokenId, streamer, streams);
    }

    // Claim streaming royalties
    function claimStreamingRoyalties(uint256 tokenId) public nonReentrant {
        StreamingRoyalty storage royalty = streamingRoyalties[tokenId];
        require(royalty.tokenId != 0, "No streaming royalties");

        uint256 claimableAmount = royalty.recipientEarnings[msg.sender];
        require(claimableAmount > 0, "No earnings to claim");

        royalty.recipientEarnings[msg.sender] = 0;
        royalty.lastClaimTime = block.timestamp;

        payable(msg.sender).transfer(claimableAmount);

        emit StreamingRoyaltyClaimed(tokenId, msg.sender, claimableAmount);
    }

    // Get royalty splits for an NFT
    function getRoyaltySplits(uint256 tokenId) public view returns (RoyaltySplit[] memory) {
        return royaltySplits[tokenId];
    }

    // Get streaming royalty info
    function getStreamingRoyalty(uint256 tokenId) public view returns (
        uint256 totalStreams,
        uint256 totalEarnings,
        uint256 lastClaimTime,
        uint256 claimableAmount
    ) {
        StreamingRoyalty storage royalty = streamingRoyalties[tokenId];
        uint256 claimable = royalty.recipientEarnings[msg.sender];

        return (
            royalty.totalStreams,
            royalty.totalEarnings,
            royalty.lastClaimTime,
            claimable
        );
    }

    // Calculate royalty amount for a sale
    function calculateRoyalty(uint256 tokenId, uint256 salePrice) public view returns (
        address[] memory recipients,
        uint256[] memory amounts
    ) {
        RoyaltySplit[] memory splits = royaltySplits[tokenId];
        if (splits.length == 0) {
            // Fallback to original NFT royalty
            (, address creator, , uint256 royaltyPercentage, , , , , , , , ) = nftContract.nftMetadata(tokenId);
            recipients = new address[](1);
            amounts = new uint256[](1);
            recipients[0] = creator;
            amounts[0] = (salePrice * royaltyPercentage) / 10000;
            return (recipients, amounts);
        }

        recipients = new address[](splits.length);
        amounts = new uint256[](splits.length);

        for (uint256 i = 0; i < splits.length; i++) {
            if (splits[i].isActive) {
                recipients[i] = splits[i].recipient;
                amounts[i] = (salePrice * splits[i].percentage) / 10000;
            }
        }

        return (recipients, amounts);
    }

    // Distribute royalties from sale
    function distributeRoyalties(uint256 tokenId, uint256 salePrice) public payable nonReentrant {
        (address[] memory recipients, uint256[] memory amounts) = calculateRoyalty(tokenId, salePrice);

        uint256 totalRoyalty = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalRoyalty += amounts[i];
        }

        require(msg.value >= totalRoyalty, "Insufficient royalty payment");

        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0) {
                payable(recipients[i]).transfer(amounts[i]);
                emit RoyaltyClaimed(tokenId, recipients[i], amounts[i]);
            }
        }

        // Refund excess
        if (msg.value > totalRoyalty) {
            payable(msg.sender).transfer(msg.value - totalRoyalty);
        }
    }

    // Update platform settings
    function updatePlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }

    function updatePlatformWallet(address newWallet) public onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }

    // Emergency functions
    function emergencyWithdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Receive function to accept royalty payments
    receive() external payable {}
}
