import { z } from "zod";
import { ObjectIdType } from "./common";

// NFT Collection Schema
export const collectionSchema = z.object({
  _id: ObjectIdType,
  collectionId: z.string(),
  name: z.string(),
  description: z.string(),
  creatorId: ObjectIdType, // Reference to User
  contractAddress: z.string(),
  isActive: z.boolean().default(true),
  totalNFTs: z.number().default(0),
  floorPrice: z.number().default(0),
  totalVolume: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertCollectionSchema = collectionSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true
});

// Collection Stats Schema
export const collectionStatsSchema = z.object({
  collectionId: ObjectIdType,
  totalVolume: z.number().default(0),
  floorPrice: z.number().default(0),
  highestSale: z.number().default(0),
  totalTransactions: z.number().default(0),
  uniqueOwners: z.number().default(0),
  lastUpdated: z.date().default(() => new Date())
});

// Type exports
export type Collection = z.infer<typeof collectionSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type CollectionStats = z.infer<typeof collectionStatsSchema>;
