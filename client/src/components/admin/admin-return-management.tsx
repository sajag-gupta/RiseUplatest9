import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  AlertTriangle,
  Eye,
  MessageSquare,
  IndianRupee
} from "lucide-react";

interface ReturnRequest {
  _id: string;
  orderId: string;
  userId: string;
  items: Array<{
    merchId: string;
    quantity: number;
    reason: string;
    condition: "NEW" | "USED" | "DAMAGED";
  }>;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED";
  refundAmount?: number;
  refundMethod?: "ORIGINAL_PAYMENT" | "STORE_CREDIT";
  reason: string;
  adminNotes?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminReturnManagement() {
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "refund">("approve");
  const [actionData, setActionData] = useState({
    refundAmount: "",
    refundMethod: "ORIGINAL_PAYMENT" as "ORIGINAL_PAYMENT" | "STORE_CREDIT",
    reason: ""
  });

  const queryClient = useQueryClient();

  // Fetch return requests
  const { data: returnRequests, isLoading, refetch } = useQuery<ReturnRequest[]>({
    queryKey: ["/api/admin/returns"],
    staleTime: 30 * 1000,
  });

  // Update return request mutation
  const updateReturnMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReturnRequest> }) => {
      const response = await fetch(`/api/admin/returns/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Failed to update return request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/returns"] });
      toast({
        title: "Success",
        description: "Return request updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update return request",
        variant: "destructive"
      });
    }
  });

  // Process return action mutation
  const processReturnMutation = useMutation({
    mutationFn: async ({ id, action, data }: {
      id: string;
      action: "approve" | "reject" | "refund";
      data: any
    }) => {
      const response = await fetch(`/api/admin/returns/${id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ action, ...data })
      });
      if (!response.ok) throw new Error("Failed to process return");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/returns"] });
      setActionDialogOpen(false);
      setSelectedReturn(null);
      toast({
        title: "Success",
        description: "Return processed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process return",
        variant: "destructive"
      });
    }
  });

  const handleAction = (returnRequest: ReturnRequest, action: "approve" | "reject" | "refund") => {
    setSelectedReturn(returnRequest);
    setActionType(action);
    setActionData({
      refundAmount: returnRequest.refundAmount?.toString() || "",
      refundMethod: returnRequest.refundMethod || "ORIGINAL_PAYMENT",
      reason: ""
    });
    setActionDialogOpen(true);
  };

  const submitAction = () => {
    if (!selectedReturn) return;

    const data = {
      refundAmount: parseFloat(actionData.refundAmount) || 0,
      refundMethod: actionData.refundMethod,
      reason: actionData.reason
    };

    processReturnMutation.mutate({
      id: selectedReturn._id,
      action: actionType,
      data
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      REQUESTED: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
      RECEIVED: "outline",
      REFUNDED: "default"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status}
      </Badge>
    );
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      NEW: "default",
      USED: "secondary",
      DAMAGED: "destructive"
    };

    return (
      <Badge variant={variants[condition] || "secondary"}>
        {condition}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" text="Loading return requests..." />
      </div>
    );
  }

  const requests = Array.isArray(returnRequests) ? returnRequests : [];
  const stats = {
    total: requests.length,
    requested: requests.filter(r => r.status === "REQUESTED").length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    refunded: requests.filter(r => r.status === "REFUNDED").length,
    rejected: requests.filter(r => r.status === "REJECTED").length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Return Management</h2>
          <p className="text-muted-foreground">Manage customer return requests and process refunds</p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Returns</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats.requested}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Refunded</p>
                <p className="text-2xl font-bold">{stats.refunded}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Return Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell className="font-mono text-sm">
                    {request.orderId.slice(-8)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                  {request.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-sm">{item.quantity}x Item {item.merchId?.slice(-8) || 'N/A'}</span>
                      {getConditionBadge(item.condition)}
                    </div>
                  ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-32 truncate" title={request.reason}>
                      {request.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell>
                    {request.refundAmount ? (
                      <span className="font-medium">₹{request.refundAmount}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReturn(request)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>

                      {request.status === "REQUESTED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(request, "approve")}
                            className="text-success hover:text-success"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approve
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(request, "reject")}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(request, "refund")}
                            className="text-primary hover:text-primary"
                          >
                            <IndianRupee className="w-3 h-3 mr-1" />
                            Refund
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {requests.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No return requests</h3>
              <p className="text-muted-foreground">All return requests will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Details Dialog */}
      <Dialog open={!!selectedReturn && !actionDialogOpen} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Order ID</Label>
                  <p className="font-mono text-sm">{selectedReturn.orderId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm">{new Date(selectedReturn.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Refund Amount</Label>
                  <p className="text-sm font-medium">
                    {selectedReturn.refundAmount ? `₹${selectedReturn.refundAmount}` : "Not set"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Return Reason</Label>
                <p className="text-sm mt-1">{selectedReturn.reason}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedReturn.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Item {item.merchId.slice(-8)}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        <p className="text-sm text-muted-foreground">Reason: {item.reason}</p>
                      </div>
                      {getConditionBadge(item.condition)}
                    </div>
                  ))}
                </div>
              </div>

              {selectedReturn.adminNotes && (
                <div>
                  <Label className="text-sm font-medium">Admin Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedReturn.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Return Request"}
              {actionType === "reject" && "Reject Return Request"}
              {actionType === "refund" && "Process Refund"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {(actionType === "approve" || actionType === "refund") && (
              <>
                <div>
                  <Label htmlFor="refundAmount">Refund Amount (₹)</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    value={actionData.refundAmount}
                    onChange={(e) => setActionData(prev => ({ ...prev, refundAmount: e.target.value }))}
                    placeholder="Enter refund amount"
                  />
                </div>

                <div>
                  <Label htmlFor="refundMethod">Refund Method</Label>
                  <Select
                    value={actionData.refundMethod}
                    onValueChange={(value: "ORIGINAL_PAYMENT" | "STORE_CREDIT") =>
                      setActionData(prev => ({ ...prev, refundMethod: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORIGINAL_PAYMENT">Original Payment Method</SelectItem>
                      <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="reason">
                {actionType === "approve" && "Approval Notes"}
                {actionType === "reject" && "Rejection Reason"}
                {actionType === "refund" && "Refund Notes"}
              </Label>
              <Textarea
                id="reason"
                value={actionData.reason}
                onChange={(e) => setActionData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={`Enter ${actionType} notes...`}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitAction}
                disabled={processReturnMutation.isPending}
                className={
                  actionType === "approve" ? "bg-success hover:bg-success/90" :
                  actionType === "reject" ? "bg-destructive hover:bg-destructive/90" :
                  "bg-primary hover:bg-primary/90"
                }
              >
                {processReturnMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <>
                    {actionType === "approve" && <CheckCircle className="w-4 h-4 mr-2" />}
                    {actionType === "reject" && <XCircle className="w-4 h-4 mr-2" />}
                    {actionType === "refund" && <IndianRupee className="w-4 h-4 mr-2" />}
                  </>
                )}
                {actionType === "approve" && "Approve Return"}
                {actionType === "reject" && "Reject Return"}
                {actionType === "refund" && "Process Refund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
