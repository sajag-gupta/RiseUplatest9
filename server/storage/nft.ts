import { ObjectId, Collection } from "mongodb";
import { BaseStorage } from "./base";
import { NFT, InsertNFT, NFTListing, InsertNFTListing, NFTAuction, InsertNFTAuction, NFTTransaction, InsertNFTTransaction } from "../../shared/schemas";

// MongoDB document types (with ObjectId)
interface NFTDoc extends Omit<NFT, '_id'> {
  _id: ObjectId;
}

interface NFTListingDoc extends Omit<NFTListing, '_id'> {
  _id: ObjectId;
}

interface NFTAuctionDoc extends Omit<NFTAuction, '_id'> {
  _id: ObjectId;
}

interface NFTTransactionDoc extends Omit<NFTTransaction, '_id'> {
  _id: ObjectId;
}

export class NFTStorage extends BaseStorage {
  private nfts: Collection<NFTDoc>;
  private nftListings: Collection<NFTListingDoc>;
  private nftAuctions: Collection<NFTAuctionDoc>;
  private nftTransactions: Collection<NFTTransactionDoc>;

  constructor() {
    super();
    this.nfts = this.db.collection("nfts");
    this.nftListings = this.db.collection("nft_listings");
    this.nftAuctions = this.db.collection("nft_auctions");
    this.nftTransactions = this.db.collection("nft_transactions");
  }

