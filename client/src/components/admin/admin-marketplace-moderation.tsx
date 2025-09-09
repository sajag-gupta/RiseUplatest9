import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Search, AlertTriangle, Flag, Ban, RotateCcw, Gavel, Eye, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Loading from "@/components/common/loading";

interface MarketplaceReport {
  _id: string;
  reporterId: string;
  reportedItemId: string;
  reportType: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface Dispute {
  _id: string;
  buyerId: string;
  sellerId: string;
  nftId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function AdminMarketplaceModeration() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<MarketplaceReport | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [takedownDialogOpen, setTakedownDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [cancelAuctionDialogOpen, setCancelAuctionDialogOpen] = useState(false);
  const [takedownReason, setTakedownReason] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [disputeResolution, setDisputeResolution] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const queryClient = useQueryClient();

  // Fetch marketplace reports
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/admin/marketplace/reports", reportStatusFilter],
    queryFn: () => fetch(`/api/admin/marketplace/reports?status=${reportStatusFilter}&limit=100`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
  });

  // Fetch marketplace disputes
  const { data: disputesData, isLoading: disputesLoading } = useQuery({
    queryKey: ["/api/admin/marketplace/disputes"],
    queryFn: () => fetch("/api/admin/marketplace/disputes?limit=100", {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
  });

  // Fetch active auctions
  const { data: auctionsData, isLoading: auctionsLoading } = useQuery({
    queryKey: ["/api/admin/marketplace/auctions"],
    queryFn: () => fetch("/api/admin/marketplace/auctions?limit=100", {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
  });

  // Take down listing mutation
  const takedownMutation = useMutation({
    mutationFn: async ({ listingId, reason, permanent }: { listingId: string; reason: string; permanent: boolean }) => {
      const response = await fetch(`/api/admin/marketplace/listings/${listingId}/takedown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ reason, permanent })
      });
      if (!response.ok) throw new Error('Failed to take down listing');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/reports"] });
      toast({ title: "Success", description: "Listing taken down successfully" });
      setTakedownDialogOpen(false);
      setTakedownReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to take down listing", variant: "destructive" });
    }
  });

  // Flag transaction mutation
  const flagMutation = useMutation({
    mutationFn: async ({ transactionId, reason, riskLevel }: { transactionId: string; reason: string; riskLevel: string }) => {
      const response = await fetch(`/api/admin/marketplace/transactions/${transactionId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ reason, riskLevel })
      });
      if (!response.ok) throw new Error('Failed to flag transaction');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Transaction flagged successfully" });
      setFlagDialogOpen(false);
      setFlagReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to flag transaction", variant: "destructive" });
    }
  });

  // Resolve dispute mutation
  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, resolution, refundAmount, notes }: {
      disputeId: string;
      resolution: string;
      refundAmount: string;
      notes: string
    }) => {
      const response = await fetch(`/api/admin/marketplace/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ resolution, refundAmount: parseFloat(refundAmount), notes })
      });
      if (!response.ok) throw new Error('Failed to resolve dispute');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/disputes"] });
      toast({ title: "Success", description: "Dispute resolved successfully" });
      setDisputeDialogOpen(false);
      setDisputeResolution("");
      setRefundAmount("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to resolve dispute", variant: "destructive" });
    }
  });

  // Cancel auction mutation
  const cancelAuctionMutation = useMutation({
    mutationFn: async ({ auctionId, reason }: { auctionId: string; reason: string }) => {
      const response = await fetch(`/api/admin/marketplace/auctions/${auctionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('Failed to cancel auction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/auctions"] });
      toast({ title: "Success", description: "Auction cancelled successfully" });
      setCancelAuctionDialogOpen(false);
      setCancelReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel auction", variant: "destructive" });
    }
  });

  const filteredReports = reportsData?.reports?.filter((report: MarketplaceReport) =>
    report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.reportType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleTakedown = (report: MarketplaceReport) => {
    setSelectedReport(report);
    setTakedownDialogOpen(true);
  };

  const handleFlagTransaction = (report: MarketplaceReport) => {
    setSelectedReport(report);
    setFlagDialogOpen(true);
  };

  const handleResolveDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDisputeDialogOpen(true);
  };

  const handleCancelAuction = (auction: any) => {
    setSelectedReport(auction);
    setCancelAuctionDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'resolved':
        return <Badge variant="default">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'copyright':
        return <Badge variant="destructive">Copyright</Badge>;
      case 'fraud':
        return <Badge variant="destructive">Fraud</Badge>;
      case 'spam':
        return <Badge variant="secondary">Spam</Badge>;
      case 'inappropriate':
        return <Badge variant="destructive">Inappropriate</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (reportsLoading || disputesLoading || auctionsLoading) {
    return <Loading size="lg" text="Loading marketplace data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportsData?.reports?.filter((r: MarketplaceReport) => r.status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
            <Flag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {disputesData?.disputes?.filter((d: Dispute) => d.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Auctions</CardTitle>
            <Gavel className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auctionsData?.auctions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved This Week</CardTitle>
            <RotateCcw className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportsData?.reports?.filter((r: MarketplaceReport) =>
                r.status === 'resolved' &&
                new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Reports</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by reason or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {filteredReports.map((report: MarketplaceReport) => (
              <div key={report._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-full">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">{report.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      Reported on {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(report.status)}
                      {getReportTypeBadge(report.reportType)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                  {report.status === 'pending' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTakedown(report)}>
                          <Ban className="w-4 h-4 mr-2" />
                          Take Down Listing
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFlagTransaction(report)}>
                          <Flag className="w-4 h-4 mr-2" />
                          Flag Transaction
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disputes */}
      <Card>
        <CardHeader>
          <CardTitle>Buyer-Seller Disputes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {disputesData?.disputes?.map((dispute: Dispute) => (
              <div key={dispute._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-full">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">Dispute for NFT {dispute.nftId}</p>
                    <p className="text-sm text-muted-foreground">
                      {dispute.reason} • Created {new Date(dispute.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(dispute.status)}
                    </div>
                  </div>
                </div>

                {dispute.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveDispute(dispute)}
                  >
                    Resolve Dispute
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Auctions */}
      <Card>
        <CardHeader>
          <CardTitle>Auction Oversight</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auctionsData?.auctions?.map((auction: any) => (
              <div key={auction._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-full">
                    <Gavel className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">Auction for NFT {auction.nftId}</p>
                    <p className="text-sm text-muted-foreground">
                      Current bid: ₹{auction.highestBid} • Ends {new Date(auction.endTime).toLocaleString()}
                    </p>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelAuction(auction)}
                  className="text-destructive hover:text-destructive"
                >
                  Cancel Auction
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Takedown Dialog */}
      <Dialog open={takedownDialogOpen} onOpenChange={setTakedownDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Down Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Remove this listing from the marketplace. This action cannot be undone.</p>
            <div>
              <Label htmlFor="takedown-reason">Reason for takedown</Label>
              <Input
                id="takedown-reason"
                placeholder="Enter reason for removing this listing..."
                value={takedownReason}
                onChange={(e) => setTakedownReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setTakedownDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedReport && takedownMutation.mutate({
                  listingId: selectedReport.reportedItemId,
                  reason: takedownReason,
                  permanent: true
                })}
                disabled={takedownMutation.isPending}
              >
                Take Down Listing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flag Transaction Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Suspicious Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Flag this transaction for further investigation.</p>
            <div>
              <Label htmlFor="flag-reason">Reason for flagging</Label>
              <Input
                id="flag-reason"
                placeholder="Enter reason for flagging this transaction..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="risk-level">Risk Level</Label>
              <Select value="medium" onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="critical">Critical Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedReport && flagMutation.mutate({
                  transactionId: selectedReport.reportedItemId,
                  reason: flagReason,
                  riskLevel: "medium"
                })}
                disabled={flagMutation.isPending}
              >
                Flag Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Resolve this buyer-seller dispute.</p>
            <div>
              <Label htmlFor="dispute-resolution">Resolution</Label>
              <Select value={disputeResolution} onValueChange={setDisputeResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund_buyer">Refund Buyer</SelectItem>
                  <SelectItem value="release_to_seller">Release to Seller</SelectItem>
                  <SelectItem value="partial_refund">Partial Refund</SelectItem>
                  <SelectItem value="cancel_transaction">Cancel Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="refund-amount">Refund Amount (₹)</Label>
              <Input
                id="refund-amount"
                type="number"
                placeholder="Enter refund amount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedDispute && resolveDisputeMutation.mutate({
                  disputeId: selectedDispute._id,
                  resolution: disputeResolution,
                  refundAmount,
                  notes: "Resolved by admin"
                })}
                disabled={resolveDisputeMutation.isPending}
              >
                Resolve Dispute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Auction Dialog */}
      <Dialog open={cancelAuctionDialogOpen} onOpenChange={setCancelAuctionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Auction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Cancel this auction. All bids will be refunded to participants.</p>
            <div>
              <Label htmlFor="cancel-reason">Reason for cancellation</Label>
              <Input
                id="cancel-reason"
                placeholder="Enter reason for cancelling this auction..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCancelAuctionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedReport && cancelAuctionMutation.mutate({
                  auctionId: selectedReport.reportedItemId,
                  reason: cancelReason
                })}
                disabled={cancelAuctionMutation.isPending}
              >
                Cancel Auction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
