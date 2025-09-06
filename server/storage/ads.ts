import { ObjectId, Collection } from "mongodb";
import { BaseStorage } from "./base";
import {
  AdCampaign,
  InsertAdCampaign,
  AudioAd,
  InsertAudioAd,
  BannerAd,
  InsertBannerAd,
  AdPlacement,
  InsertAdPlacement,
  AdImpression,
  InsertAdImpression,
  AdClick,
  InsertAdClick,
  AdRevenue,
  InsertAdRevenue
} from "../../shared/schemas";

// MongoDB document types (with ObjectId)
interface AdCampaignDoc extends Omit<AdCampaign, '_id'> {
  _id: ObjectId;
}

interface AudioAdDoc extends Omit<AudioAd, '_id'> {
  _id: ObjectId;
}

interface BannerAdDoc extends Omit<BannerAd, '_id'> {
  _id: ObjectId;
}

interface AdPlacementDoc extends Omit<AdPlacement, '_id'> {
  _id: ObjectId;
}

interface AdImpressionDoc extends Omit<AdImpression, '_id'> {
  _id: ObjectId;
}

interface AdClickDoc extends Omit<AdClick, '_id'> {
  _id: ObjectId;
}

interface AdRevenueDoc extends Omit<AdRevenue, '_id'> {
  _id: ObjectId;
}

export class AdStorage extends BaseStorage {
  private adCampaigns: Collection<AdCampaignDoc>;
  private audioAds: Collection<AudioAdDoc>;
  private bannerAds: Collection<BannerAdDoc>;
  private adPlacements: Collection<AdPlacementDoc>;
  private adImpressions: Collection<AdImpressionDoc>;
  private adClicks: Collection<AdClickDoc>;
  private adRevenue: Collection<AdRevenueDoc>;

  constructor() {
    super();
    this.adCampaigns = this.db.collection("ad_campaigns");
    this.audioAds = this.db.collection("audio_ads");
    this.bannerAds = this.db.collection("banner_ads");
    this.adPlacements = this.db.collection("ad_placements");
    this.adImpressions = this.db.collection("ad_impressions");
    this.adClicks = this.db.collection("ad_clicks");
    this.adRevenue = this.db.collection("ad_revenue");
  }

