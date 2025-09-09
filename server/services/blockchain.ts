import { ethers } from 'ethers';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { MemoryBlockstore } from 'blockstore-core/memory';
import { CID } from 'multiformats/cid';

const NFT_ABI = [
  // Standard ERC721
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",

  // Custom
  "function mintNFT(address to, string memory tokenURI, uint8 contentType, uint256 royaltyPercentage, uint256 platformFee, string memory contentHash, uint256 originalContentId) returns (uint256)",
  "function getNFTMetadata(uint256 tokenId) view returns (tuple(uint8 contentType, address creator, address platform, uint256 royaltyPercentage, uint256 platformFee, string contentHash, uint256 originalContentId, bool isListed, uint256 price, uint256 auctionEndTime, address highestBidder, uint256 highestBid))"
];

const MARKETPLACE_ABI = [
  "function listNFT(uint256 tokenId, uint256 price)",
  "function buyNFT(uint256 tokenId) payable",
  "function unlistNFT(uint256 tokenId)",
  "function startAuction(uint256 tokenId, uint256 startingPrice, uint256 duration)",
  "function placeBid(uint256 tokenId) payable",
  "function endAuction(uint256 tokenId)",
  "function getListing(uint256 tokenId) view returns (tuple(uint256 tokenId, address seller, uint256 price, bool isActive, uint256 listedAt))",
  "function getAuction(uint256 tokenId) view returns (tuple(uint256 tokenId, address seller, uint256 startingPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool isActive, uint256 startedAt))"
];

const FAN_CLUB_ABI = [
  "function mintMembership(address to, string memory tokenURI) returns (uint256)",
  "function upgradeMembership(uint256 membershipId)",
  "function hasAccess(address user, uint8 requiredTier) view returns (bool)",
  "function getMembership(uint256 membershipId) view returns (tuple(uint256 membershipId, address holder, uint8 tier, uint256 joinedAt, uint256 expiresAt, bool isActive, uint256[] ownedNFTs))",
  "function getOwnedNFTs(address user) view returns (uint256)",
  "function determineTier(uint256 ownedCount) view returns (uint8)",
  "function tierRequirements(uint8 tier) view returns (uint256)"
];

const ROYALTY_ABI = [
  "function setRoyaltySplits(uint256 tokenId, address[] recipients, uint256[] percentages)",
  "function getRoyaltySplits(uint256 tokenId) view returns (tuple(address recipient, uint256 percentage)[])",
  "function claimRoyalties(uint256 tokenId)",
  "function recordStreamingRoyalty(uint256 tokenId, address streamer, uint256 streams, uint256 earnings)",
  "function claimStreamingRoyalties(uint256 tokenId)",
  "function getStreamingRoyalty(uint256 tokenId) view returns (uint256 totalStreams, uint256 totalEarnings, uint256 lastClaimTime, uint256 claimableAmount)",
  "function calculateRoyalty(uint256 tokenId, uint256 salePrice) view returns (address[] recipients, uint256[] amounts)",
  "function distributeRoyalties(uint256 tokenId) payable"
];

// Custom provider class to handle ENS resolution issues
class CustomJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  async lookupAddress(address: string): Promise<string | null> {
    // Return null for any ENS lookup to prevent errors on testnets
    return null;
  }

  async resolveName(name: string): Promise<string | null> {
    // Return null for any name resolution to prevent errors on testnets
    return null;
  }

  async getResolver(name: string): Promise<null> {
    // Always return null to prevent ENS resolution
    return null;
  }
}

// Custom signer that doesn't attempt ENS resolution
class CustomWallet extends ethers.Wallet {
  async resolveName(name: string): Promise<string> {
    // If it's already an address, return it
    if (ethers.utils.isAddress(name)) {
      return name;
    }
    // Otherwise throw an error to prevent ENS resolution
    throw new Error('ENS resolution not supported');
  }

  async lookupAddress(address: string): Promise<string | null> {
    // Return null for any ENS lookup
    return null;
  }
}

