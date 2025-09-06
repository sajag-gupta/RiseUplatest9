import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { setupAuthRoutes } from "./routes/auth";
import { setupUserRoutes } from "./routes/users";
import { setupArtistRoutes } from "./routes/artists";
import { setupSongRoutes } from "./routes/songs";
import { setupMerchRoutes } from "./routes/merch";
import { setupEventRoutes } from "./routes/events";
import { setupBlogRoutes } from "./routes/blogs";
import { setupCommerceRoutes } from "./routes/commerce";
import { setupAdminRoutes } from "./routes/admin";
import { setupSearchRoutes } from "./routes/search";
import { setupAdRoutes } from "./routes/ads";
import { setupAnalyticsRoutes } from "./routes/analytics";

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

// Middleware: Session configuration for storing user sessions
export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage connection
  await storage.connect();

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key-here",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  // Setup all route modules
  setupAuthRoutes(app);
  setupUserRoutes(app);
  setupArtistRoutes(app);
  setupSongRoutes(app);
  setupMerchRoutes(app);
  setupEventRoutes(app);
  setupBlogRoutes(app);
  setupCommerceRoutes(app);
  setupAdminRoutes(app);
  setupSearchRoutes(app);
  setupAdRoutes(app);
  setupAnalyticsRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
