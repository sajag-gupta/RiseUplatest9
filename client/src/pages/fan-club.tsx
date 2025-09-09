import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WalletConnect } from "@/components/wallet-connect";
import { Loader2, Crown, Users, Star, Trophy, Lock, Unlock } from "lucide-react";

interface FanClubMembership {
  _id: string;
  membershipId: string;
  userId: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  joinedAt: string;
  expiresAt?: string;
  isActive: boolean;
  contractAddress: string;
}

interface FanClubStats {
  totalMembers: number;
  activeMembers: number;
  tierDistribution: {
    BRONZE: number;
    SILVER: number;
    GOLD: number;
    PLATINUM: number;
  };
  totalRevenue: number;
  lastUpdated: string;
}

const tierConfig = {
  BRONZE: {
    name: "Bronze",
    icon: "🥉",
    color: "bg-amber-100 text-amber-800",
    requirements: "1 NFT owned",
    benefits: ["Basic access", "Community events", "Exclusive content"]
  },
  SILVER: {
    name: "Silver",
    icon: "🥈",
    color: "bg-gray-100 text-gray-800",
    requirements: "5 NFTs owned",
    benefits: ["All Bronze benefits", "Priority support", "Early access", "Member badge"]
  },
  GOLD: {
    name: "Gold",
    icon: "🥇",
    color: "bg-yellow-100 text-yellow-800",
    requirements: "10 NFTs owned",
    benefits: ["All Silver benefits", "VIP events", "Direct artist access", "Exclusive merch"]
  },
  PLATINUM: {
    name: "Platinum",
    icon: "💎",
    color: "bg-purple-100 text-purple-800",
    requirements: "25 NFTs owned",
    benefits: ["All Gold benefits", "Private concerts", "Artist collaborations", "Lifetime membership"]
  }
};

