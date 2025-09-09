import { MongoClient, Db, ObjectId, Collection } from "mongodb";
import {
  User, InsertUser, Song, InsertSong, Merch, InsertMerch, Event, InsertEvent,
  Order, InsertOrder, Subscription, InsertSubscription, Analytics, InsertAnalytics,
  Blog, InsertBlog, PromoCode, InsertPromoCode, OrderTracking, InsertOrderTracking,
  ReturnRequest, InsertReturnRequest,
  NFT, InsertNFT, NFTListing, InsertNFTListing, NFTAuction, InsertNFTAuction, NFTTransaction, InsertNFTTransaction,
  AdCampaign, InsertAdCampaign, AudioAd, InsertAudioAd, BannerAd, InsertBannerAd,
  AdPlacement, InsertAdPlacement, AdImpression, InsertAdImpression, AdClick, InsertAdClick, AdRevenue, InsertAdRevenue
} from "../../shared/schemas";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Artist methods (working with User collection)
  getArtistByUserId(userId: string): Promise<User | undefined>;
  getFeaturedArtists(limit?: number): Promise<User[]>;
  getAllArtists(limit?: number): Promise<User[]>;

  // Song methods
  getSong(id: string): Promise<Song | undefined>;
  getSongsByArtist(artistId: string): Promise<Song[]>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined>;
  deleteSong(id: string): Promise<boolean>;
  getTrendingSongs(limit?: number): Promise<Song[]>;
  searchSongs(query: string): Promise<Song[]>;
  getAllSongs(options?: { genre?: string; sort?: string; limit?: number }): Promise<Song[]>;

  // Merch methods
  getMerch(id: string): Promise<Merch | undefined>;
  getMerchByArtist(artistId: string): Promise<Merch[]>;
  createMerch(merch: InsertMerch): Promise<Merch>;
  updateMerch(id: string, updates: Partial<Merch>): Promise<Merch | undefined>;
  deleteMerch(id: string): Promise<boolean>;
  getAllMerch(): Promise<Merch[]>;
  getAllMerchFiltered(filters: any): Promise<Merch[]>;

  // Event methods
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByArtist(artistId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  getUpcomingEvents(): Promise<Event[]>;
  getAllEventsFiltered(filters: any): Promise<Event[]>;

  // Order methods
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;

  // Subscription methods
  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionsByUser(userId: string): Promise<Subscription[]>;
  getSubscriptionsByArtist(artistId: string): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;

  // Blog methods
  getBlog(id: string): Promise<Blog | undefined>;
  getBlogsByArtist(artistId: string): Promise<Blog[]>;
  getAllBlogs(): Promise<Blog[]>;
  createBlog(blog: InsertBlog): Promise<Blog>;
  updateBlog(id: string, updates: Partial<Blog>): Promise<Blog | undefined>;
  deleteBlog(id: string): Promise<boolean>;

  // Promo Code methods
  getPromoCode(id: string): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  getAllPromoCodes(): Promise<PromoCode[]>;
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: string): Promise<boolean>;
  validatePromoCode(code: string, userId: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message: string }>;

  // Order Tracking methods
  getOrderTracking(orderId: string): Promise<OrderTracking[]>;
  createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking>;
  updateOrderTracking(id: string, updates: Partial<OrderTracking>): Promise<OrderTracking | undefined>;

  // Return Request methods
  getReturnRequest(id: string): Promise<ReturnRequest | undefined>;
  getReturnRequestsByUser(userId: string): Promise<ReturnRequest[]>;
  getReturnRequestsByOrder(orderId: string): Promise<ReturnRequest[]>;
  createReturnRequest(request: InsertReturnRequest): Promise<ReturnRequest>;
  updateReturnRequest(id: string, updates: Partial<ReturnRequest>): Promise<ReturnRequest | undefined>;

  // Analytics methods
  logAnalytics(analytics: InsertAnalytics): Promise<void>;

  // NFT methods
  getAllNFTs(): Promise<NFT[]>;
  getNFT(id: string): Promise<NFT | null>;
  getNFTsByUser(userId: string): Promise<NFT[]>;
  createNFT(nft: InsertNFT): Promise<NFT>;
  updateNFT(id: string, updates: Partial<NFT>): Promise<NFT | null>;
  deleteNFT(id: string): Promise<boolean>;
  getListedNFTs(): Promise<NFT[]>;
  getActiveAuctions(): Promise<NFT[]>;
  createNFTListing(listing: InsertNFTListing): Promise<NFTListing>;
  updateNFTListing(id: string, updates: Partial<NFTListing>): Promise<NFTListing | null>;
  deleteNFTListing(id: string): Promise<boolean>;
  createNFTAuction(auction: InsertNFTAuction): Promise<NFTAuction>;
  updateNFTAuction(id: string, updates: Partial<NFTAuction>): Promise<NFTAuction | null>;
  deleteNFTAuction(id: string): Promise<boolean>;
  createNFTTransaction(transaction: InsertNFTTransaction): Promise<NFTTransaction>;
  getNFTTransactions(nftId: string): Promise<NFTTransaction[]>;
  getNFTTransactionsByUser(userId: string): Promise<NFTTransaction[]>;
  getNFTStats(): Promise<any>;

  // Additional methods for dashboard
  getRecentPlaysByUser(userId: string): Promise<Song[]>;
  getArtistNameByProfileId(artistId: string): Promise<string>;
  getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }): Promise<(Song & { artistName: string })[]>;
  getEventsWithArtistNames(filters: any): Promise<(Event & { artistName: string })[]>;
  getMerchWithArtistNames(filters: any): Promise<(Merch & { artistName: string })[]>;

  // Search methods
  searchMerch(query: string): Promise<Merch[]>;
  searchEvents(query: string): Promise<Event[]>;
  searchBlogs(query: string): Promise<Blog[]>;

  // Ad methods
  getAdCampaign(id: string): Promise<AdCampaign | undefined>;
  getAllAdCampaigns(): Promise<AdCampaign[]>;
  createAdCampaign(campaign: InsertAdCampaign): Promise<AdCampaign>;
  updateAdCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign | undefined>;
  deleteAdCampaign(id: string): Promise<boolean>;

  getAudioAd(id: string): Promise<AudioAd | undefined>;
  getAudioAdsByCampaign(campaignId: string): Promise<AudioAd[]>;
  getAllAudioAds(): Promise<AudioAd[]>;
  createAudioAd(ad: InsertAudioAd): Promise<AudioAd>;
  updateAudioAd(id: string, updates: Partial<AudioAd>): Promise<AudioAd | undefined>;
  deleteAudioAd(id: string): Promise<boolean>;

  getBannerAd(id: string): Promise<BannerAd | undefined>;
  getBannerAdsByCampaign(campaignId: string): Promise<BannerAd[]>;
  getAllBannerAds(): Promise<BannerAd[]>;
  createBannerAd(ad: InsertBannerAd): Promise<BannerAd>;
  updateBannerAd(id: string, updates: Partial<BannerAd>): Promise<BannerAd | undefined>;
  deleteBannerAd(id: string): Promise<boolean>;

  getAdPlacement(id: string): Promise<AdPlacement | undefined>;
  getAdPlacementsByType(type: string): Promise<AdPlacement[]>;
  createAdPlacement(placement: InsertAdPlacement): Promise<AdPlacement>;
  updateAdPlacement(id: string, updates: Partial<AdPlacement>): Promise<AdPlacement | undefined>;
  deleteAdPlacement(id: string): Promise<boolean>;

  createAdImpression(impression: InsertAdImpression): Promise<AdImpression>;
  getAdImpressions(adId: string, adType: string): Promise<AdImpression[]>;

  createAdClick(click: InsertAdClick): Promise<AdClick>;
  getAdClicks(adId: string, adType: string): Promise<AdClick[]>;

  createAdRevenue(revenue: InsertAdRevenue): Promise<AdRevenue>;
  getAdRevenue(adId: string, adType: string): Promise<AdRevenue[]>;
  getAdRevenueByArtist(artistId: string): Promise<AdRevenue[]>;

  getAdStats(adId: string, adType: string): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
  }>;
}

