// DAO Governance Storage Module
export class DAOStorage {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // DAO Proposal Methods
  async getAllDAOProposals() {
    try {
      const collection = this.db.collection("dao_proposals");
      const docs = await collection.find({}).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting DAO proposals:", error);
      return [];
    }
  }

  async getDAOProposal(id: string) {
    try {
      const collection = this.db.collection("dao_proposals");
      const doc = await collection.findOne({ _id: new (require('mongodb').ObjectId)(id) });
      return doc ? { ...doc, _id: doc._id.toString() } : null;
    } catch (error) {
      console.error("Error getting DAO proposal:", error);
      return null;
    }
  }

  async createDAOProposal(proposal: any) {
    try {
      const collection = this.db.collection("dao_proposals");
      const result = await collection.insertOne({
        ...proposal,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating DAO proposal:", error);
      return proposal;
    }
  }

  async updateDAOProposal(id: string, updates: any) {
    try {
      const collection = this.db.collection("dao_proposals");
      await collection.updateOne(
        { _id: new (require('mongodb').ObjectId)(id) },
        { $set: { ...updates, updatedAt: new Date() } }
      );
      return updates;
    } catch (error) {
      console.error("Error updating DAO proposal:", error);
      return updates;
    }
  }

  // DAO Vote Methods
  async getDAOVotes(proposalId: string) {
    try {
      const collection = this.db.collection("dao_votes");
      const docs = await collection.find({ proposalId }).toArray();
      return docs.map((doc: any) => ({ ...doc, _id: doc._id.toString() }));
    } catch (error) {
      console.error("Error getting DAO votes:", error);
      return [];
    }
  }

  async createDAOVote(vote: any) {
    try {
      const collection = this.db.collection("dao_votes");
      const result = await collection.insertOne({
        ...vote,
        timestamp: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating DAO vote:", error);
      return vote;
    }
  }

  // Governance Token Methods
  async getUserGovernanceTokens(userId: string) {
    try {
      const collection = this.db.collection("user_governance_tokens");
      const doc = await collection.findOne({ userId });
      return doc ? { ...doc, _id: doc._id.toString() } : null;
    } catch (error) {
      console.error("Error getting user governance tokens:", error);
      return null;
    }
  }

  async createUserGovernanceTokens(tokens: any) {
    try {
      const collection = this.db.collection("user_governance_tokens");
      const result = await collection.insertOne({
        ...tokens,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return { ...newDoc, _id: newDoc._id.toString() };
    } catch (error) {
      console.error("Error creating user governance tokens:", error);
      return tokens;
    }
  }

  async updateUserGovernanceTokens(userId: string, updates: any) {
    try {
      const collection = this.db.collection("user_governance_tokens");
      await collection.updateOne(
        { userId },
        { $set: { ...updates, updatedAt: new Date() } },
        { upsert: true }
      );
      return updates;
    } catch (error) {
      console.error("Error updating user governance tokens:", error);
      return updates;
    }
  }

  // DAO Stats Methods
  async getDAOStats() {
    try {
      const proposalsCollection = this.db.collection("dao_proposals");
      const votesCollection = this.db.collection("dao_votes");
      const tokensCollection = this.db.collection("user_governance_tokens");

      const totalProposals = await proposalsCollection.countDocuments();
      const activeProposals = await proposalsCollection.countDocuments({
        executed: false,
        canceled: false,
        endTime: { $gt: new Date() }
      });
      const executedProposals = await proposalsCollection.countDocuments({ executed: true });

      const totalVotes = await votesCollection.countDocuments();

      const treasuryResult = await proposalsCollection.aggregate([
        { $match: { executed: true, proposalType: "funding" } },
        { $group: { _id: null, total: { $sum: "$value" } } }
      ]).toArray();

      const treasuryBalance = treasuryResult.length > 0 ? treasuryResult[0].total : 0;

      const tokensResult = await tokensCollection.aggregate([
        { $group: { _id: null, total: { $sum: "$balance" } } }
      ]).toArray();

      const totalAllocations = tokensResult.length > 0 ? tokensResult[0].total : 0;

      return {
        totalProposals,
        activeProposals,
        executedProposals,
        totalVotes,
        treasuryBalance,
        totalAllocations,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error getting DAO stats:", error);
      return {
        totalProposals: 0,
        activeProposals: 0,
        executedProposals: 0,
        totalVotes: 0,
        treasuryBalance: 0,
        totalAllocations: 0,
        lastUpdated: new Date()
      };
    }
  }
}
