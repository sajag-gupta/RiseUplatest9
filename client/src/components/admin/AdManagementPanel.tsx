import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Import shared types
import { Campaign, AudioAd, BannerAd } from "./types";

// Import modular components
import CampaignList from "./campaigns/CampaignList";
import CampaignForm from "./campaigns/CampaignForm";
import AdList from "./ads/AdList";
import AdForm from "./ads/AdForm";
import AnalyticsDashboard from "./analytics/AnalyticsDashboard";

export default function AdManagementPanel() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingAd, setEditingAd] = useState<AudioAd | BannerAd | null>(null);
  const [selectedAdType, setSelectedAdType] = useState<"audio" | "banner">("audio");

  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
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

  // Campaign mutations
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive"
      });
    }
  });

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

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete campaign");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns"] });
      toast({
        title: "Campaign deleted",
        description: "Ad campaign has been deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      });
    }
  });

  // Ad mutations
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
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create ad");
      }

      const createdAd = await response.json();
      // For banner ads, also create placements automatically
      if (selectedAdType === "banner" && createdAd._id) {
        const placements = [
          {
            type: "BANNER_HOME",
            adId: createdAd._id,
            adType: "BANNER",
            priority: 1,
            isActive: true,
            conditions: {
              minPlays: 0,
              timeInterval: 300,
              maxPerSession: 3
            },
            targeting: {
              userTypes: ["FREE"],
              deviceTypes: ["mobile", "desktop", "tablet"]
            }
          },
          {
            type: "BANNER_DISCOVER",
            adId: createdAd._id,
            adType: "BANNER",
            priority: 1,
            isActive: true,
            conditions: {
              minPlays: 0,
              timeInterval: 300,
              maxPerSession: 2
            },
            targeting: {
              userTypes: ["FREE"],
              deviceTypes: ["mobile", "desktop", "tablet"]
            }
          }
        ];

        // Create placements for the banner ad
        for (const placement of placements) {
          try {
            const placementResponse = await fetch("/api/ads/placements", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
              },
              body: JSON.stringify(placement)
            });

            if (!placementResponse.ok) {
              const errorData = await placementResponse.json();
              console.error('Failed to create placement:', errorData);
            }
          } catch (error) {
            console.error('Error creating placement:', error);
          }
        }
      }

      return createdAd;
    },
    onSuccess: () => {
      toast({
        title: "Ad created",
        description: selectedAdType === "banner"
          ? "Banner ad has been created and placed on home and discover pages"
          : "Ad has been created successfully"
      });
      // Invalidate all ad-related queries to ensure real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/ads/audio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/banner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/for-user"] });
      setShowCreateAd(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create ad",
        variant: "destructive"
      });
    }
  });

  const editAudioAdMutation = useMutation({
    mutationFn: async ({ adId, adData }: { adId: string; adData: any }) => {
      const response = await fetch(`/api/ads/audio/${adId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(adData)
      });

      if (!response.ok) {
        throw new Error("Failed to update audio ad");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/audio"] });
      toast({
        title: "Audio ad updated",
        description: "Audio ad has been updated successfully"
      });
      setEditingAd(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update audio ad",
        variant: "destructive"
      });
    }
  });

  const editBannerAdMutation = useMutation({
    mutationFn: async ({ adId, adData }: { adId: string; adData: any }) => {
      const response = await fetch(`/api/ads/banner/${adId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(adData)
      });

      if (!response.ok) {
        throw new Error("Failed to update banner ad");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all ad-related queries to ensure frontend updates immediately
      queryClient.invalidateQueries({ queryKey: ["/api/ads/banner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/for-user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/audio"] });

      // Specifically invalidate BannerAd component queries for all placements
      queryClient.invalidateQueries({ queryKey: ["/api/ads/for-user", "BANNER_HOME"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/for-user", "BANNER_DISCOVER"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/for-user", "BANNER_ARTIST_PROFILE"] });

      toast({
        title: "Banner ad updated",
        description: "Banner ad has been updated successfully and will reflect on all pages"
      });
      setEditingAd(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update banner ad",
        variant: "destructive"
      });
    }
  });

  const deleteAudioAdMutation = useMutation({
    mutationFn: async (adId: string) => {
      const response = await fetch(`/api/ads/audio/${adId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete audio ad");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/audio"] });
      toast({
        title: "Audio ad deleted",
        description: "Audio ad has been deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete audio ad",
        variant: "destructive"
      });
    }
  });

  const deleteBannerAdMutation = useMutation({
    mutationFn: async (adId: string) => {
      const response = await fetch(`/api/ads/banner/${adId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete banner ad");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/banner"] });
      toast({
        title: "Banner ad deleted",
        description: "Banner ad has been deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete banner ad",
        variant: "destructive"
      });
    }
  });

  // Event handlers
  const handleCreateCampaign = (campaignData: any) => {
    createCampaignMutation.mutate(campaignData);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowCreateCampaign(true);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  const handleCreateAd = (adData: any) => {
    createAdMutation.mutate(adData);
  };

  const handleEditAd = (ad: AudioAd | BannerAd, type: "audio" | "banner") => {
    setEditingAd(ad);
    setSelectedAdType(type);
    setShowCreateAd(true);
  };

  const handleDeleteAd = (adId: string) => {
    if (window.confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      if (selectedAdType === "audio") {
        deleteAudioAdMutation.mutate(adId);
      } else {
        deleteBannerAdMutation.mutate(adId);
      }
    }
  };

  const handleUpdateAd = (adData: any) => {
    if (!editingAd) return;

    const { _id, type, ...updateData } = editingAd;

    if (type === "audio") {
      editAudioAdMutation.mutate({ adId: _id, adData });
    } else {
      editBannerAdMutation.mutate({ adId: _id, adData });
    }
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
          <Button onClick={() => setShowCreateCampaign(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>

          <Button variant="outline" onClick={() => setShowCreateAd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Ad
          </Button>
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
          <CampaignList
            campaigns={campaigns || []}
            isLoading={campaignsLoading}
            onStatusUpdate={(campaignId, status) => updateCampaignStatusMutation.mutate({ campaignId, status })}
            onEdit={handleEditCampaign}
            onDelete={handleDeleteCampaign}
            isUpdating={updateCampaignStatusMutation.isPending || deleteCampaignMutation.isPending}
          />
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          <AdList
            audioAds={audioAds || []}
            bannerAds={bannerAds || []}
            audioAdsLoading={audioAdsLoading}
            bannerAdsLoading={bannerAdsLoading}
            selectedAdType={selectedAdType}
            onAdTypeChange={setSelectedAdType}
            onEditAd={handleEditAd}
            onDeleteAd={handleDeleteAd}
            isDeleting={deleteAudioAdMutation.isPending || deleteBannerAdMutation.isPending}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Campaign Form Dialog */}
      <CampaignForm
        isOpen={showCreateCampaign}
        onClose={() => {
          setShowCreateCampaign(false);
          setEditingCampaign(null);
        }}
        onSubmit={handleCreateCampaign}
        editingCampaign={editingCampaign}
        isSubmitting={createCampaignMutation.isPending}
      />

      {/* Ad Form Dialog */}
      <AdForm
        isOpen={showCreateAd}
        onClose={() => {
          setShowCreateAd(false);
          setEditingAd(null);
        }}
        onSubmit={editingAd ? handleUpdateAd : handleCreateAd}
        editingAd={editingAd}
        adType={selectedAdType}
        campaigns={campaigns || []}
        isSubmitting={createAdMutation.isPending || editAudioAdMutation.isPending || editBannerAdMutation.isPending}
      />
    </div>
  );
}