export abstract class BaseStorage implements IStorage {
  protected client: MongoClient;
  public db: Db;

  constructor(mongoUri?: string) {
    const uri = mongoUri || process.env.MONGODB_URI || "mongodb+srv://sajag:urHyCMEosGgXBGRj@cluster1.l89vj.mongodb.net/riseup4?retryWrites=true&w=majority&authSource=admin";
    this.client = new MongoClient(uri);
    this.db = this.client.db("riseup4");
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log("📚 Database connected successfully");
    } catch (error) {
      console.error("Database connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log("📚 Database disconnected successfully");
    } catch (error) {
      console.error("Database disconnection error:", error);
    }
  }

  // Abstract methods that must be implemented by concrete classes
  abstract getUser(id: string): Promise<User | undefined>;
  abstract getUserByEmail(email: string): Promise<User | undefined>;
  abstract createUser(user: InsertUser): Promise<User>;
  abstract updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  abstract getArtistByUserId(userId: string): Promise<User | undefined>;
  abstract getFeaturedArtists(limit?: number): Promise<User[]>;
  abstract getAllArtists(limit?: number): Promise<User[]>;

  abstract getSong(id: string): Promise<Song | undefined>;
  abstract getSongsByArtist(artistId: string): Promise<Song[]>;
  abstract createSong(song: InsertSong): Promise<Song>;
  abstract updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined>;
  abstract deleteSong(id: string): Promise<boolean>;
  abstract getTrendingSongs(limit?: number): Promise<Song[]>;
  abstract searchSongs(query: string): Promise<Song[]>;
  abstract getAllSongs(options?: { genre?: string; sort?: string; limit?: number }): Promise<Song[]>;

