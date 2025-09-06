import { useLocation } from "wouter";
import {
  Upload, Music, Calendar, ShoppingBag,
  DollarSign, Users, Heart, Play
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

  return (
    <TabsContent value="overview">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                safeArtistProfile.revenue.subscriptions +
                safeArtistProfile.revenue.merch +
                safeArtistProfile.revenue.events +
                safeArtistProfile.revenue.ads
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
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card onClick={() => setLocation("/creator?tab=upload")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Upload className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold">Upload Music</h3>
            <p className="text-sm text-muted-foreground">Share your tracks with fans</p>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation("/creator?tab=events")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Calendar className="w-12 h-12 text-secondary mb-4" />
            <h3 className="text-lg font-semibold">Create Event</h3>
            <p className="text-sm text-muted-foreground">Schedule concerts & shows</p>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation("/creator?tab=merch")} className="cursor-pointer hover-glow">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-accent mb-4" />
            <h3 className="text-lg font-semibold">Add Merch</h3>
            <p className="text-sm text-muted-foreground">Sell products to fans</p>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
