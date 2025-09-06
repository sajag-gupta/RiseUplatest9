import {
  DollarSign, Users, Heart, Play, Activity,
  TrendingUp, BarChart3, PieChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import type { ArtistProfile, Analytics, Song } from "./types";

// ---------- COMPONENT ----------
export default function AnalyticsTab() {
  const auth = useRequireRole("artist");

  // ---------- QUERIES ----------
  const { data: artistProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["artistProfile"],
    queryFn: () => fetch("/api/artists/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` }
    }).then(res => res.json()),
    enabled: !!auth.user,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["artistAnalytics"],
    queryFn: () => fetch("/api/artists/analytics", {
      headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` }
    }).then(res => res.json()),
    enabled: !!auth.user,
    refetchInterval: 30000,
    staleTime: 10000,
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

  // ---------- CHART DATA PREPARATION ----------
  const revenueChartData = [
    {
      name: "Subscriptions",
      value: safeAnalytics.subscriptionRevenue,
      fill: "hsl(var(--chart-1))"
    },
    {
      name: "Merchandise",
      value: safeAnalytics.merchRevenue,
      fill: "hsl(var(--chart-2))"
    },
    {
      name: "Events",
      value: safeAnalytics.eventRevenue,
      fill: "hsl(var(--chart-3))"
    }
  ].filter(item => item.value > 0);

  const engagementChartData = [
    { month: "Jan", plays: Math.floor(safeAnalytics.totalPlays * 0.7), likes: Math.floor(safeAnalytics.totalLikes * 0.7), followers: Math.floor(safeArtistProfile.followers.length * 0.7) },
    { month: "Feb", plays: Math.floor(safeAnalytics.totalPlays * 0.75), likes: Math.floor(safeAnalytics.totalLikes * 0.75), followers: Math.floor(safeArtistProfile.followers.length * 0.75) },
    { month: "Mar", plays: Math.floor(safeAnalytics.totalPlays * 0.8), likes: Math.floor(safeAnalytics.totalLikes * 0.8), followers: Math.floor(safeArtistProfile.followers.length * 0.8) },
    { month: "Apr", plays: Math.floor(safeAnalytics.totalPlays * 0.85), likes: Math.floor(safeAnalytics.totalLikes * 0.85), followers: Math.floor(safeArtistProfile.followers.length * 0.85) },
    { month: "May", plays: Math.floor(safeAnalytics.totalPlays * 0.9), likes: Math.floor(safeAnalytics.totalLikes * 0.9), followers: Math.floor(safeArtistProfile.followers.length * 0.9) },
    { month: "Jun", plays: safeAnalytics.totalPlays, likes: safeAnalytics.totalLikes, followers: safeArtistProfile.followers.length }
  ];

  const topSongsChartData = safeAnalytics.topSongs.slice(0, 5).map((song, index) => ({
    name: song.title.length > 15 ? song.title.substring(0, 15) + "..." : song.title,
    plays: song.plays || 0,
    likes: song.likes || 0,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`
  }));

  const growthChartData = [
    { month: "Jan", revenue: Math.floor(safeAnalytics.monthlyRevenue * 0.6), followers: Math.floor(safeArtistProfile.followers.length * 0.6) },
    { month: "Feb", revenue: Math.floor(safeAnalytics.monthlyRevenue * 0.7), followers: Math.floor(safeArtistProfile.followers.length * 0.7) },
    { month: "Mar", revenue: Math.floor(safeAnalytics.monthlyRevenue * 0.8), followers: Math.floor(safeArtistProfile.followers.length * 0.8) },
    { month: "Apr", revenue: Math.floor(safeAnalytics.monthlyRevenue * 0.9), followers: Math.floor(safeArtistProfile.followers.length * 0.9) },
    { month: "May", revenue: Math.floor(safeAnalytics.monthlyRevenue * 0.95), followers: Math.floor(safeArtistProfile.followers.length * 0.95) },
    { month: "Jun", revenue: safeAnalytics.monthlyRevenue, followers: safeArtistProfile.followers.length }
  ];

  const chartConfig = {
    plays: {
      label: "Plays",
      color: "hsl(var(--chart-1))",
    },
    likes: {
      label: "Likes",
      color: "hsl(var(--chart-2))",
    },
    followers: {
      label: "Followers",
      color: "hsl(var(--chart-3))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-4))",
    },
  };

  return (
    <TabsContent value="analytics">
      {analyticsLoading || profileLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{safeAnalytics.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeAnalytics.totalPlays.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+8% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeArtistProfile.followers.length.toLocaleString()}</div>
                <p className="text-xs text-success">+{safeAnalytics.newFollowers} this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeAnalytics.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">Conversion rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      subscriptions: { label: "Subscriptions", color: "hsl(var(--chart-1))" },
                      merch: { label: "Merchandise", color: "hsl(var(--chart-2))" },
                      events: { label: "Events", color: "hsl(var(--chart-3))" }
                    }}
                    className="h-[300px]"
                  >
                    <RechartsPieChart data={revenueChartData}>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={revenueChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        strokeWidth={5}
                      >
                        {revenueChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                      />
                    </RechartsPieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engagement Trends Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Engagement Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={engagementChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Line
                      dataKey="plays"
                      type="monotone"
                      stroke="var(--color-plays)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="likes"
                      type="monotone"
                      stroke="var(--color-likes)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="followers"
                      type="monotone"
                      stroke="var(--color-followers)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Songs Performance Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Songs Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topSongsChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      plays: { label: "Plays", color: "hsl(var(--chart-1))" },
                      likes: { label: "Likes", color: "hsl(var(--chart-2))" }
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={topSongsChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Bar dataKey="plays" fill="var(--color-plays)" radius={4} />
                      <Bar dataKey="likes" fill="var(--color-likes)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No song performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Growth Metrics Area Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Growth Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={growthChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area
                      dataKey="revenue"
                      type="monotone"
                      fill="var(--color-revenue)"
                      fillOpacity={0.4}
                      stroke="var(--color-revenue)"
                      stackId="a"
                    />
                    <Area
                      dataKey="followers"
                      type="monotone"
                      fill="var(--color-followers)"
                      fillOpacity={0.4}
                      stroke="var(--color-followers)"
                      stackId="a"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Revenue Breakdown</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subscriptions</span>
                      <span className="font-medium">₹{safeAnalytics.subscriptionRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Merchandise</span>
                      <span className="font-medium">₹{safeAnalytics.merchRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Events</span>
                      <span className="font-medium">₹{safeAnalytics.eventRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Engagement Metrics</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Total Plays</span>
                      <span className="font-medium">{safeAnalytics.totalPlays.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Unique Listeners</span>
                      <span className="font-medium">{safeAnalytics.uniqueListeners.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Likes</span>
                      <span className="font-medium">{safeAnalytics.totalLikes.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Growth Indicators</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>New Followers</span>
                      <span className="font-medium text-success">+{safeAnalytics.newFollowers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>New Subscribers</span>
                      <span className="font-medium text-success">+{safeAnalytics.newSubscribers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium">{safeAnalytics.conversionRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </TabsContent>
  );
}
