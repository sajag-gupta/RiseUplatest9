
import { storage } from "../storage";
import { AnalyticsStorage } from "../storage/analytics";
import {
  InsertAnalytics,
  InsertUserSession,
  InsertSearchAnalytics,
  InsertSubscriptionAnalytics,
  InsertEcommerceAnalytics
} from "@shared/schemas";

const analyticsStorage = new AnalyticsStorage();

export class AnalyticsService {
  // Track song play
  static async trackSongPlay(userId: string, songId: string, context: string = "player") {
    try {
      await storage.logAnalytics({
        userId,
        songId,
        action: "play",
        context: context as any,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: `session_${userId}_${Date.now()}`
        }
      });

      // Update song play count
      const song = await storage.getSong(songId);
      if (song) {
        await storage.updateSong(songId, {
          plays: song.plays + 1,
          uniqueListeners: song.uniqueListeners + 1
        });

        // Update artist stats
        const artist = await storage.getArtistByUserId(song.artistId);
        if (artist && artist.artist) {
          await storage.updateUser(song.artistId, {
            artist: {
              ...artist.artist,
              totalPlays: artist.artist.totalPlays + 1
            }
          });
        }
      }
    } catch (error) {
      console.error("Error tracking song play:", error);
    }
  }

  // Track song like/unlike
  static async trackSongLike(userId: string, songId: string, isLiked: boolean, context: string = "player") {
    try {
      await storage.logAnalytics({
        userId,
        songId,
        action: "like",
        context: context as any,
        metadata: {
          liked: isLiked,
          timestamp: new Date().toISOString()
        }
      });

      // Update song likes count
      const song = await storage.getSong(songId);
      if (song) {
        await storage.updateSong(songId, {
          likes: isLiked ? song.likes + 1 : Math.max(0, song.likes - 1)
        });

        // Update artist stats
        const artist = await storage.getArtistByUserId(song.artistId);
        if (artist && artist.artist) {
          await storage.updateUser(song.artistId, {
            artist: {
              ...artist.artist,
              totalLikes: isLiked ? artist.artist.totalLikes + 1 : Math.max(0, artist.artist.totalLikes - 1)
            }
          });
        }
      }
    } catch (error) {
      console.error("Error tracking song like:", error);
    }
  }

  // Track artist follow/unfollow
  static async trackArtistFollow(userId: string, artistId: string, isFollowing: boolean, context: string = "profile") {
    try {
      await storage.logAnalytics({
        userId,
        artistId,
        action: isFollowing ? "follow" : "unfollow",
        context: context as any,
        metadata: {
          following: isFollowing,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking artist follow:", error);
    }
  }

  // Track purchase
  static async trackPurchase(userId: string, orderId: string, amount: number, type: string, context: string = "cart") {
    try {
      await storage.logAnalytics({
        userId,
        action: "purchase",
        context: context as any,
        value: amount,
        metadata: {
          orderId,
          type,
          amount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking purchase:", error);
    }
  }

  // Track search
  static async trackSearch(userId: string, query: string, results: number, context: string = "discover") {
    try {
      await storage.logAnalytics({
        userId,
        action: "search",
        context: context as any,
        value: results,
        metadata: {
          query,
          resultsCount: results,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking search:", error);
    }
  }

  // Track page view
  static async trackPageView(userId: string, page: string, metadata: any = {}) {
    try {
      await storage.logAnalytics({
        userId,
        action: "view",
        context: "home",
        metadata: {
          page,
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking page view:", error);
    }
  }

  // Get user analytics
  static async getUserAnalytics(userId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        userId,
        timestamp: { $gte: startDate }
      }).toArray();

      const plays = analytics.filter((a: any) => a.action === "play").length;
      const likes = analytics.filter((a: any) => a.action === "like").length;
      const searches = analytics.filter((a: any) => a.action === "search").length;
      const follows = analytics.filter((a: any) => a.action === "follow").length;

      return {
        totalPlays: plays,
        totalLikes: likes,
        totalSearches: searches,
        totalFollows: follows,
        totalActions: analytics.length
      };
    } catch (error) {
      console.error("Error getting user analytics:", error);
      return null;
    }
  }

  // Get artist analytics
  static async getArtistAnalytics(artistId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        artistId,
        timestamp: { $gte: startDate }
      }).toArray();

      const plays = analytics.filter((a: any) => a.action === "play").length;
      const likes = analytics.filter((a: any) => a.action === "like").length;
      const follows = analytics.filter((a: any) => a.action === "follow").length;
      const views = analytics.filter((a: any) => a.action === "view").length;

      return {
        totalPlays: plays,
        totalLikes: likes,
        totalFollows: follows,
        totalViews: views,
        totalInteractions: analytics.length
      };
    } catch (error) {
      console.error("Error getting artist analytics:", error);
      return null;
    }
  }

  // Get recent analytics by artist
  static async getRecentAnalyticsByArtist(artistId: string, sinceDate: Date) {
    try {
      const analytics = await analyticsStorage.db.collection("analytics").find({
        artistId,
        timestamp: { $gte: sinceDate }
      }).toArray();

      return analytics;
    } catch (error) {
      console.error("Error getting recent analytics by artist:", error);
      return [];
    }
  }

  // ===================
  // ENHANCED TRACKING METHODS
  // ===================

  // User Session Tracking
  static async startUserSession(userId: string, deviceInfo?: any, location?: any): Promise<string> {
    try {
      const sessionId = `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await analyticsStorage.createUserSession({
        userId,
        sessionId,
        startTime: new Date(),
        pageViews: 1,
        actions: ["session_start"],
        deviceInfo,
        location,
        isActive: true
      });

      return sessionId;
    } catch (error) {
      console.error("Error starting user session:", error);
      throw error;
    }
  }

  static async updateUserSession(sessionId: string, updates: Partial<InsertUserSession>): Promise<void> {
    try {
      await analyticsStorage.updateUserSession(sessionId, updates);
    } catch (error) {
      console.error("Error updating user session:", error);
    }
  }

  static async endUserSession(sessionId: string): Promise<void> {
    try {
      await analyticsStorage.endUserSession(sessionId);
    } catch (error) {
      console.error("Error ending user session:", error);
    }
  }

  // Enhanced Search Tracking
  static async trackSearchQuery(searchData: InsertSearchAnalytics): Promise<void> {
    try {
      await analyticsStorage.logSearchAnalytics(searchData);
    } catch (error) {
      console.error("Error tracking search query:", error);
    }
  }

  // Subscription Tracking
  static async trackSubscription(subscriptionData: InsertSubscriptionAnalytics): Promise<void> {
    try {
      await analyticsStorage.logSubscriptionAnalytics(subscriptionData);
    } catch (error) {
      console.error("Error tracking subscription:", error);
    }
  }

  // E-commerce Tracking
  static async trackOrder(orderData: InsertEcommerceAnalytics): Promise<void> {
    try {
      await analyticsStorage.logEcommerceAnalytics(orderData);
    } catch (error) {
      console.error("Error tracking order:", error);
    }
  }

  // Content Performance Tracking
  static async updateContentMetrics(contentId: string, contentType: string, metrics: any): Promise<void> {
    try {
      await analyticsStorage.updateContentPerformance(contentId, contentType as any, metrics);
    } catch (error) {
      console.error("Error updating content metrics:", error);
    }
  }

  // ===================
  // ANALYTICS AGGREGATION METHODS
  // ===================

  // User Analytics
  static async getUserMetrics(userId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        userId,
        timestamp: { $gte: startDate }
      }).toArray();

      const metrics = {
        totalPlays: analytics.filter((a: any) => a.action === "play").length,
        totalLikes: analytics.filter((a: any) => a.action === "like").length,
        totalShares: analytics.filter((a: any) => a.action === "share").length,
        totalSearches: analytics.filter((a: any) => a.action === "search").length,
        totalFollows: analytics.filter((a: any) => a.action === "follow").length,
        totalPurchases: analytics.filter((a: any) => a.action === "purchase").length,
        totalRevenue: analytics
          .filter((a: any) => a.value)
          .reduce((sum: number, a: any) => sum + (a.value || 0), 0),
        favoriteGenres: this.calculateFavoriteGenres(analytics),
        listeningHours: this.calculateListeningHours(analytics),
        sessionCount: await this.getUserSessionCount(userId, days)
      };

      return metrics;
    } catch (error) {
      console.error("Error getting user metrics:", error);
      return null;
    }
  }

  // Artist Analytics
  static async getArtistMetrics(artistId: string, days: number = 30) {
    try {
      const followers = await analyticsStorage.getArtistFollowers(artistId);
      const uploads = await analyticsStorage.getArtistUploads(artistId);
      const earnings = await analyticsStorage.getArtistEarnings(artistId);

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const analytics = await analyticsStorage.db.collection("analytics").find({
        artistId,
        timestamp: { $gte: startDate }
      }).toArray();

      const totalPlays = analytics.filter((a: any) => a.action === "play").length;
      const totalLikes = analytics.filter((a: any) => a.action === "like").length;
      const totalShares = analytics.filter((a: any) => a.action === "share").length;
      const totalViews = analytics.filter((a: any) => a.action === "view").length;

      // Calculate monthly revenue (simplified - should be based on actual period)
      const monthlyRevenue = earnings.total;

      // Get unique listeners
      const uniqueListeners = new Set(
        analytics
          .filter((a: any) => a.action === "play")
          .map((a: any) => a.userId)
      ).size;

      // Calculate new followers (simplified - should compare with previous period)
      const newFollowers = followers;

      // Calculate new subscribers (simplified)
      const newSubscribers = Math.floor(followers * 0.3); // Assume 30% conversion rate

      // Calculate conversion rate
      const conversionRate = followers > 0 ? Math.round((newSubscribers / followers) * 100) : 0;

      const metrics = {
        monthlyRevenue,
        subscriptionRevenue: earnings.subscriptions,
        merchRevenue: earnings.merch,
        eventRevenue: earnings.events,
        totalPlays,
        uniqueListeners,
        totalLikes,
        newFollowers,
        newSubscribers,
        conversionRate,
        topSongs: await this.getTopSongsByArtist(artistId, days),
        // Additional fields for internal use
        followers,
        uploads,
        earnings,
        totalShares,
        totalViews,
        engagementRate: this.calculateEngagementRate(analytics),
        growthRate: await this.calculateArtistGrowth(artistId, days)
      };

      return metrics;
    } catch (error) {
      console.error("Error getting artist metrics:", error);
      return null;
    }
  }

  // Platform Analytics
  static async getPlatformMetrics(days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = {
        totalSignups: await analyticsStorage.getTotalSignups(startDate, endDate),
        dau: await analyticsStorage.getDAU(),
        mau: await analyticsStorage.getMAU(),
        retentionRate7d: await analyticsStorage.getRetentionRate(7, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
        retentionRate30d: await analyticsStorage.getRetentionRate(30, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
        trendingSongs: await analyticsStorage.getTrendingSongs(10, 7),
        popularSearches: await analyticsStorage.getPopularSearches(10, 7),
        merchAnalytics: await analyticsStorage.getMerchSalesAnalytics(startDate, endDate),
        subscriptionAnalytics: await analyticsStorage.getSubscriptionAnalytics(startDate, endDate),
        growthTrends: await analyticsStorage.getGrowthTrends(days)
      };

      return metrics;
    } catch (error) {
      console.error("Error getting platform metrics:", error);
      return null;
    }
  }

  // ===================
  // NFT ANALYTICS METHODS
  // ===================

  // Track NFT Mint
  static async trackNFTMint(userId: string, nftId: string, metadata: any = {}) {
    try {
      await storage.logAnalytics({
        userId,
        nftId,
        action: "nft_mint",
        context: "nft_marketplace",
        value: metadata.price || 0,
        metadata: {
          tokenId: metadata.tokenId,
          contractAddress: metadata.contractAddress,
          contentType: metadata.contentType,
          tags: metadata.tags,
          editions: metadata.editions,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking NFT mint:", error);
    }
  }

  // Track NFT Purchase
  static async trackNFTPurchase(buyerId: string, sellerId: string, nftId: string, price: number, currency: string = "matic") {
    try {
      await storage.logAnalytics({
        userId: buyerId,
        nftId,
        action: "nft_purchase",
        context: "nft_marketplace",
        value: price,
        metadata: {
          sellerId,
          currency,
          transactionType: "primary_sale",
          timestamp: new Date().toISOString()
        }
      });

      // Also track for seller
      await storage.logAnalytics({
        userId: sellerId,
        nftId,
        action: "nft_sale",
        context: "nft_marketplace",
        value: price,
        metadata: {
          buyerId,
          currency,
          transactionType: "primary_sale",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking NFT purchase:", error);
    }
  }

  // Track NFT Bid
  static async trackNFTBid(userId: string, nftId: string, bidAmount: number, currency: string = "matic") {
    try {
      await storage.logAnalytics({
        userId,
        nftId,
        action: "nft_bid",
        context: "nft_marketplace",
        value: bidAmount,
        metadata: {
          currency,
          bidType: "auction_bid",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking NFT bid:", error);
    }
  }

  // Track NFT View
  static async trackNFTView(userId: string, nftId: string, context: string = "marketplace") {
    try {
      await storage.logAnalytics({
        userId,
        nftId,
        action: "nft_view",
        context,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking NFT view:", error);
    }
  }

  // Track NFT Like/Share
  static async trackNFTInteraction(userId: string, nftId: string, action: "nft_like" | "nft_share", context: string = "marketplace") {
    try {
      await storage.logAnalytics({
        userId,
        nftId,
        action,
        context,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error tracking NFT interaction:", error);
    }
  }

  // Get NFT Analytics
  static async getNFTAnalytics(nftId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        nftId,
        timestamp: { $gte: startDate }
      }).toArray();

      const views = analytics.filter((a: any) => a.action === "nft_view").length;
      const likes = analytics.filter((a: any) => a.action === "nft_like").length;
      const shares = analytics.filter((a: any) => a.action === "nft_share").length;
      const bids = analytics.filter((a: any) => a.action === "nft_bid").length;

      return {
        totalViews: views,
        totalLikes: likes,
        totalShares: shares,
        totalBids: bids,
        engagementRate: views > 0 ? Math.round(((likes + shares + bids) / views) * 100) : 0
      };
    } catch (error) {
      console.error("Error getting NFT analytics:", error);
      return {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalBids: 0,
        engagementRate: 0
      };
    }
  }

  // Get NFT Marketplace Analytics
  static async getNFTMarketplaceAnalytics(days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        action: { $in: ["nft_mint", "nft_purchase", "nft_bid", "nft_view", "nft_like"] },
        timestamp: { $gte: startDate }
      }).toArray();

      const totalMints = analytics.filter((a: any) => a.action === "nft_mint").length;
      const totalPurchases = analytics.filter((a: any) => a.action === "nft_purchase").length;
      const totalBids = analytics.filter((a: any) => a.action === "nft_bid").length;
      const totalViews = analytics.filter((a: any) => a.action === "nft_view").length;
      const totalLikes = analytics.filter((a: any) => a.action === "nft_like").length;

      const totalVolume = analytics
        .filter((a: any) => a.action === "nft_purchase" && a.value)
        .reduce((sum: number, a: any) => sum + (a.value || 0), 0);

      return {
        totalMints,
        totalPurchases,
        totalBids,
        totalViews,
        totalLikes,
        totalVolume,
        averagePrice: totalPurchases > 0 ? totalVolume / totalPurchases : 0
      };
    } catch (error) {
      console.error("Error getting NFT marketplace analytics:", error);
      return {
        totalMints: 0,
        totalPurchases: 0,
        totalBids: 0,
        totalViews: 0,
        totalLikes: 0,
        totalVolume: 0,
        averagePrice: 0
      };
    }
  }

  // Get Artist NFT Analytics
  static async getArtistNFTAlytics(artistId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        artistId,
        action: { $regex: "^nft_" },
        timestamp: { $gte: startDate }
      }).toArray();

      const totalMints = analytics.filter((a: any) => a.action === "nft_mint").length;
      const totalSales = analytics.filter((a: any) => a.action === "nft_sale").length;
      const totalRoyalties = analytics.filter((a: any) => a.action === "nft_royalty_earned").length;

      const totalRevenue = analytics
        .filter((a: any) => a.value && (a.action === "nft_sale" || a.action === "nft_royalty_earned"))
        .reduce((sum: number, a: any) => sum + (a.value || 0), 0);

      const royaltyRevenue = analytics
        .filter((a: any) => a.action === "nft_royalty_earned" && a.value)
        .reduce((sum: number, a: any) => sum + (a.value || 0), 0);

      return {
        totalMints,
        totalSales,
        totalRoyalties,
        totalRevenue,
        royaltyRevenue,
        primaryRevenue: totalRevenue - royaltyRevenue
      };
    } catch (error) {
      console.error("Error getting artist NFT analytics:", error);
      return {
        totalMints: 0,
        totalSales: 0,
        totalRoyalties: 0,
        totalRevenue: 0,
        royaltyRevenue: 0,
        primaryRevenue: 0
      };
    }
  }

  // ===================
  // CROSS-SYSTEM ANALYTICS
  // ===================

  // Get User Cross-System Engagement
  static async getUserCrossSystemEngagement(userId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        userId,
        timestamp: { $gte: startDate }
      }).toArray();

      const musicEngagement = analytics.filter((a: any) =>
        ["play", "like", "share", "follow"].includes(a.action)
      ).length;

      const nftEngagement = analytics.filter((a: any) =>
        a.action.startsWith("nft_")
      ).length;

      const fanClubEngagement = analytics.filter((a: any) =>
        a.action.startsWith("fan_club_")
      ).length;

      const daoEngagement = analytics.filter((a: any) =>
        a.action.startsWith("dao_")
      ).length;

      const totalEngagement = musicEngagement + nftEngagement + fanClubEngagement + daoEngagement;

      return {
        musicEngagement,
        nftEngagement,
        fanClubEngagement,
        daoEngagement,
        totalEngagement,
        engagementDistribution: {
          music: totalEngagement > 0 ? Math.round((musicEngagement / totalEngagement) * 100) : 0,
          nft: totalEngagement > 0 ? Math.round((nftEngagement / totalEngagement) * 100) : 0,
          fanClub: totalEngagement > 0 ? Math.round((fanClubEngagement / totalEngagement) * 100) : 0,
          dao: totalEngagement > 0 ? Math.round((daoEngagement / totalEngagement) * 100) : 0
        }
      };
    } catch (error) {
      console.error("Error getting user cross-system engagement:", error);
      return {
        musicEngagement: 0,
        nftEngagement: 0,
        fanClubEngagement: 0,
        daoEngagement: 0,
        totalEngagement: 0,
        engagementDistribution: { music: 0, nft: 0, fanClub: 0, dao: 0 }
      };
    }
  }

  // Get Platform Cross-System Analytics
  static async getPlatformCrossSystemAnalytics(days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await analyticsStorage.db.collection("analytics").find({
        timestamp: { $gte: startDate }
      }).toArray();

      const musicActions = analytics.filter((a: any) =>
        ["play", "like", "share", "follow", "create_song"].includes(a.action)
      ).length;

      const nftActions = analytics.filter((a: any) =>
        a.action.startsWith("nft_")
      ).length;

      const fanClubActions = analytics.filter((a: any) =>
        a.action.startsWith("fan_club_")
      ).length;

      const daoActions = analytics.filter((a: any) =>
        a.action.startsWith("dao_")
      ).length;

      const commerceActions = analytics.filter((a: any) =>
        ["purchase", "merch_sale", "subscription_payment"].includes(a.action)
      ).length;

      return {
        musicActions,
        nftActions,
        fanClubActions,
        daoActions,
        commerceActions,
        totalActions: analytics.length,
        systemDistribution: {
          music: analytics.length > 0 ? Math.round((musicActions / analytics.length) * 100) : 0,
          nft: analytics.length > 0 ? Math.round((nftActions / analytics.length) * 100) : 0,
          fanClub: analytics.length > 0 ? Math.round((fanClubActions / analytics.length) * 100) : 0,
          dao: analytics.length > 0 ? Math.round((daoActions / analytics.length) * 100) : 0,
          commerce: analytics.length > 0 ? Math.round((commerceActions / analytics.length) * 100) : 0
        }
      };
    } catch (error) {
      console.error("Error getting platform cross-system analytics:", error);
      return {
        musicActions: 0,
        nftActions: 0,
        fanClubActions: 0,
        daoActions: 0,
        commerceActions: 0,
        totalActions: 0,
        systemDistribution: { music: 0, nft: 0, fanClub: 0, dao: 0, commerce: 0 }
      };
    }
  }

  // ===================
  // HELPER METHODS
  // ===================

  private static calculateFavoriteGenres(analytics: any[]): string[] {
    const genreCounts: { [key: string]: number } = {};

    analytics.forEach((a: any) => {
      if (a.metadata?.genre) {
        genreCounts[a.metadata.genre] = (genreCounts[a.metadata.genre] || 0) + 1;
      }
    });

    return Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);
  }

  private static calculateListeningHours(analytics: any[]): number {
    const playEvents = analytics.filter((a: any) => a.action === "play" && a.metadata?.duration);
    const totalSeconds = playEvents.reduce((sum: number, a: any) => sum + (a.metadata.duration || 0), 0);
    return Math.round(totalSeconds / 3600 * 100) / 100; // Convert to hours with 2 decimal places
  }

  private static async getUserSessionCount(userId: string, days: number): Promise<number> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sessions = await analyticsStorage.db.collection("user_sessions").countDocuments({
        userId,
        startTime: { $gte: startDate }
      });
      return sessions;
    } catch (error) {
      console.error("Error getting user session count:", error);
      return 0;
    }
  }

  private static calculateEngagementRate(analytics: any[]): number {
    const totalActions = analytics.length;
    const uniqueUsers = new Set(analytics.map((a: any) => a.userId)).size;

    return uniqueUsers > 0 ? Math.round((totalActions / uniqueUsers) * 100) / 100 : 0;
  }

  private static async getTopSongsByArtist(artistId: string, days: number): Promise<any[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const result = await analyticsStorage.db.collection("analytics").aggregate([
        {
          $match: {
            artistId,
            action: "play",
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: "$songId",
            plays: { $sum: 1 },
            uniqueListeners: { $addToSet: "$userId" }
          }
        },
        {
          $project: {
            songId: "$_id",
            plays: 1,
            uniqueListeners: { $size: "$uniqueListeners" }
          }
        },
        { $sort: { plays: -1 } },
        { $limit: 5 }
      ]).toArray();

      // Fetch song details for each top song
      const topSongsWithDetails = await Promise.all(
        result.map(async (item) => {
          try {
            const song = await storage.getSong(item.songId);
            if (song) {
              return {
                _id: song._id,
                title: song.title,
                plays: item.plays,
                likes: song.likes || 0,
                uniqueListeners: item.uniqueListeners
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching song ${item.songId}:`, error);
            return null;
          }
        })
      );

      return topSongsWithDetails.filter(song => song !== null);
    } catch (error) {
      console.error("Error getting top songs by artist:", error);
      return [];
    }
  }

  private static async calculateArtistGrowth(artistId: string, days: number): Promise<number> {
    try {
      const midPoint = new Date(Date.now() - (days / 2) * 24 * 60 * 60 * 1000);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [firstHalf, secondHalf] = await Promise.all([
        analyticsStorage.db.collection("analytics").countDocuments({
          artistId,
          timestamp: { $gte: startDate, $lt: midPoint }
        }),
        analyticsStorage.db.collection("analytics").countDocuments({
          artistId,
          timestamp: { $gte: midPoint }
        })
      ]);

      if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;

      const growthRate = ((secondHalf - firstHalf) / firstHalf) * 100;
      return Math.round(growthRate * 100) / 100;
    } catch (error) {
      console.error("Error calculating artist growth:", error);
      return 0;
    }
  }
}

export default AnalyticsService;
