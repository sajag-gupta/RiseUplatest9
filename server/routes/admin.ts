import type { Express } from "express";
import { ObjectId } from "mongodb";
import { storage } from "../storage";
import { UserStorage } from "../storage/user";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { sendArtistVerificationEmail } from "../services/email";

const userStorage = new UserStorage();

export function setupAdminRoutes(app: Express) {
  // Get pending artists for verification
  app.get("/api/admin/pending-artists", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      // Get artists awaiting verification
      const artists = await userStorage.db.collection("users").find({
        role: "artist",
        "artist.verified": false
      }).toArray();

      res.json(artists);
    } catch (error) {
      console.error("Get pending artists error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify/reject artist
  app.post("/api/admin/verify-artist/:artistId", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { artistId } = req.params;
      const { approved, reason } = req.body;

      const artist = await storage.getArtistByUserId(artistId);
      if (artist && artist.artist) {
        await storage.updateUser(artistId, {
          artist: { ...artist.artist, verified: approved }
        });
      }

      const user = await storage.getUser(artistId);
      if (user) {
        await sendArtistVerificationEmail(
          user.email,
          user.name,
          approved ? "approved" : "rejected",
          reason,
        );
      }

      res.json({ message: "Artist verification updated" });
    } catch (error) {
      console.error("Verify artist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { role, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (role && role !== "all") {
        query.role = role;
      }

      const users = await userStorage.db.collection("users")
        .find(query)
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      // Get total count
      const total = await userStorage.db.collection("users").countDocuments(query);

      res.json({
        users,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user by ID (admin only)
  app.get("/api/admin/users/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Soft delete by setting deleted flag
      const user = await storage.updateUser(id, { deleted: true });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all orders (admin only)
  app.get("/api/admin/orders", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (status && status !== "all") {
        query.status = status;
      }

      const orders = await userStorage.db.collection("orders")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      // Get total count
      const total = await userStorage.db.collection("orders").countDocuments(query);

      res.json({
        orders,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get order by ID (admin only)
  app.get("/api/admin/orders/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update order status (admin only)
  app.patch("/api/admin/orders/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const order = await storage.updateOrder(id, { status, adminNotes: notes });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Update order error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get analytics dashboard data (admin only)
  app.get("/api/admin/analytics", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { period = 30 } = req.query;
      const days = parseInt(period as string);

      // Get user statistics
      const totalUsers = await userStorage.db.collection("users").countDocuments();
      const artistCount = await userStorage.db.collection("users").countDocuments({ role: "artist" });
      const fanCount = await userStorage.db.collection("users").countDocuments({ role: "fan" });

      // Get content statistics
      const totalSongs = await userStorage.db.collection("songs").countDocuments();
      const totalEvents = await userStorage.db.collection("events").countDocuments();
      const totalMerch = await userStorage.db.collection("merch").countDocuments();
      const totalBlogs = await userStorage.db.collection("blogs").countDocuments();

      // Get order statistics
      const totalOrders = await userStorage.db.collection("orders").countDocuments();
      const completedOrders = await userStorage.db.collection("orders").countDocuments({ status: "PAID" });

      // Get revenue statistics
      const revenueResult = await userStorage.db.collection("orders").aggregate([
        { $match: { status: "PAID" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]).toArray();

      const totalRevenue = revenueResult[0]?.total || 0;

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const recentUsers = await userStorage.db.collection("users").countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      const recentOrders = await userStorage.db.collection("orders").countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      const recentSongs = await userStorage.db.collection("songs").countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      res.json({
        overview: {
          totalUsers,
          artistCount,
          fanCount,
          totalSongs,
          totalEvents,
          totalMerch,
          totalBlogs,
          totalOrders,
          completedOrders,
          totalRevenue
        },
        recent: {
          users: recentUsers,
          orders: recentOrders,
          songs: recentSongs,
          period: days
        }
      });
    } catch (error) {
      console.error("Get admin analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get content reports (admin only)
  app.get("/api/admin/content-reports", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      // Placeholder for content reports - implement based on your content moderation system
      // This could be reports on songs, blogs, comments, etc.
      const contentReports: any[] = []; // TODO: Implement content reports collection

      res.json(contentReports);
    } catch (error) {
      console.error("Get content reports error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get admin dashboard data (admin only)
  app.get("/api/admin/dashboard", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      // Get pending artists count
      const pendingArtists = await userStorage.db.collection("users").countDocuments({
        role: "artist",
        "artist.verified": false
      });

      // Get content reports count (placeholder - implement based on your content moderation system)
      const contentReports = 0; // TODO: Implement content reports collection

      // Get active users count (users active in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeUsers = await userStorage.db.collection("users").countDocuments({
        lastLogin: { $gte: thirtyDaysAgo }
      });

      // Get platform revenue (placeholder - implement based on your revenue tracking)
      const platformRevenue = 0; // TODO: Implement revenue calculation

      res.json({
        pendingArtists,
        contentReports,
        activeUsers,
        platformRevenue
      });
    } catch (error) {
      console.error("Dashboard data error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Ban/suspend user (admin only)
  app.post("/api/admin/users/:id/ban", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { reason, duration } = req.body; // duration in days, null for permanent

      const banUntil = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

      const user = await storage.updateUser(id, {
        banned: true,
        banReason: reason,
        banUntil: banUntil,
        bannedAt: new Date(),
        bannedBy: req.user!.id
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'ban_user', { userId: id, reason, duration });

      res.json({ message: "User banned successfully", user });
    } catch (error) {
      console.error("Ban user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Unban user (admin only)
  app.post("/api/admin/users/:id/unban", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const user = await storage.updateUser(id, {
        banned: false,
        banReason: null,
        banUntil: null,
        bannedAt: null,
        bannedBy: null,
        unbannedAt: new Date(),
        unbannedBy: req.user!.id
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'unban_user', { userId: id });

      res.json({ message: "User unbanned successfully", user });
    } catch (error) {
      console.error("Unban user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:id/reset-password", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      // Generate new password hash
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(newPassword, 10);

      const user = await storage.updateUser(id, {
        passwordHash,
        passwordResetAt: new Date(),
        passwordResetBy: req.user!.id
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'reset_password', { userId: id });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change user role (admin only)
  app.post("/api/admin/users/:id/change-role", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { newRole, reason } = req.body;

      if (!['fan', 'artist', 'admin'].includes(newRole)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUser(id, {
        role: newRole,
        roleChangedAt: new Date(),
        roleChangedBy: req.user!.id,
        roleChangeReason: reason
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'change_role', { userId: id, oldRole: user.role, newRole, reason });

      res.json({ message: "User role changed successfully", user });
    } catch (error) {
      console.error("Change role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all NFTs for admin management
  app.get("/api/admin/nfts", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { status, creator, limit = 50, offset = 0 } = req.query;

      const nfts = await storage.getAllNFTs();

      // Filter NFTs based on query parameters
      let filteredNFTs = nfts;

      if (status === 'listed') {
        filteredNFTs = filteredNFTs.filter(nft => nft.isListed);
      } else if (status === 'unlisted') {
        filteredNFTs = filteredNFTs.filter(nft => !nft.isListed);
      }

      if (creator) {
        filteredNFTs = filteredNFTs.filter(nft => nft.creatorId === creator);
      }

      // Apply pagination
      const paginatedNFTs = filteredNFTs.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

      res.json({
        nfts: paginatedNFTs,
        total: filteredNFTs.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get admin NFTs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Freeze/unfreeze NFT (admin only)
  app.post("/api/admin/nfts/:id/freeze", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { frozen, reason } = req.body;

      const nft = await storage.updateNFT(id, {
        frozen,
        frozenReason: reason,
        frozenAt: frozen ? new Date() : null,
        frozenBy: frozen ? req.user!.id : null
      });

      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      // Log admin action
      await logAdminAction(req.user!.id, frozen ? 'freeze_nft' : 'unfreeze_nft', { nftId: id, reason });

      res.json({ message: `NFT ${frozen ? 'frozen' : 'unfrozen'} successfully`, nft });
    } catch (error) {
      console.error("Freeze NFT error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Edit NFT metadata (admin only)
  app.patch("/api/admin/nfts/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const nft = await storage.updateNFT(id, {
        ...updates,
        editedAt: new Date(),
        editedBy: req.user!.id
      });

      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'edit_nft', { nftId: id, updates });

      res.json({ message: "NFT updated successfully", nft });
    } catch (error) {
      console.error("Edit NFT error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Burn NFT (admin only)
  app.delete("/api/admin/nfts/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const nft = await storage.getNFT(id);
      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }

      // Mark as burned in database
      await storage.updateNFT(id, {
        burned: true,
        burnedAt: new Date(),
        burnedBy: req.user!.id,
        burnReason: reason
      });

      // Log admin action
      await logAdminAction(req.user!.id, 'burn_nft', { nftId: id, reason });

      res.json({ message: "NFT burned successfully" });
    } catch (error) {
      console.error("Burn NFT error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get NFT transactions (admin only)
  app.get("/api/admin/nfts/transactions", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const transactions = await userStorage.db.collection("nft_transactions")
        .find({})
        .sort({ timestamp: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await userStorage.db.collection("nft_transactions").countDocuments();

      res.json({
        transactions,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get NFT transactions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get payment transactions (admin only)
  app.get("/api/admin/payments/transactions", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { status, type, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (status && status !== "all") {
        query.status = status;
      }
      if (type && type !== "all") {
        query.type = type;
      }

      const transactions = await userStorage.db.collection("payments")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await userStorage.db.collection("payments").countDocuments(query);

      res.json({
        transactions,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get payment transactions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Process refund (admin only) - Integrated with Razorpay
  app.post("/api/admin/payments/:id/refund", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { amount, reason, returnRequestId } = req.body;

      const { ObjectId } = require('mongodb');
      const { refundPayment } = await import("../services/razorpay");

      // Get order/payment details
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!order.razorpayPaymentId) {
        return res.status(400).json({ message: "No payment ID found for this order" });
      }

      // Process refund via Razorpay
      const refundAmount = amount || order.totalAmount;
      const razorpayRefund = await refundPayment(order.razorpayPaymentId, refundAmount);

      // Update order status
      await storage.updateOrder(id, {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundedBy: req.user!.id,
        refundReason: reason,
        refundAmount: refundAmount,
        razorpayRefundId: razorpayRefund.id
      });

      // Update return request if provided
      if (returnRequestId) {
        await storage.updateReturnRequest(returnRequestId, {
          status: "REFUNDED",
          adminNotes: `Refund processed: ₹${refundAmount}. ${reason || ''}`
        });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'process_refund', {
        orderId: id,
        paymentId: order.razorpayPaymentId,
        refundId: razorpayRefund.id,
        amount: refundAmount,
        reason,
        returnRequestId
      });

      res.json({
        message: "Refund processed successfully",
        refund: razorpayRefund,
        orderId: id
      });
    } catch (error: any) {
      console.error("Process refund error:", error);
      res.status(500).json({
        message: error.message || "Failed to process refund",
        error: error.response?.data || error.message
      });
    }
  });

  // Get royalty payments (admin only)
  app.get("/api/admin/royalty/payments", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { artist, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (artist) {
        query.artistId = artist;
      }

      const royaltyPayments = await userStorage.db.collection("royalty_payments")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await userStorage.db.collection("royalty_payments").countDocuments(query);

      res.json({
        royaltyPayments,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get royalty payments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Marketplace Moderation - Report & Review System
  app.get("/api/admin/marketplace/reports", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { status, type, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (status && status !== "all") {
        query.status = status;
      }
      if (type && type !== "all") {
        query.reportType = type;
      }

      const reports = await userStorage.db.collection("marketplace_reports")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await userStorage.db.collection("marketplace_reports").countDocuments(query);

      res.json({
        reports,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get marketplace reports error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Take Down Listings
  app.post("/api/admin/marketplace/listings/:listingId/takedown", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { listingId } = req.params;
      const { reason, permanent } = req.body;

      // Update listing status
      await userStorage.db.collection("nft_listings").updateOne(
        { _id: new ObjectId(listingId) },
        {
          $set: {
            status: permanent ? "permanently_removed" : "temporarily_removed",
            removedAt: new Date(),
            removedBy: req.user!.id,
            removalReason: reason,
            isActive: false
          }
        }
      );

      // Log admin action
      await logAdminAction(req.user!.id, 'takedown_listing', { listingId, reason, permanent });

      res.json({ message: "Listing taken down successfully" });
    } catch (error) {
      console.error("Takedown listing error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Flag Suspicious Transactions
  app.post("/api/admin/marketplace/transactions/:transactionId/flag", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { transactionId } = req.params;
      const { reason, riskLevel } = req.body;

      // Update transaction with flag
      await userStorage.db.collection("nft_transactions").updateOne(
        { _id: new ObjectId(transactionId) },
        {
          $set: {
            flagged: true,
            flagReason: reason,
            riskLevel: riskLevel,
            flaggedAt: new Date(),
            flaggedBy: req.user!.id
          }
        }
      );

      // Log admin action
      await logAdminAction(req.user!.id, 'flag_transaction', { transactionId, reason, riskLevel });

      res.json({ message: "Transaction flagged successfully" });
    } catch (error) {
      console.error("Flag transaction error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dispute Resolution
  app.post("/api/admin/marketplace/disputes/:disputeId/resolve", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { disputeId } = req.params;
      const { resolution, refundAmount, notes } = req.body;

      // Update dispute resolution
      await userStorage.db.collection("marketplace_disputes").updateOne(
        { _id: new ObjectId(disputeId) },
        {
          $set: {
            status: "resolved",
            resolution: resolution,
            refundAmount: refundAmount,
            resolvedAt: new Date(),
            resolvedBy: req.user!.id,
            adminNotes: notes
          }
        }
      );

      // Process refund if applicable
      if (refundAmount > 0) {
        // Implement refund logic here
        await logAdminAction(req.user!.id, 'process_dispute_refund', { disputeId, refundAmount });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'resolve_dispute', { disputeId, resolution, refundAmount });

      res.json({ message: "Dispute resolved successfully" });
    } catch (error) {
      console.error("Resolve dispute error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Auction Oversight - Cancel Auction
  app.post("/api/admin/marketplace/auctions/:auctionId/cancel", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { auctionId } = req.params;
      const { reason } = req.body;

      // Cancel auction
      await userStorage.db.collection("nft_auctions").updateOne(
        { _id: new ObjectId(auctionId) },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledBy: req.user!.id,
            cancellationReason: reason,
            isActive: false
          }
        }
      );

      // Log admin action
      await logAdminAction(req.user!.id, 'cancel_auction', { auctionId, reason });

      res.json({ message: "Auction cancelled successfully" });
    } catch (error) {
      console.error("Cancel auction error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DAO Governance Oversight - Monitor Proposals
  app.get("/api/admin/dao/proposals", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (status && status !== "all") {
        query.status = status;
      }

      const proposals = await userStorage.db.collection("dao_proposals")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await userStorage.db.collection("dao_proposals").countDocuments(query);

      res.json({
        proposals,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get DAO proposals error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Freeze Malicious Proposals
  app.post("/api/admin/dao/proposals/:proposalId/freeze", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { proposalId } = req.params;
      const { reason } = req.body;

      // Freeze proposal
      await userStorage.db.collection("dao_proposals").updateOne(
        { _id: new ObjectId(proposalId) },
        {
          $set: {
            status: "frozen",
            frozenAt: new Date(),
            frozenBy: req.user!.id,
            freezeReason: reason
          }
        }
      );

      // Log admin action
      await logAdminAction(req.user!.id, 'freeze_proposal', { proposalId, reason });

      res.json({ message: "Proposal frozen successfully" });
    } catch (error) {
      console.error("Freeze proposal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Override DAO in Emergencies
  app.post("/api/admin/dao/emergency-override", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { action, reason, details } = req.body;

      // Log emergency override action
      await userStorage.db.collection("dao_emergency_actions").insertOne({
        action,
        reason,
        details,
        executedBy: req.user!.id,
        executedAt: new Date()
      });

      // Log admin action
      await logAdminAction(req.user!.id, 'dao_emergency_override', { action, reason, details });

      res.json({ message: "Emergency override executed successfully" });
    } catch (error) {
      console.error("DAO emergency override error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Issue Governance Tokens
  app.post("/api/admin/dao/issue-tokens", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { recipientId, amount, reason } = req.body;

      // Update user governance tokens
      const user = await storage.getUser(recipientId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const governanceTokens = await storage.getUserGovernanceTokens(recipientId);
      const currentTokens = governanceTokens?.balance || 0;
      const newBalance = currentTokens + amount;

      await storage.updateUserGovernanceTokens(recipientId, {
        balance: newBalance,
        totalEarned: (governanceTokens?.totalEarned || 0) + amount,
        lastUpdated: new Date()
      });

      // Log token issuance
      await userStorage.db.collection("governance_token_issuances").insertOne({
        recipientId,
        amount,
        reason,
        issuedBy: req.user!.id,
        issuedAt: new Date()
      });

      // Log admin action
      await logAdminAction(req.user!.id, 'issue_governance_tokens', { recipientId, amount, reason });

      res.json({ message: "Governance tokens issued successfully", newBalance });
    } catch (error) {
      console.error("Issue governance tokens error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System Settings & Configuration
  app.get("/api/admin/settings", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const settings = await userStorage.db.collection("system_settings").findOne({});
      res.json(settings || {});
    } catch (error) {
      console.error("Get system settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update System Settings
  app.patch("/api/admin/settings", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const updates = req.body;

      await userStorage.db.collection("system_settings").updateOne(
        {},
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
            updatedBy: req.user!.id
          }
        },
        { upsert: true }
      );

      // Log admin action
      await logAdminAction(req.user!.id, 'update_system_settings', { updates });

      res.json({ message: "System settings updated successfully" });
    } catch (error) {
      console.error("Update system settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced Analytics
  app.get("/api/admin/analytics/enhanced", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { period = 30 } = req.query;
      const days = parseInt(period as string);

      // User Analytics
      const totalUsers = await userStorage.db.collection("users").countDocuments();
      const artistCount = await userStorage.db.collection("users").countDocuments({ role: "artist" });
      const fanCount = await userStorage.db.collection("users").countDocuments({ role: "fan" });
      const adminCount = await userStorage.db.collection("users").countDocuments({ role: "admin" });

      // NFT Sales Analytics
      const totalNFTSales = await userStorage.db.collection("nft_transactions").countDocuments({ transactionType: "sale" });
      const totalNFTVolume = await userStorage.db.collection("nft_transactions").aggregate([
        { $match: { transactionType: "sale" } },
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]).toArray();

      // Royalty Analytics
      const totalRoyaltiesPaid = await userStorage.db.collection("royalty_payments").aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).toArray();

      // Platform Earnings
      const platformEarnings = await userStorage.db.collection("nft_transactions").aggregate([
        { $match: { transactionType: "sale" } },
        { $group: { _id: null, total: { $sum: "$platformFee" } } }
      ]).toArray();

      // Fan Club Analytics
      const fanClubMemberships = await userStorage.db.collection("fanclub_memberships").countDocuments();
      const fanClubRevenue = await userStorage.db.collection("fanclub_memberships").aggregate([
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]).toArray();

      // Marketplace Health
      const activeAuctions = await userStorage.db.collection("nft_auctions").countDocuments({ isActive: true });
      const averageBidPrice = await userStorage.db.collection("nft_auctions").aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, average: { $avg: "$highestBid" } } }
      ]).toArray();

      // DAO Activity
      const totalProposals = await userStorage.db.collection("dao_proposals").countDocuments();
      const activeProposals = await userStorage.db.collection("dao_proposals").countDocuments({ status: "active" });
      const totalVotes = await userStorage.db.collection("dao_votes").countDocuments();

      res.json({
        users: {
          total: totalUsers,
          artists: artistCount,
          fans: fanCount,
          admins: adminCount
        },
        nftSales: {
          totalSales: totalNFTSales,
          totalVolume: totalNFTVolume[0]?.total || 0
        },
        royalties: {
          totalPaid: totalRoyaltiesPaid[0]?.total || 0
        },
        platformEarnings: platformEarnings[0]?.total || 0,
        fanClub: {
          memberships: fanClubMemberships,
          revenue: fanClubRevenue[0]?.total || 0
        },
        marketplace: {
          activeAuctions,
          averageBidPrice: averageBidPrice[0]?.average || 0
        },
        dao: {
          totalProposals,
          activeProposals,
          totalVotes
        }
      });
    } catch (error) {
      console.error("Get enhanced analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get admin action logs
  app.get("/api/admin/logs", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { action, admin, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (action && action !== "all") {
        query.action = action;
      }
      if (admin) {
        query.adminId = admin;
      }

      const logs = await userStorage.db.collection("admin_logs")
        .find(query)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await userStorage.db.collection("admin_logs").countDocuments(query);

      res.json({
        logs,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get admin logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Return Request Management (admin only)
  app.get("/api/admin/returns", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      // Build query
      const query: any = {};
      if (status && status !== "all") {
        query.status = status;
      }

      const returnRequests = await userStorage.db.collection("returnRequests")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await userStorage.db.collection("returnRequests").countDocuments(query);

      res.json({
        returnRequests,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Get return requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update return request status (admin only)
  app.patch("/api/admin/returns/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes, refundAmount, refundMethod } = req.body;

      const returnRequest = await storage.updateReturnRequest(id, {
        status,
        adminNotes,
        refundAmount,
        refundMethod,
        updatedAt: new Date()
      });

      if (!returnRequest) {
        return res.status(404).json({ message: "Return request not found" });
      }

      // Log admin action
      await logAdminAction(req.user!.id, 'update_return_request', {
        returnRequestId: id,
        status,
        adminNotes,
        refundAmount,
        refundMethod
      });

      res.json({ message: "Return request updated successfully", returnRequest });
    } catch (error) {
      console.error("Update return request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Process return and refund (admin only)
  app.post("/api/admin/returns/:id/process", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { action, refundAmount, refundMethod, reason } = req.body;

      const returnRequest = await storage.getReturnRequest(id);
      if (!returnRequest) {
        return res.status(404).json({ message: "Return request not found" });
      }

      // Get associated order
      const order = await storage.getOrder(returnRequest.orderId);
      if (!order) {
        return res.status(404).json({ message: "Associated order not found" });
      }

      if (action === "approve") {
        // Update return request status
        await storage.updateReturnRequest(id, {
          status: "APPROVED",
          adminNotes: reason || "Return approved",
          refundAmount: refundAmount || returnRequest.refundAmount,
          refundMethod: refundMethod || returnRequest.refundMethod
        });

        // Update order status
        await storage.updateOrder(returnRequest.orderId, {
          status: "RETURN_INITIATED",
          adminNotes: `Return approved: ${reason || ''}`
        });

      } else if (action === "reject") {
        // Update return request status
        await storage.updateReturnRequest(id, {
          status: "REJECTED",
          adminNotes: reason || "Return rejected"
        });

      } else if (action === "refund") {
        // Process refund via Razorpay
        const { refundPayment } = await import("../services/razorpay");

        if (!order.razorpayPaymentId) {
          return res.status(400).json({ message: "No payment ID found for this order" });
        }

        const razorpayRefund = await refundPayment(order.razorpayPaymentId, refundAmount);

        // Update return request
        await storage.updateReturnRequest(id, {
          status: "REFUNDED",
          adminNotes: `Refund processed: ₹${refundAmount}. ${reason || ''}`,
          refundAmount,
          refundMethod
        });

        // Update order status
        await storage.updateOrder(returnRequest.orderId, {
          status: "REFUNDED",
          refundedAt: new Date(),
          refundedBy: req.user!.id,
          refundReason: reason,
          refundAmount,
          razorpayRefundId: razorpayRefund.id
        });

        // Log admin action
        await logAdminAction(req.user!.id, 'process_return_refund', {
          returnRequestId: id,
          orderId: returnRequest.orderId,
          paymentId: order.razorpayPaymentId,
          refundId: razorpayRefund.id,
          amount: refundAmount,
          reason
        });

        return res.json({
          message: "Refund processed successfully",
          refund: razorpayRefund,
          returnRequestId: id,
          orderId: returnRequest.orderId
        });
      }

      // Log admin action for approve/reject
      await logAdminAction(req.user!.id, `return_${action}`, {
        returnRequestId: id,
        orderId: returnRequest.orderId,
        reason,
        refundAmount,
        refundMethod
      });

      res.json({ message: `Return ${action}d successfully` });
    } catch (error: any) {
      console.error("Process return error:", error);
      res.status(500).json({
        message: error.message || "Failed to process return",
        error: error.response?.data || error.message
      });
    }
  });

  // Tax Settings Management (admin only)
  app.get("/api/admin/tax-settings", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      // Get tax settings from system settings collection
      const settings = await userStorage.db.collection("system_settings").findOne({ type: "tax" });

      // If no tax settings exist, return default values
      const taxSettings = settings || {
        gstRate: 18,
        isInclusive: false,
        isActive: true,
        updatedAt: new Date(),
        updatedBy: req.user!.id
      };

      res.json(taxSettings);
    } catch (error) {
      console.error("Get tax settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/tax-settings", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { gstRate, isInclusive, isActive } = req.body;

      // Validate input
      if (typeof gstRate !== 'number' || gstRate < 0 || gstRate > 100) {
        return res.status(400).json({ message: "GST rate must be between 0 and 100" });
      }

      // Update or create tax settings
      const updateData = {
        type: "tax",
        gstRate,
        isInclusive: Boolean(isInclusive),
        isActive: Boolean(isActive),
        updatedAt: new Date(),
        updatedBy: req.user!.id
      };

      await userStorage.db.collection("system_settings").updateOne(
        { type: "tax" },
        { $set: updateData },
        { upsert: true }
      );

      // Log admin action
      await logAdminAction(req.user!.id, 'update_tax_settings', {
        gstRate,
        isInclusive,
        isActive
      });

      res.json({
        message: "Tax settings updated successfully",
        settings: updateData
      });
    } catch (error) {
      console.error("Update tax settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get system health (admin only)
  app.get("/api/admin/health", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      // Check database connectivity
      const dbStats = await userStorage.db.stats();

      // Check collections
      const collections = await userStorage.db.listCollections().toArray();

      // Get system info
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          collections: collections.length,
          stats: {
            dataSize: dbStats.dataSize,
            storageSize: dbStats.storageSize,
            collections: dbStats.collections
          }
        },
        system: {
          uptime: Math.floor(uptime),
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024) // MB
          },
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Helper function to log admin actions
async function logAdminAction(adminId: string, action: string, details: any) {
  try {
    await userStorage.db.collection("admin_logs").insertOne({
      adminId,
      action,
      details,
      timestamp: new Date(),
      ip: "system" // In production, get from request
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
}
