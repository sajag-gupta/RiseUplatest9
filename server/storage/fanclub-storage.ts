// Fan Club Storage Module
export class FanClubStorage {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // Fan Club Membership Methods
  async getAllFanClubMemberships() {
    try {
      const collection = this.db.collection("fan_club_memberships");
      const docs = await collection.find({}).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting fan club memberships:", error);
      return [];
    }
  }

  async getFanClubMembershipByUser(userId: string) {
    try {
      const collection = this.db.collection("fan_club_memberships");
      const doc = await collection.findOne({ userId });
      return doc ? { ...doc, _id: doc._id.toString() } : null;
    } catch (error) {
      console.error("Error getting fan club membership:", error);
      return null;
    }
  }

  async createFanClubMembership(membership: any) {
    try {
      const collection = this.db.collection("fan_club_memberships");
      const result = await collection.insertOne({
        ...membership,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating fan club membership:", error);
      return membership;
    }
  }

  async updateFanClubMembership(id: string, updates: any) {
    try {
      const collection = this.db.collection("fan_club_memberships");
      await collection.updateOne(
        { _id: new (require('mongodb').ObjectId)(id) },
        { $set: { ...updates, updatedAt: new Date() } }
      );
      return updates;
    } catch (error) {
      console.error("Error updating fan club membership:", error);
      return updates;
    }
  }

  async getFanClubStats() {
    try {
      const collection = this.db.collection("fan_club_memberships");
      const totalMembers = await collection.countDocuments();
      const activeMembers = await collection.countDocuments({ isActive: true });

      return {
        totalMembers,
        activeMembers,
        tierDistribution: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
        totalRevenue: 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error getting fan club stats:", error);
      return {
        totalMembers: 0,
        activeMembers: 0,
        tierDistribution: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
        totalRevenue: 0,
        lastUpdated: new Date()
      };
    }
  }
}
