
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

      return result;
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
