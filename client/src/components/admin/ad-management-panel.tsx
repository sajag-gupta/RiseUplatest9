import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  DollarSign,
  Users,
  Eye,
  MousePointer,
  Settings,
  Upload
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import AdAnalyticsDashboard from "@/components/ads/ad-analytics-dashboard";

interface AdCampaign {
  _id: string;
  name: string;
  type: string;
  status: string;
  targeting: any;
  budget: any;
  createdAt: string;
}

interface AudioAd {
  _id: string;
  title: string;
  campaignId: string;
  durationSec: number;
  impressions: number;
  clicks: number;
  revenue: number;
}

interface BannerAd {
  _id: string;
  title: string;
  campaignId: string;
  size: string;
  impressions: number;
  clicks: number;
  revenue: number;
}

export default function AdManagementPanel() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [selectedAdType, setSelectedAdType] = useState<"audio" | "banner">("audio");
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "AUDIO",
    targeting: {
      genres: [],
      regions: [],
      userTypes: ["FREE"]
    },
    budget: {
      total: 0,
      currency: "INR"
    }
  });

  const [newAd, setNewAd] = useState({
    title: "",
    campaignId: "",
    audioUrl: "",
    imageUrl: "",
    size: "300x250",
    callToAction: {
      text: "",
      url: ""
    }
  });

  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<AdCampaign[]>({
    queryKey: ["/api/ads/campaigns"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ads by type
  const { data: audioAds, isLoading: audioAdsLoading } = useQuery<AudioAd[]>({
    queryKey: ["/api/ads/audio"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: bannerAds, isLoading: bannerAdsLoading } = useQuery<BannerAd[]>({
    queryKey: ["/api/ads/banner"],
    staleTime: 5 * 60 * 1000,
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(campaignData)
      });

      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign created",
        description: "Ad campaign has been created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns"] });
      setShowCreateCampaign(false);
      setNewCampaign({
        name: "",
        type: "AUDIO",
        targeting: {
          genres: [],
          regions: [],
          userTypes: ["FREE"]
        },
        budget: {
          total: 0,
          currency: "INR"
        }
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive"
      });
    }
  });

  // Create ad mutation
  const createAdMutation = useMutation({
    mutationFn: async (adData: any) => {
      const endpoint = selectedAdType === "audio" ? "/api/ads/audio" : "/api/ads/banner";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(adData)
      });

      if (!response.ok) {
        throw new Error("Failed to create ad");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ad created",
        description: "Ad has been created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/audio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/banner"] });
      setShowCreateAd(false);
      setNewAd({
        title: "",
        campaignId: "",
        audioUrl: "",
        imageUrl: "",
        size: "300x250",
        callToAction: {
          text: "",
          url: ""
        }
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create ad",
        variant: "destructive"
      });
    }
  });

  // Update campaign status mutation
  const updateCampaignStatusMutation = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: string }) => {
      const response = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error("Failed to update campaign status");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns"] });
      toast({
        title: "Status updated",
        description: "Campaign status has been updated"
      });
    }
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required",
        variant: "destructive"
      });
      return;
    }

    createCampaignMutation.mutate(newCampaign);
  };

  const handleCreateAd = () => {
    if (!newAd.title.trim() || !newAd.campaignId) {
      toast({
        title: "Error",
        description: "Title and campaign selection are required",
        variant: "destructive"
      });
      return;
    }

    if (selectedAdType === "audio" && !newAd.audioUrl) {
      toast({
        title: "Error",
        description: "Audio URL is required",
        variant: "destructive"
      });
      return;
    }

    if (selectedAdType === "banner" && !newAd.imageUrl) {
      toast({
        title: "Error",
        description: "Image URL is required",
        variant: "destructive"
      });
      return;
    }

    createAdMutation.mutate(newAd);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ad Management</h2>
          <p className="text-muted-foreground">Manage ad campaigns, creatives, and performance</p>
        </div>

        <div className="flex items-center space-x-4">
          <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Ad Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-type">Campaign Type</Label>
                  <Select
                    value={newCampaign.type}
                    onValueChange={(value) => setNewCampaign(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUDIO">Audio Ads</SelectItem>
                      <SelectItem value="BANNER">Banner Ads</SelectItem>
                      <SelectItem value="GOOGLE_ADSENSE">Google AdSense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="budget">Budget (INR)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={newCampaign.budget.total}
                    onChange={(e) => setNewCampaign(prev => ({
                      ...prev,
                      budget: { ...prev.budget, total: parseFloat(e.target.value) || 0 }
                    }))}
                    placeholder="Enter budget amount"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCampaign} disabled={createCampaignMutation.isPending}>
                    Create Campaign
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateAd} onOpenChange={setShowCreateAd}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Ad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create {selectedAdType === "audio" ? "Audio" : "Banner"} Ad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ad-type">Ad Type</Label>
                  <Select
                    value={selectedAdType}
                    onValueChange={(value: "audio" | "banner") => setSelectedAdType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audio">Audio Ad</SelectItem>
                      <SelectItem value="banner">Banner Ad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ad-title">Title</Label>
                  <Input
                    id="ad-title"
                    value={newAd.title}
                    onChange={(e) => setNewAd(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter ad title"
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-select">Campaign</Label>
                  <Select
                    value={newAd.campaignId}
                    onValueChange={(value) => setNewAd(prev => ({ ...prev, campaignId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns?.map((campaign) => (
                        <SelectItem key={campaign._id} value={campaign._id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAdType === "audio" ? (
                  <div>
                    <Label htmlFor="audio-url">Audio URL</Label>
                    <Input
                      id="audio-url"
                      value={newAd.audioUrl}
                      onChange={(e) => setNewAd(prev => ({ ...prev, audioUrl: e.target.value }))}
                      placeholder="Enter audio file URL"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="image-url">Image URL</Label>
                      <Input
                        id="image-url"
                        value={newAd.imageUrl}
                        onChange={(e) => setNewAd(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="Enter image URL"
                      />
                    </div>

                    <div>
                      <Label htmlFor="banner-size">Banner Size</Label>
                      <Select
                        value={newAd.size}
                        onValueChange={(value) => setNewAd(prev => ({ ...prev, size: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="300x250">300x250 (Medium Rectangle)</SelectItem>
                          <SelectItem value="728x90">728x90 (Leaderboard)</SelectItem>
                          <SelectItem value="320x50">320x50 (Mobile Banner)</SelectItem>
                          <SelectItem value="300x600">300x600 (Large Skyscraper)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="cta-text">Call to Action Text</Label>
                  <Input
                    id="cta-text"
                    value={newAd.callToAction.text}
                    onChange={(e) => setNewAd(prev => ({
                      ...prev,
                      callToAction: { ...prev.callToAction, text: e.target.value }
                    }))}
                    placeholder="e.g., Learn More, Shop Now"
                  />
                </div>

                <div>
                  <Label htmlFor="cta-url">Call to Action URL</Label>
                  <Input
                    id="cta-url"
                    value={newAd.callToAction.url}
                    onChange={(e) => setNewAd(prev => ({
                      ...prev,
                      callToAction: { ...prev.callToAction, url: e.target.value }
                    }))}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateAd(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAd} disabled={createAdMutation.isPending}>
                    Create Ad
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaignsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign._id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{campaign.name}</h3>
                          <Badge
                            variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                          >
                            {campaign.status}
                          </Badge>
                          <Badge variant="outline">{campaign.type}</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Budget</p>
                            <p className="font-medium">{formatCurrency(campaign.budget.total)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Spent</p>
                            <p className="font-medium">{formatCurrency(campaign.budget.spent || 0)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Target Users</p>
                            <p className="font-medium">{campaign.targeting.userTypes.join(", ")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCampaignStatusMutation.mutate({
                            campaignId: campaign._id,
                            status: campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                          })}
                          disabled={updateCampaignStatusMutation.isPending}
                        >
                          {campaign.status === 'ACTIVE' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>

                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Campaigns</h3>
                <p className="text-muted-foreground">Create your first ad campaign to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          <Tabs value={selectedAdType} onValueChange={(value) => setSelectedAdType(value as "audio" | "banner")}>
            <TabsList>
              <TabsTrigger value="audio">Audio Ads</TabsTrigger>
              <TabsTrigger value="banner">Banner Ads</TabsTrigger>
            </TabsList>

            {/* Audio Ads */}
            <TabsContent value="audio" className="space-y-4">
              {audioAdsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-muted rounded w-1/3"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-1/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : audioAds && audioAds.length > 0 ? (
                <div className="space-y-4">
                  {audioAds.map((ad) => (
                    <Card key={ad._id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{ad.title}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Duration</p>
                                <p className="font-medium">{Math.floor(ad.durationSec / 60)}:{(ad.durationSec % 60).toString().padStart(2, '0')}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Impressions</p>
                                <p className="font-medium">{formatNumber(ad.impressions)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Clicks</p>
                                <p className="font-medium">{formatNumber(ad.clicks)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Revenue</p>
                                <p className="font-medium text-green-600">{formatCurrency(ad.revenue)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Audio Ads</h3>
                    <p className="text-muted-foreground">Create your first audio ad to get started.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Banner Ads */}
            <TabsContent value="banner" className="space-y-4">
              {bannerAdsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-muted rounded w-1/3"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-1/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : bannerAds && bannerAds.length > 0 ? (
                <div className="space-y-4">
                  {bannerAds.map((ad) => (
                    <Card key={ad._id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{ad.title}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Size</p>
                                <p className="font-medium">{ad.size}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Impressions</p>
                                <p className="font-medium">{formatNumber(ad.impressions)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Clicks</p>
                                <p className="font-medium">{formatNumber(ad.clicks)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Revenue</p>
                                <p className="font-medium text-green-600">{formatCurrency(ad.revenue)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Banner Ads</h3>
                    <p className="text-muted-foreground">Create your first banner ad to get started.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AdAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
