import { z } from "zod";
import { ObjectIdType } from "./common";

// -----------------------------
// 🔹 User Schema (Fans + Artists + Admins)
// -----------------------------
export const userSchema = z.object({
  _id: ObjectIdType,
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["fan", "artist", "admin"]),
  passwordHash: z.string(),
  avatarUrl: z.string().optional(),

  // Fan-related fields
  subscriptions: z.array(z.object({
    artistId: ObjectIdType,   // Reference to User (role=artist)
    tier: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    active: z.boolean()
  })).default([]),

  favorites: z.object({
    artists: z.array(ObjectIdType).default([]),  // Reference to User (role=artist)
    songs: z.array(ObjectIdType).default([]),    // Reference to Song
    events: z.array(ObjectIdType).default([])    // Reference to Event
  }).default({ artists: [], songs: [], events: [] }),

  playlists: z.array(z.object({
    name: z.string(),
    songs: z.array(ObjectIdType).default([]),    // Reference to Song
    createdAt: z.date()
  })).default([]),

  following: z.array(ObjectIdType).default([]),  // Reference to User (role=artist)

  adPreference: z.object({
    personalized: z.boolean(),
    categories: z.array(z.string())
  }).default({ personalized: true, categories: [] }),

  plan: z.object({
    type: z.enum(["FREE", "PREMIUM"]),
    renewsAt: z.date().optional()
  }).default({ type: "FREE" }),

  // Artist-only fields (applies only if role = artist)
  artist: z.object({
    bio: z.string().optional(),
    socialLinks: z.object({
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      x: z.string().optional(),
      website: z.string().optional()
    }).default({}),
    followers: z.array(ObjectIdType).default([]),   // Reference to User
    totalPlays: z.number().default(0),
    totalLikes: z.number().default(0),
    revenue: z.object({
      subscriptions: z.number().default(0),
      merch: z.number().default(0),
      events: z.number().default(0),
      ads: z.number().default(0),
    }).default({}),
    trendingScore: z.number().default(0),
    featured: z.boolean().default(false),
    verified: z.boolean().default(false),
  }).optional(),

  createdAt: z.date().default(() => new Date()),
  lastLogin: z.date().optional()
});

export const insertUserSchema = userSchema.omit({ _id: true, createdAt: true });

// -----------------------------
// 🔹 Type Exports
// -----------------------------
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
