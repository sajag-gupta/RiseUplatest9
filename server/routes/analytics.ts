import { Request, Response } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import AnalyticsService from "../services/analytics";

const requireAuth = authenticateToken;
const requireAdmin = requireRole(["admin"]);

// Get user analytics
export const getUserAnalytics = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getUserMetrics(userId, parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "User analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({ error: "Failed to get user analytics" });
  }
};

// Get artist analytics
export const getArtistAnalytics = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getArtistMetrics(artistId, parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "Artist analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting artist analytics:', error);
    res.status(500).json({ error: "Failed to get artist analytics" });
  }
};

// Get platform analytics (admin only)
export const getPlatformAnalytics = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getPlatformMetrics(parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "Platform analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting platform analytics:', error);
    res.status(500).json({ error: "Failed to get platform analytics" });
  }
};

// Track user action
export const trackUserAction = async (req: Request, res: Response) => {
  try {
    const { userId, action, context, metadata } = req.body;

    await AnalyticsService.trackPageView(userId, action, {
      context,
      ...metadata,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: "Action tracked successfully" });
  } catch (error) {
    console.error('Error tracking user action:', error);
    res.status(500).json({ error: "Failed to track user action" });
  }
};

// Track search query
export const trackSearch = async (req: Request, res: Response) => {
  try {
    const { userId, query, resultsCount, filters, clickedResults } = req.body;

    await AnalyticsService.trackSearchQuery({
      userId,
      query,
      resultsCount,
      filters: filters || {},
      clickedResults: clickedResults || []
    });

    res.status(200).json({ message: "Search tracked successfully" });
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({ error: "Failed to track search" });
  }
};

// Start user session
export const startUserSession = async (req: Request, res: Response) => {
  try {
    const { userId, deviceInfo, location } = req.body;

    const sessionId = await AnalyticsService.startUserSession(userId, deviceInfo, location);

    res.status(201).json({ sessionId });
  } catch (error) {
    console.error('Error starting user session:', error);
    res.status(500).json({ error: "Failed to start user session" });
  }
};

// Update user session
export const updateUserSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    await AnalyticsService.updateUserSession(sessionId, updates);

    res.status(200).json({ message: "Session updated successfully" });
  } catch (error) {
    console.error('Error updating user session:', error);
    res.status(500).json({ error: "Failed to update user session" });
  }
};

// End user session
export const endUserSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await AnalyticsService.endUserSession(sessionId);

    res.status(200).json({ message: "Session ended successfully" });
  } catch (error) {
    console.error('Error ending user session:', error);
    res.status(500).json({ error: "Failed to end user session" });
  }
};

// Track subscription
export const trackSubscription = async (req: Request, res: Response) => {
  try {
    const subscriptionData = req.body;

    await AnalyticsService.trackSubscription(subscriptionData);

    res.status(200).json({ message: "Subscription tracked successfully" });
  } catch (error) {
    console.error('Error tracking subscription:', error);
    res.status(500).json({ error: "Failed to track subscription" });
  }
};

// Track order/ecommerce
export const trackOrder = async (req: Request, res: Response) => {
  try {
    const orderData = req.body;

    await AnalyticsService.trackOrder(orderData);

    res.status(200).json({ message: "Order tracked successfully" });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: "Failed to track order" });
  }
};

// Update content performance metrics
export const updateContentMetrics = async (req: Request, res: Response) => {
  try {
    const { contentId, contentType } = req.params;
    const metrics = req.body;

    await AnalyticsService.updateContentMetrics(contentId, contentType, metrics);

    res.status(200).json({ message: "Content metrics updated successfully" });
  } catch (error) {
    console.error('Error updating content metrics:', error);
    res.status(500).json({ error: "Failed to update content metrics" });
  }
};

// Get trending content
export const getTrendingContent = async (req: Request, res: Response) => {
  try {
    const { type = "songs", limit = 20, days = 7 } = req.query;

    let trendingData;
    if (type === "songs") {
      trendingData = await AnalyticsService.getPlatformMetrics(parseInt(days as string));
      trendingData = trendingData?.trendingSongs || [];
    } else {
      // For other content types, implement similar logic
      trendingData = [];
    }

    res.json(trendingData);
  } catch (error) {
    console.error('Error getting trending content:', error);
    res.status(500).json({ error: "Failed to get trending content" });
  }
};

