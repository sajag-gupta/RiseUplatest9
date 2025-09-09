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
import { Loader2, Trophy, Star, Zap, Target, Award, TrendingUp, Lock } from "lucide-react";

interface Achievement {
  _id: string;
  achievementId: string;
  name: string;
  description: string;
  category: "engagement" | "creation" | "community" | "trading";
  rarity: number;
  pointsReward: number;
  contractAddress: string;
  isActive: boolean;
  totalMinted: number;
  maxSupply: number;
  createdAt: string;
  updatedAt: string;
}

interface UserAchievement {
  _id: string;
  userId: string;
  achievementId: string;
  tokenId: string;
  earnedAt: string;
}

interface UserLoyaltyProfile {
  _id: string;
  userId: string;
  totalPoints: number;
  level: number;
  joinDate: string;
  lastActivity: string;
  nftsOwned: number;
  nftsCreated: number;
  tradesCompleted: number;
  achievementsEarned: number;
  contractAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface LoyaltyStats {
  totalUsers: number;
  totalPointsDistributed: number;
  totalAchievementsEarned: number;
  activeStakers: number;
  totalStakedNFTs: number;
  levelDistribution: Record<string, number>;
  lastUpdated: string;
}

const rarityConfig = {
  1: { name: "Common", color: "bg-gray-100 text-gray-800", icon: "⚪" },
  2: { name: "Uncommon", color: "bg-green-100 text-green-800", icon: "🟢" },
  3: { name: "Rare", color: "bg-blue-100 text-blue-800", icon: "🔵" },
  4: { name: "Epic", color: "bg-purple-100 text-purple-800", icon: "🟣" },
  5: { name: "Legendary", color: "bg-yellow-100 text-yellow-800", icon: "🟡" }
};

const levelConfig = [
  { level: 1, name: "Rookie", points: 0, icon: "🌱" },
  { level: 2, name: "Explorer", points: 100, icon: "🗺️" },
  { level: 3, name: "Creator", points: 500, icon: "🎨" },
  { level: 4, name: "Influencer", points: 1000, icon: "⭐" },
  { level: 5, name: "Legend", points: 2500, icon: "👑" }
];

export default function Loyalty() {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["loyalty-profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/loyalty/profile");
      return res.json();
    },
  });

  // Fetch achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/loyalty/achievements");
      return res.json();
    },
  });

  // Fetch user achievements
  const { data: userAchievements, isLoading: userAchievementsLoading } = useQuery({
    queryKey: ["user-achievements"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/loyalty/user-achievements");
      return res.json();
    },
  });

  // Fetch loyalty stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["loyalty-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/loyalty/stats");
      return res.json();
    },
  });

  // Earn achievement mutation
  const earnAchievementMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const res = await apiRequest("POST", "/api/loyalty/earn-achievement", { achievementId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Achievement Unlocked!",
        description: "Congratulations on earning a new achievement!",
      });
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-profile"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to earn achievement",
        variant: "destructive",
      });
    },
  });

  // Stake NFT mutation
  const stakeNFTMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const res = await apiRequest("POST", "/api/loyalty/stake", { tokenId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "NFT Staked",
        description: "Your NFT is now earning rewards!",
      });
      queryClient.invalidateQueries({ queryKey: ["loyalty-profile"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stake NFT",
        variant: "destructive",
      });
    },
  });

  const handleEarnAchievement = (achievementId: string) => {
    earnAchievementMutation.mutate(achievementId);
  };

  const handleStakeNFT = (tokenId: string) => {
    stakeNFTMutation.mutate(tokenId);
  };

  const getCurrentLevel = (points: number) => {
    for (let i = levelConfig.length - 1; i >= 0; i--) {
      if (points >= levelConfig[i].points) {
        return levelConfig[i];
      }
    }
    return levelConfig[0];
  };

  const getNextLevel = (points: number) => {
    for (let i = 0; i < levelConfig.length; i++) {
      if (points < levelConfig[i].points) {
        return levelConfig[i];
      }
    }
    return null;
  };

  const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
    const rarity = rarityConfig[achievement.rarity as keyof typeof rarityConfig];
    const isEarned = userAchievements?.some((ua: UserAchievement) => ua.achievementId === achievement._id);
    const canEarn = !isEarned && achievement.isActive;

    return (
      <Card className={`relative ${isEarned ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{rarity.icon}</span>
              <CardTitle className="text-lg">{achievement.name}</CardTitle>
            </div>
            <Badge className={rarity.color}>
              {rarity.name}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Reward</span>
              <span className="font-semibold text-yellow-600">{achievement.pointsReward} Points</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>Minted</span>
              <span>{achievement.totalMinted}/{achievement.maxSupply || '∞'}</span>
            </div>

            {isEarned && (
              <Badge variant="default" className="w-full justify-center">
                <Trophy className="w-4 h-4 mr-2" />
                Earned
              </Badge>
            )}

            {canEarn && (
              <Button
                className="w-full"
                onClick={() => handleEarnAchievement(achievement._id)}
                disabled={earnAchievementMutation.isPending}
              >
                {earnAchievementMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Award className="w-4 h-4 mr-2" />
                )}
                Earn Achievement
              </Button>
            )}

            {!canEarn && !isEarned && (
              <Badge variant="secondary" className="w-full justify-center">
                <Lock className="w-4 h-4 mr-2" />
                Locked
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const currentLevel = profile ? getCurrentLevel(profile.totalPoints) : levelConfig[0];
  const nextLevel = profile ? getNextLevel(profile.totalPoints) : null;
  const progressToNext = nextLevel ?
    ((profile.totalPoints - currentLevel.points) / (nextLevel.points - currentLevel.points)) * 100 : 100;

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Loyalty Program</h1>
          <p className="text-muted-foreground">
            Earn points, unlock achievements, and stake NFTs for rewards
          </p>
        </div>
        <WalletConnect />
      </div>

      {/* User Profile Stats */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.totalPoints}</div>
              <p className="text-xs text-muted-foreground">
                Level {currentLevel.level} • {currentLevel.name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Achievements</CardTitle>
              <Trophy className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.achievementsEarned}</div>
              <p className="text-xs text-muted-foreground">
                {userAchievements?.length || 0} unlocked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NFTs Owned</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.nftsOwned}</div>
              <p className="text-xs text-muted-foreground">
                {profile.nftsCreated} created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.tradesCompleted}</div>
              <p className="text-xs text-muted-foreground">
                Completed transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Level Progress */}
      {profile && nextLevel && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{currentLevel.icon}</span>
              Level Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{currentLevel.icon}</span>
                <div>
                  <h3 className="font-semibold">{currentLevel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.totalPoints} / {nextLevel.points} points to next level
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl">{nextLevel.icon}</span>
                <p className="text-sm font-semibold">{nextLevel.name}</p>
              </div>
            </div>
            <Progress value={progressToNext} className="mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progressToNext)}% complete
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="stats">Community Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="mt-6">
          {achievementsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : achievements?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement: Achievement) => (
                <AchievementCard key={achievement._id} achievement={achievement} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No achievements available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="staking" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stake Your NFTs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Earn passive rewards by staking your NFTs
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Staking Reward Rate</span>
                    <span className="font-semibold">1 point per day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Staked NFTs</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Rewards</span>
                    <span className="font-semibold text-yellow-600">0 points</span>
                  </div>
                  <Button className="w-full" disabled>
                    <Zap className="w-4 h-4 mr-2" />
                    Stake NFT (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staking Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Earn points passively
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-purple-500" />
                    Unlock exclusive achievements
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-blue-500" />
                    Higher tier benefits
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-green-500" />
                    Governance voting power
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Community Leaderboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Top contributors this month
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((rank) => (
                  <div key={rank} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg w-8">#{rank}</span>
                      <div>
                        <p className="font-semibold">User{rank}</p>
                        <p className="text-sm text-muted-foreground">Level {Math.floor(Math.random() * 5) + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{Math.floor(Math.random() * 1000) + 100} pts</p>
                      <p className="text-sm text-muted-foreground">{Math.floor(Math.random() * 20) + 5} achievements</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
                  <p className="text-muted-foreground">Active Users</p>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{stats.totalPointsDistributed}</CardTitle>
                  <p className="text-muted-foreground">Points Distributed</p>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{stats.totalAchievementsEarned}</CardTitle>
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
    </div>
  );
}
