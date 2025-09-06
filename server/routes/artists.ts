import type { Express } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import AnalyticsService from "../services/analytics";
import { AnalyticsStorage } from "../storage/analytics";

export function setupArtistRoutes(app: Express) {
  // Get featured artists
  app.get("/api/artists/featured", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const artists = await storage.getFeaturedArtists(limit);
      res.json(artists);
    } catch (error) {
      console.error("Get featured artists error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get artist profile (for logged-in artist)
  app.get("/api/artists/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user.role !== "artist") {
        return res.status(403).json({ message: "Access denied. Artist role required." });
      }

      const artist = await storage.getArtistByUserId(req.user.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      res.json(artist);
    } catch (error) {
      console.error("Get artist profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get songs by logged-in artist
  app.get("/api/artists/songs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user.role !== "artist") {
        return res.status(403).json({ message: "Access denied. Artist role required." });
      }

      const artist = await storage.getArtistByUserId(req.user.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      const songs = await storage.getSongsByArtist(artist._id);
      res.json(songs);
    } catch (error) {
      console.error("Get artist songs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get artist analytics
  app.get("/api/artists/analytics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user.role !== "artist") {
        return res.status(403).json({ message: "Access denied. Artist role required." });
      }

      const artist = await storage.getArtistByUserId(req.user.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      // Aggregate analytics from songs
      const songs = await storage.getSongsByArtist(artist._id);
      const totalPlays = songs.reduce((sum, song) => sum + (song.plays || 0), 0);
      const totalLikes = songs.reduce((sum, song) => sum + (song.likes || 0), 0);
      const uniqueListeners = songs.reduce((sum, song) => sum + (song.uniqueListeners || 0), 0);

      // Get analytics from last 30 days for new followers/subscribers
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Use analytics service to get recent data
      const recentAnalytics = await AnalyticsService.getRecentAnalyticsByArtist(artist._id, thirtyDaysAgo);
      const newFollowers = recentAnalytics.filter((a: any) => a.action === "follow").length;
      const newSubscribers = recentAnalytics.filter((a: any) => a.action === "subscribe").length;

      // Calculate conversion rate (followers to subscribers)
      const followersCount = artist.artist?.followers?.length || 0;
      const conversionRate = followersCount > 0
        ? ((newSubscribers / followersCount) * 100).toFixed(1)
        : 0;

      // Get current revenue from artist profile
      const revenue = artist.artist?.revenue || { subscriptions: 0, merch: 0, events: 0, ads: 0 };
      const monthlyRevenue = revenue.subscriptions + revenue.merch + revenue.events + revenue.ads;

      res.json({
        monthlyRevenue,
        subscriptionRevenue: revenue.subscriptions,
        merchRevenue: revenue.merch,
        eventRevenue: revenue.events,
        totalPlays,
        uniqueListeners,
        totalLikes,
        newFollowers,
        newSubscribers,
        conversionRate: parseFloat(conversionRate.toString()),
        topSongs: songs
          .sort((a, b) => (b.plays || 0) - (a.plays || 0))
          .slice(0, 5),
      });
    } catch (error) {
      console.error("Get artist analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update artist profile
  app.patch("/api/artists/profile", authenticateToken, requireRole(["artist"]), async (req: AuthRequest, res) => {
    try {
      const artist = await storage.getArtistByUserId(req.user!.id);

      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      const updatedArtist = await storage.updateUser(artist._id, {
        artist: { ...artist.artist, ...req.body },
      });

      res.json(updatedArtist?.artist || {});
    } catch (error) {
      console.error("Update artist profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get artist by ID (public route)
  app.get("/api/artists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const artist = await storage.getArtistByUserId(id);

      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }

      // Get artist's songs
      const songs = await storage.getSongsByArtist(id);

      // Get artist's events
      const events = await storage.getEventsByArtist(id);

      // Get artist's merch
      const merch = await storage.getMerchByArtist(id);

      // Get artist's blogs
      const blogs = await storage.getBlogsByArtist(id);

      res.json({
        ...artist,
        user: {
          _id: artist._id,
          name: artist.name,
          email: artist.email
        },
        songs,
        events,
        merch,
        blogs
      });
    } catch (error) {
      console.error("Get artist by ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all artists
  app.get("/api/artists", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const artists = await storage.getAllArtists(limit);

      // Enrich with additional info
      const enrichedArtists = await Promise.all(
        artists.map(async (artist) => {
          const songs = await storage.getSongsByArtist(artist._id);
          const totalPlays = songs.reduce((sum, song) => sum + (song.plays || 0), 0);

          return {
            ...artist,
            user: {
              _id: artist._id,
              name: artist.name,
              email: artist.email
            },
            songsCount: songs.length,
            totalPlays,
            // Ensure we have the artist profile data
            artist: artist.artist || {
              bio: "",
              socialLinks: {},
              followers: [],
              totalPlays: totalPlays,
              totalLikes: 0,
              revenue: { subscriptions: 0, merch: 0, events: 0, ads: 0 },
              trendingScore: totalPlays,
              featured: false,
              verified: false,
            }
          };
        })
      );

      res.json(enrichedArtists);
    } catch (error) {
      console.error("Get all artists error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
