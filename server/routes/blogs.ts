import type { Express } from "express";
import multer from "multer";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { uploadImage } from "../services/cloudinary";

// Multer configuration for file uploads (storing files in memory)
const upload = multer({ storage: multer.memoryStorage() });

export function setupBlogRoutes(app: Express) {
  // Get all blogs
  app.get("/api/blogs", async (req, res) => {
    try {
      const blogs = await storage.getAllBlogs();
      res.json(blogs);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      res.status(500).json({ message: "Failed to fetch blogs" });
    }
  });

  // Get blogs by artist
  app.get("/api/blogs/artist", authenticateToken, async (req: AuthRequest, res) => {
    if (!req.user || req.user.role !== "artist") {
      return res.status(401).json({ message: "Unauthorized - Artist access required" });
    }

    try {
      const artist = await storage.getArtistByUserId(req.user.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      const blogs = await storage.getBlogsByArtist(artist._id);
      res.json(blogs);
    } catch (error) {
      console.error("Error fetching artist blogs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual blog post
  app.get("/api/blogs/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const blog = await storage.getBlog(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      // Check if blog is subscriber-only
      if (blog.visibility === "SUBSCRIBER_ONLY") {
        // Check if user is subscribed to the artist
        const user = await storage.getUser(req.user!.id);
        if (!user) {
          return res.status(403).json({ message: "User not found" });
        }

        const isSubscribed = user.subscriptions?.some(sub =>
          sub.artistId === blog.artistId && sub.active
        );

        if (!isSubscribed && req.user!.id !== blog.artistId) {
          return res.status(403).json({ message: "Subscriber access required" });
        }
      }

      // Get artist name for the blog
      const artist = await storage.getUser(blog.artistId);
      const blogWithArtist = {
        ...blog,
        artistName: artist?.name || "Unknown Artist"
      };

      res.json(blogWithArtist);
    } catch (error) {
      console.error("Error fetching blog:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create blog
  app.post("/api/blogs", authenticateToken, requireRole(["artist"]), upload.array("images", 10), async (req: AuthRequest, res) => {
    try {
      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      let blogData;
      if (req.body.data) {
        // FormData with files
        blogData = JSON.parse(req.body.data);
      } else {
        // Direct JSON
        blogData = req.body;
      }

      const { title, content, visibility, tags } = blogData;
      const parsedTags = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);

      const images: string[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          for (const file of req.files as Express.Multer.File[]) {
            const result = await uploadImage(
              file.buffer,
              `blog_${Date.now()}_${Math.random()}`,
              "ruc/blogs"
            );
            images.push((result as any).secure_url);
          }
        } catch (uploadError) {
          console.warn("Image upload failed, creating blog without images:", uploadError);
          // Continue without images if upload fails
        }
      }

      const blog = await storage.createBlog({
        artistId: artist._id,
        title,
        content,
        visibility: visibility || "PUBLIC",
        images,
        tags: parsedTags
      });

      res.status(201).json(blog);
    } catch (error) {
      console.error("Blog creation error:", error);
      res.status(500).json({ message: "Failed to create blog" });
    }
  });

  // Update blog
  app.patch("/api/blogs/:id", authenticateToken, requireRole(["artist"]), upload.array("images", 10), async (req: AuthRequest, res) => {
    try {
      const blog = await storage.getBlog(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      const artist = await storage.getArtistByUserId(req.user!.id);
      if (!artist || blog.artistId !== artist._id) {
        return res.status(403).json({ message: "Not authorized to edit this blog" });
      }

      let blogData;
      if (req.body.data) {
        // FormData with files
        blogData = JSON.parse(req.body.data);
      } else {
        // Direct JSON
        blogData = req.body;
      }

      const { title, content, visibility, tags } = blogData;
      const parsedTags = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : blog.tags);

      let images = blog.images || [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          const result = await uploadImage(
            file.buffer,
            `blog_${Date.now()}_${Math.random()}`,
            "ruc/blogs"
          );
          images.push((result as any).secure_url);
        }
      }

      const updateData = {
        title: title || blog.title,
        content: content || blog.content,
        visibility: visibility || blog.visibility,
        images,
        tags: parsedTags
      };

      const updatedBlog = await storage.updateBlog(req.params.id, updateData);
      res.json(updatedBlog);
    } catch (error) {
      console.error("Blog update error:", error);
      res.status(500).json({ message: "Failed to update blog" });
    }
  });

  // Delete blog
  app.delete("/api/blogs/:id", authenticateToken, requireRole(["artist"]), async (req: AuthRequest, res) => {
    try {
      const blog = await storage.getBlog(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      if (blog.artistId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this blog" });
      }

      const deleted = await storage.deleteBlog(req.params.id);
      if (deleted) {
        res.json({ message: "Blog deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete blog" });
      }
    } catch (error) {
      console.error("Blog deletion error:", error);
      res.status(500).json({ message: "Failed to delete blog" });
    }
  });
}
