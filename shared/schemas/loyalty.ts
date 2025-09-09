import { z } from "zod";
import { ObjectIdType } from "./common";

// Achievement Schema
export const achievementSchema = z.object({
  _id: ObjectIdType,
  achievementId: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(["engagement", "creation", "community", "trading"]),
  rarity: z.number().min(1).max(5),
  pointsReward: z.number(),
  contractAddress: z.string(),
  isActive: z.boolean().default(true),
  totalMinted: z.number().default(0),
  maxSupply: z.number().default(0), // 0 for unlimited
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertAchievementSchema = achievementSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true
});

// User Achievement Schema
export const userAchievementSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType, // Reference to User
  achievementId: ObjectIdType, // Reference to Achievement
  tokenId: z.string(),
  earnedAt: z.date().default(() => new Date())
});

export const insertUserAchievementSchema = userAchievementSchema.omit({
  _id: true,
  earnedAt: true
});

// User Profile Schema (Loyalty)
export const userLoyaltyProfileSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType, // Reference to User
  totalPoints: z.number().default(0),
  level: z.number().default(1),
  joinDate: z.date().default(() => new Date()),
  lastActivity: z.date().default(() => new Date()),
  nftsOwned: z.number().default(0),
  nftsCreated: z.number().default(0),
  tradesCompleted: z.number().default(0),
  achievementsEarned: z.number().default(0),
  contractAddress: z.string(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertUserLoyaltyProfileSchema = userLoyaltyProfileSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true
});

// Staking Schema
export const stakingSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType, // Reference to User
  tokenId: z.string(),
  stakedAt: z.date().default(() => new Date()),
  lastClaimTime: z.date().default(() => new Date()),
  accumulatedRewards: z.number().default(0),
  isActive: z.boolean().default(true),
  contractAddress: z.string()
});

export const insertStakingSchema = stakingSchema.omit({
  _id: true,
  stakedAt: true,
  lastClaimTime: true
});

// Loyalty Stats Schema
export const loyaltyStatsSchema = z.object({
  totalUsers: z.number().default(0),
  totalPointsDistributed: z.number().default(0),
  totalAchievementsEarned: z.number().default(0),
  activeStakers: z.number().default(0),
  totalStakedNFTs: z.number().default(0),
  levelDistribution: z.record(z.string(), z.number()).default({}),
  lastUpdated: z.date().default(() => new Date())
});

// Points Transaction Schema
export const pointsTransactionSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType, // Reference to User
  points: z.number(),
  reason: z.string(),
  transactionType: z.enum(["earned", "spent", "staked", "achievement"]),
  timestamp: z.date().default(() => new Date())
});

export const insertPointsTransactionSchema = pointsTransactionSchema.omit({
  _id: true,
  timestamp: true
});

// Type exports
export type Achievement = z.infer<typeof achievementSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = z.infer<typeof userAchievementSchema>;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserLoyaltyProfile = z.infer<typeof userLoyaltyProfileSchema>;
export type InsertUserLoyaltyProfile = z.infer<typeof insertUserLoyaltyProfileSchema>;
export type Staking = z.infer<typeof stakingSchema>;
export type InsertStaking = z.infer<typeof insertStakingSchema>;
export type LoyaltyStats = z.infer<typeof loyaltyStatsSchema>;
export type PointsTransaction = z.infer<typeof pointsTransactionSchema>;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
