import { useState, useEffect } from "react";
import { ShoppingCart, Heart, Filter, Star, Grid, List, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";
import { MERCH_CATEGORIES } from "@/lib/constants";

export default function Merch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Debounce price range to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPriceRange(priceRange);
    }, 500);

    return () => clearTimeout(timer);
  }, [priceRange]);

  // Fetch merchandise
  const { data: merchItems, isLoading: merchLoading } = useQuery({
    queryKey: ["/api/merch", { 
      search: searchQuery,
      category: selectedCategory,
      minPrice: debouncedPriceRange[0],
      maxPrice: debouncedPriceRange[1],
      sort: sortBy
    }],
    staleTime: 2 * 60 * 1000,
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (merchId: string) => {
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ 
          type: 'merch',
          id: merchId,
          quantity: 1
        })
      });
      if (!response.ok) throw new Error("Failed to add to cart");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to cart",
        description: "Item added to your cart successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  });

  // Like item mutation
  const likeMutation = useMutation({
    mutationFn: async (merchId: string) => {
      const response = await fetch(`/api/merch/${merchId}/like`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to like item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merch"] });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Query will automatically refetch due to dependency
  };

  const handleAddToCart = (item: any) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to cart",
        variant: "destructive"
      });
      return;
    }
    addToCartMutation.mutate(item._id);
  };

  const handleLike = (item: any) => {
    if (!user) {
      toast({
        title: "Sign in required", 
        description: "Please sign in to like items",
        variant: "destructive"
      });
      return;
    }
    likeMutation.mutate(item._id);
  };

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-custom py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Artist Merchandise</h1>
          <p className="text-muted-foreground">Support your favorite artists with official merchandise</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <Input
                type="text"
                placeholder="Search merchandise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-input border-border rounded-2xl"
                data-testid="merch-search-input"
              />
            </form>
            
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40" data-testid="category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {MERCH_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40" data-testid="sort-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border border-border rounded-lg">
                <Button 
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  data-testid="grid-view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  data-testid="list-view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Price Range Filter */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Price Range</span>
                <span className="text-sm text-muted-foreground">
                  ₹{priceRange[0]} - ₹{priceRange[1]}
                </span>
              </div>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={10000}
                step={100}
                className="w-full"
                data-testid="price-range-slider"
              />
            </div>
          </Card>
        </div>

        {/* Merchandise Grid/List */}
        {merchLoading ? (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={viewMode === "grid" ? "animate-pulse" : "animate-pulse flex items-center space-x-4 p-4"}>
                <div className={viewMode === "grid" 
                  ? "aspect-square bg-muted rounded-2xl mb-4" 
                  : "w-24 h-24 bg-muted rounded-lg"
                } />
                <div className={viewMode === "grid" ? "space-y-2" : "flex-1 space-y-2"}>
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : merchItems && Array.isArray(merchItems) && merchItems.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {merchItems.map((item: any, index: number) => (
                <div
                  key={item._id}
                  className="merch-card group"
                  data-testid={`merch-item-${index}`}
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
                    <img
                      src={item.images?.[0] || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300";
                      }}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleLike(item)}
                      data-testid="like-item-button"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    {item.stock < 10 && (
                      <Badge className="absolute top-2 left-2 bg-warning text-black">
                        Only {item.stock} left
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">by {item.artistName || 'Artist'}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-lg font-bold text-primary">₹{item.price}</span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{item.originalPrice}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/80 text-white"
                        onClick={() => handleAddToCart(item)}
                        disabled={item.stock === 0 || addToCartMutation.isPending}
                        data-testid="add-to-cart-button"
                      >
                        {item.stock === 0 ? (
                          "Out of Stock"
                        ) : addToCartMutation.isPending ? (
                          <Loading size="sm" />
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {item.rating && (
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(item.rating) 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({item.reviewCount || 0})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(merchItems as any[]).map((item: any, index: number) => (
                <Card
                  key={item._id}
                  className="p-4 hover-glow"
                  data-testid={`merch-list-item-${index}`}
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.images?.[0] || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                      alt={item.name}
                      className="w-24 h-24 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                      }}
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{item.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">by {item.artistName || 'Artist'}</p>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                      
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold text-primary">₹{item.price}</span>
                        {item.rating && (
                          <div className="flex items-center space-x-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.floor(item.rating) 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({item.reviewCount || 0})
                            </span>
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLike(item)}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/80 text-white"
                        onClick={() => handleAddToCart(item)}
                        disabled={item.stock === 0 || addToCartMutation.isPending}
                      >
                        {item.stock === 0 ? (
                          "Out of Stock"
                        ) : addToCartMutation.isPending ? (
                          <Loading size="sm" />
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No merchandise found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `No items match your search for "${searchQuery}"`
                  : "No merchandise available at the moment. Check back later!"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
