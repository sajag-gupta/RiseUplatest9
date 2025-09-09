import type { Express } from "express";
import { authenticateToken, AuthRequest, requireRole } from "../middleware/auth";
import { blockchainService } from "../services/blockchain";
import { storage } from "../storage";
import { insertNftSchema } from "../../shared/schemas";
import AnalyticsService from "../services/analytics";

export function setupNFTRoutes(app: Express) {
  // Get all NFTs
  app.get("/api/nfts", async (req, res) => {
    try {
      const nfts = await storage.getAllNFTs();
      res.json(nfts);
    } catch (error) {
      console.error("Get NFTs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get NFT by ID
  app.get("/api/nfts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const nft = await storage.getNFT(id);

      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      // Get blockchain metadata if contract is available
      let blockchainMetadata = null;
      try {
        blockchainMetadata = await blockchainService.getNFTMetadata(id);
      } catch (error) {
        console.warn("Could not fetch blockchain metadata:", error instanceof Error ? error.message : String(error));
      }

      res.json({ ...nft, blockchainMetadata });
    } catch (error) {
      console.error("Get NFT error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mint new NFT - Only artists and admins can mint NFTs
  app.post("/api/nfts/mint", authenticateToken, requireRole(["artist", "admin"]), async (req: AuthRequest, res) => {
    try {
      const {
        name,
        description,
        image,
        previewImage,
        contentType,
        royaltyPercentage,
        price,
        currency,
        tags,
        editions,
        saleType,
        auctionStartPrice,
        auctionDuration,
        unlockableDescription,
        unlockableFile,
        fanClubTier,
        perks,
        externalLink,
        customAttributes,
        expirationDate,
        allowResale
      } = req.body;

      // Generate unique content ID
      const contentId = `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build comprehensive metadata
      const metadata = {
        name,
        description,
        image,
        previewImage,
        external_url: externalLink,
        attributes: [
          {
            trait_type: "Content Type",
            value: contentType
          },
          {
            trait_type: "Creator",
            value: req.user!.name
          },
          {
            trait_type: "Royalty Percentage",
            value: royaltyPercentage
          },
          {
            trait_type: "Currency",
            value: currency
          },
          {
            trait_type: "Sale Type",
            value: saleType
          },
          {
            trait_type: "Editions",
            value: editions
          },
          {
            trait_type: "Fan Club Tier",
            value: fanClubTier || "None"
          },
          {
            trait_type: "Allow Resale",
            value: allowResale ? "Yes" : "No"
          },
          // Add custom attributes
          ...(customAttributes || []).map((attr: any) => ({
            trait_type: attr.trait_type,
            value: attr.value
          })),
          // Add tags as attributes
          ...(tags || []).map((tag: string) => ({
            trait_type: "Tag",
            value: tag
          }))
        ]
      };

      // Add expiration if set
      if (expirationDate) {
        metadata.attributes.push({
          trait_type: "Expiration Date",
          value: new Date(expirationDate).toISOString()
        });
      }

      // Upload metadata to IPFS
      const metadataURI = await blockchainService.uploadJSONToIPFS(metadata);

      // Mint NFT on blockchain
      // Use platform wallet as recipient since user wallet addresses aren't stored yet
      const recipientAddress = process.env.PLATFORM_WALLET || req.user!.id;

      // Generate a proper numeric content ID (not timestamp to avoid ENS issues)
      const contentIdNumber = Math.floor(Math.random() * 1000000);

      const tokenId = await blockchainService.mintNFT(
        recipientAddress,
        metadataURI,
        getContentTypeNumber(contentType),
        royaltyPercentage * 100, // Convert to basis points
        2.5 * 100, // platformFee in basis points
        image, // Use main image as content URL
        contentIdNumber // Use random number instead of timestamp
      );

      // Save NFT to database with comprehensive data
      const nftData = insertNftSchema.parse({
        tokenId,
        contractAddress: process.env.NFT_CONTRACT_ADDRESS,
        ownerId: req.user!.id,
        creatorId: req.user!.id,
        metadata: metadata,
        contentType: contentType,
        contentId: contentId,
        royaltyPercentage: royaltyPercentage,
        platformFee: 2.5,
        price: price || 0,
        currency: currency || "matic",
        tags: tags || [],
        editions: editions || 1,
        saleType: saleType || "fixed",
        auctionStartPrice: auctionStartPrice || 0,
        auctionDuration: auctionDuration || "7",
        unlockableDescription: unlockableDescription || "",
        unlockableFile: unlockableFile || "",
        fanClubTier: fanClubTier || "",
        perks: perks || [],
        externalLink: externalLink || "",
        customAttributes: customAttributes || [],
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        allowResale: allowResale !== false,
        isListed: false
      });

      const nft = await storage.createNFT(nftData);

      // Track NFT mint analytics
      await AnalyticsService.trackNFTMint(req.user!.id, nft._id, {
        tokenId,
        contractAddress: process.env.NFT_CONTRACT_ADDRESS,
        contentType,
        tags,
        editions,
        price
      });

      // If fan club tier is specified, create membership linkage
      if (fanClubTier) {
        // This would link the NFT to fan club access
        // Implementation depends on fan club system
      }

      res.json({
        nft,
        tokenId,
        transactionHash: 'placeholder',
        metadataURI,
        governanceTokensAwarded: 0 // Will be awarded when purchased
      });
    } catch (error) {
      console.error("Mint NFT error:", error);
      res.status(500).json({ message: "Failed to mint NFT" });
    }
  });

  // List NFT for sale
  app.post("/api/nfts/:id/list", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { price } = req.body;

      const nft = await storage.getNFT(id);
      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      if (nft.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // List on blockchain
      await blockchainService.listNFT(id, price.toString());

      // Update database
      await storage.updateNFT(id, {
        isListed: true,
        price: price,
        listedAt: new Date()
      });

      res.json({ message: "NFT listed successfully" });
    } catch (error) {
      console.error("List NFT error:", error);
      res.status(500).json({ message: "Failed to list NFT" });
    }
  });

  // Buy NFT
  app.post("/api/nfts/:id/buy", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const nft = await storage.getNFT(id);
      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      if (!nft.isListed) {
        return res.status(400).json({ message: "NFT not listed for sale" });
      }

      // Buy on blockchain
      await blockchainService.buyNFT(id, nft.price.toString());

      // Update database
      await storage.updateNFT(id, {
        ownerId: req.user!.id,
        isListed: false,
        price: 0
      });

      // Track NFT purchase analytics
      await AnalyticsService.trackNFTPurchase(
        req.user!.id,
        nft.ownerId,
        id,
        nft.price,
        nft.currency || "matic"
      );

      // Award governance tokens to buyer (1 token per NFT purchased)
      const governanceTokens = await storage.getUserGovernanceTokens(req.user!.id);
      const currentBalance = governanceTokens?.balance || 0;
      const newBalance = currentBalance + 1; // 1 token per NFT

      await storage.updateUserGovernanceTokens(req.user!.id, {
        balance: newBalance,
        totalEarned: (governanceTokens?.totalEarned || 0) + 1,
        lastUpdated: new Date()
      });

      // Create transaction record
      await storage.createNFTTransaction({
        nftId: id,
        fromUserId: nft.ownerId,
        toUserId: req.user!.id,
        transactionType: 'purchase',
        price: nft.price,
        transactionHash: 'placeholder', // Would be from blockchain
        timestamp: new Date()
      });

      res.json({
        message: "NFT purchased successfully",
        governanceTokensAwarded: 1,
        newBalance: newBalance
      });
    } catch (error) {
      console.error("Buy NFT error:", error);
      res.status(500).json({ message: "Failed to buy NFT" });
    }
  });

  // Start auction
  app.post("/api/nfts/:id/auction", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { startingPrice, duration } = req.body;

      const nft = await storage.getNFT(id);
      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      if (nft.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Start auction on blockchain
      await blockchainService.startAuction(id, startingPrice.toString(), duration);

      // Update database
      await storage.updateNFT(id, {
        isListed: true,
        price: startingPrice,
        auctionEndTime: new Date(Date.now() + duration * 1000)
      });

      res.json({ message: "Auction started successfully" });
    } catch (error) {
      console.error("Start auction error:", error);
      res.status(500).json({ message: "Failed to start auction" });
    }
  });

  // Place bid
  app.post("/api/nfts/:id/bid", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { bidAmount } = req.body;

      // Place bid on blockchain
      await blockchainService.placeBid(id, bidAmount.toString());

      res.json({ message: "Bid placed successfully" });
    } catch (error) {
      console.error("Place bid error:", error);
      res.status(500).json({ message: "Failed to place bid" });
    }
  });

  // Get user's NFTs
  app.get("/api/nfts/user/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const nfts = await storage.getNFTsByUser(userId);
      res.json(nfts);
    } catch (error) {
      console.error("Get user NFTs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get NFT marketplace listings
  app.get("/api/nfts/marketplace/listings", async (req, res) => {
    try {
      const listings = await storage.getListedNFTs();
      res.json(listings);
    } catch (error) {
      console.error("Get marketplace listings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get NFT auctions
  app.get("/api/nfts/marketplace/auctions", async (req, res) => {
    try {
      const auctions = await storage.getActiveAuctions();
      res.json(auctions);
    } catch (error) {
      console.error("Get auctions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// Helper function to convert content type to number
function getContentTypeNumber(contentType: string): number {
  switch (contentType) {
    case 'song': return 0;
    case 'video': return 1;
    case 'merch': return 2;
    case 'event': return 3;
    case 'artwork': return 4;
    default: return 0;
  }
}
