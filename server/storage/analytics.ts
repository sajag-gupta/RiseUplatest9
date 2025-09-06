import { ObjectId, Collection } from "mongodb";
import { BaseStorage } from "./base";
import {
  Analytics,
  InsertAnalytics,
  UserSession,
  InsertUserSession,
  SearchAnalytics,
  InsertSearchAnalytics,
  SubscriptionAnalytics,
  InsertSubscriptionAnalytics,
  EcommerceAnalytics,
  InsertEcommerceAnalytics,
  ContentPerformance,
  InsertContentPerformance
} from "../../shared/schemas";

// MongoDB document types (with ObjectId)
interface AnalyticsDoc extends Omit<Analytics, '_id'> {
  _id: ObjectId;
}

interface UserSessionDoc extends Omit<UserSession, '_id'> {
  _id: ObjectId;
}

interface SearchAnalyticsDoc extends Omit<SearchAnalytics, '_id'> {
  _id: ObjectId;
}

interface SubscriptionAnalyticsDoc extends Omit<SubscriptionAnalytics, '_id'> {
  _id: ObjectId;
}

interface EcommerceAnalyticsDoc extends Omit<EcommerceAnalytics, '_id'> {
  _id: ObjectId;
}

interface ContentPerformanceDoc extends Omit<ContentPerformance, '_id'> {
  _id: ObjectId;
}

export class AnalyticsStorage extends BaseStorage {
  private analytics: Collection<AnalyticsDoc>;
  private userSessions: Collection<UserSessionDoc>;
  private searchAnalytics: Collection<SearchAnalyticsDoc>;
  private subscriptionAnalytics: Collection<SubscriptionAnalyticsDoc>;
  private ecommerceAnalytics: Collection<EcommerceAnalyticsDoc>;
  private contentPerformance: Collection<ContentPerformanceDoc>;

  constructor() {
    super();
    this.analytics = this.db.collection("analytics");
    this.userSessions = this.db.collection("user_sessions");
    this.searchAnalytics = this.db.collection("search_analytics");
    this.subscriptionAnalytics = this.db.collection("subscription_analytics");
    this.ecommerceAnalytics = this.db.collection("ecommerce_analytics");
    this.contentPerformance = this.db.collection("content_performance");
  }

