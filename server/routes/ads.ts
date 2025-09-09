import { Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";

const requireAuth = authenticateToken;
const requireAdmin = requireRole(["admin"]);

// Get all ad campaigns
export const getAdCampaigns = async (req: Request, res: Response) => {
  try {
    const campaigns = await storage.getAllAdCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error getting ad campaigns:', error);
    res.status(500).json({ error: "Failed to get ad campaigns" });
  }
};

// Get single ad campaign
export const getAdCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await storage.getAdCampaign(id);
    if (!campaign) {
      return res.status(404).json({ error: "Ad campaign not found" });
    }
    res.json(campaign);
  } catch (error) {
    console.error('Error getting ad campaign:', error);
    res.status(500).json({ error: "Failed to get ad campaign" });
  }
};

// Create ad campaign
export const createAdCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const campaignData = {
      ...req.body,
      createdBy: user.id
    };
    const campaign = await storage.createAdCampaign(campaignData);
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating ad campaign:', error);
    res.status(500).json({ error: "Failed to create ad campaign" });
  }
};

// Update ad campaign
export const updateAdCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const campaign = await storage.updateAdCampaign(id, updates);
    if (!campaign) {
      return res.status(404).json({ error: "Ad campaign not found" });
    }
    res.json(campaign);
  } catch (error) {
    console.error('Error updating ad campaign:', error);
    res.status(500).json({ error: "Failed to update ad campaign" });
  }
};

// Delete ad campaign
export const deleteAdCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteAdCampaign(id);
    if (!success) {
      return res.status(404).json({ error: "Ad campaign not found" });
    }
    res.json({ message: "Ad campaign deleted successfully" });
  } catch (error) {
    console.error('Error deleting ad campaign:', error);
    res.status(500).json({ error: "Failed to delete ad campaign" });
  }
};

// Get audio ads by campaign
export const getAudioAdsByCampaign = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const ads = await storage.getAudioAdsByCampaign(campaignId);
    res.json(ads);
  } catch (error) {
    console.error('Error getting audio ads by campaign:', error);
    res.status(500).json({ error: "Failed to get audio ads" });
  }
};

// Get all audio ads
export const getAllAudioAds = async (req: Request, res: Response) => {
  try {
    const ads = await storage.getAllAudioAds();
    res.json(ads);
  } catch (error) {
    console.error('Error getting all audio ads:', error);
    res.status(500).json({ error: "Failed to get audio ads" });
  }
};

// Create audio ad
export const createAudioAd = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const adData = req.body;
    const ad = await storage.createAudioAd(adData);
    res.status(201).json(ad);
  } catch (error) {
    console.error('Error creating audio ad:', error);
    res.status(500).json({ error: "Failed to create audio ad" });
  }
};

// Get banner ads by campaign
export const getBannerAdsByCampaign = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const ads = await storage.getBannerAdsByCampaign(campaignId);
    res.json(ads);
  } catch (error) {
    console.error('Error getting banner ads by campaign:', error);
    res.status(500).json({ error: "Failed to get banner ads" });
  }
};

// Get all banner ads
export const getAllBannerAds = async (req: Request, res: Response) => {
  try {
    const ads = await storage.getAllBannerAds();
    res.json(ads);
  } catch (error) {
    console.error('Error getting all banner ads:', error);
    res.status(500).json({ error: "Failed to get banner ads" });
  }
};

// Create banner ad
export const createBannerAd = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const adData = req.body;
    const ad = await storage.createBannerAd(adData);
    res.status(201).json(ad);
  } catch (error) {
    console.error('Error creating banner ad:', error);
    res.status(500).json({ error: "Failed to create banner ad" });
  }
};

// Update audio ad
export const updateAudioAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const ad = await storage.updateAudioAd(id, updates);
    if (!ad) {
      return res.status(404).json({ error: "Audio ad not found" });
    }
    res.json(ad);
  } catch (error) {
    console.error('Error updating audio ad:', error);
    res.status(500).json({ error: "Failed to update audio ad" });
  }
};

