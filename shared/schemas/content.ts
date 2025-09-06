import { z } from "zod";
import { ObjectIdType } from "./common";

// -----------------------------
// 🔹 Song Schema
// -----------------------------
export const songSchema = z.object({
  _id: ObjectIdType,
  artistId: ObjectIdType, // Reference to User (role=artist)
  artistName: z.string(), // Artist name for display
  title: z.string(),
  genre: z.string(),
  fileUrl: z.string(),
  artworkUrl: z.string(),
  durationSec: z.number(),
  plays: z.number().default(0),
  uniqueListeners: z.number().default(0),
  likes: z.number().default(0),
  shares: z.number().default(0),
  reviews: z.array(z.object({
    userId: ObjectIdType,  // Reference to User
    rating: z.number().min(1).max(5),
    comment: z.string(),
    createdAt: z.date()
  })).default([]),
  visibility: z.enum(["PUBLIC", "SUBSCRIBER_ONLY"]).default("PUBLIC"),
  adEnabled: z.boolean().default(true),
  createdAt: z.date().default(() => new Date())
});

export const insertSongSchema = songSchema.omit({ _id: true, createdAt: true });

// -----------------------------
// 🔹 Merch Schema
// -----------------------------
export const merchSchema = z.object({
  _id: ObjectIdType,
  artistId: ObjectIdType,  // Reference to User (role=artist)
  name: z.string(),
  description: z.string(),
  price: z.number(),
  stock: z.number(),
  images: z.array(z.string()),
  category: z.string().optional(),
  orders: z.array(ObjectIdType).default([]),  // Reference to Order
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertMerchSchema = merchSchema.omit({ _id: true, createdAt: true, updatedAt: true });

// -----------------------------
// 🔹 Event Schema
// -----------------------------
export const eventSchema = z.object({
  _id: ObjectIdType,
  artistId: ObjectIdType,  // Reference to User (role=artist)
  title: z.string(),
  description: z.string(),
  date: z.date(),
  location: z.string(),
  onlineUrl: z.string().optional(),
  ticketPrice: z.number(),
  capacity: z.number().optional(),
  imageUrl: z.string().optional(),
  attendees: z.array(ObjectIdType).default([]),  // Reference to User
  createdAt: z.date().default(() => new Date())
});

export const insertEventSchema = eventSchema.omit({ _id: true, createdAt: true });

// -----------------------------
// 🔹 Blog Schema
// -----------------------------
export const blogSchema = z.object({
  _id: ObjectIdType,
  artistId: ObjectIdType,  // Reference to User (role=artist)
  title: z.string(),
  content: z.string(),
  visibility: z.enum(["PUBLIC", "SUBSCRIBER_ONLY"]).default("PUBLIC"),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertBlogSchema = blogSchema.omit({ _id: true, createdAt: true, updatedAt: true });

// -----------------------------
// 🔹 Type Exports
// -----------------------------
export type Song = z.infer<typeof songSchema>;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Merch = z.infer<typeof merchSchema>;
export type InsertMerch = z.infer<typeof insertMerchSchema>;
export type Event = z.infer<typeof eventSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Blog = z.infer<typeof blogSchema>;
export type InsertBlog = z.infer<typeof insertBlogSchema>;
