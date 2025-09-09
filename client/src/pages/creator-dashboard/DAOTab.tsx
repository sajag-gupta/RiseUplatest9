import { useState } from "react";
import { useLocation } from "wouter";
import {
  Vote, FileText, Users, Plus, TrendingUp,
  Clock, CheckCircle, AlertCircle, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ---------- COMPONENT ----------
export default function DAOTab() {
  const auth = useRequireRole("artist");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: "",
    description: "",
    proposalType: "parameter",
    value: 0
  });

  // Fetch DAO proposals
  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ["artistDAOProposals"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dao/proposals");
      return response.json();
    },
  });

  // Fetch DAO stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["daoStats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dao/stats");
      return response.json();
    },
  });

  // Create proposal mutation
  const createProposalMutation = useMutation({
    mutationFn: (proposalData: typeof proposalForm) =>
      apiRequest("POST", "/api/dao/proposals", proposalData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DAO proposal created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["artistDAOProposals"] });
      setShowProposalDialog(false);
      setProposalForm({
        title: "",
        description: "",
        proposalType: "parameter",
        value: 0
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create proposal",
        variant: "destructive",
      });
    },
  });

  // Vote on proposal mutation
  const voteMutation = useMutation({
    mutationFn: ({ proposalId, support }: { proposalId: string; support: string }) =>
      apiRequest("POST", `/api/dao/proposals/${proposalId}/vote`, { support }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vote cast successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["artistDAOProposals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cast vote",
        variant: "destructive",
      });
    },
  });

  const handleCreateProposal = () => {
    if (!proposalForm.title || !proposalForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createProposalMutation.mutate(proposalForm);
  };

  const handleVote = (proposalId: string, support: string) => {
    voteMutation.mutate({ proposalId, support });
  };

  const getProposalStatus = (proposal: any) => {
    const now = new Date();
    const endTime = new Date(proposal.endTime);

    if (proposal.executed) return { status: "Executed", color: "bg-green-100 text-green-800", icon: CheckCircle };
    if (now > endTime) return { status: "Ended", color: "bg-gray-100 text-gray-800", icon: Clock };
    return { status: "Active", color: "bg-blue-100 text-blue-800", icon: Vote };
  };

  return (
    <TabsContent value="dao">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">DAO Governance</h2>
            <p className="text-muted-foreground">Participate in platform governance and create proposals</p>
          </div>

          <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create DAO Proposal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={proposalForm.title}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter proposal title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={proposalForm.description}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your proposal"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="proposalType">Proposal Type</Label>
                  <Select
                    value={proposalForm.proposalType}
                    onValueChange={(value) => setProposalForm(prev => ({ ...prev, proposalType: value }))}
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

                {proposalForm.proposalType === 'funding' && (
                  <div>
                    <Label htmlFor="value">Funding Amount (MATIC)</Label>
                    <Input
                      id="value"
                      type="number"
                      value={proposalForm.value}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.0"
                      step="0.01"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateProposal}
                    disabled={createProposalMutation.isPending}
                    className="flex-1"
                  >
                    {createProposalMutation.isPending ? "Creating..." : "Create Proposal"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProposals || 0}</div>
              <p className="text-xs text-muted-foreground">All time proposals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeProposals || 0}</div>
              <p className="text-xs text-muted-foreground">Currently voting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Executed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.executedProposals || 0}</div>
              <p className="text-xs text-muted-foreground">Successfully implemented</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalVotes || 0}</div>
              <p className="text-xs text-muted-foreground">Community participation</p>
            </CardContent>
          </Card>
        </div>

        {/* Proposals List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">DAO Proposals</h3>

          {proposalsLoading ? (
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
          ) : proposals && proposals.length > 0 ? (
            <div className="space-y-4">
              {proposals.map((proposal: any) => {
                const status = getProposalStatus(proposal);
                const StatusIcon = status.icon;
                const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
                const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;

                return (
                  <Card key={proposal._id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2">{proposal.title}</h4>
                          <p className="text-muted-foreground mb-3 line-clamp-2">
                            {proposal.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Type: {proposal.proposalType}</span>
                            <span>Created: {new Date(proposal.createdAt).toLocaleDateString()}</span>
                            {proposal.value > 0 && (
                              <span>Value: {proposal.value} MATIC</span>
                            )}
                          </div>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.status}
                        </Badge>
                      </div>

                      {/* Voting Progress */}
                      {!proposal.executed && new Date() <= new Date(proposal.endTime) && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span>For: {proposal.forVotes}</span>
                            <span>Against: {proposal.againstVotes}</span>
                            <span>Abstain: {proposal.abstainVotes}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${forPercentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            {forPercentage.toFixed(1)}% in favor
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {!proposal.executed && new Date() <= new Date(proposal.endTime) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleVote(proposal._id, 'FOR')}
                              disabled={voteMutation.isPending}
                            >
                              <Vote className="w-3 h-3 mr-1" />
                              Vote For
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVote(proposal._id, 'AGAINST')}
                              disabled={voteMutation.isPending}
                            >
                              Vote Against
                            </Button>
                          </>
                        )}

                        {proposal.executed && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Executed
                          </Badge>
                        )}

                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No proposals yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create a DAO proposal to improve the platform.
                </p>
                <Button onClick={() => setShowProposalDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Proposal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Governance Info */}
        <Card>
          <CardHeader>
            <CardTitle>DAO Governance Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">How to Create Proposals</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Only artists and admins can create proposals</li>
                  <li>• Proposals are active for 7 days</li>
                  <li>• Community votes determine the outcome</li>
                  <li>• Successful proposals are automatically executed</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Proposal Types</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>Parameter:</strong> Platform settings changes</li>
                  <li>• <strong>Funding:</strong> Treasury allocation requests</li>
                  <li>• <strong>Contract:</strong> Smart contract updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