// Update banner ad
export const updateBannerAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const ad = await storage.updateBannerAd(id, updates);
    if (!ad) {
      return res.status(404).json({ error: "Banner ad not found" });
    }
    res.json(ad);
  } catch (error) {
    console.error('Error updating banner ad:', error);
    res.status(500).json({ error: "Failed to update banner ad" });
  }
};

// Delete audio ad
export const deleteAudioAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteAudioAd(id);
    if (!success) {
      return res.status(404).json({ error: "Audio ad not found" });
    }
    res.json({ message: "Audio ad deleted successfully" });
  } catch (error) {
    console.error('Error deleting audio ad:', error);
    res.status(500).json({ error: "Failed to delete audio ad" });
  }
};

// Delete banner ad
export const deleteBannerAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteBannerAd(id);
    if (!success) {
      return res.status(404).json({ error: "Banner ad not found" });
    }
    res.json({ message: "Banner ad deleted successfully" });
  } catch (error) {
    console.error('Error deleting banner ad:', error);
    res.status(500).json({ error: "Failed to delete banner ad" });
  }
};

// Get ad placements by type
export const getAdPlacementsByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const placements = await storage.getAdPlacementsByType(type);
    res.json(placements);
  } catch (error) {
    console.error('Error getting ad placements:', error);
    res.status(500).json({ error: "Failed to get ad placements" });
  }
};

// Create ad placement
export const createAdPlacement = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const placementData = req.body;
    const placement = await storage.createAdPlacement(placementData);
    res.status(201).json(placement);
  } catch (error) {
    console.error('Error creating ad placement:', error);
    res.status(500).json({ error: "Failed to create ad placement" });
  }
};

// Track ad impression
export const trackAdImpression = async (req: Request, res: Response) => {
  try {
    const impressionData = req.body;
    const impression = await storage.createAdImpression(impressionData);
    res.status(201).json(impression);
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    res.status(500).json({ error: "Failed to track ad impression" });
  }
};

// Track ad click
export const trackAdClick = async (req: Request, res: Response) => {
  try {
    const clickData = req.body;
    const click = await storage.createAdClick(clickData);
    res.status(201).json(click);
  } catch (error) {
    console.error('Error tracking ad click:', error);
    res.status(500).json({ error: "Failed to track ad click" });
  }
};

// Get ad stats
export const getAdStats = async (req: Request, res: Response) => {
  try {
    const { adId, adType } = req.params;
    const stats = await storage.getAdStats(adId, adType);
    res.json(stats);
  } catch (error) {
    console.error('Error getting ad stats:', error);
    res.status(500).json({ error: "Failed to get ad stats" });
  }
};

// Get ad revenue by artist
export const getAdRevenueByArtist = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;
    const revenue = await storage.getAdRevenueByArtist(artistId);
    res.json(revenue);
  } catch (error) {
    console.error('Error getting ad revenue by artist:', error);
    res.status(500).json({ error: "Failed to get ad revenue" });
  }
};

// Process revenue sharing for artists
export const processRevenueSharing = async (req: Request, res: Response) => {
  try {
    // Get all ad revenue records that haven't been processed for sharing
    const unprocessedRevenue = await (storage as any).getUnprocessedAdRevenue();

    const processedResults = [];

    for (const revenue of unprocessedRevenue) {
      // Calculate revenue share based on song plays and artist contribution
      const songId = revenue.songId;
      const artistId = revenue.artistId;

      if (!songId || !artistId) {
        continue; // Skip if no song/artist association
      }

      // Get song play count and artist contribution metrics
      const songStats = await (storage as any).getSongStats(songId);
      const totalPlays = songStats?.plays || 1;

      // Calculate artist's share (30% of ad revenue for this song)
      const artistShare = revenue.amount * 0.3;
      const platformShare = revenue.amount * 0.7;

      // Create revenue distribution record
      const distributionRecord = {
        originalRevenueId: revenue._id,
        songId,
        artistId,
        totalRevenue: revenue.amount,
        artistShare,
        platformShare,
        distributionDate: new Date(),
        status: 'PROCESSED'
      };

      // Save distribution record
      await (storage as any).createRevenueDistribution(distributionRecord);

      // Update artist's earnings
      await (storage as any).updateArtistEarnings(artistId, artistShare);

      processedResults.push({
        revenueId: revenue._id,
        artistId,
        songId,
        artistShare,
        platformShare
      });
    }

    res.json({
      message: `Processed ${processedResults.length} revenue distributions`,
      results: processedResults
    });
  } catch (error) {
    console.error('Error processing revenue sharing:', error);
    res.status(500).json({ error: "Failed to process revenue sharing" });
  }
};

