import { useState } from "react";
import { useLocation } from "wouter";
import {
  Crown, Users, Star, Plus, Settings, TrendingUp,
  DollarSign, UserCheck, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ---------- COMPONENT ----------
export default function FanClubTab() {
  const auth = useRequireRole("artist");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch artist's fan club configuration with improved caching
  const { data: fanClubConfig, isLoading: configLoading } = useQuery({
    queryKey: ["artistFanClubConfig"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/fanclubs/artist/config");
      return response.json();
    },
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce API calls
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: (failureCount, error) => {
      // Only retry on network errors, not on auth errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 401 || status === 403) {
          return false;
        }
      }
      return failureCount < 1; // Only retry once
    },
  });

  // Fetch fan club stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["fanClubStats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/fanclubs/stats");
      return response.json();
    },
  });

  // Create/update fan club configuration mutation
  const saveFanClubConfigMutation = useMutation({
    mutationFn: (config: any) => apiRequest("POST", "/api/fanclubs/artist/config", config),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fan club configuration saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["artistFanClubConfig"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Create NFT collection for fan club mutation
  const createNFTCollectionMutation = useMutation({
    mutationFn: (tierData: any) => apiRequest("POST", "/api/nfts/collection/create", tierData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "NFT collection created for fan club tier!",
      });
      queryClient.invalidateQueries({ queryKey: ["artistFanClubConfig"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create NFT collection",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfiguration = () => {
    const config = {
      tiers: [
        {
          name: "Bronze",
          tier: "BRONZE",
          benefits: ["Early access to content", "Community forum access", "Monthly newsletter"],
          price: 0,
          nftCollection: "bronze-membership"
        },
        {
          name: "Silver",
          tier: "SILVER",
          benefits: ["All Bronze benefits", "Behind-the-scenes content", "Priority support", "Exclusive merchandise"],
          price: 299,
          nftCollection: "silver-membership"
        },
        {
          name: "Gold",
          tier: "GOLD",
          benefits: ["All Silver benefits", "VIP events", "Direct artist messaging", "Private Q&A sessions"],
          price: 599,
          nftCollection: "gold-membership"
        },
        {
          name: "Platinum",
          tier: "PLATINUM",
          benefits: ["All Gold benefits", "Private concerts", "Artist collaborations", "Lifetime membership"],
          price: 999,
          nftCollection: "platinum-membership"
        }
      ],
      exclusiveContent: {
        chatrooms: true,
        videos: true,
        voting: true,
        events: true
      }
    };

    saveFanClubConfigMutation.mutate(config);
  };

  const handleCreateNFTCollection = (tier: string) => {
    const tierData = {
      name: `${tier} Fan Club Membership`,
      description: `Exclusive ${tier} tier membership NFT for fan club access`,
      tier: tier,
      supply: 10000, // Unlimited supply for memberships
      price: tier === 'BRONZE' ? 0 : tier === 'SILVER' ? 0.01 : tier === 'GOLD' ? 0.05 : 0.1,
      royaltyPercentage: 5
    };

    createNFTCollectionMutation.mutate(tierData);
  };

  return (
    <TabsContent value="fanclub">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Fan Club Management</h2>
            <p className="text-muted-foreground">Create NFT-gated exclusive communities for your fans</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveConfiguration}
              disabled={saveFanClubConfigMutation.isPending}
            >
              {saveFanClubConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Advanced Settings
            </Button>
          </div>
        </div>

        {/* Fan Club Status */}
        {fanClubConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Fan Club Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">NFT-Gated Membership System</h3>
                  <p className="text-sm text-muted-foreground">
                    Fans buy NFTs to unlock exclusive access and benefits
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{fanClubConfig.tiers?.length || 4}</div>
                  <div className="text-sm text-muted-foreground">Membership Tiers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">NFT</div>
                  <div className="text-sm text-muted-foreground">Access Method</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">Auto</div>
                  <div className="text-sm text-muted-foreground">Verification</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">∞</div>
                  <div className="text-sm text-muted-foreground">Supply</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
              <p className="text-xs text-muted-foreground">Active fan club members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹0</div>
              <p className="text-xs text-muted-foreground">From memberships</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">Member activity rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+0</div>
              <p className="text-xs text-muted-foreground">New members this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Membership Tiers */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Membership Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="relative">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-3">🥉</div>
                <h4 className="font-semibold text-lg mb-2">Bronze</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Basic access to exclusive content
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li>• Early access to new releases</li>
                  <li>• Community forum access</li>
                  <li>• Monthly newsletter</li>
                </ul>
                <Badge variant="outline">Free</Badge>
              </CardContent>
            </Card>

            <Card className="relative">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-3">🥈</div>
                <h4 className="font-semibold text-lg mb-2">Silver</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Premium access with bonus content
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li>• All Bronze benefits</li>
                  <li>• Behind-the-scenes content</li>
                  <li>• Priority support</li>
                  <li>• Exclusive merchandise</li>
                </ul>
                <Badge variant="outline">₹299/month</Badge>
              </CardContent>
            </Card>

            <Card className="relative">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-3">🥇</div>
                <h4 className="font-semibold text-lg mb-2">Gold</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  VIP access to everything
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li>• All Silver benefits</li>
                  <li>• Private Q&A sessions</li>
                  <li>• VIP event invitations</li>
                  <li>• Direct artist communication</li>
                </ul>
                <Badge variant="outline">₹599/month</Badge>
              </CardContent>
            </Card>

            <Card className="relative">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-3">💎</div>
                <h4 className="font-semibold text-lg mb-2">Platinum</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Ultimate fan experience
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li>• All Gold benefits</li>
                  <li>• Private concerts</li>
                  <li>• Artist collaborations</li>
                  <li>• Lifetime membership</li>
                </ul>
                <Badge variant="outline">₹999/month</Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Fan Club Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No activity yet</h3>
                <p className="text-sm text-muted-foreground">
                  Fan club activity will appear here once members join and engage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
