import { z } from "zod";
import { ObjectIdType } from "./common";

// NFT Schema
export const nftSchema = z.object({
  _id: ObjectIdType,
  tokenId: z.string(),
  contractAddress: z.string(),
  ownerId: ObjectIdType, // Reference to User
  creatorId: ObjectIdType, // Reference to User (role=artist)
  metadata: z.object({
    name: z.string(),
    description: z.string(),
    image: z.string(),
    previewImage: z.string().optional(),
    external_url: z.string().optional(),
    attributes: z.array(z.object({
      trait_type: z.string(),
      value: z.string()
    })).optional()
  }),
  contentType: z.enum(["song", "video", "merch", "event", "artwork"]),
  contentId: z.string(), // Unique content identifier
  royaltyPercentage: z.number().min(0).max(100),
  platformFee: z.number().min(0).max(100),
  price: z.number().default(0),
  currency: z.enum(["matic", "inr"]).default("matic"),
  tags: z.array(z.string()).default([]),
  editions: z.number().min(1).max(10000).default(1),
  saleType: z.enum(["fixed", "auction"]).default("fixed"),
  auctionStartPrice: z.number().default(0),
  auctionDuration: z.string().default("7"), // days
  unlockableDescription: z.string().default(""),
  unlockableFile: z.string().default(""),
  fanClubTier: z.string().default(""),
  perks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string()
  })).default([]),
  externalLink: z.string().default(""),
  customAttributes: z.array(z.object({
    trait_type: z.string(),
    value: z.string()
  })).default([]),
  expirationDate: z.date().optional(),
  allowResale: z.boolean().default(true),
  isListed: z.boolean().default(false),
  auctionEndTime: z.date().optional(),
  highestBid: z.number().default(0),
  highestBidder: ObjectIdType.optional(), // Reference to User
  listedAt: z.date().optional(),

  // Admin fields
  frozen: z.boolean().default(false),
  frozenReason: z.string().optional(),
  frozenAt: z.date().optional(),
  frozenBy: z.string().optional(),
  burned: z.boolean().default(false),
  burnedAt: z.date().optional(),
  burnedBy: z.string().optional(),
  burnReason: z.string().optional(),
  editedAt: z.date().optional(),
  editedBy: z.string().optional(),

  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertNftSchema = nftSchema.omit({ _id: true, createdAt: true, updatedAt: true });

// NFT Marketplace Schema
export const nftListingSchema = z.object({
  _id: ObjectIdType,
  nftId: ObjectIdType, // Reference to NFT
  sellerId: ObjectIdType, // Reference to User
  price: z.number(),
  isActive: z.boolean().default(true),
  listedAt: z.date().default(() => new Date())
});

export const insertNftListingSchema = nftListingSchema.omit({ _id: true, listedAt: true });

// NFT Auction Schema
export const nftAuctionSchema = z.object({
  _id: ObjectIdType,
  nftId: ObjectIdType, // Reference to NFT
  sellerId: ObjectIdType, // Reference to User
  startingPrice: z.number(),
  highestBid: z.number().default(0),
  highestBidder: ObjectIdType.optional(), // Reference to User
  endTime: z.date(),
  isActive: z.boolean().default(true),
  startedAt: z.date().default(() => new Date())
});

export const insertNftAuctionSchema = nftAuctionSchema.omit({ _id: true, startedAt: true });

// NFT Transaction Schema
export const nftTransactionSchema = z.object({
  _id: ObjectIdType,
  nftId: ObjectIdType, // Reference to NFT
  fromId: ObjectIdType, // Reference to User
  toId: ObjectIdType, // Reference to User
  transactionType: z.enum(["mint", "transfer", "sale", "auction"]),
  price: z.number().optional(),
  transactionHash: z.string(),
  blockNumber: z.number(),
  timestamp: z.date().default(() => new Date())
});

export const insertNftTransactionSchema = nftTransactionSchema.omit({ _id: true, timestamp: true });

// Type exports
export type NFT = z.infer<typeof nftSchema>;
export type InsertNFT = z.infer<typeof insertNftSchema>;
export type NFTListing = z.infer<typeof nftListingSchema>;
export type InsertNFTListing = z.infer<typeof insertNftListingSchema>;
export type NFTAuction = z.infer<typeof nftAuctionSchema>;
export type InsertNFTAuction = z.infer<typeof insertNftAuctionSchema>;
export type NFTTransaction = z.infer<typeof nftTransactionSchema>;
export type InsertNFTTransaction = z.infer<typeof insertNftTransactionSchema>;