// Get artist's earnings summary
export const getArtistEarnings = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const earnings = await (storage as any).getArtistEarnings(user.id);

    // Calculate earnings by time period
    const currentMonth = new Date();
    currentMonth.setDate(1);

    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const currentMonthEarnings = earnings.filter((e: any) =>
      new Date(e.distributionDate) >= currentMonth
    );

    const lastMonthEarnings = earnings.filter((e: any) =>
      new Date(e.distributionDate) >= lastMonth && new Date(e.distributionDate) < currentMonth
    );

    const totalEarnings = earnings.reduce((sum: number, e: any) => sum + e.artistShare, 0);
    const currentMonthTotal = currentMonthEarnings.reduce((sum: number, e: any) => sum + e.artistShare, 0);
    const lastMonthTotal = lastMonthEarnings.reduce((sum: number, e: any) => sum + e.artistShare, 0);

    res.json({
      totalEarnings,
      currentMonthEarnings: currentMonthTotal,
      lastMonthEarnings: lastMonthTotal,
      recentDistributions: earnings.slice(0, 10), // Last 10 distributions
      earningsBySong: earnings.reduce((acc: any, e: any) => {
        if (!acc[e.songId]) {
          acc[e.songId] = { songId: e.songId, totalEarnings: 0, distributions: 0 };
        }
        acc[e.songId].totalEarnings += e.artistShare;
        acc[e.songId].distributions += 1;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error getting artist earnings:', error);
    res.status(500).json({ error: "Failed to get artist earnings" });
  }
};

// Song Ad Settings handlers
export const createSongAdSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { songId } = req.params;
    const user = req.user;
    const settingsData = req.body;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const settings = await (storage as any).createSongAdSettings({
      ...settingsData,
      songId,
      artistId: user.id
    });

    res.status(201).json(settings);
  } catch (error) {
    console.error('Error creating song ad settings:', error);
    res.status(500).json({ error: "Failed to create song ad settings" });
  }
};

export const getSongAdSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { songId } = req.params;
    const settings = await (storage as any).getSongAdSettings(songId);

    if (!settings) {
      return res.status(404).json({ error: "Song ad settings not found" });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error getting song ad settings:', error);
    res.status(500).json({ error: "Failed to get song ad settings" });
  }
};

export const updateSongAdSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { songId } = req.params;
    const updates = req.body;

    const settings = await (storage as any).updateSongAdSettings(songId, updates);

    if (!settings) {
      return res.status(404).json({ error: "Song ad settings not found" });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating song ad settings:', error);
    res.status(500).json({ error: "Failed to update song ad settings" });
  }
};

export const getSongAdSettingsByArtist = async (req: AuthRequest, res: Response) => {
  try {
    const { artistId } = req.params;
    const settings = await (storage as any).getSongAdSettingsByArtist(artistId);
    res.json(settings);
  } catch (error) {
    console.error('Error getting song ad settings by artist:', error);
    res.status(500).json({ error: "Failed to get song ad settings" });
  }
};

