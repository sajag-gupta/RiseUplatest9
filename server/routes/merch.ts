import type { Express } from "express";
import multer from "multer";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { uploadImage } from "../services/cloudinary";

// Multer configuration for file uploads (storing files in memory)
const upload = multer({ storage: multer.memoryStorage() });

export function setupMerchRoutes(app: Express) {
  // Get all merch with filters
  app.get("/api/merch", async (req, res) => {
    try {
      const { search, category, minPrice, maxPrice, sort } = req.query;

      // Build query filters
      const filters: any = {};

      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (category && category !== "all-categories") {
        filters.category = { $regex: category, $options: "i" };
      }

      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice as string);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice as string);
      }

      // Get filtered merch
      let merch = await storage.getAllMerchFiltered(filters);

      // Apply sorting
      if (sort) {
        switch (sort) {
          case "price-low":
            merch.sort((a, b) => a.price - b.price);
            break;
          case "price-high":
            merch.sort((a, b) => b.price - a.price);
            break;
          case "newest":
            merch.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );
            break;
          case "popular":
          default:
            merch.sort(
              (a, b) => (b.orders?.length || 0) - (a.orders?.length || 0),
            );
            break;
        }
      }

      res.json(merch);
    } catch (error) {
      console.error("Get merch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get artist's merch
  app.get("/api/merch/artist", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== "artist") {
        return res.json([]); // fans/admins shouldn't see this
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      const merch = await storage.getMerchByArtist(artist._id);
      const merchWithArtistName = merch.map((item) => ({
        ...item,
        artistName: artist.name,
      }));

      res.json(merchWithArtistName);
    } catch (error) {
      console.error("Get artist merch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get merch by ID
  app.get("/api/merch/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getMerch(id);

      if (!item) {
        return res.status(404).json({ message: "Merch item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Get merch item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create merch
  app.post("/api/merch", authenticateToken, requireRole(["artist"]), upload.array("images", 5), async (req: AuthRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const merchData = JSON.parse(req.body.data);

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      // Upload images to Cloudinary
      let images: string[] = [];
      if (files && files.length > 0) {
        const imageUploads = files.map((file) =>
          uploadImage(
            file.buffer,
            `merch_${Date.now()}_${Math.random()}`,
            "ruc/merch",
          ),
        );
        const imageResults = await Promise.all(imageUploads);
        images = imageResults.map((result) => (result as any).secure_url);
      }

      const merch = await storage.createMerch({
        ...merchData,
        artistId: artist._id,
        images,
      });

      res.json(merch);
    } catch (error) {
      console.error("Create merch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update merch
  app.patch("/api/merch/:id", authenticateToken, upload.array("images", 5), async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== "artist") {
        return res.status(403).json({ message: "Only artists can update merch" });
      }

      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      // Check if merch exists and belongs to this artist
      const existingMerch = await storage.getMerch(id);
      if (!existingMerch) {
        return res.status(404).json({ message: "Merch not found" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist || existingMerch.artistId !== artist._id) {
        return res.status(403).json({ message: "Not authorized to update this merch" });
      }

      let merchData;
      if (req.body.data) {
        // Multipart form data with images
        merchData = JSON.parse(req.body.data);
      } else {
        // JSON data without images
        merchData = req.body;
      }

      // Upload new images to Cloudinary if provided
      let images = existingMerch.images || [];
      if (files && files.length > 0) {
        const imageUploads = files.map((file) =>
          uploadImage(
            file.buffer,
            `merch_${Date.now()}_${Math.random()}`,
            "ruc/merch",
          ),
        );
        const imageResults = await Promise.all(imageUploads);
        images = imageResults.map((result) => (result as any).secure_url);
      }

      const updatedMerch = await storage.updateMerch(id, {
        ...merchData,
        images,
      });

      if (!updatedMerch) {
        return res.status(500).json({ message: "Failed to update merch" });
      }

      res.json(updatedMerch);
    } catch (error) {
      console.error("Update merch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete merch
  app.delete("/api/merch/:id", authenticateToken, requireRole(["artist"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const merch = await storage.getMerch(id);

      if (!merch) {
        return res.status(404).json({ message: "Merch not found" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist || merch.artistId !== artist._id) {
        return res.status(403).json({ message: "Not authorized to delete this merch" });
      }

      const deleted = await storage.deleteMerch(id);
      if (deleted) {
        res.json({ message: "Merch deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete merch" });
      }
    } catch (error) {
      console.error("Delete merch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