export class BlockchainService {
  private provider: CustomJsonRpcProvider;
  private signer: ethers.Wallet;
  private nftContract?: ethers.Contract;
  private marketplaceContract?: ethers.Contract;
  private fanClubContract?: ethers.Contract;
  private royaltyContract?: ethers.Contract;
  private helia: any;
  private fs: any;

  constructor() {
    // Determine which network to use (default to local for development)
    const networkType = process.env.NETWORK || 'local'; // 'local' or 'amoy'

    let rpcUrl: string;
    let network: { name: string; chainId: number };
    let privateKey: string;

    if (networkType === 'amoy') {
      // Polygon Amoy Testnet Configuration
      const amoyRpcUrl = process.env.AMOY_RPC_URL;

      // Fallback to public RPC if Alchemy key is invalid or missing
      if (!amoyRpcUrl || amoyRpcUrl.includes('AHB6PVVbqIVc-IHbGLgys')) {
        console.warn('Using public Polygon Amoy RPC endpoint (Alchemy key appears invalid)');
        rpcUrl = 'https://rpc-amoy.polygon.technology';
      } else {
        rpcUrl = amoyRpcUrl;
      }

      network = {
        name: "polygon-amoy",
        chainId: 80002
      };

      privateKey = process.env.PRIVATE_KEY!;
      if (!privateKey) {
        throw new Error('PRIVATE_KEY not found in environment variables for Amoy network');
      }

      console.log('🌐 Using Polygon Amoy Testnet');
    } else {
      // Local Hardhat Network Configuration (default)
      rpcUrl = 'http://127.0.0.1:8545'; // Local Hardhat network

      network = {
        name: "hardhat",
        chainId: 1337
      };

      // Use default Hardhat private key for local testing
      privateKey = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478c3a526db38f64d3d65bcd2c6f';

      console.log('🏠 Using Local Hardhat Network');
    }

    // Use custom provider that handles ENS resolution properly
    this.provider = new CustomJsonRpcProvider({
      url: rpcUrl,
      timeout: 30000 // 30 second timeout
    }, network);

    // Configure wallet signer
    this.signer = new ethers.Wallet(privateKey, this.provider);

    // Load contract addresses
    const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
    const marketplaceContractAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;
    const fanClubContractAddress = process.env.FAN_CLUB_CONTRACT_ADDRESS;
    const royaltyContractAddress = process.env.ROYALTY_CONTRACT_ADDRESS;

    if (nftContractAddress) {
      this.nftContract = new ethers.Contract(nftContractAddress, NFT_ABI, this.signer);
    }
    if (marketplaceContractAddress) {
      this.marketplaceContract = new ethers.Contract(marketplaceContractAddress, MARKETPLACE_ABI, this.signer);
    }
    if (fanClubContractAddress) {
      this.fanClubContract = new ethers.Contract(fanClubContractAddress, FAN_CLUB_ABI, this.signer);
    }
    if (royaltyContractAddress) {
      this.royaltyContract = new ethers.Contract(royaltyContractAddress, ROYALTY_ABI, this.signer);
    }
  }

  // Initialize Helia
  async initHelia() {
    if (!this.helia) {
      const blockstore = new MemoryBlockstore();
      this.helia = await createHelia({ blockstore });
      this.fs = unixfs(this.helia);
      console.log("Helia IPFS node initialized");
    }
  }

  /** ------------------------------
   * NFT Functions
   * ------------------------------ */

