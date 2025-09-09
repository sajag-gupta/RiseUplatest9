import type { Express } from "express";
import { authenticateToken, AuthRequest, requireRole } from "../middleware/auth";
import { blockchainService } from "../services/blockchain";
import { storage } from "../storage";

export function setupLoyaltyRoutes(app: Express) {
  // Get user loyalty profile
  app.get("/api/loyalty/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const profile = await storage.getUserLoyaltyProfile(req.user!.id);
      res.json(profile);
    } catch (error) {
      console.error("Get loyalty profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Get all achievements
  app.get("/api/loyalty/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Get achievements error:", error);
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  // Get user achievements
  app.get("/api/loyalty/user-achievements", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.user!.id);
      res.json(achievements);
    } catch (error) {
      console.error("Get user achievements error:", error);
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  // Earn achievement
  app.post("/api/loyalty/earn-achievement", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { achievementId } = req.body;

      const achievement = await storage.getAchievement(achievementId);
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      // Check if user already has this achievement
      const userAchievements = await storage.getUserAchievements(req.user!.id);
      const existingAchievement = userAchievements.find((ua: any) => ua.achievementId === achievementId);
      if (existingAchievement) {
        return res.status(400).json({ message: "Achievement already earned" });
      }

      const userAchievementData = {
        userId: req.user!.id,
        achievementId,
        tokenId: `achievement_${Date.now()}`, // Generate unique token ID
        earnedAt: new Date()
      };

      const userAchievement = await storage.createUserAchievement(userAchievementData);

      // Update user points via loyalty profile
      const profile = await storage.getUserLoyaltyProfile(req.user!.id);
      if (profile) {
        await storage.updateUserLoyaltyProfile(profile._id, {
          totalPoints: profile.totalPoints + achievement.pointsReward,
          achievementsEarned: profile.achievementsEarned + 1
        });
      }

      res.json(userAchievement);
    } catch (error) {
      console.error("Earn achievement error:", error);
      res.status(500).json({ message: "Failed to earn achievement" });
    }
  });

  // Stake NFT
  app.post("/api/loyalty/stake", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tokenId } = req.body;

      const stakingData = {
        userId: req.user!.id,
        tokenId,
        stakedAt: new Date(),
        rewardsEarned: 0,
        isActive: true
      };

      const staking = await storage.createStaking(stakingData);
      res.json(staking);
    } catch (error) {
      console.error("Stake NFT error:", error);
      res.status(500).json({ message: "Failed to stake NFT" });
    }
  });

  // Get loyalty stats
  app.get("/api/loyalty/stats", async (req, res) => {
    try {
      const stats = await storage.getLoyaltyStats();
      res.json(stats);
    } catch (error) {
      console.error("Get loyalty stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Upgrade membership tier
  app.post("/api/loyalty/upgrade", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const profile = await storage.getUserLoyaltyProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Calculate new level based on points
      const newLevel = Math.floor(profile.totalPoints / 100) + 1;

      await storage.updateUserLoyaltyProfile(profile._id, { level: newLevel });
      res.json({ message: "Membership upgraded successfully", newLevel });
    } catch (error) {
      console.error("Upgrade membership error:", error);
      res.status(500).json({ message: "Failed to upgrade membership" });
    }
  });
}
