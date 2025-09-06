import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Users, Music, DollarSign, TrendingUp, Calendar, ShoppingBag, Play, Heart, Search, BarChart3 } from "lucide-react";
import Loading from "@/components/common/loading";

export default function AdminAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30");

  // Fetch platform analytics
  const { data: platformAnalytics, isLoading: platformLoading } = useQuery({
    queryKey: ["/api/analytics/platform", timeRange],
    queryFn: () => fetch(`/api/analytics/platform?days=${timeRange}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch retention metrics
  const { data: retentionMetrics, isLoading: retentionLoading } = useQuery({
    queryKey: ["/api/analytics/retention"],
    queryFn: () => fetch("/api/analytics/retention", {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch e-commerce analytics
  const { data: ecommerceAnalytics, isLoading: ecommerceLoading } = useQuery({
    queryKey: ["/api/analytics/ecommerce", timeRange],
    queryFn: () => fetch(`/api/analytics/ecommerce?days=${timeRange}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch subscription analytics
  const { data: subscriptionAnalytics, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/analytics/subscriptions", timeRange],
    queryFn: () => fetch(`/api/analytics/subscriptions?days=${timeRange}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch growth trends
  const { data: growthTrends, isLoading: growthLoading } = useQuery({
    queryKey: ["/api/analytics/growth", timeRange],
    queryFn: () => fetch(`/api/analytics/growth?days=${timeRange}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch popular searches
  const { data: popularSearches, isLoading: searchesLoading } = useQuery({
    queryKey: ["/api/analytics/searches/popular", timeRange],
    queryFn: () => fetch(`/api/analytics/searches/popular?days=${timeRange}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  if (platformLoading || retentionLoading || ecommerceLoading || subscriptionLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Platform Analytics</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Signups */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{platformAnalytics?.totalSignups?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">New user registrations</p>
              </CardContent>
            </Card>

            {/* DAU */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{retentionMetrics?.dau?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Active today</p>
              </CardContent>
            </Card>

            {/* MAU */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{retentionMetrics?.mau?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Active this month</p>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{ecommerceAnalytics?.totalRevenue?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">From all sources</p>
              </CardContent>
            </Card>
          </div>

          {/* Retention Rates */}
          <Card>
            <CardHeader>
              <CardTitle>User Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-2xl font-bold text-success">
                    {retentionMetrics?.retentionRate7d || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">7-day retention rate</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">
                    {retentionMetrics?.retentionRate30d || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">30-day retention rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {growthTrends?.userGrowth ? (
                  <div className="space-y-2">
                    {growthTrends.userGrowth.slice(-5).map((growth: number, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {new Date(Date.now() - (4 - index) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </span>
                        <span className="font-medium">+{growth}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No growth data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">7-day retention</span>
                    <span className="font-medium">{retentionMetrics?.retentionRate7d || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">30-day retention</span>
                    <span className="font-medium">{retentionMetrics?.retentionRate30d || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Daily active users</span>
                    <span className="font-medium">{retentionMetrics?.dau?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly active users</span>
                    <span className="font-medium">{retentionMetrics?.mau?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total streams</span>
                    <span className="font-medium">{platformAnalytics?.totalPlays?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total likes</span>
                    <span className="font-medium">{platformAnalytics?.totalLikes?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total shares</span>
                    <span className="font-medium">{platformAnalytics?.totalShares?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending Content</CardTitle>
              </CardHeader>
              <CardContent>
                {platformAnalytics?.trendingSongs?.length > 0 ? (
                  <div className="space-y-3">
                    {platformAnalytics.trendingSongs.slice(0, 5).map((song: any, index: number) => (
                      <div key={song._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-sm">{song.title}</p>
                            <p className="text-xs text-muted-foreground">{song.artist}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{song.plays?.toLocaleString() || 0} plays</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No trending content</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>E-commerce Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total sales</span>
                    <span className="font-medium">{ecommerceAnalytics?.totalSales?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total revenue</span>
                    <span className="font-medium">₹{ecommerceAnalytics?.totalRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Best selling products</span>
                    <span className="font-medium">{ecommerceAnalytics?.bestSellingProducts?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total subscriptions</span>
                    <span className="font-medium">{subscriptionAnalytics?.totalSubscriptions?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active subscriptions</span>
                    <span className="font-medium">{subscriptionAnalytics?.activeSubscriptions?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Churn rate</span>
                    <span className="font-medium">{subscriptionAnalytics?.churnRate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Renewals</span>
                    <span className="font-medium">{subscriptionAnalytics?.renewals?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {growthTrends?.revenueGrowth ? (
                <div className="space-y-2">
                  {growthTrends.revenueGrowth.slice(-5).map((growth: number, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(Date.now() - (4 - index) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                      <span className="font-medium">₹{growth.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No revenue data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Popular Search Terms</CardTitle>
            </CardHeader>
            <CardContent>
              {popularSearches?.length > 0 ? (
                <div className="space-y-3">
                  {popularSearches.slice(0, 10).map((search: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium">{search.term}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{search.count} searches</p>
                        <p className="text-xs text-muted-foreground">{search.conversionRate}% conversion</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No search data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
