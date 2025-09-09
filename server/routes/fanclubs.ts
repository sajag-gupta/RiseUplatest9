import type { Express } from "express";
import { authenticateToken, AuthRequest, requireRole } from "../middleware/auth";
import { blockchainService } from "../services/blockchain";
import { storage } from "../storage";

export function setupFanClubRoutes(app: Express) {
  // Get all fan club memberships
  app.get("/api/fanclubs", async (req, res) => {
    try {
      const memberships = await storage.getAllFanClubMemberships();
      res.json(memberships);
    } catch (error) {
      console.error("Get fan club memberships error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's fan club membership
  app.get("/api/fanclubs/user/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const membership = await storage.getFanClubMembershipByUser(userId);
      res.json(membership);
    } catch (error) {
      console.error("Get user fan club membership error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mint fan club membership NFT
  app.post("/api/fanclubs/mint", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenURI, tier = 'BRONZE' } = req.body;

      // For artists creating fan clubs, allow multiple memberships
      // Check if user already has membership of the same tier
      const existingMembership = await storage.getFanClubMembershipByUser(req.user!.id);
      if (existingMembership && existingMembership.tier === tier) {
        return res.status(400).json({ message: `User already has ${tier} fan club membership` });
      }

      // Mint membership NFT on blockchain
      const membershipId = await blockchainService.mintFanClubMembership(req.user!.id, tokenURI);

      // Save membership to database
      const membershipData = {
        membershipId,
        userId: req.user!.id,
        tier: tier.toUpperCase(), // Use the provided tier
        joinedAt: new Date(),
        isActive: true,
        contractAddress: process.env.FAN_CLUB_CONTRACT_ADDRESS
      };

      const membership = await storage.createFanClubMembership(membershipData);

      res.json({ membership, membershipId });
    } catch (error) {
      console.error("Mint fan club membership error:", error);
      res.status(500).json({ message: "Failed to mint fan club membership" });
    }
  });

  // Upgrade fan club membership
  app.post("/api/fanclubs/upgrade", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const membership = await storage.getFanClubMembershipByUser(req.user!.id);
      if (!membership || typeof membership !== 'object') {
        return res.status(404).json({ message: "Fan club membership not found" });
      }

      // Upgrade on blockchain
      await blockchainService.upgradeFanClubMembership((membership as any).membershipId);

      // Update database
      await storage.updateFanClubMembership((membership as any)._id, {
        tier: 'SILVER', // Example upgrade
        updatedAt: new Date()
      });

      res.json({ message: "Fan club membership upgraded successfully" });
    } catch (error) {
      console.error("Upgrade fan club membership error:", error);
      res.status(500).json({ message: "Failed to upgrade fan club membership" });
    }
  });

  // Check access to exclusive content
  app.get("/api/fanclubs/access/:contentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { contentId } = req.params;
      const { requiredTier } = req.query;

      const membership = await storage.getFanClubMembershipByUser(req.user!.id);
      if (!membership) {
        return res.json({ hasAccess: false });
      }

      // Check access on blockchain
      const hasAccess = await blockchainService.checkFanClubAccess(
        req.user!.id,
        requiredTier as string || 'BRONZE'
      );

      res.json({ hasAccess, membership });
    } catch (error) {
      console.error("Check fan club access error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get fan club statistics
  app.get("/api/fanclubs/stats", async (req, res) => {
    try {
      const stats = await storage.getFanClubStats();
      res.json(stats);
    } catch (error) {
      console.error("Get fan club stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tier requirements
  app.get("/api/fanclubs/tiers", async (req, res) => {
    try {
      const tierRequirements = await blockchainService.getFanClubTierRequirements();
      res.json(tierRequirements);
    } catch (error) {
      console.error("Get fan club tiers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
