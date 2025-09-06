import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Calendar,
  Download,
  Filter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AdAnalytics {
  totalImpressions: number;
  totalClicks: number;
  totalRevenue: number;
  ctr: number;
  topPerformingAds: Array<{
    adId: string;
    title: string;
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    impressions: number;
    clicks: number;
  }>;
  campaignPerformance: Array<{
    campaignId: string;
    name: string;
    status: string;
    impressions: number;
    clicks: number;
    revenue: number;
    ctr: number;
  }>;
}

export default function AdAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AdAnalytics>({
    queryKey: ["/api/ads/analytics", { timeRange, campaign: selectedCampaign }],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch campaigns for filter
  const { data: campaigns } = useQuery<any[]>({
    queryKey: ["/api/ads/campaigns"],
    staleTime: 10 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">Analytics data will appear once ads start receiving traffic.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ad Analytics Dashboard</h2>
          <p className="text-muted-foreground">Monitor your ad performance and revenue</p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map((campaign: any) => (
                <SelectItem key={campaign._id} value={campaign._id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.totalImpressions)}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.totalClicks)}</p>
              </div>
              <MousePointer className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Click-Through Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(analytics.ctr)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Ads */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Ads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topPerformingAds.slice(0, 5).map((ad, index) => (
                    <div key={ad.adId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium truncate">{ad.title}</p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span>{formatNumber(ad.impressions)} impressions</span>
                          <span>{formatNumber(ad.clicks)} clicks</span>
                          <span>{formatPercentage(ad.ctr)} CTR</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.revenueByDay.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(day.impressions)} / {formatNumber(day.clicks)}
                        </span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(day.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.campaignPerformance.map((campaign) => (
                  <div key={campaign.campaignId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <Badge
                        variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                      >
                        {campaign.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Impressions</p>
                        <p className="font-medium">{formatNumber(campaign.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Clicks</p>
                        <p className="font-medium">{formatNumber(campaign.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">CTR</p>
                        <p className="font-medium">{formatPercentage(campaign.ctr)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-medium text-green-600">{formatCurrency(campaign.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.totalRevenue * 0.7)}
                  </p>
                  <p className="text-sm text-muted-foreground">Platform Revenue</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analytics.totalRevenue * 0.3)}
                  </p>
                  <p className="text-sm text-muted-foreground">Artist Revenue</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(analytics.totalRevenue / analytics.revenueByDay.length)}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Daily Revenue</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>Internal Ads Revenue</span>
                  <span className="font-medium">{formatCurrency(analytics.totalRevenue * 0.8)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>Google AdSense Revenue</span>
                  <span className="font-medium">{formatCurrency(analytics.totalRevenue * 0.2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 border-t pt-3">
                  <span className="font-medium">Total Revenue</span>
                  <span className="font-bold text-green-600">{formatCurrency(analytics.totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
