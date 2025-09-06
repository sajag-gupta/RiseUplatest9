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
export const createAdCampaign = async (req: Request, res: Response) => {
  try {
    const campaignData = req.body;
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

// Create audio ad
export const createAudioAd = async (req: Request, res: Response) => {
  try {
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

// Create banner ad
export const createBannerAd = async (req: Request, res: Response) => {
  try {
    const adData = req.body;
    const ad = await storage.createBannerAd(adData);
    res.status(201).json(ad);
  } catch (error) {
    console.error('Error creating banner ad:', error);
    res.status(500).json({ error: "Failed to create banner ad" });
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
export const createAdPlacement = async (req: Request, res: Response) => {
  try {
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

    // Check if user is premium - no ads for premium users
    // TODO: Implement proper user plan checking when user data includes plan info
    // For now, we'll allow ads for all authenticated users

    // Get all active placements for the requested type
    const placements = await storage.getAdPlacementsByType(type as string);

    if (placements.length === 0) {
      return res.json([]);
    }

    // Filter placements based on basic criteria
    let eligiblePlacements = placements.filter(p => p.isActive);

    if (eligiblePlacements.length === 0) {
      return res.json([]);
    }

    // Apply sophisticated targeting logic
    eligiblePlacements = eligiblePlacements.filter(placement => {
      const targeting = placement.targeting;

      if (!targeting) {
        return true; // No targeting means show to everyone
      }

      // User type targeting
      if (targeting.userTypes && targeting.userTypes.length > 0) {
        // For now, assume all users are FREE unless specified otherwise
        // TODO: Implement proper user plan checking
        const userType = "FREE";
        if (!targeting.userTypes.includes(userType as any)) {
          return false;
        }
      }

      // Device type targeting
      if (targeting.deviceTypes && targeting.deviceTypes.length > 0) {
        const userAgent = req.headers['user-agent'] || '';
        let deviceType: string;

        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
          deviceType = 'mobile';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
          deviceType = 'tablet';
        } else {
          deviceType = 'desktop';
        }

        if (!targeting.deviceTypes.includes(deviceType as any)) {
          return false;
        }
      }

      // Age targeting (if user age data is available)
      // TODO: Add age field to user schema and implement age-based targeting

      // Region targeting (if user location data is available)
      // TODO: Add region field to user schema and implement region-based targeting

      // Genre targeting (if user has favorite genres)
      // TODO: Add favoriteGenres field to user schema and implement genre-based targeting

      return true;
    });

    if (eligiblePlacements.length === 0) {
      return res.json([]);
    }

    // Sort by priority (higher priority first)
    eligiblePlacements.sort((a, b) => b.priority - a.priority);

    // Select the best placement (highest priority)
    const selectedPlacement = eligiblePlacements[0];

    // Get the ad based on type
    let ad = null;
    if (selectedPlacement.adType === "AUDIO") {
      ad = await storage.getAudioAd(selectedPlacement.adId);
    } else {
      ad = await storage.getBannerAd(selectedPlacement.adId);
    }

    if (!ad) {
      return res.json([]);
    }

    res.json([{
      ...ad,
      placement: selectedPlacement.type,
      placementId: selectedPlacement._id
    }]);
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

    // Build match conditions
    const matchConditions: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (campaign && campaign !== "all") {
      matchConditions.campaignId = campaign;
    }

    // Get total impressions
    const totalImpressionsResult = await (storage as any).db.collection("ad_impressions")
      .aggregate([
        { $match: matchConditions },
        { $count: "total" }
      ]).toArray();

    const totalImpressions = totalImpressionsResult[0]?.total || 0;

    // Get total clicks
    const totalClicksResult = await (storage as any).db.collection("ad_clicks")
      .aggregate([
        { $match: matchConditions },
        { $count: "total" }
      ]).toArray();

    const totalClicks = totalClicksResult[0]?.total || 0;

    // Calculate CTR
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Get total revenue
    const totalRevenueResult = await (storage as any).db.collection("ad_revenue")
      .aggregate([
        { $match: matchConditions },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).toArray();

    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Get top performing ads
    const topPerformingAds = await (storage as any).db.collection("ad_impressions")
      .aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: "$adId",
            impressions: { $sum: 1 },
            clicks: {
              $sum: {
                $cond: [
                  { $in: ["$_id", await getClickAdIds(matchConditions)] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: "audio_ads",
            localField: "_id",
            foreignField: "_id",
            as: "audioAd"
          }
        },
        {
          $lookup: {
            from: "banner_ads",
            localField: "_id",
            foreignField: "_id",
            as: "bannerAd"
          }
        },
        {
          $project: {
            adId: "$_id",
            title: {
              $ifNull: [
                { $arrayElemAt: ["$audioAd.title", 0] },
                { $arrayElemAt: ["$bannerAd.title", 0] }
              ]
            },
            impressions: 1,
            clicks: 1,
            ctr: { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] }
          }
        },
        { $sort: { impressions: -1 } },
        { $limit: 10 }
      ]).toArray();

    // Get revenue by day
    const revenueByDay = await (storage as any).db.collection("ad_revenue")
      .aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            revenue: { $sum: "$amount" },
            impressions: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "ad_clicks",
            let: { date: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                      "$$date"
                    ]
                  }
                }
              },
              { $count: "clicks" }
            ],
            as: "clickData"
          }
        },
        {
          $project: {
            date: "$_id",
            revenue: 1,
            impressions: 1,
            clicks: { $ifNull: [{ $arrayElemAt: ["$clickData.clicks", 0] }, 0] }
          }
        },
        { $sort: { date: 1 } }
      ]).toArray();

    // Get campaign performance
    const campaignPerformance = await (storage as any).db.collection("ad_campaigns")
      .aggregate([
        {
          $lookup: {
            from: "ad_impressions",
            localField: "_id",
            foreignField: "campaignId",
            as: "impressions"
          }
        },
        {
          $lookup: {
            from: "ad_clicks",
            localField: "_id",
            foreignField: "campaignId",
            as: "clicks"
          }
        },
        {
          $lookup: {
            from: "ad_revenue",
            localField: "_id",
            foreignField: "campaignId",
            as: "revenue"
          }
        },
        {
          $project: {
            campaignId: "$_id",
            name: 1,
            status: 1,
            impressions: { $size: "$impressions" },
            clicks: { $size: "$clicks" },
            revenue: { $sum: "$revenue.amount" },
            ctr: {
              $multiply: [
                {
                  $divide: [
                    { $size: "$clicks" },
                    { $cond: { if: { $gt: [{ $size: "$impressions" }, 0] }, then: { $size: "$impressions" }, else: 1 } }
                  ]
                },
                100
              ]
            }
          }
        }
      ]).toArray();

    res.json({
      totalImpressions,
      totalClicks,
      totalRevenue,
      ctr,
      topPerformingAds,
      revenueByDay,
      campaignPerformance
    });
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
  app.get("/api/ads/campaigns", requireAdmin, getAdCampaigns);
  app.get("/api/ads/campaigns/:id", requireAdmin, getAdCampaign);
  app.post("/api/ads/campaigns", requireAdmin, createAdCampaign);
  app.put("/api/ads/campaigns/:id", requireAdmin, updateAdCampaign);
  app.delete("/api/ads/campaigns/:id", requireAdmin, deleteAdCampaign);

  // Audio Ad routes
  app.get("/api/ads/audio/campaign/:campaignId", requireAdmin, getAudioAdsByCampaign);
  app.post("/api/ads/audio", requireAdmin, createAudioAd);

  // Banner Ad routes
  app.get("/api/ads/banner/campaign/:campaignId", requireAdmin, getBannerAdsByCampaign);
  app.post("/api/ads/banner", requireAdmin, createBannerAd);

  // Ad Placement routes
  app.get("/api/ads/placements/:type", requireAuth, getAdPlacementsByType);
  app.post("/api/ads/placements", requireAdmin, createAdPlacement);

  // Analytics routes
  app.get("/api/ads/analytics", requireAdmin, getAdAnalytics);
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