  private convertNFTDoc(doc: NFTDoc): NFT {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertNFTListingDoc(doc: NFTListingDoc): NFTListing {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertNFTAuctionDoc(doc: NFTAuctionDoc): NFTAuction {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertNFTTransactionDoc(doc: NFTTransactionDoc): NFTTransaction {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  // NFT CRUD operations
  async getAllNFTs(): Promise<NFT[]> {
    const docs = await this.nfts.find({}).toArray();
    return docs.map(doc => this.convertNFTDoc(doc));
  }

  async getNFT(id: string): Promise<NFT | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.nfts.findOne({ _id: new ObjectId(id) });
    return doc ? this.convertNFTDoc(doc) : null;
  }

  async getNFTsByUser(userId: string): Promise<NFT[]> {
    if (!ObjectId.isValid(userId)) return [];
    const docs = await this.nfts.find({
      $or: [
        { ownerId: userId },
        { creatorId: userId }
      ]
    }).toArray();
    return docs.map(doc => this.convertNFTDoc(doc));
  }

  async createNFT(nft: InsertNFT): Promise<NFT> {
    const nftDoc: Omit<NFTDoc, '_id'> = {
      ...nft,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.nfts.insertOne(nftDoc as NFTDoc);
    const newDoc = await this.nfts.findOne({ _id: result.insertedId });
    return this.convertNFTDoc(newDoc!);
  }

  async updateNFT(id: string, updates: Partial<NFT>): Promise<NFT | null> {
    if (!ObjectId.isValid(id)) return null;

    // Remove _id from updates if present
    const { _id, ...updateData } = updates;

    await this.nfts.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    return this.getNFT(id);
  }

  async deleteNFT(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.nfts.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // NFT Listings
  async getListedNFTs(): Promise<NFT[]> {
    const listings = await this.nftListings.find({ isActive: true }).toArray();
    const nftIds = listings.map(listing => new ObjectId(listing.nftId));

    const docs = await this.nfts.find({
      _id: { $in: nftIds },
      isListed: true
    }).toArray();

    return docs.map(doc => this.convertNFTDoc(doc));
  }

  async createNFTListing(listing: InsertNFTListing): Promise<NFTListing> {
    const listingDoc: Omit<NFTListingDoc, '_id'> = {
      ...listing,
      listedAt: new Date()
    };

    const result = await this.nftListings.insertOne(listingDoc as NFTListingDoc);
    const newDoc = await this.nftListings.findOne({ _id: result.insertedId });
    return this.convertNFTListingDoc(newDoc!);
  }

  async updateNFTListing(id: string, updates: Partial<NFTListing>): Promise<NFTListing | null> {
    if (!ObjectId.isValid(id)) return null;

    // Remove _id from updates if present
    const { _id, ...updateData } = updates;

    await this.nftListings.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const doc = await this.nftListings.findOne({ _id: new ObjectId(id) });
    return doc ? this.convertNFTListingDoc(doc) : null;
  }

  async deleteNFTListing(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.nftListings.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // NFT Auctions
  async getActiveAuctions(): Promise<NFT[]> {
    const auctions = await this.nftAuctions.find({
      isActive: true,
      endTime: { $gt: new Date() }
    }).toArray();

    const nftIds = auctions.map(auction => new ObjectId(auction.nftId));

    const docs = await this.nfts.find({
      _id: { $in: nftIds },
      auctionEndTime: { $exists: true }
    }).toArray();

    return docs.map(doc => this.convertNFTDoc(doc));
  }

  async createNFTAuction(auction: InsertNFTAuction): Promise<NFTAuction> {
    const auctionDoc: Omit<NFTAuctionDoc, '_id'> = {
      ...auction,
      startedAt: new Date()
    };

    const result = await this.nftAuctions.insertOne(auctionDoc as NFTAuctionDoc);
    const newDoc = await this.nftAuctions.findOne({ _id: result.insertedId });
    return this.convertNFTAuctionDoc(newDoc!);
  }

  async updateNFTAuction(id: string, updates: Partial<NFTAuction>): Promise<NFTAuction | null> {
    if (!ObjectId.isValid(id)) return null;

    // Remove _id from updates if present
    const { _id, ...updateData } = updates;

    await this.nftAuctions.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const doc = await this.nftAuctions.findOne({ _id: new ObjectId(id) });
    return doc ? this.convertNFTAuctionDoc(doc) : null;
  }

  async deleteNFTAuction(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.nftAuctions.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // NFT Transactions
  async createNFTTransaction(transaction: InsertNFTTransaction): Promise<NFTTransaction> {
    const transactionDoc: Omit<NFTTransactionDoc, '_id'> = {
      ...transaction,
      timestamp: new Date()
    };

    const result = await this.nftTransactions.insertOne(transactionDoc as NFTTransactionDoc);
    const newDoc = await this.nftTransactions.findOne({ _id: result.insertedId });
    return this.convertNFTTransactionDoc(newDoc!);
  }

  async getNFTTransactions(nftId: string): Promise<NFTTransaction[]> {
    if (!ObjectId.isValid(nftId)) return [];
    const docs = await this.nftTransactions.find({ nftId })
      .sort({ timestamp: -1 })
      .toArray();
    return docs.map(doc => this.convertNFTTransactionDoc(doc));
  }

  async getNFTTransactionsByUser(userId: string): Promise<NFTTransaction[]> {
    if (!ObjectId.isValid(userId)) return [];
    const docs = await this.nftTransactions.find({
      $or: [
        { fromId: userId },
        { toId: userId }
      ]
    })
      .sort({ timestamp: -1 })
      .toArray();
    return docs.map(doc => this.convertNFTTransactionDoc(doc));
  }

  // Placeholder implementations for abstract methods (required by BaseStorage)
  async getUser(id: string): Promise<any> { throw new Error("Not implemented"); }
  async getUserByEmail(email: string): Promise<any> { throw new Error("Not implemented"); }
  async createUser(user: any): Promise<any> { throw new Error("Not implemented"); }
  async updateUser(id: string, updates: Partial<any>): Promise<any> { throw new Error("Not implemented"); }
  async deleteUser(id: string): Promise<boolean> { throw new Error("Not implemented"); }
  async getArtistByUserId(userId: string): Promise<any> { throw new Error("Not implemented"); }
  async getFeaturedArtists(limit?: number): Promise<any[]> { throw new Error("Not implemented"); }
  async getAllArtists(limit?: number): Promise<any[]> { throw new Error("Not implemented"); }
  async searchArtists(query: string): Promise<any[]> { throw new Error("Not implemented"); }

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

  async logAnalytics(analytics: any): Promise<void> { throw new Error("Not implemented"); }

  async getRecentPlaysByUser(userId: string): Promise<any[]> { throw new Error("Not implemented"); }
  async getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }): Promise<any[]> { throw new Error("Not implemented"); }
  async getEventsWithArtistNames(filters: any): Promise<any[]> { throw new Error("Not implemented"); }
  async getMerchWithArtistNames(filters: any): Promise<any[]> { throw new Error("Not implemented"); }

  async getArtistNameByProfileId(artistId: string): Promise<string> { throw new Error("Not implemented"); }
  async searchMerch(query: string): Promise<any[]> { throw new Error("Not implemented"); }
  async searchEvents(query: string): Promise<any[]> { throw new Error("Not implemented"); }
  async searchBlogs(query: string): Promise<any[]> { throw new Error("Not implemented"); }

  // Analytics and stats
  async getNFTStats(): Promise<any> {
    const totalNFTs = await this.nfts.countDocuments();
    const listedNFTs = await this.nfts.countDocuments({ isListed: true });
    const activeAuctions = await this.nftAuctions.countDocuments({
      isActive: true,
      endTime: { $gt: new Date() }
    });

    const totalVolumeResult = await this.nftTransactions.aggregate([
      { $match: { transactionType: { $in: ["sale", "auction"] } } },
      { $group: { _id: null, total: { $sum: "$price" } } }
    ]).toArray();

    const totalVolume = totalVolumeResult.length > 0 ? totalVolumeResult[0].total : 0;

    return {
      totalNFTs,
      listedNFTs,
      activeAuctions,
      totalVolume
    };
  }
}