  private convertAdCampaignDoc(doc: AdCampaignDoc): AdCampaign {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertAudioAdDoc(doc: AudioAdDoc): AudioAd {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertBannerAdDoc(doc: BannerAdDoc): BannerAd {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertAdPlacementDoc(doc: AdPlacementDoc): AdPlacement {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertAdImpressionDoc(doc: AdImpressionDoc): AdImpression {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertAdClickDoc(doc: AdClickDoc): AdClick {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertAdRevenueDoc(doc: AdRevenueDoc): AdRevenue {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  // Ad Campaign methods
  async getAdCampaign(id: string): Promise<AdCampaign | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const campaign = await this.adCampaigns.findOne({ _id: new ObjectId(id) });
      return campaign ? this.convertAdCampaignDoc(campaign) : undefined;
    } catch (error) {
      console.error('Error getting ad campaign:', error);
      return undefined;
    }
  }

  async getAllAdCampaigns(): Promise<AdCampaign[]> {
    try {
      const campaigns = await this.adCampaigns.find({}).sort({ createdAt: -1 }).toArray();
      return campaigns.map(c => this.convertAdCampaignDoc(c));
    } catch (error) {
      console.error('Error getting all ad campaigns:', error);
      return [];
    }
  }

  async createAdCampaign(campaign: InsertAdCampaign): Promise<AdCampaign> {
    const campaignDoc: Omit<AdCampaignDoc, '_id'> = {
      ...campaign,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.adCampaigns.insertOne(campaignDoc as AdCampaignDoc);
    const newCampaign = await this.adCampaigns.findOne({ _id: result.insertedId });
    return this.convertAdCampaignDoc(newCampaign!);
  }

  async updateAdCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.adCampaigns.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

      return this.getAdCampaign(id);
    } catch (error) {
      console.error('Error updating ad campaign:', error);
      return undefined;
    }
  }

  async deleteAdCampaign(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.adCampaigns.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting ad campaign:', error);
      return false;
    }
  }

  // Audio Ad methods
  async getAudioAd(id: string): Promise<AudioAd | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const ad = await this.audioAds.findOne({ _id: new ObjectId(id) });
      return ad ? this.convertAudioAdDoc(ad) : undefined;
    } catch (error) {
      console.error('Error getting audio ad:', error);
      return undefined;
    }
  }

  async getAudioAdsByCampaign(campaignId: string): Promise<AudioAd[]> {
    try {
      const ads = await this.audioAds.find({ campaignId }).toArray();
      return ads.map(a => this.convertAudioAdDoc(a));
    } catch (error) {
      console.error('Error getting audio ads by campaign:', error);
      return [];
    }
  }

  async createAudioAd(ad: InsertAudioAd): Promise<AudioAd> {
    const adDoc: Omit<AudioAdDoc, '_id'> = {
      ...ad,
      createdAt: new Date()
    };

    const result = await this.audioAds.insertOne(adDoc as AudioAdDoc);
    const newAd = await this.audioAds.findOne({ _id: result.insertedId });
    return this.convertAudioAdDoc(newAd!);
  }

  async updateAudioAd(id: string, updates: Partial<AudioAd>): Promise<AudioAd | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.audioAds.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getAudioAd(id);
    } catch (error) {
      console.error('Error updating audio ad:', error);
      return undefined;
    }
  }

  async deleteAudioAd(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.audioAds.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting audio ad:', error);
      return false;
    }
  }

  // Banner Ad methods
  async getBannerAd(id: string): Promise<BannerAd | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const ad = await this.bannerAds.findOne({ _id: new ObjectId(id) });
      return ad ? this.convertBannerAdDoc(ad) : undefined;
    } catch (error) {
      console.error('Error getting banner ad:', error);
      return undefined;
    }
  }

  async getBannerAdsByCampaign(campaignId: string): Promise<BannerAd[]> {
    try {
      const ads = await this.bannerAds.find({ campaignId }).toArray();
      return ads.map(a => this.convertBannerAdDoc(a));
    } catch (error) {
      console.error('Error getting banner ads by campaign:', error);
      return [];
    }
  }

  async createBannerAd(ad: InsertBannerAd): Promise<BannerAd> {
    const adDoc: Omit<BannerAdDoc, '_id'> = {
      ...ad,
      createdAt: new Date()
    };

    const result = await this.bannerAds.insertOne(adDoc as BannerAdDoc);
    const newAd = await this.bannerAds.findOne({ _id: result.insertedId });
    return this.convertBannerAdDoc(newAd!);
  }

  async updateBannerAd(id: string, updates: Partial<BannerAd>): Promise<BannerAd | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.bannerAds.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getBannerAd(id);
    } catch (error) {
      console.error('Error updating banner ad:', error);
      return undefined;
    }
  }

  async deleteBannerAd(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.bannerAds.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting banner ad:', error);
      return false;
    }
  }

  // Ad Placement methods
  async getAdPlacement(id: string): Promise<AdPlacement | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const placement = await this.adPlacements.findOne({ _id: new ObjectId(id) });
      return placement ? this.convertAdPlacementDoc(placement) : undefined;
    } catch (error) {
      console.error('Error getting ad placement:', error);
      return undefined;
    }
  }

  async getAdPlacementsByType(type: string): Promise<AdPlacement[]> {
    try {
      const placements = await this.adPlacements.find({ type: type as any, isActive: true }).toArray();
      return placements.map(p => this.convertAdPlacementDoc(p));
    } catch (error) {
      console.error('Error getting ad placements by type:', error);
      return [];
    }
  }

  async createAdPlacement(placement: InsertAdPlacement): Promise<AdPlacement> {
    const placementDoc: Omit<AdPlacementDoc, '_id'> = {
      ...placement,
      createdAt: new Date()
    };

    const result = await this.adPlacements.insertOne(placementDoc as AdPlacementDoc);
    const newPlacement = await this.adPlacements.findOne({ _id: result.insertedId });
    return this.convertAdPlacementDoc(newPlacement!);
  }

  async updateAdPlacement(id: string, updates: Partial<AdPlacement>): Promise<AdPlacement | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.adPlacements.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getAdPlacement(id);
    } catch (error) {
      console.error('Error updating ad placement:', error);
      return undefined;
    }
  }

  async deleteAdPlacement(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.adPlacements.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting ad placement:', error);
      return false;
    }
  }

  // Ad Impression methods
  async createAdImpression(impression: InsertAdImpression): Promise<AdImpression> {
    const impressionDoc: Omit<AdImpressionDoc, '_id'> = {
      ...impression,
      timestamp: new Date()
    };

    const result = await this.adImpressions.insertOne(impressionDoc as AdImpressionDoc);
    const newImpression = await this.adImpressions.findOne({ _id: result.insertedId });
    return this.convertAdImpressionDoc(newImpression!);
  }

  async getAdImpressions(adId: string, adType: string): Promise<AdImpression[]> {
    try {
      const impressions = await this.adImpressions.find({ adId, adType: adType as any }).toArray();
      return impressions.map(i => this.convertAdImpressionDoc(i));
    } catch (error) {
      console.error('Error getting ad impressions:', error);
      return [];
    }
  }

  // Ad Click methods
  async createAdClick(click: InsertAdClick): Promise<AdClick> {
    const clickDoc: Omit<AdClickDoc, '_id'> = {
      ...click,
      timestamp: new Date()
    };

    const result = await this.adClicks.insertOne(clickDoc as AdClickDoc);
    const newClick = await this.adClicks.findOne({ _id: result.insertedId });
    return this.convertAdClickDoc(newClick!);
  }

  async getAdClicks(adId: string, adType: string): Promise<AdClick[]> {
    try {
      const clicks = await this.adClicks.find({ adId, adType: adType as any }).toArray();
      return clicks.map(c => this.convertAdClickDoc(c));
    } catch (error) {
      console.error('Error getting ad clicks:', error);
      return [];
    }
  }

  // Ad Revenue methods
  async createAdRevenue(revenue: InsertAdRevenue): Promise<AdRevenue> {
    const revenueDoc: Omit<AdRevenueDoc, '_id'> = {
      ...revenue,
      createdAt: new Date()
    };

    const result = await this.adRevenue.insertOne(revenueDoc as AdRevenueDoc);
    const newRevenue = await this.adRevenue.findOne({ _id: result.insertedId });
    return this.convertAdRevenueDoc(newRevenue!);
  }

  async getAdRevenue(adId: string, adType: string): Promise<AdRevenue[]> {
    try {
      const revenues = await this.adRevenue.find({ adId, adType: adType as any }).toArray();
      return revenues.map(r => this.convertAdRevenueDoc(r));
    } catch (error) {
      console.error('Error getting ad revenue:', error);
      return [];
    }
  }

  async getAdRevenueByArtist(artistId: string): Promise<AdRevenue[]> {
    try {
      const revenues = await this.adRevenue.find({ artistId }).toArray();
      return revenues.map(r => this.convertAdRevenueDoc(r));
    } catch (error) {
      console.error('Error getting ad revenue by artist:', error);
      return [];
    }
  }

  // Analytics methods
  async getAdStats(adId: string, adType: string): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
  }> {
    try {
      const impressions = await this.adImpressions.countDocuments({ adId, adType: adType as any });
      const clicks = await this.adClicks.countDocuments({ adId, adType: adType as any });
      const revenue = await this.adRevenue.aggregate([
        { $match: { adId, adType: adType as any } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).toArray();

      const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      return {
        impressions,
        clicks,
        ctr,
        revenue: totalRevenue
      };
    } catch (error) {
      console.error('Error getting ad stats:', error);
      return { impressions: 0, clicks: 0, ctr: 0, revenue: 0 };
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
  async getTrendingSongs(limit?: number): Promise<any[]> { throw new Error("Not implemented"); }
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

  async getBlog(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getBlogsByArtist(artistId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getAllBlogs(): Promise<any[]> { throw new Error("Not implemented"); }
  async createBlog(blog: any): Promise<any> { throw new Error("Not implemented"); }
  async updateBlog(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteBlog(id: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getOrder(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getOrdersByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createOrder(order: any): Promise<any> { throw new Error("Not implemented"); }
  async updateOrder(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }

  async getSubscription(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getSubscriptionsByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getSubscriptionsByArtist(artistId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createSubscription(subscription: any): Promise<any> { throw new Error("Not implemented"); }
  async updateSubscription(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }

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

  async logAnalytics(analytics: any): Promise<void> { throw new Error("Not implemented"); }

  async getRecentPlaysByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getArtistNameByProfileId(artistId: string): Promise<string> { throw new Error("Not implemented"); }
  async getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }): Promise<any[]> { throw new Error("Not implemented"); }
  async getEventsWithArtistNames(filters: any): Promise<any[]> { throw new Error("Not implemented"); }
  async getMerchWithArtistNames(filters: any): Promise<any[]> { throw new Error("Not implemented"); }

  // Song Ad Settings methods
  async createSongAdSettings(settings: any): Promise<any> {
    const result = await this.db.collection('songAdSettings').insertOne(settings);
    return { ...settings, _id: result.insertedId };
  }

  async getSongAdSettings(songId: string): Promise<any | null> {
    return await this.db.collection('songAdSettings').findOne({ songId });
  }

  async getSongAdSettingsByArtist(artistId: string): Promise<any[]> {
    return await this.db.collection('songAdSettings').find({ artistId }).toArray();
  }

  async updateSongAdSettings(songId: string, updates: any): Promise<any | null> {
    const result = await this.db.collection('songAdSettings').findOneAndUpdate(
      { songId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? result.value : null;
  }

  async deleteSongAdSettings(songId: string): Promise<boolean> {
    const result = await this.db.collection('songAdSettings').deleteOne({ songId });
    return result.deletedCount > 0;
  }
}
