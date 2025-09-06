import { useState } from "react";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CreditCard, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";
import Loading from "@/components/common/loading";

export default function Cart() {
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch cart data
  const { data: cart, isLoading: cartLoading, error: cartError } = useQuery<any>({
    queryKey: ["/api/cart"],
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    retryDelay: 1000
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const response = await fetch("/api/cart/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ itemId, quantity })
      });
      if (!response.ok) throw new Error("Failed to update cart");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cart item",
        variant: "destructive"
      });
    }
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch("/api/cart/remove", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ itemId })
      });
      if (!response.ok) throw new Error("Failed to remove item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Item removed",
        description: "Item removed from cart"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive"
      });
    }
  });

  // Apply promo code mutation
  const applyPromoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/cart/promo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ code })
      });
      if (!response.ok) throw new Error("Invalid promo code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Promo applied",
        description: "Discount applied successfully"
      });
      setPromoCode("");
      setIsApplyingPromo(false);
    },
    onError: () => {
      toast({
        title: "Invalid promo code",
        description: "Please check the code and try again",
        variant: "destructive"
      });
      setIsApplyingPromo(false);
    }
  });

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateQuantityMutation.mutate({ itemId, quantity });
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId);
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    applyPromoMutation.mutate(promoCode.trim().toUpperCase());
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-16 pb-24 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view cart</h2>
            <p className="text-muted-foreground">Please sign in to access your shopping cart</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen pt-16 pb-24">
        <div className="container-custom py-8">
          <Loading size="lg" text="Loading your cart..." />
        </div>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="min-h-screen pt-16 pb-24">
        <div className="container-custom py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold mb-2">Error loading cart</h2>
              <p className="text-muted-foreground mb-4">Please try refreshing the page</p>
              <Button onClick={() => window.location.reload()}>Refresh</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const cartItems = cart?.items || [];
  const cartSummary = cart?.summary || { subtotal: 0, discount: 0, tax: 0, total: 0 };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen pt-16 pb-24">
        <div className="container-custom py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <CardContent>
                <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
                <p className="text-muted-foreground mb-6">
                  Discover amazing music, merchandise, and events to add to your cart
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/discover">
                    <Button>Discover Music</Button>
                  </Link>
                  <Link href="/merch">
                    <Button variant="outline">Shop Merch</Button>
                  </Link>
                  <Link href="/events">
                    <Button variant="outline">Browse Events</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-custom py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-muted-foreground">
            {cartItems.length} item{cartItems.length > 1 ? 's' : ''} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item: any, index: number) => (
              <Card key={item._id} data-testid={`cart-item-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    {/* Item Image */}
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                      }}
                    />

                    {/* Item Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.type === 'merch' ? `by ${item.artistName}` : item.artistName}
                          </p>
                          {item.type === 'ticket' && (
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.eventDate).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{item.venue}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item._id)}
                          disabled={removeItemMutation.isPending}
                          data-testid="remove-item"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity Controls (only for merch) */}
                        {item.type === 'merch' ? (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                              data-testid="decrease-quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item._id, parseInt(e.target.value) || 1)}
                              className="h-8 w-16 text-center"
                              data-testid="quantity-input"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                              disabled={updateQuantityMutation.isPending}
                              data-testid="increase-quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Ticket className="w-4 h-4 text-primary" />
                            <span className="text-sm text-muted-foreground">
                              {item.quantity} ticket{item.quantity > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {/* Price */}
                        <div className="text-right">
                          <div className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</div>
                          {item.quantity > 1 && (
                            <div className="text-xs text-muted-foreground">
                              ₹{item.price} each
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{cartSummary.subtotal.toLocaleString()}</span>
                </div>

                {cartSummary.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-₹{cartSummary.discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>₹{cartSummary.tax.toLocaleString()}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">₹{cartSummary.total.toLocaleString()}</span>
                </div>

                <Link href="/checkout">
                  <Button
                    className="w-full gradient-primary hover:opacity-90 text-white"
                    size="lg"
                    data-testid="proceed-to-checkout"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Promo Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Promo Code</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleApplyPromo(); }} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    data-testid="promo-code-input"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={!promoCode.trim() || isApplyingPromo}
                    data-testid="apply-promo"
                  >
                    {isApplyingPromo ? (
                      <Loading size="sm" />
                    ) : (
                      "Apply Code"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Continue Shopping */}
            <Card>
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Continue exploring</p>
                  <div className="flex space-x-2">
                    <Link href="/merch" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        More Merch
                      </Button>
                    </Link>
                    <Link href="/events" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        More Events
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
