// Loyalty Program Storage Module
export class LoyaltyStorage {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // Achievement Methods
  async getAllAchievements() {
    try {
      const collection = this.db.collection("achievements");
      const docs = await collection.find({}).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting achievements:", error);
      return [];
    }
  }

  async getAchievement(id: string) {
    try {
      const collection = this.db.collection("achievements");
      const doc = await collection.findOne({ _id: new (require('mongodb').ObjectId)(id) });
      return doc ? { ...doc, _id: doc._id.toString() } : null;
    } catch (error) {
      console.error("Error getting achievement:", error);
      return null;
    }
  }

  async createAchievement(achievement: any) {
    try {
      const collection = this.db.collection("achievements");
      const result = await collection.insertOne({
        ...achievement,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating achievement:", error);
      return achievement;
    }
  }

  // User Achievement Methods
  async getUserAchievements(userId: string) {
    try {
      const collection = this.db.collection("user_achievements");
      const docs = await collection.find({ userId }).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting user achievements:", error);
      return [];
    }
  }

  async createUserAchievement(achievement: any) {
    try {
      const collection = this.db.collection("user_achievements");
      const result = await collection.insertOne({
        ...achievement,
        earnedAt: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating user achievement:", error);
      return achievement;
    }
  }

  // User Loyalty Profile Methods
  async getUserLoyaltyProfile(userId: string) {
    try {
      const collection = this.db.collection("user_loyalty_profiles");
      const doc = await collection.findOne({ userId });
      return doc ? { ...doc, _id: doc._id.toString() } : null;
    } catch (error) {
      console.error("Error getting user loyalty profile:", error);
      return null;
    }
  }

  async createUserLoyaltyProfile(profile: any) {
    try {
      const collection = this.db.collection("user_loyalty_profiles");
      const result = await collection.insertOne({
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating user loyalty profile:", error);
      return profile;
    }
  }

  async updateUserLoyaltyProfile(id: string, updates: any) {
    try {
      const collection = this.db.collection("user_loyalty_profiles");
      await collection.updateOne(
        { _id: new (require('mongodb').ObjectId)(id) },
        { $set: { ...updates, updatedAt: new Date() } }
      );
      return updates;
    } catch (error) {
      console.error("Error updating user loyalty profile:", error);
      return updates;
    }
  }

  // Staking Methods
  async getStakingInfo(tokenId: string) {
    try {
      const collection = this.db.collection("stakings");
      const doc = await collection.findOne({ tokenId });
      return doc ? { ...doc, _id: doc._id.toString() } : null;
    } catch (error) {
      console.error("Error getting staking info:", error);
      return null;
    }
  }

  async createStaking(staking: any) {
    try {
      const collection = this.db.collection("stakings");
      const result = await collection.insertOne(staking);
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating staking:", error);
      return staking;
    }
  }

  async updateStaking(id: string, updates: any) {
    try {
      const collection = this.db.collection("stakings");
      await collection.updateOne(
        { _id: new (require('mongodb').ObjectId)(id) },
        { $set: updates }
      );
      return updates;
    } catch (error) {
      console.error("Error updating staking:", error);
      return updates;
    }
  }

  // Points Transaction Methods
  async createPointsTransaction(transaction: any) {
    try {
      const collection = this.db.collection("points_transactions");
      const result = await collection.insertOne({
        ...transaction,
        timestamp: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating points transaction:", error);
      return transaction;
    }
  }

  // Loyalty Stats Methods
  async getLoyaltyStats() {
    try {
      const profilesCollection = this.db.collection("user_loyalty_profiles");
      const achievementsCollection = this.db.collection("user_achievements");
      const stakingsCollection = this.db.collection("stakings");
      const transactionsCollection = this.db.collection("points_transactions");

      const totalUsers = await profilesCollection.countDocuments();
      const totalAchievementsEarned = await achievementsCollection.countDocuments();
      const activeStakers = await stakingsCollection.countDocuments({ isActive: true });
      const totalStakedNFTs = await stakingsCollection.countDocuments({ isActive: true });

      const pointsResult = await transactionsCollection.aggregate([
        { $group: { _id: null, total: { $sum: "$points" } } }
      ]).toArray();

      const totalPointsDistributed = pointsResult.length > 0 ? pointsResult[0].total : 0;

      return {
        totalUsers,
        totalPointsDistributed,
        totalAchievementsEarned,
        activeStakers,
        totalStakedNFTs,
        levelDistribution: {},
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error getting loyalty stats:", error);
      return {
        totalUsers: 0,
        totalPointsDistributed: 0,
        totalAchievementsEarned: 0,
        activeStakers: 0,
        totalStakedNFTs: 0,
        levelDistribution: {},
        lastUpdated: new Date()
      };
    }
  }
}
