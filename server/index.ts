import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { configureCloudinary } from "./services/cloudinary";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for development
    crossOriginEmbedderPolicy: false,
  })
);

// Enable trust proxy for rate limiting in Replit environment
app.set("trust proxy", 1);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : ["http://localhost:5173", "http://localhost:5000"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging middleware - log all API requests cleanly
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api", limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: "Too many authentication attempts, please try again later.",
});

app.use("/api/auth", authLimiter);

(async () => {
  // Initialize Cloudinary after env vars are loaded
  configureCloudinary();

  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`Error ${status}: ${message}`);

    if (process.env.NODE_ENV === "development") {
      console.error(err);
    }

    res.status(status).json({
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  const port = parseInt(process.env.PORT || "5000", 10);

  server.listen(port, "0.0.0.0", () => {
    log(`Server running on port ${port}`);
    log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
})();
