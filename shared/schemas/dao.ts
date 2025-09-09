import { z } from "zod";
import { ObjectIdType } from "./common";

// DAO Proposal Schema
export const daoProposalSchema = z.object({
  _id: ObjectIdType,
  proposalId: z.string(),
  title: z.string(),
  description: z.string(),
  proposalType: z.enum(["parameter", "funding", "contract"]),
  proposerId: ObjectIdType, // Reference to User
  contractAddress: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  forVotes: z.number().default(0),
  againstVotes: z.number().default(0),
  abstainVotes: z.number().default(0),
  executed: z.boolean().default(false),
  canceled: z.boolean().default(false),
  value: z.number().default(0), // ETH value for funding proposals
  data: z.string().optional(), // Encoded function calls
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertDaoProposalSchema = daoProposalSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true
});

// DAO Vote Schema
export const daoVoteSchema = z.object({
  _id: ObjectIdType,
  proposalId: ObjectIdType, // Reference to DAO Proposal
  voterId: ObjectIdType, // Reference to User
  support: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
  votes: z.number(),
  timestamp: z.date().default(() => new Date())
});

export const insertDaoVoteSchema = daoVoteSchema.omit({
  _id: true,
  timestamp: true
});

// Treasury Allocation Schema
export const treasuryAllocationSchema = z.object({
  _id: ObjectIdType,
  allocationId: z.string(),
  recipientId: ObjectIdType, // Reference to User
  amount: z.number(),
  purpose: z.string(),
  contractAddress: z.string(),
  allocatedAt: z.date().default(() => new Date()),
  claimed: z.boolean().default(false),
  claimedAt: z.date().optional()
});

export const insertTreasuryAllocationSchema = treasuryAllocationSchema.omit({
  _id: true,
  allocatedAt: true
});

// DAO Stats Schema
export const daoStatsSchema = z.object({
  totalProposals: z.number().default(0),
  activeProposals: z.number().default(0),
  executedProposals: z.number().default(0),
  totalVotes: z.number().default(0),
  treasuryBalance: z.number().default(0),
  totalAllocations: z.number().default(0),
  lastUpdated: z.date().default(() => new Date())
});

// Type exports
export type DAOProposal = z.infer<typeof daoProposalSchema>;
export type InsertDAOProposal = z.infer<typeof insertDaoProposalSchema>;
export type DAOVote = z.infer<typeof daoVoteSchema>;
export type InsertDAOVote = z.infer<typeof insertDaoVoteSchema>;
export type TreasuryAllocation = z.infer<typeof treasuryAllocationSchema>;
export type InsertTreasuryAllocation = z.infer<typeof insertTreasuryAllocationSchema>;
export type DAOStats = z.infer<typeof daoStatsSchema>;
