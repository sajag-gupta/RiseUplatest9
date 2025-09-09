import { z } from "zod";
import { ObjectIdType } from "./common";

// Fan Club Membership Schema
export const fanClubMembershipSchema = z.object({
  _id: ObjectIdType,
  membershipId: z.string(),
  userId: ObjectIdType, // Reference to User
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
  joinedAt: z.date().default(() => new Date()),
  expiresAt: z.date().optional(), // null for lifetime
  isActive: z.boolean().default(true),
  contractAddress: z.string(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertFanClubMembershipSchema = fanClubMembershipSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true
});

// Fan Club Stats Schema
export const fanClubStatsSchema = z.object({
  totalMembers: z.number().default(0),
  activeMembers: z.number().default(0),
  tierDistribution: z.object({
    BRONZE: z.number().default(0),
    SILVER: z.number().default(0),
    GOLD: z.number().default(0),
    PLATINUM: z.number().default(0)
  }),
  totalRevenue: z.number().default(0),
  lastUpdated: z.date().default(() => new Date())
});

// Type exports
export type FanClubMembership = z.infer<typeof fanClubMembershipSchema>;
export type InsertFanClubMembership = z.infer<typeof insertFanClubMembershipSchema>;
export type FanClubStats = z.infer<typeof fanClubStatsSchema>;
