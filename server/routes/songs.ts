import type { Express } from "express";
import multer from "multer";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { uploadAudio, uploadImage } from "../services/cloudinary";
import AnalyticsService from "../services/analytics";

// Multer configuration for file uploads (storing files in memory)
const upload = multer({ storage: multer.memoryStorage() });

export function setupSongRoutes(app: Express) {
  // Get trending songs
  app.get("/api/songs/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const songs = await storage.getTrendingSongs(limit);

      // Populate artist names
      const songsWithArtistNames = await Promise.all(
        songs.map(async (song) => {
          const artist = await storage.getArtistByUserId(song.artistId);
          if (artist) {
            const user = artist;
            return {
              ...song,
              artistName: user?.name || "Unknown Artist",
            };
          }
          return {
            ...song,
            artistName: "Unknown Artist",
          };
        }),
      );

      res.json(songsWithArtistNames);
    } catch (error) {
      console.error("Get trending songs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get recommended songs
  app.get("/api/songs/recommended", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      // For now, return trending songs as recommendations
      // In future, this could be personalized based on user's listening history
      const songs = await storage.getTrendingSongs(limit);

      // Populate artist names
      const songsWithArtistNames = await Promise.all(
        songs.map(async (song) => {
          const artist = await storage.getArtistByUserId(song.artistId);
          if (artist) {
            const user = artist;
            return {
              ...song,
              artistName: user?.name || "Unknown Artist",
            };
          }
          return {
            ...song,
            artistName: "Unknown Artist",
          };
        }),
      );

      res.json(songsWithArtistNames);
    } catch (error) {
      console.error("Get recommended songs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all songs with filters
  app.get("/api/songs", async (req, res) => {
    try {
      const { genre, sort, limit } = req.query;
      const limitNum = parseInt(limit as string) || 20;

      // Get all songs based on filters
      const songs = await storage.getAllSongs({
        genre: genre as string,
        sort: sort as string,
        limit: limitNum,
      });

      // Populate artist names
      const songsWithArtistNames = await Promise.all(
        songs.map(async (song) => {
          const artist = await storage.getArtistByUserId(song.artistId);
          if (artist) {
            const user = artist;
            return {
              ...song,
              artistName: user?.name || "Unknown Artist",
            };
          }
          return {
            ...song,
            artistName: "Unknown Artist",
          };
        }),
      );

      res.json(songsWithArtistNames);
    } catch (error) {
      console.error("Get all songs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search songs
  app.get("/api/songs/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query required" });
      }

      const songs = await storage.searchSongs(q);
      res.json(songs);
    } catch (error) {
      console.error("Search songs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get song by ID
  app.get("/api/songs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const song = await storage.getSong(id);

      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }

      // Get artist info for the song
      const artist = await storage.getArtistByUserId(song.artistId);
      const songWithArtist = {
        ...song,
        artistName: artist?.name || "Unknown Artist"
      };

      res.json(songWithArtist);
    } catch (error) {
      console.error("Get song error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create song
  app.post("/api/songs", authenticateToken, requireRole(["artist"]), upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "artwork", maxCount: 1 },
  ]), async (req: AuthRequest, res) => {
    try {
      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };
      const songData = JSON.parse(req.body.data);

      if (!files.audio || !files.artwork) {
        return res
          .status(400)
          .json({ message: "Audio file and artwork required" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      // Upload files to Cloudinary
      const audioResult = await uploadAudio(
        files.audio[0].buffer,
        `song_${Date.now()}`,
      );
      const artworkResult = await uploadImage(
        files.artwork[0].buffer,
        `artwork_${Date.now()}`,
      );

      // Get audio duration from Cloudinary response
      const audioDuration = (audioResult as any).duration || 0;

      const song = await storage.createSong({
        ...songData,
        artistId: artist._id,
        fileUrl: (audioResult as any).secure_url,
        artworkUrl: (artworkResult as any).secure_url,
        durationSec: Math.round(audioDuration),
        plays: 0,
        likes: 0,
        uniqueListeners: 0,
      });

      // Log analytics
      await storage.logAnalytics({
        userId: req.user!.id,
        artistId: artist._id,
        songId: song._id,
        action: "view",
        context: "profile",
        metadata: {},
      });

      res.json(song);
    } catch (error) {
      console.error("Upload song error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Log song play
  app.post("/api/songs/:id/play", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const song = await storage.getSong(id);

      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }

      // Use analytics service to track play
      await AnalyticsService.trackSongPlay(req.user!.id, id, req.body.context || "player");

      res.json({ message: "Play logged" });
    } catch (error) {
      console.error("Log play error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Like/unlike song
  app.post("/api/songs/:id/like", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const song = await storage.getSong(id);

      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }

      const user = await storage.getUser(req.user!.id);
      const isLiked = user?.favorites.songs.includes(id);

      // Update user favorites
      const favorites = {
        ...user!.favorites,
        songs: isLiked
          ? user!.favorites.songs.filter((songId) => songId !== id)
          : [...user!.favorites.songs, id],
      };

      await storage.updateUser(req.user!.id, { favorites });

      // Use analytics service to track like/unlike
      await AnalyticsService.trackSongLike(req.user!.id, id, !isLiked, req.body.context || "player");

      res.json({ liked: !isLiked });
    } catch (error) {
      console.error("Like song error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update song
  app.patch("/api/songs/:id", authenticateToken, requireRole(["artist"]), upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "artwork", maxCount: 1 },
  ]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      // Check if song exists and belongs to this artist
      const existingSong = await storage.getSong(id);
      if (!existingSong) {
        return res.status(404).json({ message: "Song not found" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist || existingSong.artistId !== artist._id) {
        return res.status(403).json({ message: "Not authorized to update this song" });
      }

      let songData;
      if (req.body.data) {
        songData = JSON.parse(req.body.data);
      } else {
        songData = req.body;
      }

      let fileUrl = existingSong.fileUrl;
      let artworkUrl = existingSong.artworkUrl;
      let durationSec = existingSong.durationSec;

      // Upload new files if provided
      if (files.audio && files.audio[0]) {
        const audioResult = await uploadAudio(
          files.audio[0].buffer,
          `song_${Date.now()}`,
        );
        fileUrl = (audioResult as any).secure_url;
        durationSec = Math.round((audioResult as any).duration || 0);
      }

      if (files.artwork && files.artwork[0]) {
        const artworkResult = await uploadImage(
          files.artwork[0].buffer,
          `artwork_${Date.now()}`,
        );
        artworkUrl = (artworkResult as any).secure_url;
      }

      const updatedSong = await storage.updateSong(id, {
        ...songData,
        fileUrl,
        artworkUrl,
        durationSec,
      });

      res.json(updatedSong);
    } catch (error) {
      console.error("Update song error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete song
  app.delete("/api/songs/:id", authenticateToken, requireRole(["artist"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const song = await storage.getSong(id);

      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist || song.artistId !== artist._id) {
        return res.status(403).json({ message: "Not authorized to delete this song" });
      }

      const deleted = await storage.deleteSong(id);
      if (deleted) {
        res.json({ message: "Song deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete song" });
      }
    } catch (error) {
      console.error("Delete song error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
