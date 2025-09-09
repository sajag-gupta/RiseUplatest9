import { useState } from "react";
import { Crown, Package, Music, Heart, Calendar, Settings, CreditCard, Download, Star, Users, ShoppingBag, BarChart3, TrendingUp, Play, ThumbsUp, Eye, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-auth";
import { usePlayer } from "@/hooks/use-player";
import Loading from "@/components/common/loading";
import Sidebar from "@/components/layout/sidebar";
import { Link, useLocation } from "wouter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const auth = useRequireAuth();
  const [location, setLocation] = useLocation();

  // Handle URL parameters for tabs
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || "overview");

  // Fetch user data
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ["/api/subscriptions/me"],
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/me"],
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: returns, isLoading: returnsLoading } = useQuery({
    queryKey: ["/api/returns/me"],
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists/mine"],
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ["/api/users/me/favorites"],
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user analytics
  const { data: userAnalytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ["/api/analytics/users", auth.user?._id, { days: 30 }],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/users/${auth.user!._id}?days=30`);
      if (!response.ok) {
        throw new Error('Failed to fetch user analytics');
      }
      return response.json();
    },
    enabled: !!auth.user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  if (auth.isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (!auth.user) {
    return null;
  }

  return (
    <div className="min-h-screen pt-16 pb-24 flex">
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64">
        <div className="container-custom py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">User Dashboard</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            {auth.user.plan?.type === "FREE" && (
              <Link href="/plans">
                <Button className="gradient-primary hover:opacity-90" data-testid="upgrade-button">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            window.history.pushState({}, '', `?tab=${value}`);
          }}>
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="overview" data-testid="overview-tab">Overview</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="analytics-tab">Analytics</TabsTrigger>
              <TabsTrigger value="subscriptions" data-testid="subscriptions-tab">Subscriptions</TabsTrigger>
              <TabsTrigger value="orders" data-testid="orders-tab">Orders</TabsTrigger>
              <TabsTrigger value="returns" data-testid="returns-tab">Returns</TabsTrigger>
              <TabsTrigger value="library" data-testid="library-tab">Library</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Plan Status */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                    <Crown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{auth.user.plan?.type || 'FREE'}</div>
                    <p className="text-xs text-muted-foreground">
                      {auth.user.plan?.type === 'PREMIUM' ? 'Enjoy ad-free music' : 'Upgrade for premium features'}
                    </p>
                  </CardContent>
                </Card>

                {/* Following */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Following</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{auth.user.following?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Artists you follow</p>
                  </CardContent>
                </Card>

                {/* Favorites */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{auth.user.favorites?.songs?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Liked songs</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/discover">
                      <Button variant="outline" className="w-full justify-start" data-testid="discover-music">
                        <Music className="w-4 h-4 mr-2" />
                        Discover Music
                      </Button>
                    </Link>
                    <Link href="/events">
                      <Button variant="outline" className="w-full justify-start" data-testid="browse-events">
                        <Calendar className="w-4 h-4 mr-2" />
                        Browse Events
                      </Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant="outline" className="w-full justify-start" data-testid="account-settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Account Settings
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        No recent activity to show.
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Start listening to music and following artists to see your activity here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              {analyticsLoading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-8 bg-muted rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-64 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                </div>
              ) : analyticsError ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Unable to Load Analytics</h3>
                    <p className="text-muted-foreground mb-4">
                      There was an error loading your analytics data. Please try again later.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : !userAnalytics ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start listening to music, liking songs, and making purchases to see your analytics here.
                    </p>
                    <Link href="/discover">
                      <Button>Discover Music</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
                        <Play className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{userAnalytics.totalPlays || 0}</div>
                        <p className="text-xs text-muted-foreground">
                          Songs played this month
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                        <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{userAnalytics.totalLikes || 0}</div>
                        <p className="text-xs text-muted-foreground">
                          Songs liked this month
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">₹{userAnalytics.totalRevenue || 0}</div>
                        <p className="text-xs text-muted-foreground">
                          Spent on platform
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Session Count</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{userAnalytics.sessionCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                          Platform visits
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Activity Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={{
                            plays: {
                              label: "Plays",
                              color: "hsl(var(--chart-1))",
                            },
                            likes: {
                              label: "Likes",
                              color: "hsl(var(--chart-2))",
                            },
                            purchases: {
                              label: "Purchases",
                              color: "hsl(var(--chart-3))",
                            },
                          }}
                          className="h-[300px]"
                        >
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Plays', value: userAnalytics.totalPlays || 0, fill: 'hsl(var(--chart-1))' },
                                { name: 'Likes', value: userAnalytics.totalLikes || 0, fill: 'hsl(var(--chart-2))' },
                                { name: 'Purchases', value: userAnalytics.totalPurchases || 0, fill: 'hsl(var(--chart-3))' },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell fill="hsl(var(--chart-1))" />
                              <Cell fill="hsl(var(--chart-2))" />
                              <Cell fill="hsl(var(--chart-3))" />
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>

                    {/* Listening Hours Trend */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Listening Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={{
                            hours: {
                              label: "Hours",
                              color: "hsl(var(--chart-1))",
                            },
                          }}
                          className="h-[300px]"
                        >
                          <BarChart
                            data={[
                              { name: 'Week 1', hours: (userAnalytics.listeningHours || 0) * 0.25 },
                              { name: 'Week 2', hours: (userAnalytics.listeningHours || 0) * 0.3 },
                              { name: 'Week 3', hours: (userAnalytics.listeningHours || 0) * 0.25 },
                              { name: 'Week 4', hours: (userAnalytics.listeningHours || 0) * 0.2 },
                            ]}
                          >
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="hours" fill="hsl(var(--chart-1))" />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Favorite Genres</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {userAnalytics.favoriteGenres && userAnalytics.favoriteGenres.length > 0 ? (
                            userAnalytics.favoriteGenres.slice(0, 3).map((genre: string, index: number) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm">{genre}</span>
                                <Badge variant="secondary">#{index + 1}</Badge>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No genre data yet</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Search Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{userAnalytics.totalSearches || 0}</div>
                        <p className="text-xs text-muted-foreground">Searches performed</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Follow Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{userAnalytics.totalFollows || 0}</div>
                        <p className="text-xs text-muted-foreground">Artists followed</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions">
              {subsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : subscriptions && Array.isArray(subscriptions) && subscriptions.length > 0 ? (
                <div className="space-y-4">
                  {subscriptions.map((subscription: any, index: number) => (
                    <Card key={subscription._id} data-testid={`subscription-${index}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">Artist Subscription</h3>
                            <p className="text-sm text-muted-foreground">
                              {subscription.tier} tier - ₹{subscription.amount}/month
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {subscription.active ? 'Active' : 'Inactive'} • 
                              Renews on {new Date(subscription.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={subscription.active ? "default" : "secondary"}>
                              {subscription.active ? "Active" : "Inactive"}
                            </Badge>
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No subscriptions</h3>
                    <p className="text-muted-foreground mb-4">
                      Subscribe to artists to access exclusive content and support your favorite creators.
                    </p>
                    <Link href="/discover">
                      <Button data-testid="find-artists-to-subscribe">Find Artists to Subscribe</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : orders && Array.isArray(orders) && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order: any, index: number) => (
                    <Card 
                      key={order._id} 
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setLocation(`/order/${order._id}`)}
                      data-testid={`order-${index}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">Order #{order._id.slice(-6)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {order.type} • ₹{order.totalAmount} • {order.items.length} item(s)
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Ordered on {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={
                                order.status === 'PAID' ? "default" : 
                                order.status === 'PENDING' ? "secondary" : 
                                "destructive"
                              }
                            >
                              {order.status}
                            </Badge>
                            {order.status === 'PAID' && order.type === 'TICKET' && (
                              <Button variant="outline" size="sm" data-testid="download-ticket">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setLocation(`/order/${order._id}`)}
                            >
                              Track Order
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-4">
                      When you buy merchandise or tickets, your orders will appear here.
                    </p>
                    <div className="flex space-x-4 justify-center">
                      <Link href="/merch">
                        <Button variant="outline">Browse Merch</Button>
                      </Link>
                      <Link href="/events">
                        <Button>Find Events</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Returns Tab */}
            <TabsContent value="returns">
              {returnsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : returns && Array.isArray(returns) && returns.length > 0 ? (
                <div className="space-y-4">
                  {returns.map((returnRequest: any, index: number) => (
                    <Card key={returnRequest._id} data-testid={`return-${index}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">Return Request #{returnRequest._id.slice(-6)}</h3>
                            <p className="text-sm text-muted-foreground">
                              Order #{returnRequest.orderId.slice(-6)} • ₹{returnRequest.refundAmount} refund
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested on {new Date(returnRequest.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Reason: {returnRequest.reason}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                returnRequest.status === 'APPROVED' ? "default" :
                                returnRequest.status === 'REQUESTED' ? "secondary" :
                                returnRequest.status === 'REJECTED' ? "destructive" :
                                "outline"
                              }
                            >
                              {returnRequest.status}
                            </Badge>
                          </div>
                        </div>
                        {returnRequest.items && returnRequest.items.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Items to return:</h4>
                            <div className="space-y-2">
                              {returnRequest.items.map((item: any, itemIndex: number) => (
                                <div key={itemIndex} className="text-sm text-muted-foreground">
                                  • {item.quantity}x item • Condition: {item.condition}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No return requests</h3>
                    <p className="text-muted-foreground mb-4">
                      Your return requests will appear here. You can request returns for eligible orders within 30 days.
                    </p>
                    <Link href="/dashboard?tab=orders">
                      <Button variant="outline">View Orders</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Library Tab */}
            <TabsContent value="library">
              <div className="space-y-8">
                {/* Playlists */}
                <section>
                  <h2 className="text-xl font-bold mb-4">Playlists</h2>
                  {playlistsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : playlists && Array.isArray(playlists) && playlists.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playlists.map((playlist: any, index: number) => (
                        <Card key={playlist._id} className="cursor-pointer hover-glow" data-testid={`playlist-${index}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                                <Music className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{playlist.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {playlist.songs?.length || 0} songs
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="text-center py-8">
                      <CardContent>
                        <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="font-semibold mb-1">No playlists yet</h3>
                        <p className="text-sm text-muted-foreground">Create your first playlist to organize your favorite songs.</p>
                      </CardContent>
                    </Card>
                  )}
                </section>

                {/* Favorite Songs */}
                <section>
                  <h2 className="text-xl font-bold mb-4">Favorite Songs</h2>
                  {favoritesLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 rounded-lg animate-pulse">
                          <div className="w-12 h-12 bg-muted rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded mb-1"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : favorites && (favorites as any).songs && Array.isArray((favorites as any).songs) && (favorites as any).songs.length > 0 ? (
                    <div className="space-y-2">
                      {((favorites as any).songs as any[]).slice(0, 10).map((song: any, index: number) => (
                        <div 
                          key={song._id}
                          className="flex items-center space-x-4 p-4 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            // You can implement play functionality here
                            console.log('Playing song:', song.title);
                          }}
                          data-testid={`favorite-song-${index}`}
                        >
                          <img 
                            src={song.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                            alt={song.title}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                            }}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium">{song.title}</h4>
                            <p className="text-sm text-muted-foreground">{song.artistName || "Artist Name"}</p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Heart className="w-4 h-4 fill-current text-primary" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card className="text-center py-8">
                      <CardContent>
                        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="font-semibold mb-1">No favorite songs</h3>
                        <p className="text-sm text-muted-foreground">Like songs to add them to your favorites.</p>
                      </CardContent>
                    </Card>
                  )}
                </section>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
