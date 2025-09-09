// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RiseUpNFT.sol";

contract RiseUpLoyalty is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    RiseUpNFT public nftContract;

    uint256 private _achievementIdCounter;
    uint256 private _pointsTokenIdCounter;

    // Achievement NFT structure
    struct Achievement {
        uint256 id;
        string name;
        string description;
        string category; // "engagement", "creation", "community", "trading"
        uint256 rarity; // 1-5 scale
        uint256 pointsReward;
        bool isActive;
        uint256 totalMinted;
        uint256 maxSupply; // 0 for unlimited
    }

    // User profile structure
    struct UserProfile {
        uint256 totalPoints;
        uint256 level;
        uint256 joinDate;
        uint256 lastActivity;
        uint256 nftsOwned;
        uint256 nftsCreated;
        uint256 tradesCompleted;
        uint256 achievementsEarned;
        mapping(uint256 => bool) unlockedAchievements;
        mapping(string => uint256) activityCounts;
    }

    // Staking structure
    struct Stake {
        uint256 tokenId;
        address staker;
        uint256 stakedAt;
        uint256 lastClaimTime;
        uint256 accumulatedRewards;
        bool isActive;
    }

    // Achievement definitions
    mapping(uint256 => Achievement) public achievements;
    mapping(address => UserProfile) public userProfiles;
    mapping(uint256 => Stake) public stakes;
    mapping(uint256 => uint256) public stakedTokens;

    // Points system
    uint256 public pointsPerNFT = 10;
    uint256 public pointsPerTrade = 5;
    uint256 public pointsPerAchievement = 25;
    uint256 public stakingRewardRate = 1; // Points per day per staked NFT

    // Events
    event AchievementCreated(uint256 indexed achievementId, string name, uint256 rarity);
    event AchievementEarned(address indexed user, uint256 indexed achievementId, uint256 tokenId);
    event PointsEarned(address indexed user, uint256 points, string reason);
    event LevelUp(address indexed user, uint256 newLevel);
    event NFTStaked(uint256 indexed tokenId, address indexed staker);
    event NFTUnstaked(uint256 indexed tokenId, address indexed staker);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _nftContract) ERC721("RiseUp Achievements", "RUPA") Ownable(msg.sender) {
        require(_nftContract != address(0), "Invalid NFT contract");
        nftContract = RiseUpNFT(_nftContract);

        // Create initial achievements
        _createInitialAchievements();
    }

    // Create initial achievement templates
    function _createInitialAchievements() internal {
        _createAchievement("First NFT", "Mint your first NFT", "creation", 1, 50, 1000);
        _createAchievement("Collector", "Own 10 NFTs", "engagement", 2, 100, 500);
        _createAchievement("Trader", "Complete 5 trades", "trading", 2, 75, 1000);
        _createAchievement("Community Builder", "Refer 3 friends", "community", 3, 150, 200);
        _createAchievement("Legendary Creator", "Create 50 NFTs", "creation", 5, 500, 10);
    }

    function _createAchievement(
        string memory name,
        string memory description,
        string memory category,
        uint256 rarity,
        uint256 pointsReward,
        uint256 maxSupply
    ) internal returns (uint256) {
        _achievementIdCounter++;
        uint256 achievementId = _achievementIdCounter;

        achievements[achievementId] = Achievement({
            id: achievementId,
            name: name,
            description: description,
            category: category,
            rarity: rarity,
            pointsReward: pointsReward,
            isActive: true,
            totalMinted: 0,
            maxSupply: maxSupply
        });

        emit AchievementCreated(achievementId, name, rarity);
        return achievementId;
    }

    // Earn achievement NFT
    function earnAchievement(uint256 achievementId, address recipient) public onlyOwner returns (uint256) {
        Achievement storage achievement = achievements[achievementId];
        require(achievement.isActive, "Achievement not active");
        require(achievement.maxSupply == 0 || achievement.totalMinted < achievement.maxSupply, "Max supply reached");

        _pointsTokenIdCounter++;
        uint256 tokenId = _pointsTokenIdCounter;

        _mint(recipient, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked("achievement-", achievementId)));

        achievement.totalMinted++;

        // Award points
        _awardPoints(recipient, achievement.pointsReward, "achievement");

        // Update user profile
        UserProfile storage profile = userProfiles[recipient];
        if (profile.joinDate == 0) {
            profile.joinDate = block.timestamp;
        }
        profile.achievementsEarned++;
        profile.unlockedAchievements[achievementId] = true;
        profile.lastActivity = block.timestamp;

        emit AchievementEarned(recipient, achievementId, tokenId);
        return tokenId;
    }

    // Award points for various activities
    function awardActivityPoints(address user, string memory activityType, uint256 multiplier) public onlyOwner {
        uint256 points = 0;

        if (keccak256(bytes(activityType)) == keccak256(bytes("nft_mint"))) {
            points = pointsPerNFT * multiplier;
            userProfiles[user].nftsCreated++;
        } else if (keccak256(bytes(activityType)) == keccak256(bytes("nft_purchase"))) {
            points = pointsPerTrade * multiplier;
            userProfiles[user].tradesCompleted++;
        } else if (keccak256(bytes(activityType)) == keccak256(bytes("nft_trade"))) {
            points = pointsPerTrade * multiplier;
            userProfiles[user].tradesCompleted++;
        }

        if (points > 0) {
            _awardPoints(user, points, activityType);
        }
    }

    function _awardPoints(address user, uint256 points, string memory reason) internal {
        UserProfile storage profile = userProfiles[user];
        profile.totalPoints += points;
        profile.lastActivity = block.timestamp;

        // Check for level up
        uint256 newLevel = _calculateLevel(profile.totalPoints);
        if (newLevel > profile.level) {
            profile.level = newLevel;
            emit LevelUp(user, newLevel);
        }

        // Check for achievements
        _checkAchievements(user);

        emit PointsEarned(user, points, reason);
    }

    function _calculateLevel(uint256 points) internal pure returns (uint256) {
        // Simple level calculation: level = sqrt(points / 100)
        if (points < 100) return 1;
        uint256 level = 1;
        uint256 threshold = 100;

        while (points >= threshold) {
            level++;
            threshold = level * level * 100;
        }

        return level;
    }

    function _checkAchievements(address user) internal {
        UserProfile storage profile = userProfiles[user];

        // Check NFT ownership achievement
        if (profile.nftsOwned >= 10 && !profile.unlockedAchievements[2]) {
            earnAchievement(2, user); // Collector achievement
        }

        // Check trading achievement
        if (profile.tradesCompleted >= 5 && !profile.unlockedAchievements[3]) {
            earnAchievement(3, user); // Trader achievement
        }

        // Check creation achievement
        if (profile.nftsCreated >= 50 && !profile.unlockedAchievements[5]) {
            earnAchievement(5, user); // Legendary Creator achievement
        }
    }

    // Staking functions
    function stakeNFT(uint256 tokenId) public {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(stakedTokens[tokenId] == 0, "Already staked");

        // Transfer NFT to contract
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        stakes[tokenId] = Stake({
            tokenId: tokenId,
            staker: msg.sender,
            stakedAt: block.timestamp,
            lastClaimTime: block.timestamp,
            accumulatedRewards: 0,
            isActive: true
        });

        stakedTokens[tokenId] = tokenId;

        emit NFTStaked(tokenId, msg.sender);
    }

    function unstakeNFT(uint256 tokenId) public {
        Stake storage stakeInfo = stakes[tokenId];
        require(stakeInfo.staker == msg.sender, "Not staker");
        require(stakeInfo.isActive, "Not staked");

        // Claim any pending rewards
        _claimStakingRewards(tokenId);

        // Transfer NFT back
        nftContract.transferFrom(address(this), msg.sender, tokenId);

        stakeInfo.isActive = false;
        delete stakedTokens[tokenId];

        emit NFTUnstaked(tokenId, msg.sender);
    }

    function claimStakingRewards(uint256 tokenId) public {
        Stake storage stakeInfo = stakes[tokenId];
        require(stakeInfo.staker == msg.sender, "Not staker");
        require(stakeInfo.isActive, "Not staked");

        _claimStakingRewards(tokenId);
    }

    function _claimStakingRewards(uint256 tokenId) internal {
        Stake storage stakeInfo = stakes[tokenId];

        uint256 timeStaked = block.timestamp - stakeInfo.lastClaimTime;
        uint256 rewards = (timeStaked * stakingRewardRate) / 1 days;

        if (rewards > 0) {
            stakeInfo.accumulatedRewards += rewards;
            stakeInfo.lastClaimTime = block.timestamp;

            _awardPoints(stakeInfo.staker, rewards, "staking");

            emit RewardsClaimed(stakeInfo.staker, rewards);
        }
    }

    // Get user statistics
    function getUserStats(address user) public view returns (
        uint256 totalPoints,
        uint256 level,
        uint256 achievementsEarned,
        uint256 nftsOwned,
        uint256 nftsCreated,
        uint256 tradesCompleted
    ) {
        UserProfile storage profile = userProfiles[user];
        return (
            profile.totalPoints,
            profile.level,
            profile.achievementsEarned,
            profile.nftsOwned,
            profile.nftsCreated,
            profile.tradesCompleted
        );
    }

    // Get staking info
    function getStakingInfo(uint256 tokenId) public view returns (
        address staker,
        uint256 stakedAt,
        uint256 accumulatedRewards,
        bool isActive
    ) {
        Stake memory stakeInfo = stakes[tokenId];
        return (
            stakeInfo.staker,
            stakeInfo.stakedAt,
            stakeInfo.accumulatedRewards,
            stakeInfo.isActive
        );
    }

    // Update user NFT count (called by external contracts)
    function updateUserNFTCount(address user, uint256 count) public onlyOwner {
        userProfiles[user].nftsOwned = count;
        userProfiles[user].lastActivity = block.timestamp;
    }

    // Admin functions
    function createAchievement(
        string memory name,
        string memory description,
        string memory category,
        uint256 rarity,
        uint256 pointsReward,
        uint256 maxSupply
    ) public onlyOwner returns (uint256) {
        return _createAchievement(name, description, category, rarity, pointsReward, maxSupply);
    }

    function updatePointsRates(
        uint256 _pointsPerNFT,
        uint256 _pointsPerTrade,
        uint256 _pointsPerAchievement,
        uint256 _stakingRewardRate
    ) public onlyOwner {
        pointsPerNFT = _pointsPerNFT;
        pointsPerTrade = _pointsPerTrade;
        pointsPerAchievement = _pointsPerAchievement;
        stakingRewardRate = _stakingRewardRate;
    }

    // Override functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
