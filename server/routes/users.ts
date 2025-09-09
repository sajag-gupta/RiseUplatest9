import type { Express } from "express";
import multer from "multer";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { uploadImage } from "../services/cloudinary";
import { createOrder, verifyPayment, verifyPaymentWithTracking, getPaymentStatus } from "../services/razorpay";

// Multer configuration for file uploads (storing files in memory)
const upload = multer({ storage: multer.memoryStorage() });

export function setupUserRoutes(app: Express) {
  // User profile routes
  app.get("/api/users/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        favorites: user.favorites,
        following: user.following,
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/me/recent-plays", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const recentSongs = await storage.getRecentPlaysByUser(req.user!.id);
      res.json(recentSongs);
    } catch (error) {
      console.error("Get recent plays error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.user!.id, updates);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Following routes
  app.get("/api/users/me/following-content", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get content from followed artists
      const followedArtists = await Promise.all(
        user.following.map((artistId) => storage.getArtistByUserId(artistId)),
      );

      const validArtists = followedArtists.filter(
        (artist) => artist !== undefined,
      );
      res.json(validArtists);
    } catch (error) {
      console.error("Get following content error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/follow/:artistId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { artistId } = req.params;
      const user = await storage.getUser(req.user!.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isCurrentlyFollowing = user.following.includes(artistId);
      const following = isCurrentlyFollowing
        ? user.following.filter((id) => id !== artistId)
        : [...user.following, artistId];

      // Update user's following list
      await storage.updateUser(req.user!.id, { following });

      // Update artist's followers list (bidirectional sync)
      const artist = await storage.getArtistByUserId(artistId);
      if (artist && artist.artist) {
        const followers = isCurrentlyFollowing
          ? artist.artist.followers.filter((id) => id !== req.user!.id)
          : [...artist.artist.followers, req.user!.id];

        await storage.updateUser(artistId, {
          artist: { ...artist.artist, followers }
        });
      }

      res.json({ following: !isCurrentlyFollowing });
    } catch (error) {
      console.error("Follow error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Favorites routes
  app.get("/api/users/me/favorites", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const favorites = user.favorites || {
        artists: [],
        songs: [],
        events: [],
      };

      // Populate song details for favorites
      const populatedSongs = [];
      for (const songId of favorites.songs) {
        const song = await storage.getSong(songId);
        if (song) {
          populatedSongs.push(song);
        }
      }

      // Populate artist details for favorites
      const populatedArtists = [];
      for (const artistId of favorites.artists) {
        const artist = await storage.getArtistByUserId(artistId);
        if (artist) {
          populatedArtists.push(artist);
        }
      }

      // Populate event details for favorites
      const populatedEvents = [];
      for (const eventId of favorites.events) {
        const event = await storage.getEvent(eventId);
        if (event) {
          populatedEvents.push(event);
        }
      }

      res.json({
        artists: populatedArtists,
        songs: populatedSongs,
        events: populatedEvents,
      });
    } catch (error) {
      console.error("Get user favorites error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/me/favorites/songs/:songId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { songId } = req.params;
      const user = await storage.getUser(req.user!.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const favorites = user.favorites || {
        artists: [],
        songs: [],
        events: [],
      };
      const songIndex = favorites.songs.indexOf(songId);

      if (songIndex > -1) {
        // Remove from favorites
        favorites.songs.splice(songIndex, 1);
      } else {
        // Add to favorites
        favorites.songs.push(songId);
      }

      await storage.updateUser(req.user!.id, { favorites });
      res.json({ favorited: songIndex === -1, favorites });
    } catch (error) {
      console.error("Toggle song favorite error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Playlist routes
  app.get("/api/playlists/mine", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const playlists = user.playlists || [];

      // Populate songs with artist names
      const populatedPlaylists = await Promise.all(
        playlists.map(async (playlist) => {
          const populatedSongs = await Promise.all(
            playlist.songs.map(async (songId) => {
              const song = await storage.getSong(songId);
              if (song) {
                const artist = await storage.getArtistByUserId(song.artistId);
                return {
                  ...song,
                  artistName: artist?.name || "Unknown Artist"
                };
              }
              return null;
            })
          );

          return {
            ...playlist,
            songs: populatedSongs.filter(song => song !== null)
          };
        })
      );

      res.json(populatedPlaylists);
    } catch (error) {
      console.error("Get user playlists error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/playlists", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, songs = [] } = req.body;

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newPlaylist = {
        name,
        songs,
        createdAt: new Date(),
      };

      const updatedPlaylists = [...(user.playlists || []), newPlaylist];
      await storage.updateUser(req.user!.id, { playlists: updatedPlaylists });

      res.json(newPlaylist);
    } catch (error) {
      console.error("Create playlist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/playlists/add-song", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { playlistName, songId } = req.body;

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedPlaylists = (user.playlists || []).map((playlist) => {
        if (playlist.name === playlistName) {
          // Check if song is already in playlist
          if (!playlist.songs.includes(songId)) {
            return {
              ...playlist,
              songs: [...playlist.songs, songId],
            };
          }
        }
        return playlist;
      });

      await storage.updateUser(req.user!.id, { playlists: updatedPlaylists });

      res.json({ message: "Song added to playlist" });
    } catch (error) {
      console.error("Add song to playlist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Settings routes
  app.get("/api/users/me/settings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get artist profile if user is an artist
      let artistProfile = null;
      if (user.role === "artist") {
        artistProfile = await storage.getArtistByUserId(user._id);
      }

      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          bio: artistProfile?.artist?.bio || "",
          website: artistProfile?.artist?.socialLinks?.website || "",
          instagram: artistProfile?.artist?.socialLinks?.instagram || "",
          youtube: artistProfile?.artist?.socialLinks?.youtube || "",
          x: artistProfile?.artist?.socialLinks?.x || "",
        },
        notifications: {
          email: true,
          newMusic: true,
          events: true,
          marketing: false,
          followers: true,
          revenue: true,
        },
        privacy: {
          visibility: "public",
          activity: true,
          history: true,
          personalizedAds: false,
        },
      });
    } catch (error) {
      console.error("Get user settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user settings
  app.patch("/api/users/me/settings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { notifications, privacy } = req.body;
      const user = await storage.getUser(req.user!.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user settings (you can store these in the user document or a separate settings collection)
      // For now, we'll just return success since the frontend handles the logic
      res.json({
        message: "Settings updated successfully",
        notifications,
        privacy,
      });
    } catch (error) {
      console.error("Update user settings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Plan upgrade routes
  app.post("/api/users/me/upgrade", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }

      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate plan ID
      const validPlans = ["free", "premium", "artist"];
      if (!validPlans.includes(planId.toLowerCase())) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const currentPlan = user.plan?.type?.toUpperCase() || "FREE";
      const requestedPlan = planId.toUpperCase();

      // Check if already on the requested plan
      if (currentPlan === requestedPlan) {
        return res.status(400).json({ message: "Already on this plan" });
      }

      // Handle free plan (no payment required)
      if (requestedPlan === "FREE") {
        await storage.updateUser(req.user!.id, {
          plan: {
            type: "FREE",
            renewsAt: undefined,
            paymentId: undefined,
            subscriptionId: undefined
          }
        });

        return res.json({
          message: "Plan updated successfully",
          plan: { type: "FREE" }
        });
      }

      // Handle premium/artist plans (payment required)
      const planPrices = {
        PREMIUM: 99,
        ARTIST: 299
      };

      const amount = planPrices[requestedPlan as keyof typeof planPrices];
      if (!amount) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      // Create Razorpay order
      try {
        // Use a simple short receipt like commerce routes do
        const receipt = `plan_${Date.now().toString().slice(-8)}`; // Simple timestamp-based receipt

        const order = await createOrder(amount, "INR", receipt);

        // Check if we have the Razorpay key for frontend
        if (!process.env.RAZORPAY_KEY_ID) {
          return res.status(503).json({
            message: "Payment service configuration incomplete. Please contact support."
          });
        }

        res.json({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          planId: requestedPlan,
          key: process.env.RAZORPAY_KEY_ID.trim()
        });
      } catch (razorpayError: any) {
        console.error("Razorpay order creation failed:", razorpayError);
        return res.status(503).json({
          message: "Payment service temporarily unavailable. Please try again later or contact support.",
          error: razorpayError.message
        });
      }

    } catch (error) {
      console.error("Plan upgrade error:", error);
      res.status(500).json({ message: "Failed to initiate upgrade" });
    }
  });

  // Verify payment and complete upgrade
  app.post("/api/users/me/upgrade/verify", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { orderId, paymentId, signature, planId } = req.body;

      if (!orderId || !paymentId || !signature || !planId) {
        return res.status(400).json({
          message: "Missing payment verification data",
          error: "REQUIRED_FIELDS_MISSING"
        });
      }

      console.log(`Payment verification request: orderId=${orderId}, paymentId=${paymentId}, planId=${planId}`);

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          error: "USER_NOT_FOUND"
        });
      }

      // Use enhanced payment verification with tracking
      const verificationResult = await verifyPaymentWithTracking(orderId, paymentId, signature, planId);

      // If payment is still processing, return appropriate response
      if (!verificationResult.success) {
        return res.status(202).json({
          message: verificationResult.message || "Payment is still being processed",
          status: "processing",
          orderId,
          paymentId,
          planId
        });
      }

      // Payment successful - update user plan
      const renewsAt = new Date();
      renewsAt.setMonth(renewsAt.getMonth() + 1);

      const planUpdate: any = {
        plan: {
          type: planId,
          renewsAt,
          paymentId,
          subscriptionId: undefined // For future subscription management
        }
      };

      // If upgrading to ARTIST plan, also change role from fan to artist
      if (planId === "ARTIST" && user.role === "fan") {
        planUpdate.role = "artist";
      }

      await storage.updateUser(req.user!.id, planUpdate);

      // Get updated user data
      const updatedUser = await storage.getUser(req.user!.id);

      // Generate new JWT token with updated role
      const jwt = require("jsonwebtoken");
      const newToken = jwt.sign(
        { userId: updatedUser!._id, email: updatedUser!.email, role: updatedUser!.role, name: updatedUser!.name },
        process.env.SESSION_SECRET || "your-secret-key-here",
        { expiresIn: "24h" },
      );

      console.log(`Payment verification successful for user ${user._id}: plan upgraded to ${planId}`);

      res.json({
        message: "Plan upgraded successfully",
        plan: {
          type: planId,
          renewsAt
        },
        user: {
          id: updatedUser!._id,
          name: updatedUser!.name,
          email: updatedUser!.email,
          role: updatedUser!.role,
          plan: updatedUser!.plan,
          favorites: updatedUser!.favorites,
          following: updatedUser!.following,
          avatarUrl: updatedUser!.avatarUrl,
        },
        token: newToken, // Send new token with updated role
        paymentDetails: verificationResult.paymentDetails
      });

    } catch (error: any) {
      console.error("Payment verification error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        body: req.body
      });

      // Provide user-friendly error messages based on error type
      let statusCode = 500;
      let errorMessage = "Payment verification failed";
      let errorCode = "VERIFICATION_FAILED";

      if (error.message?.includes("Payment signature verification failed")) {
        statusCode = 400;
        errorMessage = "Payment verification failed. Please contact support if you were charged.";
        errorCode = "SIGNATURE_VERIFICATION_FAILED";
      } else if (error.message?.includes("Payment failed")) {
        statusCode = 400;
        errorMessage = error.message;
        errorCode = "PAYMENT_FAILED";
      } else if (error.message?.includes("timed out")) {
        statusCode = 408;
        errorMessage = "Payment verification is taking longer than expected. Please check your payment status in a few minutes.";
        errorCode = "VERIFICATION_TIMEOUT";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        statusCode = 503;
        errorMessage = "Network error during payment verification. Please try again.";
        errorCode = "NETWORK_ERROR";
      }

      res.status(statusCode).json({
        message: errorMessage,
        error: errorCode,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Check payment status for recovery
  app.get("/api/users/me/payment-status/:orderId/:paymentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { orderId, paymentId } = req.params;

      if (!orderId || !paymentId) {
        return res.status(400).json({ message: "Order ID and Payment ID are required" });
      }

      const paymentStatusInfo = getPaymentStatus(orderId, paymentId);

      if (!paymentStatusInfo) {
        return res.status(404).json({
          message: "Payment status not found. This payment may be too old or doesn't exist.",
          status: "not_found"
        });
      }

      // If payment was completed, check if user actually has the plan
      if (paymentStatusInfo.status === 'completed') {
        const user = await storage.getUser(req.user!.id);
        if (user && user.plan?.type?.toUpperCase() === paymentStatusInfo.planId) {
          return res.json({
            status: "completed",
            message: "Payment completed successfully",
            planId: paymentStatusInfo.planId,
            userPlan: user.plan
          });
        } else {
          // Payment completed but user doesn't have the plan - possible sync issue
          console.warn(`Payment completed but user plan not synced: user=${req.user!.id}, planId=${paymentStatusInfo.planId}`);
          return res.status(206).json({
            status: "completed_but_not_synced",
            message: "Payment was successful but your account hasn't been updated yet. Please contact support.",
            planId: paymentStatusInfo.planId
          });
        }
      }

      res.json({
        status: paymentStatusInfo.status,
        attempts: paymentStatusInfo.attempts,
        lastAttempt: paymentStatusInfo.lastAttempt,
        planId: paymentStatusInfo.planId,
        message: paymentStatusInfo.status === 'failed'
          ? "Payment verification failed. Please try again or contact support."
          : paymentStatusInfo.status === 'processing'
          ? "Payment is still being processed. Please wait..."
          : "Payment status unknown"
      });

    } catch (error: any) {
      console.error("Payment status check error:", error);
      res.status(500).json({
        message: "Unable to check payment status. Please try again or contact support.",
        error: error.message
      });
    }
  });

  // Delete user account
  app.delete("/api/users/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete user from database
      await storage.deleteUser(req.user!.id);

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });



  // Avatar upload
  app.post("/api/users/me/avatar", authenticateToken, upload.single("avatar"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Avatar file required" });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File size must be less than 5MB" });
      }

      try {
        const avatarResult = await uploadImage(
          req.file.buffer,
          `avatar_${req.user!.id}`,
          "ruc/avatars"
        );

        const avatarUrl = (avatarResult as any).secure_url;

        // Update user profile with avatar URL
        await storage.updateUser(req.user!.id, { avatarUrl });

        res.json({
          message: "Avatar uploaded successfully",
          avatarUrl: avatarUrl,
        });
      } catch (uploadError: any) {
        console.error("Cloudinary upload error:", uploadError);
        throw uploadError; // Re-throw to be caught by outer catch
      }
    } catch (error: any) {
      console.error("Upload avatar error:", error);
      if (error.message?.includes("Cloudinary not configured")) {
        res.status(503).json({ message: "File upload service not configured. Please contact administrator." });
      } else if (error.message?.includes("Upload timeout")) {
        res.status(408).json({ message: "Upload timeout. Please try again." });
      } else {
        res.status(500).json({ message: "Failed to upload avatar. Please try again." });
      }
    }
  });
}
