import type { Express } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/email";
import { insertUserSchema } from "../../shared/schemas";
import { AuthRequest, authenticateToken } from "../middleware/auth";

// Extend session type for cart
declare module "express-session" {
  interface SessionData {
    cart?: {
      items: Array<{
        _id: string;
        type: "merch" | "event";
        id: string;
        name: string;
        price: number;
        quantity: number;
        image?: string;
      }>;
      summary: {
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
      };
      appliedPromoCode?: string;
    };
  }
}

export function setupAuthRoutes(app: Express) {
  // Store reset tokens temporarily (in production, use Redis or database)
  const resetTokens = new Map<string, { email: string; expires: Date }>();

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);

      // Update user with embedded artist data if role is artist
      if (user.role === "artist") {
        await storage.updateUser(user._id, {
          artist: {
            bio: "",
            socialLinks: {},
            followers: [],
            totalPlays: 0,
            totalLikes: 0,
            revenue: { subscriptions: 0, merch: 0, events: 0, ads: 0 },
            trendingScore: 0,
            featured: false,
            verified: false,
          }
        });
      }

      // Send welcome email (non-blocking)
      sendWelcomeEmail(user.email, user.name, user.role).catch((error) => {
        console.warn("Failed to send welcome email:", error.message);
      });

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, name: user.name },
        process.env.SESSION_SECRET || "your-secret-key-here",
        { expiresIn: "24h" },
      );

      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          favorites: user.favorites,
          following: user.following,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUser(user._id, { lastLogin: new Date() });

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, name: user.name },
        process.env.SESSION_SECRET || "your-secret-key-here",
        { expiresIn: "24h" },
      );

      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          favorites: user.favorites,
          following: user.following,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate reset token (6-digit code)
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store token with expiration
      resetTokens.set(resetToken, { email: user.email, expires });

      // Clean up expired tokens
      for (const [token, data] of Array.from(resetTokens.entries())) {
        if (data.expires < new Date()) {
          resetTokens.delete(token);
        }
      }

      sendPasswordResetEmail(user.email, resetToken).catch((error) => {
        console.warn("Failed to send password reset email:", error.message);
      });

      res.json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if token exists and is valid
      const tokenData = resetTokens.get(token);
      if (!tokenData) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (tokenData.expires < new Date()) {
        resetTokens.delete(token);
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(tokenData.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user._id, { passwordHash: hashedPassword });

      // Remove used token
      resetTokens.delete(token);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/change-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!isValidPassword) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(req.user.id, {
        passwordHash: hashedNewPassword,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
