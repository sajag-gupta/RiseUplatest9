import { z } from "zod";
import { ObjectIdType } from "./common";

// -----------------------------
// 🔹 Analytics Schema
// -----------------------------
export const analyticsSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType.optional(),   // Reference to User
  artistId: ObjectIdType.optional(), // Reference to User (role=artist)
  songId: ObjectIdType.optional(),   // Reference to Song
  merchId: ObjectIdType.optional(),  // Reference to Merch
  eventId: ObjectIdType.optional(),  // Reference to Event
  subscriptionId: ObjectIdType.optional(), // Reference to Subscription
  orderId: ObjectIdType.optional(),  // Reference to Order
  adId: ObjectIdType.optional(),     // Reference to Ad
  action: z.enum([
    "play", "like", "share", "purchase", "review", "follow", "unfollow", "subscribe",
    "ad_impression", "ad_click", "ad_complete", "search", "view", "signup", "login",
    "download", "share_social", "add_to_playlist", "remove_from_playlist",
    "create_playlist", "follow_artist", "unfollow_artist", "rate_song",
    "comment", "reply", "report", "block", "unblock", "upgrade_premium",
    "cancel_subscription", "renew_subscription", "refund", "return_request",
    "order_placed", "order_cancelled", "payment_success", "payment_failed",
    "event_registration", "event_attendance", "merch_view", "blog_view",
    "profile_view", "discover_browse", "genre_filter", "mood_filter",
    "create_song", "create_blog", "create_event", "create_merch",
    "subscription_payment", "merch_sale", "event_ticket_sale", "ad_revenue"
  ]),
  context: z.enum([
    "home", "profile", "discover", "player", "cart", "admin", "checkout",
    "search_results", "playlist", "artist_page", "song_details", "event_details",
    "merch_store", "blog_post", "settings", "notifications", "favorites",
    "library", "trending", "new_releases", "top_charts", "recommendations",
    "social_feed", "messages", "help", "about"
  ]),
  value: z.number().optional(), // For quantitative metrics (play duration, purchase amount, etc.)
  metadata: z.record(z.any()).default({}), // Additional context-specific data
  sessionId: z.string().optional(), // For session tracking
  deviceInfo: z.object({
    type: z.enum(["mobile", "desktop", "tablet"]).optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
    userAgent: z.string().optional()
  }).optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    ip: z.string().optional()
  }).optional(),
  timestamp: z.date().default(() => new Date())
});

export const insertAnalyticsSchema = analyticsSchema.omit({ _id: true, timestamp: true });

// -----------------------------
// 🔹 User Session Schema (for DAU/MAU tracking)
// -----------------------------
export const userSessionSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType,
  sessionId: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // in seconds
  pageViews: z.number().default(0),
  actions: z.array(z.string()).default([]), // List of actions in this session
  deviceInfo: z.object({
    type: z.string().optional(),
    os: z.string().optional(),
    browser: z.string().optional()
  }).optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional()
  }).optional(),
  isActive: z.boolean().default(true)
});

export const insertUserSessionSchema = userSessionSchema.omit({ _id: true });

// -----------------------------
// 🔹 Search Analytics Schema
// -----------------------------
export const searchAnalyticsSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType.optional(),
  query: z.string(),
  filters: z.record(z.any()).default({}), // genre, artist, year, etc.
  resultsCount: z.number(),
  clickedResults: z.array(z.object({
    itemId: ObjectIdType,
    itemType: z.enum(["song", "artist", "album", "playlist"]),
    position: z.number()
  })).default([]),
  timeToClick: z.number().optional(), // seconds
  sessionId: z.string().optional(),
  timestamp: z.date().default(() => new Date())
});

export const insertSearchAnalyticsSchema = searchAnalyticsSchema.omit({ _id: true, timestamp: true });

// -----------------------------
// 🔹 Subscription Analytics Schema
// -----------------------------
export const subscriptionAnalyticsSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType,
  subscriptionId: ObjectIdType,
  artistId: ObjectIdType,
  tier: z.enum(["bronze", "silver", "gold"]),
  action: z.enum(["subscribed", "renewed", "cancelled", "expired", "upgraded", "downgraded"]),
  amount: z.number(),
  currency: z.string().default("INR"),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  paymentMethod: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  timestamp: z.date().default(() => new Date())
});

export const insertSubscriptionAnalyticsSchema = subscriptionAnalyticsSchema.omit({ _id: true, timestamp: true });

// -----------------------------
// 🔹 E-commerce Analytics Schema
// -----------------------------
export const ecommerceAnalyticsSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType,
  orderId: ObjectIdType,
  type: z.enum(["merch", "event_ticket"]),
  items: z.array(z.object({
    itemId: ObjectIdType,
    itemType: z.enum(["merch", "event"]),
    quantity: z.number(),
    price: z.number(),
    discount: z.number().default(0)
  })),
  totalAmount: z.number(),
  currency: z.string().default("INR"),
  status: z.enum(["placed", "confirmed", "shipped", "delivered", "cancelled", "refunded"]),
  paymentStatus: z.enum(["pending", "completed", "failed", "refunded"]),
  shippingAddress: z.record(z.any()).optional(),
  metadata: z.record(z.any()).default({}),
  timestamp: z.date().default(() => new Date())
});

export const insertEcommerceAnalyticsSchema = ecommerceAnalyticsSchema.omit({ _id: true, timestamp: true });

// -----------------------------
// 🔹 Content Performance Schema
// -----------------------------
export const contentPerformanceSchema = z.object({
  _id: ObjectIdType,
  contentId: ObjectIdType,
  contentType: z.enum(["song", "album", "playlist", "blog", "event", "merch"]),
  artistId: ObjectIdType.optional(),
  metrics: z.object({
    views: z.number().default(0),
    uniqueViews: z.number().default(0),
    plays: z.number().default(0),
    uniqueListeners: z.number().default(0),
    likes: z.number().default(0),
    shares: z.number().default(0),
    comments: z.number().default(0),
    saves: z.number().default(0),
    downloads: z.number().default(0),
    revenue: z.number().default(0),
    engagementRate: z.number().default(0) // calculated field
  }),
  trending: z.object({
    score: z.number().default(0),
    rank: z.number().optional(),
    lastCalculated: z.date().optional()
  }).default({}),
  demographics: z.object({
    ageGroups: z.record(z.number()).default({}),
    genders: z.record(z.number()).default({}),
    countries: z.record(z.number()).default({}),
    devices: z.record(z.number()).default({})
  }).default({}),
  lastUpdated: z.date().default(() => new Date())
});

export const insertContentPerformanceSchema = contentPerformanceSchema.omit({ _id: true, lastUpdated: true });

// -----------------------------
// 🔹 Type Exports
// -----------------------------
export type Analytics = z.infer<typeof analyticsSchema>;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type UserSession = z.infer<typeof userSessionSchema>;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type SearchAnalytics = z.infer<typeof searchAnalyticsSchema>;
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
export type SubscriptionAnalytics = z.infer<typeof subscriptionAnalyticsSchema>;
export type InsertSubscriptionAnalytics = z.infer<typeof insertSubscriptionAnalyticsSchema>;
export type EcommerceAnalytics = z.infer<typeof ecommerceAnalyticsSchema>;
export type InsertEcommerceAnalytics = z.infer<typeof insertEcommerceAnalyticsSchema>;
export type ContentPerformance = z.infer<typeof contentPerformanceSchema>;
export type InsertContentPerformance = z.infer<typeof insertContentPerformanceSchema>;