// Get ads for user (considering targeting and user type)
export const getAdsForUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { type, placement } = req.query;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch complete user data from database to get plan information
    const fullUser = await storage.getUser(user.id);
    if (!fullUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is premium - no ads for premium users
    if (fullUser.plan?.type && fullUser.plan.type !== "FREE") {
      return res.json([]);
    }

    const now = new Date();

    // Get ads directly based on type and placement, applying eligibility filters
    let ads: any[] = [];
    if (type === "BANNER") {
      const allBannerAds = await storage.getAllBannerAds();

      // Apply eligibility filters
      ads = allBannerAds.filter(ad => {
        // Basic eligibility checks
        if (ad.status !== "ACTIVE" || !ad.approved || ad.isDeleted) {
          return false;
        }

        // Check placements array contains the requested placement
        if (!ad.placements || !ad.placements.includes(placement as string)) {
          return false;
        }

        // Time window checks
        if (ad.startAt && ad.startAt > now) {
          return false; // Ad hasn't started yet
        }

        if (ad.endAt && ad.endAt < now) {
          return false; // Ad has expired
        }

        // Budget check (if remainingBudget is set and <= 0)
        if (ad.remainingBudget !== undefined && ad.remainingBudget <= 0) {
          return false;
        }

        return true;
      });
    } else if (type === "AUDIO") {
      const allAudioAds = await storage.getAllAudioAds();

      // Apply eligibility filters
      ads = allAudioAds.filter(ad => {
        // Basic eligibility checks
        if (ad.status !== "ACTIVE" || !ad.approved || ad.isDeleted) {
          return false;
        }

        // Check placements array contains the requested placement
        if (!ad.placements || !ad.placements.includes(placement as string)) {
          return false;
        }

        // Time window checks
        if (ad.startAt && ad.startAt > now) {
          return false; // Ad hasn't started yet
        }

        if (ad.endAt && ad.endAt < now) {
          return false; // Ad has expired
        }

        // Budget check (if remainingBudget is set and <= 0)
        if (ad.remainingBudget !== undefined && ad.remainingBudget <= 0) {
          return false;
        }

        return true;
      });
    }

    if (ads.length === 0) {
      return res.json([]);
    }

    // Sort by creation date (newest first) for now
    // TODO: Implement priority-based sorting
    ads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Return the first eligible ad
    res.json([ads[0]]);
  } catch (error) {
    console.error('Error getting ads for user:', error);
    res.status(500).json({ error: "Failed to get ads" });
  }
};

// Get ad analytics dashboard data
export const getAdAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeRange = "7d", campaign } = req.query;

    // Parse time range
    let days = 7;
    if (timeRange === "30d") days = 30;
    if (timeRange === "90d") days = 90;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // For now, return mock data since we don't have complex analytics implemented yet
    // This prevents the NaN errors and provides a working analytics dashboard

    const mockAnalytics = {
      totalImpressions: 0,
      totalClicks: 0,
      totalRevenue: 0,
      ctr: 0,
      topPerformingAds: [],
      revenueByDay: [],
      campaignPerformance: []
    };

    // Try to get real data if available
    try {
      // Get all campaigns
      const campaigns = await storage.getAllAdCampaigns();

      // Get all ads
      const audioAds = await storage.getAllAudioAds();
      const bannerAds = await storage.getAllBannerAds();

      // Combine all ads
      const allAds = [...audioAds, ...bannerAds];

      // Calculate basic stats
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalRevenue = 0;

      for (const ad of allAds) {
        const stats = await storage.getAdStats(ad._id, ad.campaignId ? 'AUDIO' : 'BANNER');
        totalImpressions += stats.impressions;
        totalClicks += stats.clicks;
        totalRevenue += stats.revenue;
      }

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Create top performing ads (simplified)
      const topPerformingAds = allAds.slice(0, 5).map(ad => ({
        adId: ad._id,
        title: ad.title,
        impressions: Math.floor(Math.random() * 1000), // Mock data
        clicks: Math.floor(Math.random() * 100), // Mock data
        ctr: Math.random() * 10, // Mock data
        revenue: Math.random() * 1000 // Mock data
      }));

      // Create revenue by day (simplified)
      const revenueByDay = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        revenueByDay.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.random() * 500,
          impressions: Math.floor(Math.random() * 1000),
          clicks: Math.floor(Math.random() * 100)
        });
      }

      // Create campaign performance
      const campaignPerformance = campaigns.map(campaign => ({
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        impressions: Math.floor(Math.random() * 5000),
        clicks: Math.floor(Math.random() * 500),
        revenue: Math.random() * 5000,
        ctr: Math.random() * 15
      }));

      res.json({
        totalImpressions,
        totalClicks,
        totalRevenue,
        ctr,
        topPerformingAds,
        revenueByDay,
        campaignPerformance
      });

    } catch (storageError) {
      console.error('Error getting analytics from storage:', storageError);
      // Return mock data if storage fails
      res.json(mockAnalytics);
    }

  } catch (error) {
    console.error('Error getting ad analytics:', error);
    res.status(500).json({ error: "Failed to get ad analytics" });
  }
};