// Get popular searches
export const getPopularSearches = async (req: Request, res: Response) => {
  try {
    const { limit = 20, days = 30 } = req.query;

    const platformMetrics = await AnalyticsService.getPlatformMetrics(parseInt(days as string));
    const popularSearches = platformMetrics?.popularSearches || [];

    res.json(popularSearches.slice(0, parseInt(limit as string)));
  } catch (error) {
    console.error('Error getting popular searches:', error);
    res.status(500).json({ error: "Failed to get popular searches" });
  }
};

// Get growth trends
export const getGrowthTrends = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const platformMetrics = await AnalyticsService.getPlatformMetrics(parseInt(days as string));
    const growthTrends = platformMetrics?.growthTrends || {
      userGrowth: [],
      revenueGrowth: [],
      dates: []
    };

    res.json(growthTrends);
  } catch (error) {
    console.error('Error getting growth trends:', error);
    res.status(500).json({ error: "Failed to get growth trends" });
  }
};

// Get retention metrics
export const getRetentionMetrics = async (req: Request, res: Response) => {
  try {
    const platformMetrics = await AnalyticsService.getPlatformMetrics(30);

    res.json({
      retentionRate7d: platformMetrics?.retentionRate7d || 0,
      retentionRate30d: platformMetrics?.retentionRate30d || 0,
      dau: platformMetrics?.dau || 0,
      mau: platformMetrics?.mau || 0
    });
  } catch (error) {
    console.error('Error getting retention metrics:', error);
    res.status(500).json({ error: "Failed to get retention metrics" });
  }
};

// Get e-commerce analytics
export const getEcommerceAnalytics = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const platformMetrics = await AnalyticsService.getPlatformMetrics(parseInt(days as string));
    const ecommerceAnalytics = platformMetrics?.merchAnalytics || {
      totalSales: 0,
      totalRevenue: 0,
      bestSellingProducts: [],
      stockVsDemand: []
    };

    res.json(ecommerceAnalytics);
  } catch (error) {
    console.error('Error getting e-commerce analytics:', error);
    res.status(500).json({ error: "Failed to get e-commerce analytics" });
  }
};

// Get subscription analytics
export const getSubscriptionAnalytics = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const platformMetrics = await AnalyticsService.getPlatformMetrics(parseInt(days as string));
    const subscriptionAnalytics = platformMetrics?.subscriptionAnalytics || {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      churnRate: 0,
      renewals: 0,
      upgrades: 0
    };

    res.json(subscriptionAnalytics);
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    res.status(500).json({ error: "Failed to get subscription analytics" });
  }
};

// Get current user's artist analytics (for creator dashboard)
export const getCurrentArtistAnalytics = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const analytics = await AnalyticsService.getArtistMetrics(user._id, 30);

    if (!analytics) {
      return res.status(404).json({ error: "Artist analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting current artist analytics:', error);
    res.status(500).json({ error: "Failed to get artist analytics" });
  }
};

// ===================
// NFT ANALYTICS ROUTES
// ===================

// Get NFT analytics
export const getNFTAnalytics = async (req: Request, res: Response) => {
  try {
    const { nftId } = req.params;
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getNFTAnalytics(nftId, parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "NFT analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting NFT analytics:', error);
    res.status(500).json({ error: "Failed to get NFT analytics" });
  }
};

// Get NFT marketplace analytics
export const getNFTMarketplaceAnalytics = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getNFTMarketplaceAnalytics(parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "NFT marketplace analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting NFT marketplace analytics:', error);
    res.status(500).json({ error: "Failed to get NFT marketplace analytics" });
  }
};

// Get artist NFT analytics
export const getArtistNFTAlytics = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getArtistNFTAlytics(artistId, parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "Artist NFT analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting artist NFT analytics:', error);
    res.status(500).json({ error: "Failed to get artist NFT analytics" });
  }
};

