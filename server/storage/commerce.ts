import { ObjectId, Collection } from "mongodb";
import { BaseStorage } from "./base";
import {
  Order, InsertOrder, Subscription, InsertSubscription,
  PromoCode, InsertPromoCode, OrderTracking, InsertOrderTracking,
  ReturnRequest, InsertReturnRequest
} from "../../shared/schemas";

// MongoDB document types (with ObjectId)
interface OrderDoc extends Omit<Order, '_id'> {
  _id: ObjectId;
}

interface SubscriptionDoc extends Omit<Subscription, '_id'> {
  _id: ObjectId;
}

interface PromoCodeDoc extends Omit<PromoCode, '_id'> {
  _id: ObjectId;
}

interface OrderTrackingDoc extends Omit<OrderTracking, '_id'> {
  _id: ObjectId;
}

interface ReturnRequestDoc extends Omit<ReturnRequest, '_id'> {
  _id: ObjectId;
}

export class CommerceStorage extends BaseStorage {
  private orders: Collection<OrderDoc>;
  private subscriptions: Collection<SubscriptionDoc>;
  private promoCodes: Collection<PromoCodeDoc>;
  private orderTracking: Collection<OrderTrackingDoc>;
  private returnRequests: Collection<ReturnRequestDoc>;

  constructor() {
    super();
    this.orders = this.db.collection("orders");
    this.subscriptions = this.db.collection("subscriptions");
    this.promoCodes = this.db.collection("promoCodes");
    this.orderTracking = this.db.collection("orderTracking");
    this.returnRequests = this.db.collection("returnRequests");
  }

  private convertOrderDoc(doc: OrderDoc): Order {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertSubscriptionDoc(doc: SubscriptionDoc): Subscription {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertPromoCodeDoc(doc: PromoCodeDoc): PromoCode {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertOrderTrackingDoc(doc: OrderTrackingDoc): OrderTracking {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertReturnRequestDoc(doc: ReturnRequestDoc): ReturnRequest {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  // Order methods
  async getOrder(id: string): Promise<Order | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const order = await this.orders.findOne({ _id: new ObjectId(id) });
      return order ? this.convertOrderDoc(order) : undefined;
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    try {
      const orders = await this.orders.find({ userId }).toArray();
      return orders.map(o => this.convertOrderDoc(o));
    } catch (error) {
      console.error('Error getting orders by user:', error);
      return [];
    }
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const orderDoc: Omit<OrderDoc, '_id'> = {
      ...order,
      createdAt: new Date()
    };

    const result = await this.orders.insertOne(orderDoc as OrderDoc);
    const newOrder = await this.orders.findOne({ _id: result.insertedId });
    return this.convertOrderDoc(newOrder!);
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.orders.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getOrder(id);
    } catch (error) {
      console.error('Error updating order:', error);
      return undefined;
    }
  }

  // Subscription methods
  async getSubscription(id: string): Promise<Subscription | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const sub = await this.subscriptions.findOne({ _id: new ObjectId(id) });
      return sub ? this.convertSubscriptionDoc(sub) : undefined;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return undefined;
    }
  }

  async getSubscriptionsByUser(userId: string): Promise<Subscription[]> {
    try {
      const subs = await this.subscriptions.find({ fanId: userId }).toArray();
      return subs.map(s => this.convertSubscriptionDoc(s));
    } catch (error) {
      console.error('Error getting subscriptions by user:', error);
      return [];
    }
  }

  async getSubscriptionsByArtist(artistId: string): Promise<Subscription[]> {
    try {
      const subs = await this.subscriptions.find({ artistId }).toArray();
      return subs.map(s => this.convertSubscriptionDoc(s));
    } catch (error) {
      console.error('Error getting subscriptions by artist:', error);
      return [];
    }
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const subDoc: Omit<SubscriptionDoc, '_id'> = {
      ...subscription,
      createdAt: new Date()
    };

    const result = await this.subscriptions.insertOne(subDoc as SubscriptionDoc);
    const newSub = await this.subscriptions.findOne({ _id: result.insertedId });
    return this.convertSubscriptionDoc(newSub!);
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.subscriptions.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getSubscription(id);
    } catch (error) {
      console.error('Error updating subscription:', error);
      return undefined;
    }
  }