  abstract getMerch(id: string): Promise<Merch | undefined>;
  abstract getMerchByArtist(artistId: string): Promise<Merch[]>;
  abstract createMerch(merch: InsertMerch): Promise<Merch>;
  abstract updateMerch(id: string, updates: Partial<Merch>): Promise<Merch | undefined>;
  abstract deleteMerch(id: string): Promise<boolean>;
  abstract getAllMerch(): Promise<Merch[]>;
  abstract getAllMerchFiltered(filters: any): Promise<Merch[]>;

  abstract getEvent(id: string): Promise<Event | undefined>;
  abstract getEventsByArtist(artistId: string): Promise<Event[]>;
  abstract createEvent(event: InsertEvent): Promise<Event>;
  abstract updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  abstract deleteEvent(id: string): Promise<boolean>;
  abstract getUpcomingEvents(): Promise<Event[]>;
  abstract getAllEventsFiltered(filters: any): Promise<Event[]>;

  abstract getOrder(id: string): Promise<Order | undefined>;
  abstract getOrdersByUser(userId: string): Promise<Order[]>;
  abstract createOrder(order: InsertOrder): Promise<Order>;
  abstract updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;

  abstract getSubscription(id: string): Promise<Subscription | undefined>;
  abstract getSubscriptionsByUser(userId: string): Promise<Subscription[]>;
  abstract getSubscriptionsByArtist(artistId: string): Promise<Subscription[]>;
  abstract createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  abstract updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;

  abstract getBlog(id: string): Promise<Blog | undefined>;
  abstract getBlogsByArtist(artistId: string): Promise<Blog[]>;
  abstract getAllBlogs(): Promise<Blog[]>;
  abstract createBlog(blog: InsertBlog): Promise<Blog>;
  abstract updateBlog(id: string, updates: Partial<Blog>): Promise<Blog | undefined>;
  abstract deleteBlog(id: string): Promise<boolean>;

  abstract getPromoCode(id: string): Promise<PromoCode | undefined>;
  abstract getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  abstract getAllPromoCodes(): Promise<PromoCode[]>;
  abstract createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  abstract updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<PromoCode | undefined>;
  abstract deletePromoCode(id: string): Promise<boolean>;
  abstract validatePromoCode(code: string, userId: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message: string }>;

  abstract getOrderTracking(orderId: string): Promise<OrderTracking[]>;
  abstract createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking>;
  abstract updateOrderTracking(id: string, updates: Partial<OrderTracking>): Promise<OrderTracking | undefined>;

  abstract getReturnRequest(id: string): Promise<ReturnRequest | undefined>;
  abstract getReturnRequestsByUser(userId: string): Promise<ReturnRequest[]>;
  abstract getReturnRequestsByOrder(orderId: string): Promise<ReturnRequest[]>;
  abstract createReturnRequest(request: InsertReturnRequest): Promise<ReturnRequest>;
  abstract updateReturnRequest(id: string, updates: Partial<ReturnRequest>): Promise<ReturnRequest | undefined>;

  abstract logAnalytics(analytics: InsertAnalytics): Promise<void>;

