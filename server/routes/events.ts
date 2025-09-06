import type { Express } from "express";
import multer from "multer";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { uploadImage } from "../services/cloudinary";

// Multer configuration for file uploads (storing files in memory)
const upload = multer({ storage: multer.memoryStorage() });

export function setupEventRoutes(app: Express) {
  // Get all events with filters
  app.get("/api/events", async (req, res) => {
    try {
      const { search, location, date, genre, type } = req.query;

      // Build query filters
      const filters: any = {};

      if (search) {
        filters.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ];
      }

      if (location && location !== "all-locations") {
        filters.location = { $regex: location, $options: "i" };
      }

      if (date && date !== "upcoming") {
        const now = new Date();
        switch (date) {
          case "this-week":
            const weekFromNow = new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000,
            );
            filters.date = { $gte: now, $lte: weekFromNow };
            break;
          case "this-month":
            const monthFromNow = new Date(
              now.getTime() + 30 * 24 * 60 * 60 * 1000,
            );
            filters.date = { $gte: now, $lte: monthFromNow };
            break;
          case "past":
            filters.date = { $lt: now };
            break;
          default:
            filters.date = { $gte: now };
        }
      } else {
        // Default to upcoming events
        filters.date = { $gte: new Date() };
      }

      let events = await storage.getAllEventsFiltered(filters);

      // Populate artist names
      const eventsWithArtistNames = await Promise.all(
        events.map(async (event) => {
          const artist = await storage.getArtistByUserId(event.artistId);
          if (artist) {
            const user = artist;
            return {
              ...event,
              artistName: user?.name || "Unknown Artist",
            };
          }
          return {
            ...event,
            artistName: "Unknown Artist",
          };
        }),
      );

      res.json(eventsWithArtistNames);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get artist's events
  app.get("/api/events/artist", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== "artist") {
        return res.json([]);
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      const events = await storage.getEventsByArtist(artist._id);
      const eventsWithArtistName = events.map((event) => ({
        ...event,
        artistName: artist.name,
      }));

      res.json(eventsWithArtistName);
    } catch (error) {
      console.error("Get artist events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEvent(id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create event
  app.post("/api/events", authenticateToken, requireRole(["artist"]), upload.single("image"), async (req: AuthRequest, res) => {
    try {
      const file = req.file;
      let eventData;

      if (req.body.data) {
        // Multipart form data with image
        eventData = JSON.parse(req.body.data);
      } else {
        // JSON data without image
        eventData = req.body;
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      // Upload image to Cloudinary if provided
      let imageUrl = "";
      if (file) {
        const imageResult = await uploadImage(
          file.buffer,
          `event_${Date.now()}_${Math.random()}`,
          "ruc/events",
        );
        imageUrl = (imageResult as any).secure_url;
      }

      const event = await storage.createEvent({
        ...eventData,
        artistId: artist._id,
        date: new Date(eventData.date),
        imageUrl: imageUrl || eventData.imageUrl || "",
      });

      res.json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update event
  app.patch("/api/events/:id", authenticateToken, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== "artist") {
        return res.status(403).json({ message: "Only artists can update events" });
      }

      const { id } = req.params;
      const file = req.file;

      // Check if event exists and belongs to this artist
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist || existingEvent.artistId !== artist._id) {
        return res.status(403).json({ message: "Not authorized to update this event" });
      }

      let eventData;
      if (req.body.data) {
        // Multipart form data with image
        eventData = JSON.parse(req.body.data);
      } else {
        // JSON data without image
        eventData = req.body;
      }

      // Upload new image to Cloudinary if provided
      let imageUrl = existingEvent.imageUrl;
      if (file) {
        const imageResult = await uploadImage(
          file.buffer,
          `event_${Date.now()}_${Math.random()}`,
          "ruc/events",
        );
        imageUrl = (imageResult as any).secure_url;
      }

      const updatedEvent = await storage.updateEvent(id, {
        ...eventData,
        date: eventData.date ? new Date(eventData.date) : existingEvent.date,
        imageUrl: imageUrl || eventData.imageUrl || existingEvent.imageUrl,
      });

      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to update event" });
      }

      res.json(updatedEvent);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete event
  app.delete("/api/events/:id", authenticateToken, requireRole(["artist"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEvent(id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist || event.artistId !== artist._id) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }

      const deleted = await storage.deleteEvent(id);
      if (deleted) {
        res.json({ message: "Event deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete event" });
      }
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
