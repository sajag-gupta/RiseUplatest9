// NFT Collection Storage Module
export class CollectionStorage {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // Collection Methods
  async getAllCollections() {
    try {
      const collection = this.db.collection("collections");
      const docs = await collection.find({}).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting collections:", error);
      return [];
    }
  }

  async getCollection(id: string) {
    try {
      const collection = this.db.collection("collections");
      const doc = await collection.findOne({ _id: new (require('mongodb').ObjectId)(id) });
      return doc ? { ...doc, _id: doc._id.toString() } : null;
    } catch (error) {
      console.error("Error getting collection:", error);
      return null;
    }
  }

  async createCollection(collection: any) {
    try {
      const coll = this.db.collection("collections");
      const result = await coll.insertOne({
        ...collection,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const newDoc = await coll.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating collection:", error);
      return collection;
    }
  }

  async updateCollection(id: string, updates: any) {
    try {
      const collection = this.db.collection("collections");
      await collection.updateOne(
        { _id: new (require('mongodb').ObjectId)(id) },
        { $set: { ...updates, updatedAt: new Date() } }
      );
      return updates;
    } catch (error) {
      console.error("Error updating collection:", error);
      return updates;
    }
  }

  async deleteCollection(id: string) {
    try {
      const collection = this.db.collection("collections");
      await collection.deleteOne({ _id: new (require('mongodb').ObjectId)(id) });
      return true;
    } catch (error) {
      console.error("Error deleting collection:", error);
      return false;
    }
  }

  // Collection Stats Methods
  async getCollectionStats(collectionId: string) {
    try {
      const nftsCollection = this.db.collection("nfts");
      const transactionsCollection = this.db.collection("nft_transactions");

      const totalNFTs = await nftsCollection.countDocuments({ collectionId });
      const totalVolumeResult = await transactionsCollection.aggregate([
        { $match: { collectionId } },
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]).toArray();

      const totalVolume = totalVolumeResult.length > 0 ? totalVolumeResult[0].total : 0;
      const floorPriceResult = await nftsCollection.find({ collectionId, isListed: true })
        .sort({ price: 1 }).limit(1).toArray();

      const floorPrice = floorPriceResult.length > 0 ? floorPriceResult[0].price : 0;

      return {
        totalNFTs,
        totalVolume,
        floorPrice,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error getting collection stats:", error);
      return {
        totalNFTs: 0,
        totalVolume: 0,
        floorPrice: 0,
        lastUpdated: new Date()
      };
    }
  }

  // Collection by Creator Methods
  async getCollectionsByCreator(creatorId: string) {
    try {
      const collection = this.db.collection("collections");
      const docs = await collection.find({ creatorId }).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting collections by creator:", error);
      return [];
    }
  }

  // Collection Search Methods
  async searchCollections(query: string) {
    try {
      const collection = this.db.collection("collections");
      const docs = await collection.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error searching collections:", error);
      return [];
    }
  }

  // Featured Collections Methods
  async getFeaturedCollections(limit: number = 10) {
    try {
      const collection = this.db.collection("collections");
      const docs = await collection.find({ isFeatured: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting featured collections:", error);
      return [];
    }
  }

  // Collection Analytics Methods
  async getCollectionAnalytics(collectionId: string, timeframe: string = '30d') {
    try {
      const transactionsCollection = this.db.collection("nft_transactions");
      const nftsCollection = this.db.collection("nfts");

      const startDate = new Date();
      switch (timeframe) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const volumeResult = await transactionsCollection.aggregate([
        { $match: { collectionId, timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
            },
            volume: { $sum: "$price" },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]).toArray();

      const totalNFTs = await nftsCollection.countDocuments({ collectionId });
      const listedNFTs = await nftsCollection.countDocuments({ collectionId, isListed: true });

      return {
        timeframe,
        volumeData: volumeResult,
        totalNFTs,
        listedNFTs,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error getting collection analytics:", error);
      return {
        timeframe,
        volumeData: [],
        totalNFTs: 0,
        listedNFTs: 0,
        lastUpdated: new Date()
      };
    }
  }
}
