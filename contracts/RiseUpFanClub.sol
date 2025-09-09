// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RiseUpNFT.sol";

contract RiseUpFanClub is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    RiseUpNFT public nftContract;

    uint256 private _membershipIdCounter;

    // Membership tiers
    enum Tier { BRONZE, SILVER, GOLD, PLATINUM }

    struct Membership {
        uint256 membershipId;
        address holder;
        Tier tier;
        uint256 joinedAt;
        uint256 expiresAt; // 0 for lifetime
        bool isActive;
        uint256[] ownedNFTs; // NFTs owned by the member
    }

    // Mapping from membership ID to membership details
    mapping(uint256 => Membership) public memberships;

    // Mapping from address to membership ID
    mapping(address => uint256) public memberToId;

    // Tier requirements (minimum NFTs owned)
    mapping(Tier => uint256) public tierRequirements;

    // Events
    event MembershipMinted(uint256 indexed membershipId, address indexed holder, Tier tier);
    event MembershipUpgraded(uint256 indexed membershipId, Tier oldTier, Tier newTier);
    event MembershipExpired(uint256 indexed membershipId);
    event AccessGranted(uint256 indexed membershipId, address indexed contentOwner);

    constructor(address _nftContract) ERC721("RiseUp Fan Club", "RUFC") Ownable(msg.sender) {
        require(_nftContract != address(0), "Invalid NFT contract");
        nftContract = RiseUpNFT(_nftContract);

        // Set tier requirements
        tierRequirements[Tier.BRONZE] = 1;
        tierRequirements[Tier.SILVER] = 5;
        tierRequirements[Tier.GOLD] = 10;
        tierRequirements[Tier.PLATINUM] = 25;
    }

    // Mint membership NFT based on owned NFTs
    function mintMembership(address to, string memory _tokenURI) public returns (uint256) {
        require(memberToId[to] == 0, "Already a member");

        uint256 ownedNFTs = getOwnedNFTs(to);
        Tier tier = determineTier(ownedNFTs);

        _membershipIdCounter++;
        uint256 membershipId = _membershipIdCounter;

        _mint(to, membershipId);
        _setTokenURI(membershipId, _tokenURI);

        memberships[membershipId] = Membership({
            membershipId: membershipId,
            holder: to,
            tier: tier,
            joinedAt: block.timestamp,
            expiresAt: 0, // Lifetime for now
            isActive: true,
            ownedNFTs: getNFTIds(to)
        });

        memberToId[to] = membershipId;

        emit MembershipMinted(membershipId, to, tier);
        return membershipId;
    }

    // Upgrade membership tier
    function upgradeMembership(uint256 membershipId) public {
        Membership storage membership = memberships[membershipId];
        require(membership.holder == msg.sender, "Not membership holder");
        require(membership.isActive, "Membership not active");

        uint256 ownedNFTs = getOwnedNFTs(msg.sender);
        Tier newTier = determineTier(ownedNFTs);

        require(uint256(newTier) > uint256(membership.tier), "No upgrade available");

        Tier oldTier = membership.tier;
        membership.tier = newTier;
        membership.ownedNFTs = getNFTIds(msg.sender);

        emit MembershipUpgraded(membershipId, oldTier, newTier);
    }

    // Check if address has access to exclusive content
    function hasAccess(address user, Tier requiredTier) public view returns (bool) {
        uint256 membershipId = memberToId[user];
        if (membershipId == 0) return false;

        Membership memory membership = memberships[membershipId];
        return membership.isActive && uint256(membership.tier) >= uint256(requiredTier);
    }

    // Get owned NFTs count
    function getOwnedNFTs(address user) public view returns (uint256) {
        // This would need to be implemented with NFT contract enumeration
        // For now, return a placeholder
        return 0; // TODO: Implement proper NFT enumeration
    }

    // Get NFT IDs owned by user
    function getNFTIds(address user) public view returns (uint256[] memory) {
        // Placeholder - would need enumeration
        uint256[] memory ids = new uint256[](0);
        return ids;
    }

    // Determine tier based on owned NFTs
    function determineTier(uint256 ownedCount) public view returns (Tier) {
        if (ownedCount >= tierRequirements[Tier.PLATINUM]) return Tier.PLATINUM;
        if (ownedCount >= tierRequirements[Tier.GOLD]) return Tier.GOLD;
        if (ownedCount >= tierRequirements[Tier.SILVER]) return Tier.SILVER;
        if (ownedCount >= tierRequirements[Tier.BRONZE]) return Tier.BRONZE;
        return Tier.BRONZE; // Default
    }

    // Get membership details
    function getMembership(uint256 membershipId) public view returns (Membership memory) {
        require(_ownerOf(membershipId) != address(0), "Membership does not exist");
        return memberships[membershipId];
    }

    // Override functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