  private convertAnalyticsDoc(doc: AnalyticsDoc): Analytics {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertUserSessionDoc(doc: UserSessionDoc): UserSession {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertSearchAnalyticsDoc(doc: SearchAnalyticsDoc): SearchAnalytics {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertSubscriptionAnalyticsDoc(doc: SubscriptionAnalyticsDoc): SubscriptionAnalytics {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertEcommerceAnalyticsDoc(doc: EcommerceAnalyticsDoc): EcommerceAnalytics {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertContentPerformanceDoc(doc: ContentPerformanceDoc): ContentPerformance {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  // Analytics methods
  async logAnalytics(analytics: InsertAnalytics): Promise<void> {
    try {
      const analyticsDoc: Omit<AnalyticsDoc, '_id'> = {
        ...analytics,
        timestamp: new Date()
      };

      await this.analytics.insertOne(analyticsDoc as AnalyticsDoc);
    } catch (error) {
      console.error('Error logging analytics:', error);
    }
  }

  // User Session methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    try {
      const sessionDoc: Omit<UserSessionDoc, '_id'> = {
        ...session,
        startTime: new Date()
      };

      const result = await this.userSessions.insertOne(sessionDoc as UserSessionDoc);
      return this.convertUserSessionDoc({ ...sessionDoc, _id: result.insertedId });
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  }

  async updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | null> {
    try {
      const updateObj: any = { ...updates };
      delete updateObj._id; // Remove _id from updates to avoid type issues

      const result = await this.userSessions.findOneAndUpdate(
        { sessionId },
        { $set: { ...updateObj, lastActivity: new Date() } },
        { returnDocument: 'after' }
      );
      return result ? this.convertUserSessionDoc(result) : null;
    } catch (error) {
      console.error('Error updating user session:', error);
      throw error;
    }
  }

  async endUserSession(sessionId: string): Promise<void> {
    try {
      await this.userSessions.updateOne(
        { sessionId },
        { $set: { isActive: false, endTime: new Date() } }
      );
    } catch (error) {
      console.error('Error ending user session:', error);
    }
  }

  // Search Analytics methods
  async logSearchAnalytics(search: InsertSearchAnalytics): Promise<SearchAnalytics> {
    try {
      const searchDoc: Omit<SearchAnalyticsDoc, '_id'> = {
        ...search,
        timestamp: new Date()
      };

      const result = await this.searchAnalytics.insertOne(searchDoc as SearchAnalyticsDoc);
      return this.convertSearchAnalyticsDoc({ ...searchDoc, _id: result.insertedId });
    } catch (error) {
      console.error('Error logging search analytics:', error);
      throw error;
    }
  }

  // Subscription Analytics methods
  async logSubscriptionAnalytics(subscription: InsertSubscriptionAnalytics): Promise<SubscriptionAnalytics> {
    try {
      const subscriptionDoc: Omit<SubscriptionAnalyticsDoc, '_id'> = {
        ...subscription,
        timestamp: new Date()
      };

      const result = await this.subscriptionAnalytics.insertOne(subscriptionDoc as SubscriptionAnalyticsDoc);
      return this.convertSubscriptionAnalyticsDoc({ ...subscriptionDoc, _id: result.insertedId });
    } catch (error) {
      console.error('Error logging subscription analytics:', error);
      throw error;
    }
  }

  // E-commerce Analytics methods
  async logEcommerceAnalytics(ecommerce: InsertEcommerceAnalytics): Promise<EcommerceAnalytics> {
    try {
      const ecommerceDoc: Omit<EcommerceAnalyticsDoc, '_id'> = {
        ...ecommerce,
        timestamp: new Date()
      };

      const result = await this.ecommerceAnalytics.insertOne(ecommerceDoc as EcommerceAnalyticsDoc);
      return this.convertEcommerceAnalyticsDoc({ ...ecommerceDoc, _id: result.insertedId });
    } catch (error) {
      console.error('Error logging ecommerce analytics:', error);
      throw error;
    }
  }

  // Content Performance methods
  async updateContentPerformance(contentId: string, contentType: ContentPerformance['contentType'], metrics: Partial<ContentPerformance['metrics']>): Promise<void> {
    try {
      const updateData = {
        ...metrics,
        lastUpdated: new Date()
      };

      await this.contentPerformance.updateOne(
        { contentId, contentType },
        { $set: updateData },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating content performance:', error);
    }
  }

  async getContentPerformance(contentId: string, contentType: ContentPerformance['contentType']): Promise<ContentPerformance | null> {
    try {
      const doc = await this.contentPerformance.findOne({ contentId, contentType });
      return doc ? this.convertContentPerformanceDoc(doc) : null;
    } catch (error) {
      console.error('Error getting content performance:', error);
      return null;
    }
  }

  // Get analytics data for dashboard
  async getRecentPlaysByUser(userId: string): Promise<any[]> {
    try {
      const recentAnalytics = await this.analytics.find({
        userId,
        action: "play"
      }).sort({ timestamp: -1 }).limit(10).toArray();

      const songIds = recentAnalytics
        .map(a => a.songId)
        .filter(Boolean)
        .filter(id => ObjectId.isValid(id!));

      if (songIds.length === 0) return [];

      const songs = await this.db.collection("songs").find({
        _id: { $in: songIds.map(id => new ObjectId(id!)) }
      }).toArray();

      // Get songs with artist names
      const songsWithArtistNames = await Promise.all(
        songs.map(async (song) => {
          const artist = await this.getArtistByUserId(song.artistId);
          return {
            ...song,
            _id: song._id.toString(),
            artistName: artist?.name || "Unknown Artist"
          };
        })
      );

      return songsWithArtistNames;
    } catch (error) {
      console.error('Error getting recent plays by user:', error);
      return [];
    }
  }

  async getSongsWithArtistNames(options: { genre?: string; sort?: string; limit?: number } = {}): Promise<any[]> {
    try {
      const songs = await this.getAllSongs(options);

      const songsWithNames = await Promise.all(
        songs.map(async (song) => ({
          ...song,
          artistName: await this.getArtistNameByProfileId(song.artistId)
        }))
      );

      return songsWithNames;
    } catch (error) {
      console.error('Error getting songs with artist names:', error);
      return [];
    }
  }

  async getEventsWithArtistNames(filters: any): Promise<any[]> {
    try {
      const events = await this.getAllEventsFiltered(filters);

      const eventsWithNames = await Promise.all(
        events.map(async (event) => ({
          ...event,
          artistName: await this.getArtistNameByProfileId(event.artistId)
        }))
      );

      return eventsWithNames;
    } catch (error) {
      console.error('Error getting events with artist names:', error);
      return [];
    }
  }

  async getMerchWithArtistNames(filters: any): Promise<any[]> {
    try {
      const merchItems = await this.getAllMerchFiltered(filters);

      const merchWithNames = await Promise.all(
        merchItems.map(async (item) => ({
          ...item,
          artistName: await this.getArtistNameByProfileId(item.artistId)
        }))
      );

      return merchWithNames;
    } catch (error) {
      console.error('Error getting merch with artist names:', error);
      return [];
    }
  }

  // Placeholder implementations for abstract methods not implemented in this class
  async getUser(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getUserByEmail(email: string): Promise<any> { throw new Error("Not implemented"); }
  async createUser(user: any): Promise<any> { throw new Error("Not implemented"); }
  async updateUser(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async getArtistByUserId(userId: string): Promise<any> { throw new Error("Not implemented"); }
  async getFeaturedArtists(limit?: number): Promise<any[]> { throw new Error("Not implemented"); }
  async getAllArtists(limit?: number): Promise<any[]> { throw new Error("Not implemented"); }

  async getSong(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getSongsByArtist(artistId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createSong(song: any): Promise<any> { throw new Error("Not implemented"); }
  async updateSong(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteSong(id: string): Promise<boolean> { throw new Error("Not implemented"); }

  async searchSongs(query: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getAllSongs(options?: { genre?: string; sort?: string; limit?: number }): Promise<any[]> { throw new Error("Not implemented"); }

  async getMerch(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getMerchByArtist(artistId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createMerch(merch: any): Promise<any> { throw new Error("Not implemented"); }
  async updateMerch(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteMerch(id: string): Promise<boolean> { throw new Error("Not implemented"); }
  async getAllMerch(): Promise<any[]> { throw new Error("Not implemented"); }
  async getAllMerchFiltered(filters: any): Promise<any[]> { throw new Error("Not implemented"); }

  async getEvent(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getEventsByArtist(artistId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createEvent(event: any): Promise<any> { throw new Error("Not implemented"); }
  async updateEvent(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteEvent(id: string): Promise<boolean> { throw new Error("Not implemented"); }
  async getUpcomingEvents(): Promise<any[]> { throw new Error("Not implemented"); }
  async getAllEventsFiltered(filters: any): Promise<any[]> { throw new Error("Not implemented"); }

  async getOrder(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getOrdersByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createOrder(order: any): Promise<any> { throw new Error("Not implemented"); }
  async updateOrder(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }

  async getSubscription(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getSubscriptionsByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getSubscriptionsByArtist(artistId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createSubscription(subscription: any): Promise<any> { throw new Error("Not implemented"); }
  async updateSubscription(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }

  async getBlog(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getBlogsByArtist(artistId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getAllBlogs(): Promise<any[]> { throw new Error("Not implemented"); }
  async createBlog(blog: any): Promise<any> { throw new Error("Not implemented"); }
  async updateBlog(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteBlog(id: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getPromoCode(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getPromoCodeByCode(code: string): Promise<any> { throw new Error("Not implemented"); }
  async getAllPromoCodes(): Promise<any[]> { throw new Error("Not implemented"); }
  async createPromoCode(promoCode: any): Promise<any> { throw new Error("Not implemented"); }
  async updatePromoCode(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deletePromoCode(id: string): Promise<boolean> { throw new Error("Not implemented"); }
  async validatePromoCode(code: string, userId: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message: string }> { throw new Error("Not implemented"); }

  async getOrderTracking(orderId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createOrderTracking(tracking: any): Promise<any> { throw new Error("Not implemented"); }
  async updateOrderTracking(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }

  async getReturnRequest(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getReturnRequestsByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getReturnRequestsByOrder(orderId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createReturnRequest(request: any): Promise<any> { throw new Error("Not implemented"); }
  async updateReturnRequest(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }

  async getArtistNameByProfileId(artistId: string): Promise<string> { throw new Error("Not implemented"); }

  // ===================
  // AGGREGATION METHODS
  // ===================

  // User Analytics
  async getTotalSignups(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const matchConditions: any = { action: "signup" };
      if (startDate || endDate) {
        matchConditions.timestamp = {};
        if (startDate) matchConditions.timestamp.$gte = startDate;
        if (endDate) matchConditions.timestamp.$lte = endDate;
      }

      const result = await this.analytics.aggregate([
        { $match: matchConditions },
        { $count: "total" }
      ]).toArray();

      return result[0]?.total || 0;
    } catch (error) {
      console.error('Error getting total signups:', error);
      return 0;
    }
  }

  async getDAU(date?: Date): Promise<number> {
    try {
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await this.userSessions.aggregate([
        {
          $match: {
            startTime: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: "$userId"
          }
        },
        {
          $count: "uniqueUsers"
        }
      ]).toArray();

      return result[0]?.uniqueUsers || 0;
    } catch (error) {
      console.error('Error getting DAU:', error);
      return 0;
    }
  }

  async getMAU(date?: Date): Promise<number> {
    try {
      const targetDate = date || new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const result = await this.userSessions.aggregate([
        {
          $match: {
            startTime: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: "$userId"
          }
        },
        {
          $count: "uniqueUsers"
        }
      ]).toArray();

      return result[0]?.uniqueUsers || 0;
    } catch (error) {
      console.error('Error getting MAU:', error);
      return 0;
    }
  }

  async getRetentionRate(days: number, cohortDate: Date): Promise<number> {
    try {
      const cohortStart = new Date(cohortDate);
      const cohortEnd = new Date(cohortDate);
      cohortEnd.setDate(cohortEnd.getDate() + 1);

      const retentionStart = new Date(cohortDate);
      retentionStart.setDate(retentionStart.getDate() + days);
      const retentionEnd = new Date(retentionStart);
      retentionEnd.setDate(retentionEnd.getDate() + 1);

      // Get cohort users
      const cohortUsers = await this.analytics.distinct("userId", {
        action: "signup",
        timestamp: { $gte: cohortStart, $lt: cohortEnd }
      });

      if (cohortUsers.length === 0) return 0;

      // Get retained users
      const retainedUsers = await this.userSessions.distinct("userId", {
        startTime: { $gte: retentionStart, $lt: retentionEnd },
        userId: { $in: cohortUsers.filter((id): id is string => id !== undefined) }
      });

      return (retainedUsers.length / cohortUsers.length) * 100;
    } catch (error) {
      console.error('Error calculating retention rate:', error);
      return 0;
    }
  }

  // Artist Analytics
  async getArtistFollowers(artistId: string): Promise<number> {
    try {
      const result = await this.analytics.aggregate([
        {
          $match: {
            artistId,
            action: "follow",
            $or: [
              { "metadata.following": true },
              { "metadata.following": { $exists: false } } // Legacy data
            ]
          }
        },
        {
          $group: {
            _id: "$userId"
          }
        },
        {
          $count: "followers"
        }
      ]).toArray();

      return result[0]?.followers || 0;
    } catch (error) {
      console.error('Error getting artist followers:', error);
      return 0;
    }
  }

  async getArtistUploads(artistId: string): Promise<{ songs: number; blogs: number; events: number; merch: number }> {
    try {
      const songs = await this.analytics.countDocuments({
        artistId,
        action: "create_song"
      });

      const blogs = await this.analytics.countDocuments({
        artistId,
        action: "create_blog"
      });

      const events = await this.analytics.countDocuments({
        artistId,
        action: "create_event"
      });

      const merch = await this.analytics.countDocuments({
        artistId,
        action: "create_merch"
      });

      return { songs, blogs, events, merch };
    } catch (error) {
      console.error('Error getting artist uploads:', error);
      return { songs: 0, blogs: 0, events: 0, merch: 0 };
    }
  }

  async getArtistEarnings(artistId: string, startDate?: Date, endDate?: Date): Promise<{
    subscriptions: number;
    merch: number;
    events: number;
    ads: number;
    total: number;
  }> {
    try {
      const matchConditions: any = { artistId };
      if (startDate || endDate) {
        matchConditions.timestamp = {};
        if (startDate) matchConditions.timestamp.$gte = startDate;
        if (endDate) matchConditions.timestamp.$lte = endDate;
      }

      const result = await this.analytics.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            subscriptions: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "subscription_payment"] },
                  "$value",
                  0
                ]
              }
            },
            merch: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "merch_sale"] },
                  "$value",
                  0
                ]
              }
            },
            events: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "event_ticket_sale"] },
                  "$value",
                  0
                ]
              }
            },
            ads: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "ad_revenue"] },
                  "$value",
                  0
                ]
              }
            }
          }
        }
      ]).toArray();

      const earnings = result[0] || { subscriptions: 0, merch: 0, events: 0, ads: 0 };
      return {
        subscriptions: earnings.subscriptions || 0,
        merch: earnings.merch || 0,
        events: earnings.events || 0,
        ads: earnings.ads || 0,
        total: (earnings.subscriptions || 0) + (earnings.merch || 0) + (earnings.events || 0) + (earnings.ads || 0)
      };
    } catch (error) {
      console.error('Error getting artist earnings:', error);
      return { subscriptions: 0, merch: 0, events: 0, ads: 0, total: 0 };
    }
  }

  // Music Analytics
  async getSongPlays(songId: string): Promise<number> {
    try {
      return await this.analytics.countDocuments({
        songId,
        action: "play"
      });
    } catch (error) {
      console.error('Error getting song plays:', error);
      return 0;
    }
  }

  async getSongUniqueListeners(songId: string): Promise<number> {
    try {
      const result = await this.analytics.aggregate([
        {
          $match: {
            songId,
            action: "play"
          }
        },
        {
          $group: {
            _id: "$userId"
          }
        },
        {
          $count: "uniqueListeners"
        }
      ]).toArray();

      return result[0]?.uniqueListeners || 0;
    } catch (error) {
      console.error('Error getting song unique listeners:', error);
      return 0;
    }
  }

  async getSongLikes(songId: string): Promise<number> {
    try {
      const likes = await this.analytics.countDocuments({
        songId,
        action: "like",
        "metadata.liked": true
      });

      const unlikes = await this.analytics.countDocuments({
        songId,
        action: "like",
        "metadata.liked": false
      });

      return Math.max(0, likes - unlikes);
    } catch (error) {
      console.error('Error getting song likes:', error);
      return 0;
    }
  }

  async getTrendingSongs(limit: number = 20, days: number = 7): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.analytics.aggregate([
        {
          $match: {
            action: { $in: ["play", "like", "share"] },
            timestamp: { $gte: startDate },
            songId: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: "$songId",
            plays: {
              $sum: { $cond: [{ $eq: ["$action", "play"] }, 1, 0] }
            },
            likes: {
              $sum: { $cond: [{ $eq: ["$action", "like"] }, 1, 0] }
            },
            shares: {
              $sum: { $cond: [{ $eq: ["$action", "share"] }, 1, 0] }
            },
            uniqueListeners: {
              $addToSet: {
                $cond: [
                  { $eq: ["$action", "play"] },
                  "$userId",
                  null
                ]
              }
            }
          }
        },
        {
          $project: {
            songId: "$_id",
            plays: 1,
            likes: 1,
            shares: 1,
            uniqueListeners: { $size: { $filter: { input: "$uniqueListeners", cond: { $ne: ["$$this", null] } } } },
            trendingScore: {
              $add: [
                { $multiply: ["$plays", 1] },
                { $multiply: ["$likes", 2] },
                { $multiply: ["$shares", 3] },
                { $multiply: ["$uniqueListeners", 1.5] }
              ]
            }
          }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit }
      ]).toArray();

      return result;
    } catch (error) {
      console.error('Error getting trending songs:', error);
      return [];
    }
  }

  // E-commerce Analytics
  async getMerchSalesAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalSales: number;
    totalRevenue: number;
    bestSellingProducts: any[];
    stockVsDemand: any[];
  }> {
    try {
      const matchConditions: any = { action: "merch_sale" };
      if (startDate || endDate) {
        matchConditions.timestamp = {};
        if (startDate) matchConditions.timestamp.$gte = startDate;
        if (endDate) matchConditions.timestamp.$lte = endDate;
      }

      const sales = await this.analytics.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: "$merchId",
            totalSold: { $sum: "$value" },
            revenue: { $sum: { $multiply: ["$value", "$metadata.price"] } },
            orders: { $sum: 1 }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]).toArray();

      const totalStats = await this.analytics.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$value" },
            totalRevenue: { $sum: { $multiply: ["$value", "$metadata.price"] } }
          }
        }
      ]).toArray();

      return {
        totalSales: totalStats[0]?.totalSales || 0,
        totalRevenue: totalStats[0]?.totalRevenue || 0,
        bestSellingProducts: sales,
        stockVsDemand: [] // TODO: Implement stock vs demand analysis
      };
    } catch (error) {
      console.error('Error getting merch sales analytics:', error);
      return {
        totalSales: 0,
        totalRevenue: 0,
        bestSellingProducts: [],
        stockVsDemand: []
      };
    }
  }

  // Subscription Analytics
  async getSubscriptionAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    churnRate: number;
    renewals: number;
    upgrades: number;
  }> {
    try {
      const matchConditions: any = {};
      if (startDate || endDate) {
        matchConditions.timestamp = {};
        if (startDate) matchConditions.timestamp.$gte = startDate;
        if (endDate) matchConditions.timestamp.$lte = endDate;
      }

      const subscriptionData = await this.subscriptionAnalytics.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalSubscriptions: {
              $sum: {
                $cond: [
                  { $in: ["$action", ["subscribed", "renewed"]] },
                  1,
                  0
                ]
              }
            },
            cancellations: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "cancelled"] },
                  1,
                  0
                ]
              }
            },
            renewals: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "renewed"] },
                  1,
                  0
                ]
              }
            },
            upgrades: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "upgraded"] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray();

      const data = subscriptionData[0] || {
        totalSubscriptions: 0,
        cancellations: 0,
        renewals: 0,
        upgrades: 0
      };

      const churnRate = data.totalSubscriptions > 0
        ? (data.cancellations / data.totalSubscriptions) * 100
        : 0;

      // Get active subscriptions (simplified - in real implementation, check expiry dates)
      const activeSubscriptions = data.totalSubscriptions - data.cancellations;

      return {
        totalSubscriptions: data.totalSubscriptions,
        activeSubscriptions: Math.max(0, activeSubscriptions),
        churnRate,
        renewals: data.renewals,
        upgrades: data.upgrades
      };
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        churnRate: 0,
        renewals: 0,
        upgrades: 0
      };
    }
  }

  // Search Analytics
  async getPopularSearches(limit: number = 20, days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.searchAnalytics.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: "$query",
            count: { $sum: 1 },
            avgResults: { $avg: "$resultsCount" },
            totalClicks: { $sum: { $size: "$clickedResults" } }
          }
        },
        {
          $project: {
            query: "$_id",
            searchCount: "$count",
            avgResults: 1,
            totalClicks: 1,
            clickThroughRate: {
              $cond: [
                { $eq: ["$count", 0] },
                0,
                { $divide: ["$totalClicks", "$count"] }
              ]
            }
          }
        },
        { $sort: { searchCount: -1 } },
        { $limit: limit }
      ]).toArray();

      return result;
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }

  async getSearchConversionRate(query: string, days: number = 30): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const searchData = await this.searchAnalytics.aggregate([
        {
          $match: {
            query,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSearches: { $sum: 1 },
            totalClicks: { $sum: { $size: "$clickedResults" } }
          }
        }
      ]).toArray();

      const data = searchData[0];
      if (!data || data.totalSearches === 0) return 0;

      return (data.totalClicks / data.totalSearches) * 100;
    } catch (error) {
      console.error('Error calculating search conversion rate:', error);
      return 0;
    }
  }

  // Growth Trends
  async getGrowthTrends(days: number = 30): Promise<{
    userGrowth: number[];
    revenueGrowth: number[];
    dates: string[];
  }> {
    try {
      const result = [];
      const dates = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        dates.push(date.toISOString().split('T')[0]);

        // Get daily signups
        const signups = await this.analytics.countDocuments({
          action: "signup",
          timestamp: { $gte: startOfDay, $lte: endOfDay }
        });

        // Get daily revenue
        const revenueResult = await this.analytics.aggregate([
          {
            $match: {
              action: { $in: ["purchase", "subscription_payment", "ad_revenue"] },
              timestamp: { $gte: startOfDay, $lte: endOfDay }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$value" }
            }
          }
        ]).toArray();

        const revenue = revenueResult[0]?.total || 0;

        result.push({ date: dates[dates.length - 1], signups, revenue });
      }

      return {
        userGrowth: result.map(r => r.signups),
        revenueGrowth: result.map(r => r.revenue),
        dates
      };
    } catch (error) {
      console.error('Error getting growth trends:', error);
      return {
        userGrowth: [],
        revenueGrowth: [],
        dates: []
      };
    }
  }
}
