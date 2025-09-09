import { useState } from "react";
import { useLocation } from "wouter";
import {
  Plus, Palette, ShoppingCart, Gavel, TrendingUp,
  Eye, Edit, Trash2, ExternalLink, Copy
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
import NFTMintForm from "@/components/forms/nft-mint-form";

// ---------- COMPONENT ----------
export default function NFTsTab() {
  const auth = useRequireRole("artist");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showMintDialog, setShowMintDialog] = useState(false);
  const [mintForm, setMintForm] = useState({
    name: "",
    description: "",
    image: "",
    contentType: "artwork",
    royaltyPercentage: 5,
    price: 0
  });

  // Fetch artist's NFTs
  const { data: artistNFTs, isLoading: nftsLoading } = useQuery({
    queryKey: ["artistNFTs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/nfts/user/me");
      return response.json();
    },
    enabled: !!auth.user,
  });

  // Fetch NFT marketplace stats with improved caching
  const { data: marketplaceStats } = useQuery({
    queryKey: ["nftMarketplaceStats"],
    queryFn: () => apiRequest("GET", "/api/nfts/marketplace/listings"),
    staleTime: 2 * 60 * 1000, // 2 minutes - reduce API calls
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: (failureCount, error) => {
      // Only retry on network errors, not on auth errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 401 || status === 403) {
          return false;
        }
      }
      return failureCount < 1; // Only retry once
    },
  });

  // Mint NFT mutation
  const mintNFTMutation = useMutation({
    mutationFn: (nftData: typeof mintForm) => apiRequest("POST", "/api/nfts/mint", nftData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "NFT minted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["artistNFTs"] });
      setShowMintDialog(false);
      setMintForm({
        name: "",
        description: "",
        image: "",
        contentType: "artwork",
        royaltyPercentage: 5,
        price: 0
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to mint NFT",
        variant: "destructive",
      });
    },
  });

  // List NFT for sale mutation
  const listNFTMutation = useMutation({
    mutationFn: ({ nftId, price }: { nftId: string; price: number }) =>
      apiRequest("POST", `/api/nfts/${nftId}/list`, { price }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "NFT listed for sale!",
      });
      queryClient.invalidateQueries({ queryKey: ["artistNFTs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to list NFT",
        variant: "destructive",
      });
    },
  });

  const handleMintNFT = () => {
    if (!mintForm.name || !mintForm.description || !mintForm.image) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    mintNFTMutation.mutate(mintForm);
  };

  const handleListNFT = (nftId: string, price: number) => {
    listNFTMutation.mutate({ nftId, price });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
  };

  return (
    <TabsContent value="nfts">
      <div className="space-y-8">
        {/* Header with Stats */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My NFTs</h2>
            <p className="text-muted-foreground">Create, manage, and track your digital collectibles</p>
          </div>

          <Dialog open={showMintDialog} onOpenChange={setShowMintDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowMintDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Mint NFT
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New NFT</DialogTitle>
              </DialogHeader>
              <NFTMintForm
                onSuccess={() => {
                  setShowMintDialog(false);
                  queryClient.invalidateQueries({ queryKey: ["artistNFTs"] });
                }}
                onCancel={() => setShowMintDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total NFTs</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{artistNFTs?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Created by you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Listed for Sale</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {artistNFTs?.filter((nft: any) => nft.isListed).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Available on marketplace</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">NFTs sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Royalty Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 MATIC</div>
              <p className="text-xs text-muted-foreground">From resales</p>
            </CardContent>
          </Card>
        </div>

        {/* NFTs Grid */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Your NFTs</h3>

          {nftsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : artistNFTs && artistNFTs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artistNFTs.map((nft: any) => (
                <Card key={nft._id} className="overflow-hidden">
                  <div className="aspect-square relative">
                    <img
                      src={nft.metadata?.image || "/placeholder-nft.png"}
                      alt={nft.metadata?.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge variant={nft.isListed ? "default" : "secondary"}>
                        {nft.isListed ? "Listed" : "Unlisted"}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline">
                        {nft.contentType}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h4 className="font-semibold text-lg mb-2">{nft.metadata?.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {nft.metadata?.description}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-semibold">{nft.price} MATIC</span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Royalty</span>
                      <span className="font-semibold">{nft.royaltyPercentage}%</span>
                    </div>

                    <div className="flex gap-2">
                      {!nft.isListed ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              List
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>List NFT for Sale</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="listPrice">Price (MATIC)</Label>
                                <Input
                                  id="listPrice"
                                  type="number"
                                  step="0.01"
                                  placeholder="0.1"
                                  onChange={(e) => {
                                    const price = parseFloat(e.target.value);
                                    if (!isNaN(price)) {
                                      handleListNFT(nft._id, price);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-3 h-3 mr-1" />
                          View on Market
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(`${window.location.origin}/nft/${nft._id}`)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Palette className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No NFTs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first NFT to start building your digital collection.
                </p>
                <Button onClick={() => setShowMintDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Mint Your First NFT
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