// Get current user's NFT analytics
export const getCurrentUserNFTAlytics = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const analytics = await AnalyticsService.getArtistNFTAlytics(user._id, 30);

    if (!analytics) {
      return res.status(404).json({ error: "User NFT analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting current user NFT analytics:', error);
    res.status(500).json({ error: "Failed to get user NFT analytics" });
  }
};

// ===================
// CROSS-SYSTEM ANALYTICS ROUTES
// ===================

// Get user cross-system engagement
export const getUserCrossSystemEngagement = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getUserCrossSystemEngagement(userId, parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "User cross-system analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting user cross-system engagement:', error);
    res.status(500).json({ error: "Failed to get user cross-system engagement" });
  }
};

// Get platform cross-system analytics
export const getPlatformCrossSystemAnalytics = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await AnalyticsService.getPlatformCrossSystemAnalytics(parseInt(days as string));

    if (!analytics) {
      return res.status(404).json({ error: "Platform cross-system analytics not found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error getting platform cross-system analytics:', error);
    res.status(500).json({ error: "Failed to get platform cross-system analytics" });
  }
};

// Generic analytics tracking endpoint
export const trackGenericAnalytics = async (req: Request, res: Response) => {
  try {
    const { userId, artistId, songId, action, context, metadata } = req.body;

    // Create analytics data
    const analyticsData = {
      userId,
      artistId,
      songId,
      action,
      context: context || "unknown",
      metadata: metadata || {}
    };

    await AnalyticsService.trackPageView(userId, action, {
      context,
      ...metadata,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: "Analytics tracked successfully" });
  } catch (error) {
    console.error('Error tracking generic analytics:', error);
    res.status(500).json({ error: "Failed to track analytics" });
  }
};

// Setup routes
export function setupAnalyticsRoutes(app: any) {
  // Generic analytics tracking
  app.post("/api/analytics", requireAuth, trackGenericAnalytics);

  // User analytics
  app.get("/api/analytics/users/:userId", requireAuth, getUserAnalytics);

  // Artist analytics
  app.get("/api/analytics/artists/:artistId", requireAuth, getArtistAnalytics);
  app.get("/api/artists/analytics", requireAuth, getCurrentArtistAnalytics);

  // Platform analytics (admin only)
  app.get("/api/analytics/platform", requireAdmin, getPlatformAnalytics);

  // Tracking endpoints
  app.post("/api/analytics/track", requireAuth, trackUserAction);
  app.post("/api/analytics/search", requireAuth, trackSearch);
  app.post("/api/analytics/sessions", requireAuth, startUserSession);
  app.put("/api/analytics/sessions/:sessionId", requireAuth, updateUserSession);
  app.delete("/api/analytics/sessions/:sessionId", requireAuth, endUserSession);
  app.post("/api/analytics/subscriptions", requireAuth, trackSubscription);
  app.post("/api/analytics/orders", requireAuth, trackOrder);
  app.put("/api/analytics/content/:contentId/:contentType", requireAuth, updateContentMetrics);

  // Analytics data endpoints
  app.get("/api/analytics/trending", getTrendingContent);
  app.get("/api/analytics/searches/popular", getPopularSearches);
  app.get("/api/analytics/growth", getGrowthTrends);
  app.get("/api/analytics/retention", getRetentionMetrics);
  app.get("/api/analytics/ecommerce", getEcommerceAnalytics);
  app.get("/api/analytics/subscriptions", getSubscriptionAnalytics);

  // ===================
  // NFT ANALYTICS ROUTES
  // ===================

  // NFT analytics
  app.get("/api/analytics/nfts/:nftId", requireAuth, getNFTAnalytics);
  app.get("/api/analytics/nfts/marketplace", requireAuth, getNFTMarketplaceAnalytics);
  app.get("/api/analytics/artists/:artistId/nfts", requireAuth, getArtistNFTAlytics);
  app.get("/api/artists/analytics/nfts", requireAuth, getCurrentUserNFTAlytics);

  // ===================
  // CROSS-SYSTEM ANALYTICS ROUTES
  // ===================

  // Cross-system engagement analytics
  app.get("/api/analytics/users/:userId/cross-system", requireAuth, getUserCrossSystemEngagement);
  app.get("/api/analytics/platform/cross-system", requireAuth, getPlatformCrossSystemAnalytics);
}
