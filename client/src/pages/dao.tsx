import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WalletConnect } from "@/components/wallet-connect";
import { Loader2, Vote, Users, Coins, FileText, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";

interface DAOProposal {
  _id: string;
  proposalId: string;
  title: string;
  description: string;
  proposalType: "parameter" | "funding" | "contract";
  proposerId: string;
  contractAddress: string;
  startTime: string;
  endTime: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  executed: boolean;
  canceled: boolean;
  value: number;
  data?: string;
  createdAt: string;
  updatedAt: string;
}

interface DAOVote {
  _id: string;
  proposalId: string;
  voterId: string;
  support: "FOR" | "AGAINST" | "ABSTAIN";
  votes: number;
  timestamp: string;
}

interface DAOStats {
  totalProposals: number;
  activeProposals: number;
  executedProposals: number;
  totalVotes: number;
  treasuryBalance: number;
  totalAllocations: number;
  lastUpdated: string;
}

export default function DAO() {
  const [selectedProposal, setSelectedProposal] = useState<DAOProposal | null>(null);
  const [voteType, setVoteType] = useState<"FOR" | "AGAINST" | "ABSTAIN">("FOR");
  const [newProposal, setNewProposal] = useState({
    title: "",
    description: "",
    proposalType: "parameter" as "parameter" | "funding" | "contract",
    value: 0
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user from localStorage for role check
  const user = JSON.parse(localStorage.getItem("ruc_user") || "null");
  const canCreateProposals = user && (user.role === "artist" || user.role === "admin");

  // Fetch proposals
  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ["dao-proposals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dao/proposals");
      return res.json();
    },
  });

  // Fetch DAO stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dao-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dao/stats");
      return res.json();
    },
  });

  // Fetch user's governance tokens
  const { data: userTokens, isLoading: tokensLoading } = useQuery({
    queryKey: ["user-governance-tokens"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dao/user/tokens");
      return res.json();
    },
    enabled: !!user,
  });

  // Create proposal mutation
  const createProposalMutation = useMutation({
    mutationFn: async (proposalData: typeof newProposal) => {
      const res = await apiRequest("POST", "/api/dao/proposals", proposalData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["dao-proposals"] });
      setNewProposal({ title: "", description: "", proposalType: "parameter", value: 0 });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create proposal",
        variant: "destructive",
      });
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ proposalId, support }: { proposalId: string; support: string }) => {
      const res = await apiRequest("POST", `/api/dao/proposals/${proposalId}/vote`, { support });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vote cast successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["dao-proposals"] });
      setSelectedProposal(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cast vote",
        variant: "destructive",
      });
    },
  });

  // Execute proposal mutation
  const executeProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const res = await apiRequest("POST", `/api/dao/proposals/${proposalId}/execute`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal executed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["dao-proposals"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to execute proposal",
        variant: "destructive",
      });
    },
  });

  const handleCreateProposal = () => {
    if (!newProposal.title || !newProposal.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createProposalMutation.mutate(newProposal);
  };

  const handleVote = () => {
    if (!selectedProposal) return;
    voteMutation.mutate({
      proposalId: selectedProposal._id,
      support: voteType
    });
  };

  const handleExecuteProposal = (proposalId: string) => {
    executeProposalMutation.mutate(proposalId);
  };

  const getProposalStatus = (proposal: DAOProposal) => {
    const now = new Date();
    const startTime = new Date(proposal.startTime);
    const endTime = new Date(proposal.endTime);

    if (proposal.executed) return { status: "Executed", color: "bg-green-100 text-green-800", icon: CheckCircle };
    if (proposal.canceled) return { status: "Canceled", color: "bg-red-100 text-red-800", icon: AlertCircle };
    if (now < startTime) return { status: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock };
    if (now > endTime) return { status: "Ended", color: "bg-gray-100 text-gray-800", icon: Clock };
    return { status: "Active", color: "bg-blue-100 text-blue-800", icon: Vote };
  };

  const ProposalCard = ({ proposal }: { proposal: DAOProposal }) => {
    const status = getProposalStatus(proposal);
    const StatusIcon = status.icon;
    const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{proposal.title}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {proposal.description}
              </p>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Proposal Type</span>
              <Badge variant="outline">{proposal.proposalType}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>For: {proposal.forVotes}</span>
                <span>Against: {proposal.againstVotes}</span>
                <span>Abstain: {proposal.abstainVotes}</span>
              </div>
              <Progress value={forPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {forPercentage.toFixed(1)}% in favor
              </p>
            </div>

            <div className="flex gap-2">
              {!proposal.executed && !proposal.canceled && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProposal(proposal)}
                    >
                      <Vote className="w-4 h-4 mr-2" />
                      Vote
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}

              {proposal.executed && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Executed
                </Badge>
              )}

              {!proposal.executed && !proposal.canceled && new Date() > new Date(proposal.endTime) && (
                <Button
                  size="sm"
                  onClick={() => handleExecuteProposal(proposal._id)}
                  disabled={executeProposalMutation.isPending}
                >
                  {executeProposalMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Execute
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">DAO Governance</h1>
          <p className="text-muted-foreground">
            Participate in community governance and shape the future of RiseUp
          </p>
        </div>
        <WalletConnect />
      </div>

      {/* DAO Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProposals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProposals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Treasury Balance</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.treasuryBalance} MATIC</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVotes}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className={`grid w-full ${canCreateProposals ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          {canCreateProposals && <TabsTrigger value="create">Create Proposal</TabsTrigger>}
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-6">
          {proposalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : proposals?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposals.map((proposal: DAOProposal) => (
                <ProposalCard key={proposal._id} proposal={proposal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No proposals yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Create New Proposal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter proposal title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProposal.description}
                  onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your proposal"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="type">Proposal Type</Label>
                <Select
                  value={newProposal.proposalType}
                  onValueChange={(value: "parameter" | "funding" | "contract") =>
                    setNewProposal(prev => ({ ...prev, proposalType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parameter">Parameter Change</SelectItem>
                    <SelectItem value="funding">Funding Request</SelectItem>
                    <SelectItem value="contract">Contract Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newProposal.proposalType === "funding" && (
                <div>
                  <Label htmlFor="value">Funding Amount (MATIC)</Label>
                  <Input
                    id="value"
                    type="number"
                    value={newProposal.value}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.0"
                  />
                </div>
              )}

              <Button
                onClick={handleCreateProposal}
                disabled={createProposalMutation.isPending}
                className="w-full"
              >
                {createProposalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Create Proposal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treasury" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Treasury Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Balance</span>
                    <span className="font-semibold">{stats?.treasuryBalance || 0} MATIC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Allocations</span>
                    <span className="font-semibold">{stats?.totalAllocations || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Funds</span>
                    <span className="font-semibold">
                      {(stats?.treasuryBalance || 0) - (stats?.totalAllocations || 0)} MATIC
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Governance Token</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Your Voting Power</span>
                    <span className="font-semibold">
                      {tokensLoading ? "..." : `${userTokens?.balance || 0} RUPG`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Earned</span>
                    <span className="font-semibold">
                      {tokensLoading ? "..." : `${userTokens?.totalEarned || 0} RUPG`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proposal Threshold</span>
                    <span className="font-semibold">1,000 RUPG</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quorum Required</span>
                    <span className="font-semibold">10,000 RUPG</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Earn governance tokens by purchasing NFTs from the marketplace
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Vote Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vote on Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">{selectedProposal?.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProposal?.description}
              </p>
            </div>

            <div>
              <Label>Vote Type</Label>
              <Select value={voteType} onValueChange={(value: "FOR" | "AGAINST" | "ABSTAIN") => setVoteType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOR">For</SelectItem>
                  <SelectItem value="AGAINST">Against</SelectItem>
                  <SelectItem value="ABSTAIN">Abstain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleVote} disabled={voteMutation.isPending} className="flex-1">
                {voteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Vote className="w-4 h-4 mr-2" />
                )}
                Cast Vote
              </Button>
              <Button variant="outline" onClick={() => setSelectedProposal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