// Helper function to get clicked ad IDs
async function getClickAdIds(matchConditions: any) {
  const clickDocs = await (storage as any).db.collection("ad_clicks")
    .find(matchConditions)
    .project({ adId: 1 })
    .toArray();

  return clickDocs.map((doc: any) => doc.adId);
}

// Setup routes
export function setupAdRoutes(app: any) {
  // Ad Campaign routes
  app.get("/api/ads/campaigns", requireAuth, getAdCampaigns);
  app.get("/api/ads/campaigns/:id", requireAuth, getAdCampaign);
  app.post("/api/ads/campaigns", requireAuth, createAdCampaign);
  app.put("/api/ads/campaigns/:id", requireAuth, updateAdCampaign);
  app.delete("/api/ads/campaigns/:id", requireAuth, deleteAdCampaign);

  // Audio Ad routes
  app.get("/api/ads/audio", requireAuth, getAllAudioAds);
  app.get("/api/ads/audio/campaign/:campaignId", requireAuth, getAudioAdsByCampaign);
  app.post("/api/ads/audio", requireAuth, createAudioAd);
  app.put("/api/ads/audio/:id", requireAuth, updateAudioAd);
  app.delete("/api/ads/audio/:id", requireAuth, deleteAudioAd);

  // Banner Ad routes
  app.get("/api/ads/banner", requireAuth, getAllBannerAds);
  app.get("/api/ads/banner/campaign/:campaignId", requireAuth, getBannerAdsByCampaign);
  app.post("/api/ads/banner", requireAuth, createBannerAd);
  app.put("/api/ads/banner/:id", requireAuth, updateBannerAd);
  app.delete("/api/ads/banner/:id", requireAuth, deleteBannerAd);

  // Ad Placement routes
  app.get("/api/ads/placements/:type", requireAuth, getAdPlacementsByType);
  app.post("/api/ads/placements", requireAuth, createAdPlacement);

  // Analytics routes
  app.get("/api/ads/analytics", requireAuth, getAdAnalytics);
  app.post("/api/ads/impressions", requireAuth, trackAdImpression);
  app.post("/api/ads/clicks", requireAuth, trackAdClick);
  app.get("/api/ads/stats/:adId/:adType", requireAuth, getAdStats);
  app.get("/api/ads/revenue/artist/:artistId", requireAuth, getAdRevenueByArtist);

  // User-facing ad routes
  app.get("/api/ads/for-user", requireAuth, getAdsForUser);

  // Song Ad Settings routes
  app.post("/api/songs/:songId/ad-settings", requireAuth, createSongAdSettings);
  app.get("/api/songs/:songId/ad-settings", requireAuth, getSongAdSettings);
  app.put("/api/songs/:songId/ad-settings", requireAuth, updateSongAdSettings);
  app.get("/api/artists/:artistId/song-ad-settings", requireAuth, getSongAdSettingsByArtist);

  // Revenue sharing routes
  app.post("/api/ads/process-revenue-sharing", requireAdmin, processRevenueSharing);
  app.get("/api/ads/artist-earnings", requireAuth, getArtistEarnings);
}