  // Promo Code methods
  async getPromoCode(id: string): Promise<PromoCode | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const promoCode = await this.promoCodes.findOne({ _id: new ObjectId(id) });
      return promoCode ? this.convertPromoCodeDoc(promoCode) : undefined;
    } catch (error) {
      console.error('Error getting promo code:', error);
      return undefined;
    }
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    try {
      const promoCode = await this.promoCodes.findOne({ code: code.toUpperCase() });
      return promoCode ? this.convertPromoCodeDoc(promoCode) : undefined;
    } catch (error) {
      console.error('Error getting promo code by code:', error);
      return undefined;
    }
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    try {
      const promoCodes = await this.promoCodes.find({}).sort({ createdAt: -1 }).toArray();
      return promoCodes.map(p => this.convertPromoCodeDoc(p));
    } catch (error) {
      console.error('Error getting all promo codes:', error);
      return [];
    }
  }

  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const promoCodeDoc: Omit<PromoCodeDoc, '_id'> = {
      ...promoCode,
      createdAt: new Date()
    };

    const result = await this.promoCodes.insertOne(promoCodeDoc as PromoCodeDoc);
    const newPromoCode = await this.promoCodes.findOne({ _id: result.insertedId });
    return this.convertPromoCodeDoc(newPromoCode!);
  }

  async updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<PromoCode | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.promoCodes.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getPromoCode(id);
    } catch (error) {
      console.error('Error updating promo code:', error);
      return undefined;
    }
  }

  async deletePromoCode(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.promoCodes.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting promo code:', error);
      return false;
    }
  }

  async validatePromoCode(code: string, userId: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message: string }> {
    try {
      const promoCode = await this.getPromoCodeByCode(code);

      if (!promoCode) {
        return { valid: false, discount: 0, message: "Invalid promo code" };
      }

      if (!promoCode.isActive) {
        return { valid: false, discount: 0, message: "Promo code is not active" };
      }

      const now = new Date();
      if (now < promoCode.validFrom || now > promoCode.validUntil) {
        return { valid: false, discount: 0, message: "Promo code has expired" };
      }

      if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
        return { valid: false, discount: 0, message: "Promo code usage limit exceeded" };
      }

      if (promoCode.minimumOrderAmount && orderAmount < promoCode.minimumOrderAmount) {
        return { valid: false, discount: 0, message: `Minimum order amount is ₹${promoCode.minimumOrderAmount}` };
      }

      // Calculate discount
      let discount = 0;
      if (promoCode.discountType === "PERCENTAGE") {
        discount = (orderAmount * promoCode.discountValue) / 100;
        if (promoCode.maximumDiscount && discount > promoCode.maximumDiscount) {
          discount = promoCode.maximumDiscount;
        }
      } else if (promoCode.discountType === "FIXED") {
        discount = promoCode.discountValue;
      } else if (promoCode.discountType === "FREE_SHIPPING") {
        discount = 0; // Free shipping handled separately
      }

      return { valid: true, discount, message: "Promo code applied successfully" };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, discount: 0, message: "Error validating promo code" };
    }
  }

  // Order Tracking methods
  async getOrderTracking(orderId: string): Promise<OrderTracking[]> {
    try {
      const tracking = await this.orderTracking.find({ orderId }).sort({ createdAt: 1 }).toArray();
      return tracking.map(t => this.convertOrderTrackingDoc(t));
    } catch (error) {
      console.error('Error getting order tracking:', error);
      return [];
    }
  }

  async createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking> {
    const trackingDoc: Omit<OrderTrackingDoc, '_id'> = {
      ...tracking,
      createdAt: new Date()
    };

    const result = await this.orderTracking.insertOne(trackingDoc as OrderTrackingDoc);
    const newTracking = await this.orderTracking.findOne({ _id: result.insertedId });
    return this.convertOrderTrackingDoc(newTracking!);
  }

  async updateOrderTracking(id: string, updates: Partial<OrderTracking>): Promise<OrderTracking | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.orderTracking.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getOrderTracking(id).then(tracking => tracking[0]);
    } catch (error) {
      console.error('Error updating order tracking:', error);
      return undefined;
    }
  }

  // Return Request methods
  async getReturnRequest(id: string): Promise<ReturnRequest | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const request = await this.returnRequests.findOne({ _id: new ObjectId(id) });
      return request ? this.convertReturnRequestDoc(request) : undefined;
    } catch (error) {
      console.error('Error getting return request:', error);
      return undefined;
    }
  }

  async getReturnRequestsByUser(userId: string): Promise<ReturnRequest[]> {
    try {
      const requests = await this.returnRequests.find({ userId }).sort({ createdAt: -1 }).toArray();
      return requests.map(r => this.convertReturnRequestDoc(r));
    } catch (error) {
      console.error('Error getting return requests by user:', error);
      return [];
    }
  }

  async getReturnRequestsByOrder(orderId: string): Promise<ReturnRequest[]> {
    try {
      const requests = await this.returnRequests.find({ orderId }).sort({ createdAt: -1 }).toArray();
      return requests.map(r => this.convertReturnRequestDoc(r));
    } catch (error) {
      console.error('Error getting return requests by order:', error);
      return [];
    }
  }

  async createReturnRequest(request: InsertReturnRequest): Promise<ReturnRequest> {
    const requestDoc: Omit<ReturnRequestDoc, '_id'> = {
      ...request,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.returnRequests.insertOne(requestDoc as ReturnRequestDoc);
    const newRequest = await this.returnRequests.findOne({ _id: result.insertedId });
    return this.convertReturnRequestDoc(newRequest!);
  }

  async updateReturnRequest(id: string, updates: Partial<ReturnRequest>): Promise<ReturnRequest | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.returnRequests.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

      return this.getReturnRequest(id);
    } catch (error) {
      console.error('Error updating return request:', error);
      return undefined;
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

  async logAnalytics(analytics: any): Promise<void> { throw new Error("Not implemented"); }

  async getRecentPlaysByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getArtistNameByProfileId(artistId: string): Promise<string> { throw new Error("Not implemented"); }
  async getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }): Promise<any[]> { throw new Error("Not implemented"); }
  async getEventsWithArtistNames(filters: any): Promise<any[]> { throw new Error("Not implemented"); }
  async getMerchWithArtistNames(filters: any): Promise<any[]> { throw new Error("Not implemented"); }

  async getAllNFTs(): Promise<any[]> { throw new Error("Not implemented"); }
  async getNFT(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getNFTsByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async createNFT(nft: any): Promise<any> { throw new Error("Not implemented"); }
  async updateNFT(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteNFT(id: string): Promise<boolean> { throw new Error("Not implemented"); }
  async getListedNFTs(): Promise<any[]> { throw new Error("Not implemented"); }
  async getActiveAuctions(): Promise<any[]> { throw new Error("Not implemented"); }
  async createNFTListing(listing: any): Promise<any> { throw new Error("Not implemented"); }
  async updateNFTListing(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteNFTListing(id: string): Promise<boolean> { throw new Error("Not implemented"); }
  async createNFTAuction(auction: any): Promise<any> { throw new Error("Not implemented"); }
  async updateNFTAuction(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteNFTAuction(id: string): Promise<boolean> { throw new Error("Not implemented"); }
  async createNFTTransaction(transaction: any): Promise<any> { throw new Error("Not implemented"); }
  async getNFTTransactions(nftId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getNFTTransactionsByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getNFTStats(): Promise<any> { throw new Error("Not implemented"); }

  async searchMerch(query: string): Promise<any[]> { throw new Error("Not implemented"); }
  async searchEvents(query: string): Promise<any[]> { throw new Error("Not implemented"); }
  async searchBlogs(query: string): Promise<any[]> { throw new Error("Not implemented"); }
}