  abstract getAllNFTs(): Promise<NFT[]>;
  abstract getNFT(id: string): Promise<NFT | null>;
  abstract getNFTsByUser(userId: string): Promise<NFT[]>;
  abstract createNFT(nft: InsertNFT): Promise<NFT>;
  abstract updateNFT(id: string, updates: Partial<NFT>): Promise<NFT | null>;
  abstract deleteNFT(id: string): Promise<boolean>;
  abstract getListedNFTs(): Promise<NFT[]>;
  abstract getActiveAuctions(): Promise<NFT[]>;
  abstract createNFTListing(listing: InsertNFTListing): Promise<NFTListing>;
  abstract updateNFTListing(id: string, updates: Partial<NFTListing>): Promise<NFTListing | null>;
  abstract deleteNFTListing(id: string): Promise<boolean>;
  abstract createNFTAuction(auction: InsertNFTAuction): Promise<NFTAuction>;
  abstract updateNFTAuction(id: string, updates: Partial<NFTAuction>): Promise<NFTAuction | null>;
  abstract deleteNFTAuction(id: string): Promise<boolean>;
  abstract createNFTTransaction(transaction: InsertNFTTransaction): Promise<NFTTransaction>;
  abstract getNFTTransactions(nftId: string): Promise<NFTTransaction[]>;
  abstract getNFTTransactionsByUser(userId: string): Promise<NFTTransaction[]>;
  abstract getNFTStats(): Promise<any>;

  abstract getRecentPlaysByUser(userId: string): Promise<Song[]>;
  abstract getArtistNameByProfileId(artistId: string): Promise<string>;
  abstract getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }): Promise<(Song & { artistName: string })[]>;
  abstract getEventsWithArtistNames(filters: any): Promise<(Event & { artistName: string })[]>;
  abstract getMerchWithArtistNames(filters: any): Promise<(Merch & { artistName: string })[]>;

  abstract searchMerch(query: string): Promise<Merch[]>;
  abstract searchEvents(query: string): Promise<Event[]>;
  abstract searchBlogs(query: string): Promise<Blog[]>;

  // Ad methods
  abstract getAdCampaign(id: string): Promise<AdCampaign | undefined>;
  abstract getAllAdCampaigns(): Promise<AdCampaign[]>;
  abstract createAdCampaign(campaign: InsertAdCampaign): Promise<AdCampaign>;
  abstract updateAdCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign | undefined>;
  abstract deleteAdCampaign(id: string): Promise<boolean>;

  abstract getAudioAd(id: string): Promise<AudioAd | undefined>;
  abstract getAudioAdsByCampaign(campaignId: string): Promise<AudioAd[]>;
  abstract getAllAudioAds(): Promise<AudioAd[]>;
  abstract createAudioAd(ad: InsertAudioAd): Promise<AudioAd>;
  abstract updateAudioAd(id: string, updates: Partial<AudioAd>): Promise<AudioAd | undefined>;
  abstract deleteAudioAd(id: string): Promise<boolean>;

  abstract getBannerAd(id: string): Promise<BannerAd | undefined>;
  abstract getBannerAdsByCampaign(campaignId: string): Promise<BannerAd[]>;
  abstract getAllBannerAds(): Promise<BannerAd[]>;
  abstract createBannerAd(ad: InsertBannerAd): Promise<BannerAd>;
  abstract updateBannerAd(id: string, updates: Partial<BannerAd>): Promise<BannerAd | undefined>;
  abstract deleteBannerAd(id: string): Promise<boolean>;

  abstract getAdPlacement(id: string): Promise<AdPlacement | undefined>;
  abstract getAdPlacementsByType(type: string): Promise<AdPlacement[]>;
  abstract createAdPlacement(placement: InsertAdPlacement): Promise<AdPlacement>;
  abstract updateAdPlacement(id: string, updates: Partial<AdPlacement>): Promise<AdPlacement | undefined>;
  abstract deleteAdPlacement(id: string): Promise<boolean>;

  abstract createAdImpression(impression: InsertAdImpression): Promise<AdImpression>;
  abstract getAdImpressions(adId: string, adType: string): Promise<AdImpression[]>;

  abstract createAdClick(click: InsertAdClick): Promise<AdClick>;
  abstract getAdClicks(adId: string, adType: string): Promise<AdClick[]>;

  abstract createAdRevenue(revenue: InsertAdRevenue): Promise<AdRevenue>;
  abstract getAdRevenue(adId: string, adType: string): Promise<AdRevenue[]>;
  abstract getAdRevenueByArtist(artistId: string): Promise<AdRevenue[]>;

  abstract getAdStats(adId: string, adType: string): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
  }>;
}
