// Common utilities
export { ObjectIdType } from "./common";

// User schemas
export { userSchema, insertUserSchema, type User, type InsertUser } from "./user";

// Content schemas
export {
  songSchema,
  insertSongSchema,
  merchSchema,
  insertMerchSchema,
  eventSchema,
  insertEventSchema,
  blogSchema,
  insertBlogSchema,
  type Song,
  type InsertSong,
  type Merch,
  type InsertMerch,
  type Event,
  type InsertEvent,
  type Blog,
  type InsertBlog
} from "./content";

// Commerce schemas
export {
  orderSchema,
  insertOrderSchema,
  subscriptionSchema,
  insertSubscriptionSchema,
  promoCodeSchema,
  insertPromoCodeSchema,
  orderTrackingSchema,
  insertOrderTrackingSchema,
  returnRequestSchema,
  insertReturnRequestSchema,
  type Order,
  type InsertOrder,
  type Subscription,
  type InsertSubscription,
  type PromoCode,
  type InsertPromoCode,
  type OrderTracking,
  type InsertOrderTracking,
  type ReturnRequest,
  type InsertReturnRequest
} from "./commerce";

// Analytics schemas
export {
  analyticsSchema,
  insertAnalyticsSchema,
  userSessionSchema,
  insertUserSessionSchema,
  searchAnalyticsSchema,
  insertSearchAnalyticsSchema,
  subscriptionAnalyticsSchema,
  insertSubscriptionAnalyticsSchema,
  ecommerceAnalyticsSchema,
  insertEcommerceAnalyticsSchema,
  contentPerformanceSchema,
  insertContentPerformanceSchema,
  type Analytics,
  type InsertAnalytics,
  type UserSession,
  type InsertUserSession,
  type SearchAnalytics,
  type InsertSearchAnalytics,
  type SubscriptionAnalytics,
  type InsertSubscriptionAnalytics,
  type EcommerceAnalytics,
  type InsertEcommerceAnalytics,
  type ContentPerformance,
  type InsertContentPerformance
} from "./analytics";

// Ad schemas
export {
  adCampaignSchema,
  insertAdCampaignSchema,
  audioAdSchema,
  insertAudioAdSchema,
  bannerAdSchema,
  insertBannerAdSchema,
  adPlacementSchema,
  insertAdPlacementSchema,
  adImpressionSchema,
  insertAdImpressionSchema,
  adClickSchema,
  insertAdClickSchema,
  adRevenueSchema,
  insertAdRevenueSchema,
  songAdSettingsSchema,
  insertSongAdSettingsSchema,
  type AdCampaign,
  type InsertAdCampaign,
  type AudioAd,
  type InsertAudioAd,
  type BannerAd,
  type InsertBannerAd,
  type AdPlacement,
  type InsertAdPlacement,
  type AdImpression,
  type InsertAdImpression,
  type AdClick,
  type InsertAdClick,
  type AdRevenue,
  type InsertAdRevenue,
  type SongAdSettings,
  type InsertSongAdSettings
} from "./ads";

// NFT schemas
export {
  nftSchema,
  insertNftSchema,
  nftListingSchema,
  insertNftListingSchema,
  nftAuctionSchema,
  insertNftAuctionSchema,
  nftTransactionSchema,
  insertNftTransactionSchema,
  type NFT,
  type InsertNFT,
  type NFTListing,
  type InsertNFTListing,
  type NFTAuction,
  type InsertNFTAuction,
  type NFTTransaction,
  type InsertNFTTransaction
} from "./nft";

// Fan Club schemas
export {
  fanClubMembershipSchema,
  insertFanClubMembershipSchema,
  fanClubStatsSchema,
  type FanClubMembership,
  type InsertFanClubMembership,
  type FanClubStats
} from "./fanclub";

// Collection schemas
export {
  collectionSchema,
  insertCollectionSchema,
  collectionStatsSchema,
  type Collection,
  type InsertCollection,
  type CollectionStats
} from "./collection";

// DAO schemas
export {
  daoProposalSchema,
  insertDaoProposalSchema,
  daoVoteSchema,
  insertDaoVoteSchema,
  treasuryAllocationSchema,
  insertTreasuryAllocationSchema,
  daoStatsSchema,
  type DAOProposal,
  type InsertDAOProposal,
  type DAOVote,
  type InsertDAOVote,
  type TreasuryAllocation,
  type InsertTreasuryAllocation,
  type DAOStats
} from "./dao";

// Loyalty schemas
export {
  achievementSchema,
  insertAchievementSchema,
  userAchievementSchema,
  insertUserAchievementSchema,
  userLoyaltyProfileSchema,
  insertUserLoyaltyProfileSchema,
  stakingSchema,
  insertStakingSchema,
  loyaltyStatsSchema,
  pointsTransactionSchema,
  insertPointsTransactionSchema,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type UserLoyaltyProfile,
  type InsertUserLoyaltyProfile,
  type Staking,
  type InsertStaking,
  type LoyaltyStats,
  type PointsTransaction,
  type InsertPointsTransaction
} from "./loyalty";
