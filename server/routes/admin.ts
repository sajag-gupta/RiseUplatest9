import type { Express } from "express";
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
