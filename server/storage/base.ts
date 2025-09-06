import { MongoClient, Db, ObjectId, Collection } from "mongodb";
import {
  User, InsertUser, Song, InsertSong, Merch, InsertMerch, Event, InsertEvent,
  Order, InsertOrder, Subscription, InsertSubscription, Analytics, InsertAnalytics,
  Blog, InsertBlog, PromoCode, InsertPromoCode, OrderTracking, InsertOrderTracking,
  ReturnRequest, InsertReturnRequest
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

  // Additional methods for dashboard
  getRecentPlaysByUser(userId: string): Promise<Song[]>;
  getArtistNameByProfileId(artistId: string): Promise<string>;
  getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }): Promise<(Song & { artistName: string })[]>;
  getEventsWithArtistNames(filters: any): Promise<(Event & { artistName: string })[]>;
  getMerchWithArtistNames(filters: any): Promise<(Merch & { artistName: string })[]>;
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

  abstract getRecentPlaysByUser(userId: string): Promise<Song[]>;
  abstract getArtistNameByProfileId(artistId: string): Promise<string>;
  abstract getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }): Promise<(Song & { artistName: string })[]>;
  abstract getEventsWithArtistNames(filters: any): Promise<(Event & { artistName: string })[]>;
  abstract getMerchWithArtistNames(filters: any): Promise<(Merch & { artistName: string })[]>;
}