export default function FanClub() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user from localStorage for role check
  const user = JSON.parse(localStorage.getItem("ruc_user") || "null");

  // Fetch user's membership
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["fan-club-membership"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fanclubs/user/me");
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch available fan club NFTs
  const { data: availableNFTs, isLoading: nftsLoading } = useQuery({
    queryKey: ["fan-club-nfts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nfts/marketplace/listings?category=fanclub");
      return res.json();
    },
  });

  // Fetch fan club stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["fan-club-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fanclubs/stats");
      return res.json();
    },
  });

  // Buy NFT membership mutation
  const buyNFTMembershipMutation = useMutation({
    mutationFn: async (nftId: string) => {
      const res = await apiRequest("POST", `/api/nfts/${nftId}/buy`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fan club membership NFT purchased! You now have access to exclusive content.",
      });
      queryClient.invalidateQueries({ queryKey: ["fan-club-membership"] });
      setSelectedTier(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to purchase membership NFT",
        variant: "destructive",
      });
    },
  });

  const handleBuyMembership = async (nftId: string) => {
    buyNFTMembershipMutation.mutate(nftId);
  };

  const TierCard = ({ tier, isCurrentTier, canUpgrade }: {
    tier: keyof typeof tierConfig;
    isCurrentTier: boolean;
    canUpgrade: boolean;
  }) => {
    const config = tierConfig[tier];

    return (
      <Card className={`relative ${isCurrentTier ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.icon}</span>
              <CardTitle className="text-xl">{config.name}</CardTitle>
            </div>
            {isCurrentTier && (
              <Badge variant="default">
                <Crown className="w-3 h-3 mr-1" />
                Current
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{config.requirements}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Benefits:</h4>
              <ul className="text-sm space-y-1">
                {config.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-yellow-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {!membership && availableNFTs && availableNFTs.length > 0 && (
              <Button
                className="w-full"
                onClick={() => setSelectedTier(tier)}
                disabled={buyNFTMembershipMutation.isPending}
              >
                {buyNFTMembershipMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Buy NFT to Join
              </Button>
            )}

            {!membership && (!availableNFTs || availableNFTs.length === 0) && (
              <Badge variant="outline" className="w-full justify-center py-2">
                Coming Soon
              </Badge>
            )}

            {canUpgrade && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setSelectedTier(tier)}
                disabled={buyNFTMembershipMutation.isPending}
              >
                {buyNFTMembershipMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trophy className="w-4 h-4 mr-2" />
                )}
                Upgrade to {config.name}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fan Club</h1>
          <p className="text-muted-foreground">
            Join exclusive communities and unlock premium benefits
          </p>
        </div>
        <WalletConnect />
      </div>

      {/* Membership Status */}
      {membership && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Your Membership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{tierConfig[membership.tier as keyof typeof tierConfig]?.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{tierConfig[membership.tier as keyof typeof tierConfig]?.name} Member</h3>
                  <p className="text-sm text-muted-foreground">
                    Member since {new Date(membership.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className={tierConfig[membership.tier as keyof typeof tierConfig]?.color}>
                {membership.tier}
              </Badge>
            </div>
            <Progress value={75} className="mb-2" />
            <p className="text-sm text-muted-foreground">3 NFTs until next tier upgrade</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tiers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
          <TabsTrigger value="benefits">Exclusive Benefits</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.keys(tierConfig) as Array<keyof typeof tierConfig>).map((tier) => (
              <TierCard
                key={tier}
                tier={tier}
                isCurrentTier={membership?.tier === tier}
                canUpgrade={membership && membership.tier !== tier}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="benefits" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Exclusive Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Access premium content, behind-the-scenes footage, and exclusive releases from your favorite artists.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Unlock className="w-4 h-4 text-green-500" />
                    Early music releases
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Unlock className="w-4 h-4 text-green-500" />
                    Artist Q&A sessions
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Unlock className="w-4 h-4 text-green-500" />
                    Exclusive merchandise
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Community Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Join private communities, attend VIP events, and connect with fellow fans and artists.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-blue-500" />
                    Private Discord channels
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-blue-500" />
                    VIP event invitations
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-blue-500" />
                    Artist meet & greets
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{stats.totalMembers}</CardTitle>
                  <p className="text-muted-foreground">Total Members</p>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{stats.activeMembers}</CardTitle>
                  <p className="text-muted-foreground">Active Members</p>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {Object.values(stats.tierDistribution).reduce((a: number, b: any) => a + (b as number), 0)}
                  </CardTitle>
                  <p className="text-muted-foreground">Achievements Earned</p>
                </CardHeader>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading community stats...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Buy Membership NFT Dialog */}
      <Dialog open={!!selectedTier} onOpenChange={() => setSelectedTier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Join {selectedTier && tierConfig[selectedTier as keyof typeof tierConfig]?.name} Fan Club
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Purchase a membership NFT to unlock exclusive benefits and join the community.
            </p>

            {nftsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : availableNFTs && availableNFTs.length > 0 ? (
              <div className="space-y-4">
                <h4 className="font-semibold">Available Membership NFTs:</h4>
                <div className="grid grid-cols-1 gap-4 max-h-60 overflow-y-auto">
                  {availableNFTs
                    .filter((nft: any) => nft.contentType === 'fanclub' && nft.tier === selectedTier)
                    .map((nft: any) => (
                      <Card key={nft._id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={nft.metadata?.image || "/placeholder-nft.png"}
                              alt={nft.metadata?.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <h5 className="font-semibold">{nft.metadata?.name}</h5>
                              <p className="text-sm text-muted-foreground">{nft.price} MATIC</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleBuyMembership(nft._id)}
                            disabled={buyNFTMembershipMutation.isPending}
                            size="sm"
                          >
                            {buyNFTMembershipMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Crown className="w-4 h-4 mr-2" />
                            )}
                            Buy NFT
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No membership NFTs available for this tier yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Check back later or contact the artist.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedTier(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
