import { useLocation } from "wouter";
import {
  Upload, Music, Calendar, ShoppingBag,
  DollarSign, Users, Heart, Play, Palette, Crown, Vote
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import type { ArtistProfile, Analytics } from "./types";

// ---------- COMPONENT ----------
export default function OverviewTab() {
  const auth = useRequireRole("artist");
  const [, setLocation] = useLocation();

  // ---------- QUERIES ----------
  const { data: artistProfile } = useQuery({
    queryKey: ["artistProfile"],
    queryFn: () => fetch("/api/artists/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` }
    }).then(res => res.json()),
    enabled: !!auth.user,
  });

  const { data: analytics } = useQuery({
    queryKey: ["artistAnalytics"],
    queryFn: () => fetch("/api/artists/analytics", {
      headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` }
    }).then(res => res.json()),
    enabled: !!auth.user,
  });

  const { data: nftAnalytics } = useQuery({
    queryKey: ["artistNFTAlytics"],
    queryFn: () => fetch("/api/artists/analytics/nfts", {
      headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` }
    }).then(res => res.json()),
    enabled: !!auth.user,
  });

  // ---------- SAFE DEFAULTS ----------
  const safeArtistProfile: ArtistProfile = {
    _id: artistProfile?._id || "",
    userId: artistProfile?.userId || auth.user?._id || "",
    bio: artistProfile?.bio || "",
    socialLinks: artistProfile?.socialLinks || {},
    followers: artistProfile?.followers || [],
    totalPlays: artistProfile?.totalPlays || 0,
    totalLikes: artistProfile?.totalLikes || 0,
    revenue: {
      subscriptions: artistProfile?.revenue?.subscriptions || 0,
      merch: artistProfile?.revenue?.merch || 0,
      events: artistProfile?.revenue?.events || 0,
      ads: artistProfile?.revenue?.ads || 0
    },
    trendingScore: artistProfile?.trendingScore || 0,
    featured: artistProfile?.featured || false,
    verified: artistProfile?.verified || false,
    createdAt: artistProfile?.createdAt || new Date(),
    updatedAt: artistProfile?.updatedAt || new Date()
  };

  const safeAnalytics: Analytics = analytics || {
    monthlyRevenue: 0, subscriptionRevenue: 0, merchRevenue: 0, eventRevenue: 0,
    totalPlays: 0, uniqueListeners: 0, totalLikes: 0,
    newFollowers: 0, newSubscribers: 0, conversionRate: 0, topSongs: []
  };

  const safeNFTAlytics = nftAnalytics || {
    totalMints: 0,
    totalSales: 0,
    totalRoyalties: 0,
    totalRevenue: 0,
    royaltyRevenue: 0,
    primaryRevenue: 0
  };

  return (
    <TabsContent value="overview">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {/* Earnings */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {(
                safeAnalytics.monthlyRevenue +
                safeNFTAlytics.totalRevenue
              ).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        {/* Streams */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeAnalytics.totalPlays?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {safeAnalytics.totalPlays > safeArtistProfile.totalPlays ? '+' : ''}
              {Math.round(((safeAnalytics.totalPlays - safeArtistProfile.totalPlays) / Math.max(safeArtistProfile.totalPlays, 1)) * 100)}% from last period
            </p>
          </CardContent>
        </Card>

        {/* Followers */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeArtistProfile.followers.length?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{safeAnalytics.newFollowers || 0} this period
            </p>
          </CardContent>
        </Card>

        {/* Likes */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeAnalytics.totalLikes?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.max(0, (safeAnalytics.totalLikes || 0) - safeArtistProfile.totalLikes)} new likes
            </p>
          </CardContent>
        </Card>

        {/* NFT Mints */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NFT Mints</CardTitle>
            <Palette className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeNFTAlytics.totalMints?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{safeNFTAlytics.totalMints || 0} NFTs created
            </p>
          </CardContent>
        </Card>

        {/* NFT Sales */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NFT Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeNFTAlytics.totalSales?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              ₹{safeNFTAlytics.totalRevenue?.toLocaleString() || 0} total revenue
            </p>
          </CardContent>
        </Card>

        {/* NFT Royalties */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NFT Royalties</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeNFTAlytics.totalRoyalties?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              ₹{safeNFTAlytics.royaltyRevenue?.toLocaleString() || 0} earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card onClick={() => setLocation("/creator/upload")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Upload className="w-10 h-10 text-primary mb-3" />
            <h3 className="text-lg font-semibold">Upload Music</h3>
            <p className="text-sm text-muted-foreground">Share your tracks with fans</p>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation("/creator/nfts")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Palette className="w-10 h-10 text-purple-500 mb-3" />
            <h3 className="text-lg font-semibold">Mint NFT</h3>
            <p className="text-sm text-muted-foreground">Create digital collectibles</p>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation("/creator/fanclub")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Crown className="w-10 h-10 text-yellow-500 mb-3" />
            <h3 className="text-lg font-semibold">Fan Club</h3>
            <p className="text-sm text-muted-foreground">Build exclusive community</p>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation("/creator/dao")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Vote className="w-10 h-10 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold">DAO Governance</h3>
            <p className="text-sm text-muted-foreground">Create proposals & vote</p>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation("/creator/events")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Calendar className="w-10 h-10 text-secondary mb-3" />
            <h3 className="text-lg font-semibold">Create Event</h3>
            <p className="text-sm text-muted-foreground">Schedule concerts & shows</p>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation("/creator/merch")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-10 h-10 text-accent mb-3" />
            <h3 className="text-lg font-semibold">Add Merch</h3>
            <p className="text-sm text-muted-foreground">Sell products to fans</p>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
