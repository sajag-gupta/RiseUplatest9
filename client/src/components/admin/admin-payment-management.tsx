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
import { Search, DollarSign, CreditCard, Receipt, RotateCcw, TrendingUp, Calendar, Filter } from "lucide-react";
import Loading from "@/components/common/loading";

interface Payment {
  _id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  description: string;
  createdAt: string;
  transactionId?: string;
}

interface RoyaltyPayment {
  _id: string;
  artistId: string;
  amount: number;
  currency: string;
  status: string;
  period: string;
  createdAt: string;
}

export default function AdminPaymentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const queryClient = useQueryClient();

  // Fetch payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/admin/payments/transactions", statusFilter, typeFilter],
    queryFn: () => fetch(`/api/admin/payments/transactions?status=${statusFilter}&type=${typeFilter}&limit=100`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
  });

  // Fetch royalty payments
  const { data: royaltyData, isLoading: royaltyLoading } = useQuery({
    queryKey: ["/api/admin/royalty/payments"],
    queryFn: () => fetch("/api/admin/royalty/payments?limit=100", {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
  });

  // Process refund mutation
  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, amount, reason }: { paymentId: string; amount: string; reason: string }) => {
      const response = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ amount: parseFloat(amount), reason })
      });
      if (!response.ok) throw new Error('Failed to process refund');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/transactions"] });
      toast({ title: "Success", description: "Refund processed successfully" });
      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to process refund", variant: "destructive" });
    }
  });

  const filteredPayments = paymentsData?.transactions?.filter((payment: Payment) =>
    payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.transactionId?.includes(searchTerm)
  ) || [];

  const handleRefund = (payment: Payment) => {
    setSelectedPayment(payment);
    setRefundAmount(payment.amount.toString());
    setRefundDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'subscription':
        return <Badge variant="secondary">Subscription</Badge>;
      case 'nft_purchase':
        return <Badge variant="default">NFT Purchase</Badge>;
      case 'merch':
        return <Badge variant="outline">Merchandise</Badge>;
      case 'royalty':
        return <Badge variant="secondary">Royalty</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (paymentsLoading || royaltyLoading) {
    return <Loading size="lg" text="Loading payment data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{paymentsData?.transactions?.reduce((sum: number, p: Payment) =>
                p.status === 'completed' || p.status === 'paid' ? sum + p.amount : sum, 0)?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentsData?.transactions?.filter((p: Payment) => p.status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Royalty Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{royaltyData?.royaltyPayments?.reduce((sum: number, r: RoyaltyPayment) =>
                r.status === 'paid' ? sum + r.amount : sum, 0)?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Paid to artists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentsData?.transactions?.length ?
                Math.round((paymentsData.transactions.filter((p: Payment) => p.status === 'refunded').length /
                  paymentsData.transactions.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Of total transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Management */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Transactions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by description or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="type-filter">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="nft_purchase">NFT Purchase</SelectItem>
                  <SelectItem value="merch">Merchandise</SelectItem>
                  <SelectItem value="royalty">Royalty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="space-y-4">
            {filteredPayments.map((payment: Payment) => (
              <div key={payment._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-full">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">{payment.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.transactionId || 'No transaction ID'} • {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(payment.status)}
                      {getTypeBadge(payment.type)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{payment.currency.toUpperCase()}</p>
                  </div>

                  {payment.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefund(payment)}
                      className="text-destructive hover:text-destructive"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Refund
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Royalty Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Royalty Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {royaltyData?.royaltyPayments?.map((royalty: RoyaltyPayment) => (
              <div key={royalty._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-full">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">Royalty Payment - {royalty.period}</p>
                    <p className="text-sm text-muted-foreground">
                      Artist ID: {royalty.artistId} • {new Date(royalty.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(royalty.status)}
                      <Badge variant="secondary">Royalty</Badge>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold">₹{royalty.amount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{royalty.currency.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Process refund for transaction: {selectedPayment?.description}</p>
            <div>
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
            </div>
            <div>
              <Label htmlFor="refund-reason">Reason for refund</Label>
              <Input
                id="refund-reason"
                placeholder="Enter reason for refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedPayment && refundMutation.mutate({
                  paymentId: selectedPayment._id,
                  amount: refundAmount,
                  reason: refundReason
                })}
                disabled={refundMutation.isPending}
              >
                Process Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
