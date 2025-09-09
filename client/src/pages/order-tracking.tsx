
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Package, Truck, CheckCircle, Clock, Download, MapPin, Calendar, CreditCard, Star, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-auth";
import Loading from "@/components/common/loading";
import { toast } from "@/hooks/use-toast";

interface OrderItem {
  _id: string;
  merchId?: string;
  eventId?: string;
  qty: number;
  unitPrice: number;
  title?: string;
  name?: string;
  imageUrl?: string;
}

interface Order {
  _id: string;
  type: "MERCH" | "TICKET" | "MIXED";
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "SHIPPED" | "DELIVERED";
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  qrTicketUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

interface TrackingUpdate {
  _id: string;
  orderId: string;
  status: "ORDER_PLACED" | "PAYMENT_CONFIRMED" | "PROCESSING" | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "REFUNDED";
  description: string;
  location?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  updatedBy: string;
  createdAt: string;
}

export default function OrderTracking() {
  const auth = useRequireAuth();
  const [location] = useLocation();
  const orderId = location.split('/')[2]; // Extract order ID from URL

  const { data: order, isLoading } = useQuery({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch order");
      return response.json();
    },
    enabled: !!orderId && !!auth.user,
  });

  const { data: trackingUpdates, isLoading: trackingLoading } = useQuery({
    queryKey: ["/api/orders", orderId, "tracking"],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/tracking`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch tracking");
      return response.json();
    },
    enabled: !!orderId && !!auth.user,
  });

  // Fetch return requests for this order
  const { data: returnRequests, isLoading: returnsLoading } = useQuery({
    queryKey: ["/api/returns/me"],
    queryFn: async () => {
      const response = await fetch("/api/returns/me", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch returns");
      return response.json();
    },
    enabled: !!orderId && !!auth.user,
  });

  // Return request mutation
  const returnRequestMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(returnData)
      });
      if (!response.ok) throw new Error("Failed to submit return request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Return request submitted",
        description: "Your return request has been submitted and will be reviewed shortly",
      });
    },
    onError: () => {
      toast({
        title: "Return request failed",
        description: "Failed to submit return request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500";
      case "PAID": return "bg-blue-500";
      case "SHIPPED": return "bg-orange-500";
      case "DELIVERED": return "bg-green-500";
      case "REFUNDED": return "bg-gray-500";
      case "FAILED": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusSteps = (status: string, type: string) => {
    if (type === "TICKET") {
      return [
        { name: "Order Placed", status: "completed", icon: Clock },
        { name: "Payment Confirmed", status: status === "PAID" ? "completed" : "pending", icon: CreditCard },
        { name: "Tickets Generated", status: status === "PAID" ? "completed" : "pending", icon: CheckCircle },
      ];
    } else {
      return [
        { name: "Order Placed", status: "completed", icon: Clock },
        { name: "Payment Confirmed", status: ["PAID", "SHIPPED", "DELIVERED"].includes(status) ? "completed" : "pending", icon: CreditCard },
        { name: "Processing", status: ["SHIPPED", "DELIVERED"].includes(status) ? "completed" : "pending", icon: Package },
        { name: "Shipped", status: ["SHIPPED", "DELIVERED"].includes(status) ? "completed" : "pending", icon: Truck },
        { name: "Delivered", status: status === "DELIVERED" ? "completed" : "pending", icon: CheckCircle },
      ];
    }
  };

  const handleDownloadTicket = () => {
    if (order?.qrTicketUrl) {
      window.open(order.qrTicketUrl, '_blank');
    } else {
      toast({
        title: "Ticket not available",
        description: "Your ticket will be available after payment confirmation",
        variant: "destructive"
      });
    }
  };

  const handleRequestReturn = () => {
    // Check if order is eligible for return
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceOrder > 60) {
      toast({
        title: "Return period expired",
        description: "Returns are only eligible within 60 days of order",
        variant: "destructive"
      });
      return;
    }

    const eligibleStatuses = ["PAID", "SHIPPED", "DELIVERED"];
    if (!eligibleStatuses.includes(order.status)) {
      toast({
        title: "Order not eligible",
        description: "Only paid, shipped, or delivered orders can be returned",
        variant: "destructive"
      });
      return;
    }

    // Prepare return request data
    const returnData = {
      orderId: order._id,
      items: order.items.map((item: OrderItem) => ({
        merchId: item.merchId,
        eventId: item.eventId,
        quantity: item.qty,
        condition: "NEW" // Default condition
      })),
      reason: "Customer requested return",
      refundMethod: "ORIGINAL_PAYMENT"
    };

    returnRequestMutation.mutate(returnData);
  };

  const isReturnEligible = () => {
    if (!order) return false;

    // For testing/demo purposes, allow returns for PAID, SHIPPED, or DELIVERED orders
    const eligibleStatuses = ["PAID", "SHIPPED", "DELIVERED"];
    if (!eligibleStatuses.includes(order.status)) return false;

    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    // Allow returns within 60 days for testing
    return daysSinceOrder <= 60;
  };

  const hasExistingReturnRequest = () => {
    if (!returnRequests || !Array.isArray(returnRequests)) return false;

    // Check if there's already a return request for this order
    return returnRequests.some((returnRequest: any) => returnRequest.orderId === orderId);
  };

  if (!auth.user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading order details..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen pt-16 pb-24">
        <div className="container-custom py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Order not found</h3>
              <p className="text-muted-foreground">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps(order.status, order.type);

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-custom py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Order Tracking</h1>
          <p className="text-muted-foreground">Track your order and view details</p>
        </div>

        {/* Order Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Order #{order._id.slice(-8)}</CardTitle>
                <p className="text-muted-foreground">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <Badge className={`${getStatusColor(order.status)} text-white`}>
                {order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Order Type</h3>
                <p className="text-muted-foreground">{order.type}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Total Amount</h3>
                <p className="text-lg font-bold text-primary">₹{order.totalAmount}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <p className="text-muted-foreground">{order.items.length} item(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Timeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Status & Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            {trackingUpdates && trackingUpdates.length > 0 ? (
              <div className="relative space-y-6">
                {trackingUpdates.map((update: TrackingUpdate, index: number) => {
                  const getStatusIcon = (status: string) => {
                    switch (status) {
                      case "ORDER_PLACED": return Clock;
                      case "PAYMENT_CONFIRMED": return CreditCard;
                      case "PROCESSING": return Package;
                      case "PACKED": return Package;
                      case "SHIPPED": return Truck;
                      case "OUT_FOR_DELIVERY": return Truck;
                      case "DELIVERED": return CheckCircle;
                      case "CANCELLED": return Clock;
                      case "REFUNDED": return Clock;
                      default: return Clock;
                    }
                  };

                  const Icon = getStatusIcon(update.status);
                  const isLast = index === trackingUpdates.length - 1;

                  return (
                    <div key={update._id} className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground">
                            {update.status.replace(/_/g, ' ')}
                          </h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(update.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {update.description}
                        </p>
                        {update.location && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {update.location}
                          </p>
                        )}
                        {update.trackingNumber && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📦 Tracking: {update.trackingNumber}
                            {update.carrier && ` (${update.carrier})`}
                          </p>
                        )}
                        {update.estimatedDelivery && (
                          <p className="text-sm text-muted-foreground mt-1">
                            🚚 Est. Delivery: {new Date(update.estimatedDelivery).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {!isLast && (
                        <div className="absolute left-5 w-0.5 h-8 bg-primary ml-0" style={{ top: `${index * 120 + 50}px` }} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = step.status === "completed";
                  const isLast = index === statusSteps.length - 1;

                  return (
                    <div key={step.name} className="flex items-center mb-6 last:mb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.name}
                        </h4>
                      </div>
                      {!isLast && (
                        <div className={`absolute left-5 w-0.5 h-6 ${
                          isCompleted ? 'bg-primary' : 'bg-muted'
                        } mt-10`} style={{ top: `${index * 80 + 40}px` }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tracking Information */}
            {order.trackingNumber && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Tracking Information</h4>
                <p className="text-sm text-muted-foreground mb-1">Tracking Number: {order.trackingNumber}</p>
                {order.estimatedDelivery && (
                  <p className="text-sm text-muted-foreground">
                    Estimated Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Ticket Download */}
            {order.type === "TICKET" && order.status === "PAID" && (
              <div className="mt-6">
                <Button onClick={handleDownloadTicket} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Ticket
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item: OrderItem, index: number) => (
                <div key={index} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                  <img
                    src={item.imageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100"}
                    alt={item.title || item.name || "Item"}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.title || item.name}</h4>
                    <p className="text-sm text-muted-foreground">Quantity: {item.qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{item.unitPrice * item.qty}</p>
                    <p className="text-sm text-muted-foreground">₹{item.unitPrice} each</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Return Status */}
        {returnRequests && Array.isArray(returnRequests) && returnRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <RotateCcw className="w-5 h-5 mr-2" />
                Return Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {returnRequests
                  .filter((returnRequest: any) => returnRequest.orderId === orderId)
                  .map((returnRequest: any, index: number) => (
                    <div key={returnRequest._id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">Return Request #{returnRequest._id.slice(-6)}</h4>
                          <p className="text-sm text-muted-foreground">
                            Requested on {new Date(returnRequest.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            returnRequest.status === 'APPROVED' ? "default" :
                            returnRequest.status === 'REQUESTED' ? "secondary" :
                            returnRequest.status === 'REJECTED' ? "destructive" :
                            "outline"
                          }
                        >
                          {returnRequest.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium mb-2">Return Reason</h5>
                          <p className="text-sm text-muted-foreground">{returnRequest.reason}</p>
                        </div>

                        {returnRequest.refundAmount && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Refund Amount</h5>
                            <p className="text-sm font-semibold text-primary">₹{returnRequest.refundAmount}</p>
                          </div>
                        )}
                      </div>

                      {returnRequest.adminNotes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded">
                          <h5 className="text-sm font-medium mb-1">Admin Notes</h5>
                          <p className="text-sm text-muted-foreground">{returnRequest.adminNotes}</p>
                        </div>
                      )}

                      {returnRequest.status === 'REQUESTED' && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-800">
                            Your return request is being reviewed. We'll update you once it's processed.
                          </p>
                        </div>
                      )}

                      {returnRequest.status === 'APPROVED' && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800">
                            Your return request has been approved. Please return the items as per the instructions provided.
                          </p>
                        </div>
                      )}

                      {returnRequest.status === 'REJECTED' && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">
                            Your return request has been rejected. {returnRequest.adminNotes || 'Please contact support for more information.'}
                          </p>
                        </div>
                      )}

                      {returnRequest.status === 'REFUNDED' && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">
                            Your refund has been processed successfully. The amount will be credited to your original payment method.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Return Request */}
        {isReturnEligible() && !hasExistingReturnRequest() && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <RotateCcw className="w-5 h-5 mr-2" />
                Return & Refund
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  This order is eligible for return within 60 days of order placement.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Return Policy</h4>
                    <p className="text-sm text-muted-foreground">
                      Items must be in original condition with all packaging and tags intact.
                    </p>
                  </div>
                  <Button
                    onClick={handleRequestReturn}
                    disabled={returnRequestMutation.isPending}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    {returnRequestMutation.isPending ? (
                      <Loading size="sm" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>Request Return</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shipping Address */}
        {order.shippingAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-semibold">{order.shippingAddress.name}</p>
                <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </p>
                <p className="text-muted-foreground">Phone: {order.shippingAddress.phone}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