  async mintNFT(
    to: string,
    tokenURI: string,
    contentType: number,
    royaltyPercentage: number,
    platformFee: number,
    contentHash: string,
    originalContentId: number
  ): Promise<string> {
    if (!this.nftContract) throw new Error('NFT contract not initialized');

    try {
      // Ensure the 'to' address is a valid Ethereum address
      if (!ethers.utils.isAddress(to)) {
        throw new Error(`Invalid Ethereum address: ${to}`);
      }

      // Get the contract address directly
      const contractAddress = this.nftContract.address;

      // Create the transaction data manually to avoid ENS resolution
      const iface = new ethers.utils.Interface(NFT_ABI);
      const data = iface.encodeFunctionData('mintNFT', [
        to,
        tokenURI,
        contentType,
        royaltyPercentage,
        platformFee,
        contentHash,
        originalContentId
      ]);

      // Send the raw transaction
      const tx = await this.signer.sendTransaction({
        to: contractAddress, // Use the contract address directly
        data: data,
        gasLimit: 500000 // Set a reasonable gas limit
      });

      const receipt = await tx.wait();

      // Parse logs to find the NFTMinted event
      const mintedEvent = receipt.logs
        .map(log => {
          try {
            return iface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(parsed => parsed?.name === 'NFTMinted');

      return mintedEvent?.args?.tokenId.toString() || '';
    } catch (error) {
      console.error('Mint NFT error:', error);
      throw error;
    }
  }

  async getNFTMetadata(tokenId: string): Promise<any> {
    if (!this.nftContract) throw new Error('NFT contract not initialized');

    try {
      const metadata = await this.nftContract.getNFTMetadata(tokenId);
      return {
        contentType: metadata.contentType,
        creator: metadata.creator,
        platform: metadata.platform,
        royaltyPercentage: Number(metadata.royaltyPercentage),
        platformFee: Number(metadata.platformFee),
        contentHash: metadata.contentHash,
        originalContentId: Number(metadata.originalContentId),
        isListed: metadata.isListed,
        price: ethers.utils.formatEther(metadata.price),
        auctionEndTime: Number(metadata.auctionEndTime),
        highestBidder: metadata.highestBidder,
        highestBid: ethers.utils.formatEther(metadata.highestBid)
      };
    } catch (error) {
      console.error('Get NFT metadata error:', error);
      throw error;
    }
  }

  /** ------------------------------
   * Marketplace Functions
   * ------------------------------ */

  async listNFT(tokenId: string, price: string): Promise<void> {
    if (!this.marketplaceContract) throw new Error('Marketplace contract not initialized');

    try {
      const priceWei = ethers.utils.parseEther(price);
      const tx = await this.marketplaceContract.listNFT(tokenId, priceWei);
      await tx.wait();
    } catch (error) {
      console.error('List NFT error:', error);
      throw error;
    }
  }

  async buyNFT(tokenId: string, price: string): Promise<void> {
    if (!this.marketplaceContract) throw new Error('Marketplace contract not initialized');

    try {
      const tx = await this.marketplaceContract.buyNFT(tokenId, {
        value: ethers.utils.parseEther(price)
      });
      await tx.wait();
    } catch (error) {
      console.error('Buy NFT error:', error);
      throw error;
    }
  }

  async startAuction(tokenId: string, startingPrice: string, duration: number): Promise<void> {
    if (!this.marketplaceContract) throw new Error('Marketplace contract not initialized');

    try {
      const priceWei = ethers.utils.parseEther(startingPrice);
      const tx = await this.marketplaceContract.startAuction(tokenId, priceWei, duration);
      await tx.wait();
    } catch (error) {
      console.error('Start auction error:', error);
      throw error;
    }
  }

  async placeBid(tokenId: string, bidAmount: string): Promise<void> {
    if (!this.marketplaceContract) throw new Error('Marketplace contract not initialized');

    try {
      const tx = await this.marketplaceContract.placeBid(tokenId, {
        value: ethers.utils.parseEther(bidAmount)
      });
      await tx.wait();
    } catch (error) {
      console.error('Place bid error:', error);
      throw error;
    }
  }

  async getListing(tokenId: string): Promise<any> {
    if (!this.marketplaceContract) throw new Error('Marketplace contract not initialized');

    try {
      const listing = await this.marketplaceContract.getListing(tokenId);
      return {
        tokenId: listing.tokenId.toString(),
        seller: listing.seller,
        price: ethers.utils.formatEther(listing.price),
        isActive: listing.isActive,
        listedAt: Number(listing.listedAt)
      };
    } catch (error) {
      console.error('Get listing error:', error);
      throw error;
    }
  }

  async getAuction(tokenId: string): Promise<any> {
    if (!this.marketplaceContract) throw new Error('Marketplace contract not initialized');

    try {
      const auction = await this.marketplaceContract.getAuction(tokenId);
      return {
        tokenId: auction.tokenId.toString(),
        seller: auction.seller,
        startingPrice: ethers.utils.formatEther(auction.startingPrice),
        highestBid: ethers.utils.formatEther(auction.highestBid),
        highestBidder: auction.highestBidder,
        endTime: Number(auction.endTime),
        isActive: auction.isActive,
        startedAt: Number(auction.startedAt)
      };
    } catch (error) {
      console.error('Get auction error:', error);
      throw error;
    }
  }

  /** ------------------------------
   * Fan Club Functions
   * ------------------------------ */

  async mintFanClubMembership(to: string, tokenURI: string): Promise<string> {
    if (!this.fanClubContract) throw new Error('Fan Club contract not initialized');

    try {
      const tx = await this.fanClubContract.mintMembership(to, tokenURI);
      const receipt = await tx.wait();
      const mintedEvent = receipt.events?.find((e: any) => e.event === 'MembershipMinted');
      return mintedEvent?.args?.membershipId.toString() || '';
    } catch (error) {
      console.error('Mint fan club membership error:', error);
      throw error;
    }
  }

  async upgradeFanClubMembership(membershipId: string): Promise<void> {
    if (!this.fanClubContract) throw new Error('Fan Club contract not initialized');

    try {
      const tx = await this.fanClubContract.upgradeMembership(membershipId);
      await tx.wait();
    } catch (error) {
      console.error('Upgrade fan club membership error:', error);
      throw error;
    }
  }

  async checkFanClubAccess(user: string, requiredTier: string): Promise<boolean> {
    if (!this.fanClubContract) throw new Error('Fan Club contract not initialized');

    try {
      const tierNumber = this.getTierNumber(requiredTier);
      return await this.fanClubContract.hasAccess(user, tierNumber);
    } catch (error) {
      console.error('Check fan club access error:', error);
      throw error;
    }
  }

  async getFanClubMembership(membershipId: string): Promise<any> {
    if (!this.fanClubContract) throw new Error('Fan Club contract not initialized');

    try {
      const membership = await this.fanClubContract.getMembership(membershipId);
      return {
        membershipId: membership.membershipId.toString(),
        holder: membership.holder,
        tier: this.getTierName(Number(membership.tier)),
        joinedAt: Number(membership.joinedAt),
        expiresAt: Number(membership.expiresAt),
        isActive: membership.isActive,
        ownedNFTs: membership.ownedNFTs.map((id: any) => id.toString())
      };
    } catch (error) {
      console.error('Get fan club membership error:', error);
      throw error;
    }
  }

  async getFanClubTierRequirements(): Promise<Record<string, number>> {
    if (!this.fanClubContract) throw new Error('Fan Club contract not initialized');

    try {
      const requirements: Record<string, number> = {};
      const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

      for (let i = 0; i < tiers.length; i++) {
        const requirement = await this.fanClubContract.tierRequirements(i);
        requirements[tiers[i]] = Number(requirement);
      }

      return requirements;
    } catch (error) {
      console.error('Get fan club tier requirements error:', error);
      throw error;
    }
  }

  private getTierNumber(tierName: string): number {
    switch (tierName.toUpperCase()) {
      case 'BRONZE': return 0;
      case 'SILVER': return 1;
      case 'GOLD': return 2;
      case 'PLATINUM': return 3;
      default: return 0;
    }
  }

  private getTierName(tierNumber: number): string {
    switch (tierNumber) {
      case 0: return 'BRONZE';
      case 1: return 'SILVER';
      case 2: return 'GOLD';
      case 3: return 'PLATINUM';
      default: return 'BRONZE';
    }
  }

  /** ------------------------------
   * Royalty Functions
   * ------------------------------ */

  async setRoyaltySplits(tokenId: string, recipients: string[], percentages: number[]): Promise<void> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const basisPoints = percentages.map(p => p * 100); // Convert to basis points
      const tx = await this.royaltyContract.setRoyaltySplits(tokenId, recipients, basisPoints);
      await tx.wait();
    } catch (error) {
      console.error('Set royalty splits error:', error);
      throw error;
    }
  }

  async getRoyaltySplits(tokenId: string): Promise<any[]> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const splits = await this.royaltyContract.getRoyaltySplits(tokenId);
      return splits.map((split: any) => ({
        recipient: split.recipient,
        percentage: Number(split.percentage) / 100 // Convert from basis points
      }));
    } catch (error) {
      console.error('Get royalty splits error:', error);
      throw error;
    }
  }

  async claimRoyalties(tokenId: string): Promise<void> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const tx = await this.royaltyContract.claimRoyalties(tokenId);
      await tx.wait();
    } catch (error) {
      console.error('Claim royalties error:', error);
      throw error;
    }
  }

  async recordStreamingRoyalty(tokenId: string, streamer: string, streams: number, earnings: string): Promise<void> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const earningsWei = ethers.utils.parseEther(earnings);
      const tx = await this.royaltyContract.recordStreamingRoyalty(tokenId, streamer, streams, earningsWei);
      await tx.wait();
    } catch (error) {
      console.error('Record streaming royalty error:', error);
      throw error;
    }
  }

  async claimStreamingRoyalties(tokenId: string): Promise<void> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const tx = await this.royaltyContract.claimStreamingRoyalties(tokenId);
      await tx.wait();
    } catch (error) {
      console.error('Claim streaming royalties error:', error);
      throw error;
    }
  }

  async getStreamingRoyalty(tokenId: string): Promise<any> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const royalty = await this.royaltyContract.getStreamingRoyalty(tokenId);
      return {
        totalStreams: Number(royalty[0]),
        totalEarnings: ethers.utils.formatEther(royalty[1]),
        lastClaimTime: Number(royalty[2]),
        claimableAmount: ethers.utils.formatEther(royalty[3])
      };
    } catch (error) {
      console.error('Get streaming royalty error:', error);
      throw error;
    }
  }

  async calculateRoyalty(tokenId: string, salePrice: string): Promise<any> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const priceWei = ethers.utils.parseEther(salePrice);
      const royalty = await this.royaltyContract.calculateRoyalty(tokenId, priceWei);

      return {
        recipients: royalty.recipients,
        amounts: royalty.amounts.map((amount: any) => ethers.utils.formatEther(amount))
      };
    } catch (error) {
      console.error('Calculate royalty error:', error);
      throw error;
    }
  }

  async distributeRoyalties(tokenId: string, salePrice: string): Promise<void> {
    if (!this.royaltyContract) throw new Error('Royalty contract not initialized');

    try {
      const priceWei = ethers.utils.parseEther(salePrice);
      const tx = await this.royaltyContract.distributeRoyalties(tokenId, { value: priceWei });
      await tx.wait();
    } catch (error) {
      console.error('Distribute royalties error:', error);
      throw error;
    }
  }

  /** ------------------------------
   * Wallet & Utility Functions
   * ------------------------------ */

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /** ------------------------------
   * IPFS Uploads using Helia
   * ------------------------------ */

  // Upload JSON Metadata to IPFS
  async uploadJSONToIPFS(data: Record<string, any>): Promise<string> {
    await this.initHelia();
    const jsonBuffer = new TextEncoder().encode(JSON.stringify(data));
    const cid = await this.fs.addBytes(jsonBuffer);
    return `ipfs://${cid.toString()}`;
  }

  // Upload File to IPFS
  async uploadFileToIPFS(fileBuffer: Buffer): Promise<string> {
    await this.initHelia();
    const cid = await this.fs.addBytes(fileBuffer);
    return `ipfs://${cid.toString()}`;
  }

  // Retrieve File from IPFS
  async fetchFromIPFS(cidString: string): Promise<Uint8Array> {
    await this.initHelia();
    const cid = CID.parse(cidString.replace('ipfs://', ''));
    const chunks: Uint8Array[] = [];

    for await (const chunk of this.fs.cat(cid)) {
      chunks.push(chunk);
    }

    const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
