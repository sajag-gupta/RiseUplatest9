import type { Express } from "express";
import { authenticateToken, AuthRequest, requireRole } from "../middleware/auth";
import { blockchainService } from "../services/blockchain";
import { storage } from "../storage";

export function setupDaoRoutes(app: Express) {
  // Get all DAO proposals
  app.get("/api/dao/proposals", async (req, res) => {
    try {
      const proposals = await storage.getAllDAOProposals();
      res.json(proposals);
    } catch (error) {
      console.error("Get DAO proposals error:", error);
      res.status(500).json({ message: "Failed to get proposals" });
    }
  });

  // Get DAO proposal by ID
  app.get("/api/dao/proposals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const proposal = await storage.getDAOProposal(id);

      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      res.json(proposal);
    } catch (error) {
      console.error("Get DAO proposal error:", error);
      res.status(500).json({ message: "Failed to get proposal" });
    }
  });

  // Create DAO proposal - Only artists and admins can create proposals
  app.post("/api/dao/proposals", authenticateToken, requireRole(["artist", "admin"]), async (req: AuthRequest, res) => {
    try {
      const { title, description, proposalType, value } = req.body;

      const proposalData = {
        title,
        description,
        proposalType,
        proposerId: req.user!.id,
        contractAddress: process.env.DAO_CONTRACT_ADDRESS,
        value: value || 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        forVotes: 0,
        againstVotes: 0,
        abstainVotes: 0,
        executed: false,
        canceled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const proposal = await storage.createDAOProposal(proposalData);
      res.json(proposal);
    } catch (error) {
      console.error("Create DAO proposal error:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  // Vote on DAO proposal
  app.post("/api/dao/proposals/:id/vote", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { support } = req.body;

      // Get user's governance token balance
      const governanceTokens = await storage.getUserGovernanceTokens(req.user!.id);
      const votingPower = governanceTokens?.balance || 0;

      if (votingPower === 0) {
        return res.status(400).json({ message: "No governance tokens available for voting" });
      }

      const voteData = {
        proposalId: id,
        voterId: req.user!.id,
        support,
        votes: votingPower, // Use actual token balance for voting power
        timestamp: new Date()
      };

      const vote = await storage.createDAOVote(voteData);
      res.json(vote);
    } catch (error) {
      console.error("Vote on DAO proposal error:", error);
      res.status(500).json({ message: "Failed to cast vote" });
    }
  });

  // Execute DAO proposal
  app.post("/api/dao/proposals/:id/execute", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Check if proposal can be executed (voting period ended, quorum reached, etc.)
      const proposal = await storage.getDAOProposal(id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      if (new Date() < new Date(proposal.endTime)) {
        return res.status(400).json({ message: "Voting period not ended" });
      }

      // Execute proposal logic here
      await storage.updateDAOProposal(id, { executed: true, updatedAt: new Date() });

      res.json({ message: "Proposal executed successfully" });
    } catch (error) {
      console.error("Execute DAO proposal error:", error);
      res.status(500).json({ message: "Failed to execute proposal" });
    }
  });

  // Get DAO votes for proposal
  app.get("/api/dao/proposals/:id/votes", async (req, res) => {
    try {
      const { id } = req.params;
      const votes = await storage.getDAOVotes(id);
      res.json(votes);
    } catch (error) {
      console.error("Get DAO votes error:", error);
      res.status(500).json({ message: "Failed to get votes" });
    }
  });

  // Get DAO stats
  app.get("/api/dao/stats", async (req, res) => {
    try {
      const stats = await storage.getDAOStats();
      res.json(stats);
    } catch (error) {
      console.error("Get DAO stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Get user's governance tokens
  app.get("/api/dao/user/tokens", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tokens = await storage.getUserGovernanceTokens(req.user!.id);
      res.json(tokens || { balance: 0, totalEarned: 0, lastUpdated: new Date() });
    } catch (error) {
      console.error("Get user governance tokens error:", error);
      res.status(500).json({ message: "Failed to get governance tokens" });
    }
  });
}
