import { ObjectId, Collection } from "mongodb";
import { BaseStorage } from "./base";
import { Song, InsertSong, Merch, InsertMerch, Event, InsertEvent, Blog, InsertBlog } from "../../shared/schemas";

// MongoDB document types (with ObjectId)
interface SongDoc extends Omit<Song, '_id'> {
  _id: ObjectId;
}

interface MerchDoc extends Omit<Merch, '_id'> {
  _id: ObjectId;
}

interface EventDoc extends Omit<Event, '_id'> {
  _id: ObjectId;
}

interface BlogDoc extends Omit<Blog, '_id'> {
  _id: ObjectId;
}

export class ContentStorage extends BaseStorage {
  private songs: Collection<SongDoc>;
  private merch: Collection<MerchDoc>;
  private events: Collection<EventDoc>;
  private blogs: Collection<BlogDoc>;

  constructor() {
    super();
    this.songs = this.db.collection("songs");
    this.merch = this.db.collection("merch");
    this.events = this.db.collection("events");
    this.blogs = this.db.collection("blogs");
  }

  private convertSongDoc(doc: SongDoc): Song {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertMerchDoc(doc: MerchDoc): Merch {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertEventDoc(doc: EventDoc): Event {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  private convertBlogDoc(doc: BlogDoc): Blog {
    return {
      ...doc,
      _id: doc._id.toString()
    };
  }

  // Song methods
  async getSong(id: string): Promise<Song | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const song = await this.songs.findOne({ _id: new ObjectId(id) });
      return song ? this.convertSongDoc(song) : undefined;
    } catch (error) {
      console.error('Error getting song:', error);
      return undefined;
    }
  }

  async getSongsByArtist(artistId: string): Promise<Song[]> {
    try {
      const songs = await this.songs.find({ artistId }).toArray();
      return songs.map(s => this.convertSongDoc(s));
    } catch (error) {
      console.error('Error getting songs by artist:', error);
      return [];
    }
  }

  async createSong(song: InsertSong): Promise<Song> {
    const songDoc: Omit<SongDoc, '_id'> = {
      ...song,
      createdAt: new Date()
    };

    const result = await this.songs.insertOne(songDoc as SongDoc);
    const newSong = await this.songs.findOne({ _id: result.insertedId });
    return this.convertSongDoc(newSong!);
  }

  async updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.songs.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getSong(id);
    } catch (error) {
      console.error('Error updating song:', error);
      return undefined;
    }
  }

  async deleteSong(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.songs.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting song:', error);
      return false;
    }
  }

  async getTrendingSongs(limit = 10): Promise<Song[]> {
    try {
      const songs = await this.songs.find({
        visibility: "PUBLIC"
      })
        .sort({ plays: -1, likes: -1, createdAt: -1 })
        .limit(limit)
        .toArray();
      return songs.map(s => this.convertSongDoc(s));
    } catch (error) {
      console.error('Error getting trending songs:', error);
      return [];
    }
  }

  async searchSongs(query: string): Promise<Song[]> {
    try {
      const songs = await this.songs.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { genre: { $regex: query, $options: 'i' } }
        ]
      }).toArray();
      return songs.map(s => this.convertSongDoc(s));
    } catch (error) {
      console.error('Error searching songs:', error);
      return [];
    }
  }

  async searchMerch(query: string): Promise<Merch[]> {
    try {
      const merch = await this.merch.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }).toArray();
      return merch.map(m => this.convertMerchDoc(m));
    } catch (error) {
      console.error('Error searching merch:', error);
      return [];
    }
  }

  async searchEvents(query: string): Promise<Event[]> {
    try {
      const events = await this.events.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } }
        ]
      }).toArray();
      return events.map(e => this.convertEventDoc(e));
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  }

  async searchBlogs(query: string): Promise<Blog[]> {
    try {
      const blogs = await this.blogs.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }).toArray();
      return blogs.map(b => this.convertBlogDoc(b));
    } catch (error) {
      console.error('Error searching blogs:', error);
      return [];
    }
  }

  async getAllSongs(options: { genre?: string; sort?: string; limit?: number } = {}): Promise<Song[]> {
    try {
      const { genre, sort = 'latest', limit = 20 } = options;

      // Build query
      const query: any = {
        visibility: "PUBLIC"  // Only show public songs
      };
      if (genre && genre !== 'all') {
        query.genre = { $regex: genre, $options: 'i' };
      }

      // Build sort
      let sortQuery: any = {};
      switch (sort) {
        case 'popular':
          sortQuery = { plays: -1, likes: -1 };
          break;
        case 'trending':
          sortQuery = { plays: -1, createdAt: -1 };
          break;
        case 'alphabetical':
          sortQuery = { title: 1 };
          break;
        case 'latest':
        default:
          sortQuery = { createdAt: -1 };
          break;
      }

      const songs = await this.songs.find(query)
        .sort(sortQuery)
        .limit(limit)
        .toArray();

      return songs.map(s => this.convertSongDoc(s));
    } catch (error) {
      console.error('Error getting all songs:', error);
      return [];
    }
  }

  // Merch methods
  async getMerch(id: string): Promise<Merch | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const item = await this.merch.findOne({ _id: new ObjectId(id) });
      return item ? this.convertMerchDoc(item) : undefined;
    } catch (error) {
      console.error('Error getting merch:', error);
      return undefined;
    }
  }

  async getMerchByArtist(artistId: string): Promise<Merch[]> {
    try {
      if (!artistId) return [];
      const merchItems = await this.merch.find({ artistId: artistId }).toArray();
      return merchItems.map(m => this.convertMerchDoc(m));
    } catch (error) {
      console.error('Error getting merch by artist:', error);
      return [];
    }
  }

  async createMerch(merch: InsertMerch): Promise<Merch> {
    const merchDoc: Omit<MerchDoc, '_id'> = {
      ...merch,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.merch.insertOne(merchDoc as MerchDoc);
    const newMerch = await this.merch.findOne({ _id: result.insertedId });
    return this.convertMerchDoc(newMerch!);
  }

  async updateMerch(id: string, updates: Partial<Merch>): Promise<Merch | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.merch.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

      return this.getMerch(id);
    } catch (error) {
      console.error('Error updating merch:', error);
      return undefined;
    }
  }

  async deleteMerch(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.merch.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting merch:', error);
      return false;
    }
  }

  async getAllMerch(): Promise<Merch[]> {
    try {
      const items = await this.merch.find({}).toArray();
      return items.map(m => this.convertMerchDoc(m));
    } catch (error) {
      console.error('Error getting all merch:', error);
      return [];
    }
  }

  async getAllMerchFiltered(filters: any): Promise<Merch[]> {
    try {
      const items = await this.merch.find(filters).toArray();
      return items.map(m => this.convertMerchDoc(m));
    } catch (error) {
      console.error('Error getting filtered merch:', error);
      return [];
    }
  }

  // Event methods
  async getEvent(id: string): Promise<Event | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const event = await this.events.findOne({ _id: new ObjectId(id) });
      return event ? this.convertEventDoc(event) : undefined;
    } catch (error) {
      console.error('Error getting event:', error);
      return undefined;
    }
  }

  async getEventsByArtist(artistId: string): Promise<Event[]> {
    try {
      if (!artistId) return [];
      const events = await this.events.find({ artistId: artistId }).toArray();
      return events.map(e => this.convertEventDoc(e));
    } catch (error) {
      console.error('Error getting events by artist:', error);
      return [];
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const eventDoc: Omit<EventDoc, '_id'> = {
      ...event,
      createdAt: new Date()
    };

    const result = await this.events.insertOne(eventDoc as EventDoc);
    const newEvent = await this.events.findOne({ _id: result.insertedId });
    return this.convertEventDoc(newEvent!);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.events.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return this.getEvent(id);
    } catch (error) {
      console.error('Error updating event:', error);
      return undefined;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.events.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  async getUpcomingEvents(): Promise<Event[]> {
    try {
      const events = await this.events.find({
        date: { $gte: new Date() }
      }).sort({ date: 1 }).toArray();
      return events.map(e => this.convertEventDoc(e));
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  async getAllEventsFiltered(filters: any): Promise<Event[]> {
    try {
      const events = await this.events.find(filters)
        .sort({ date: 1 })
        .toArray();
      return events.map(e => this.convertEventDoc(e));
    } catch (error) {
      console.error('Error getting filtered events:', error);
      return [];
    }
  }

  // Blog methods
  async getBlog(id: string): Promise<Blog | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;
      const blog = await this.blogs.findOne({ _id: new ObjectId(id) });
      return blog ? this.convertBlogDoc(blog) : undefined;
    } catch (error) {
      console.error('Error getting blog:', error);
      return undefined;
    }
  }

  async getBlogsByArtist(artistId: string): Promise<Blog[]> {
    try {
      const blogs = await this.blogs.find({ artistId }).toArray();
      return blogs.map(b => this.convertBlogDoc(b));
    } catch (error) {
      console.error('Error getting blogs by artist:', error);
      return [];
    }
  }

  async getAllBlogs(): Promise<Blog[]> {
    try {
      const blogs = await this.blogs.find({}).sort({ createdAt: -1 }).toArray();
      return blogs.map(b => this.convertBlogDoc(b));
    } catch (error) {
      console.error('Error getting all blogs:', error);
      return [];
    }
  }

  async createBlog(blog: InsertBlog): Promise<Blog> {
    const blogDoc: Omit<BlogDoc, '_id'> = {
      ...blog,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.blogs.insertOne(blogDoc as BlogDoc);
    const newBlog = await this.blogs.findOne({ _id: result.insertedId });
    return this.convertBlogDoc(newBlog!);
  }

  async updateBlog(id: string, updates: Partial<Blog>): Promise<Blog | undefined> {
    try {
      if (!ObjectId.isValid(id)) return undefined;

      const { _id, ...updateData } = updates;

      await this.blogs.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

      return this.getBlog(id);
    } catch (error) {
      console.error('Error updating blog:', error);
      return undefined;
    }
  }

  async deleteBlog(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) return false;
      const result = await this.blogs.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting blog:', error);
      return false;
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
}
