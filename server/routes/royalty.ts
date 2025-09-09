import type { Express } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { blockchainService } from "../services/blockchain";
import { storage } from "../storage";

export function setupRoyaltyRoutes(app: Express) {
  // Set multi-recipient royalty splits
  app.post("/api/royalty/splits/:tokenId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenId } = req.params;
      const { recipients, percentages } = req.body;

      // Validate ownership
      const nft = await storage.getNFT(tokenId);
      if (!nft || nft.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Set royalty splits on blockchain
      await blockchainService.setRoyaltySplits(tokenId, recipients, percentages);

      res.json({ message: "Royalty splits set successfully" });
    } catch (error) {
      console.error("Set royalty splits error:", error);
      res.status(500).json({ message: "Failed to set royalty splits" });
    }
  });

  // Get royalty splits for NFT
  app.get("/api/royalty/splits/:tokenId", async (req, res) => {
    try {
      const { tokenId } = req.params;

      const splits = await blockchainService.getRoyaltySplits(tokenId);
      res.json(splits);
    } catch (error) {
      console.error("Get royalty splits error:", error);
      res.status(500).json({ message: "Failed to get royalty splits" });
    }
  });

  // Claim royalties
  app.post("/api/royalty/claim/:tokenId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenId } = req.params;

      await blockchainService.claimRoyalties(tokenId);
      res.json({ message: "Royalties claimed successfully" });
    } catch (error) {
      console.error("Claim royalties error:", error);
      res.status(500).json({ message: "Failed to claim royalties" });
    }
  });

  // Record streaming royalty
  app.post("/api/royalty/streaming/:tokenId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenId } = req.params;
      const { streams, earnings } = req.body;

      await blockchainService.recordStreamingRoyalty(tokenId, req.user!.id, streams, earnings);
      res.json({ message: "Streaming royalty recorded" });
    } catch (error) {
      console.error("Record streaming royalty error:", error);
      res.status(500).json({ message: "Failed to record streaming royalty" });
    }
  });

  // Claim streaming royalties
  app.post("/api/royalty/streaming/claim/:tokenId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenId } = req.params;

      await blockchainService.claimStreamingRoyalties(tokenId);
      res.json({ message: "Streaming royalties claimed" });
    } catch (error) {
      console.error("Claim streaming royalties error:", error);
      res.status(500).json({ message: "Failed to claim streaming royalties" });
    }
  });

  // Get streaming royalty info
  app.get("/api/royalty/streaming/:tokenId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenId } = req.params;

      const info = await blockchainService.getStreamingRoyalty(tokenId);
      res.json(info);
    } catch (error) {
      console.error("Get streaming royalty error:", error);
      res.status(500).json({ message: "Failed to get streaming royalty info" });
    }
  });

  // Calculate royalty for sale
  app.post("/api/royalty/calculate", async (req, res) => {
    try {
      const { tokenId, salePrice } = req.body;

      const royalty = await blockchainService.calculateRoyalty(tokenId, salePrice);
      res.json(royalty);
    } catch (error) {
      console.error("Calculate royalty error:", error);
      res.status(500).json({ message: "Failed to calculate royalty" });
    }
  });

  // Distribute royalties from sale
  app.post("/api/royalty/distribute/:tokenId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenId } = req.params;
      const { salePrice } = req.body;

      await blockchainService.distributeRoyalties(tokenId, salePrice);
      res.json({ message: "Royalties distributed successfully" });
    } catch (error) {
      console.error("Distribute royalties error:", error);
      res.status(500).json({ message: "Failed to distribute royalties" });
    }
  });
}
