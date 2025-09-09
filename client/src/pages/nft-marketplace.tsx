import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRequireRole } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { WalletConnect } from "@/components/wallet-connect";
import { Loader2, ShoppingCart, Gavel, Plus, Palette } from "lucide-react";

interface NFT {
  _id: string;
  tokenId: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  contentType: string;
  price: number;
  isListed: boolean;
  auctionEndTime?: number;
  creatorId: string;
  ownerId: string;
}

export default function NFTMarketplace() {
  const [activeTab, setActiveTab] = useState("listings");
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [mintForm, setMintForm] = useState({
    name: "",
    description: "",
    image: "",
    contentType: "song",
    royaltyPercentage: 5,
    price: 0
  });
  const { toast } = useToast();

  // Get user from localStorage for role check
  const user = JSON.parse(localStorage.getItem("ruc_user") || "null");
  const canMintNFT = user && (user.role === "artist" || user.role === "admin");

  // Fetch NFT listings with improved caching
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["nft-listings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nfts/marketplace/listings");
      return res.json();
    },
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

  // Fetch NFT auctions with improved caching
  const { data: auctions, isLoading: auctionsLoading } = useQuery({
    queryKey: ["nft-auctions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nfts/marketplace/auctions");
      return res.json();
    },
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

  const handleBuyNFT = async (nft: NFT) => {
    try {
      await apiRequest("POST", `/api/nfts/${nft._id}/buy`);
      toast({
        title: "Success",
        description: "NFT purchased successfully!",
      });
      // Refresh data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to purchase NFT",
        variant: "destructive",
      });
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedNFT || !bidAmount) return;

    try {
      await apiRequest("POST", `/api/nfts/${selectedNFT._id}/bid`, {
        bidAmount: parseFloat(bidAmount)
      });
      toast({
        title: "Success",
        description: "Bid placed successfully!",
      });
      setSelectedNFT(null);
      setBidAmount("");
      // Refresh data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place bid",
        variant: "destructive",
      });
    }
  };

  const handleMintNFT = async () => {
    if (!mintForm.name || !mintForm.description || !mintForm.image) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/nfts/mint", {
        name: mintForm.name,
        description: mintForm.description,
        image: mintForm.image,
        contentType: mintForm.contentType,
        royaltyPercentage: mintForm.royaltyPercentage,
        price: mintForm.price
      });

      toast({
        title: "Success",
        description: "NFT minted successfully!",
      });

      setShowMintDialog(false);
      setMintForm({
        name: "",
        description: "",
        image: "",
        contentType: "song",
        royaltyPercentage: 5,
        price: 0
      });

      // Refresh data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mint NFT",
        variant: "destructive",
      });
    }
  };

  const NFTCard = ({ nft, type }: { nft: NFT; type: "listing" | "auction" }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative">
        <img
          src={nft.metadata.image || "/placeholder-nft.png"}
          alt={nft.metadata.name}
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 left-2" variant="secondary">
          {nft.contentType}
        </Badge>
        {type === "auction" && (
          <Badge className="absolute top-2 right-2" variant="destructive">
            <Gavel className="w-3 h-3 mr-1" />
            Auction
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{nft.metadata.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {nft.metadata.description}
        </p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="font-semibold">{nft.price} MATIC</span>
        </div>
        {type === "auction" && nft.auctionEndTime && (
          <div className="text-sm text-muted-foreground mb-3">
            Ends: {new Date(nft.auctionEndTime * 1000).toLocaleDateString()}
          </div>
        )}
        <div className="flex gap-2">
          {type === "listing" ? (
            <Button
              className="flex-1"
              onClick={() => handleBuyNFT(nft)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Now
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setSelectedNFT(nft)}
                >
                  <Gavel className="w-4 h-4 mr-2" />
                  Place Bid
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Place Bid on {nft.metadata.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bidAmount">Bid Amount (MATIC)</Label>
                    <Input
                      id="bidAmount"
                      type="number"
                      step="0.01"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Enter bid amount"
                    />
                  </div>
                  <Button onClick={handlePlaceBid} className="w-full">
                    Place Bid
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">NFT Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and collect unique digital assets from your favorite artists
          </p>
        </div>
        <div className="flex gap-2">
          <WalletConnect />
          {canMintNFT && (
            <Dialog open={showMintDialog} onOpenChange={setShowMintDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setShowMintDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Mint NFT
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Mint New NFT</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={mintForm.name}
                    onChange={(e) => setMintForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter NFT name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={mintForm.description}
                    onChange={(e) => setMintForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter NFT description"
                  />
                </div>

                <div>
                  <Label htmlFor="image">Image URL</Label>
                  <Input
                    id="image"
                    value={mintForm.image}
                    onChange={(e) => setMintForm(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="Enter image URL"
                  />
                </div>

                <div>
                  <Label htmlFor="contentType">Content Type</Label>
                  <select
                    id="contentType"
                    value={mintForm.contentType}
                    onChange={(e) => setMintForm(prev => ({ ...prev, contentType: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="song">Song</option>
                    <option value="album">Album</option>
                    <option value="video">Video</option>
                    <option value="merch">Merchandise</option>
                    <option value="event">Event</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="royalty">Royalty Percentage</Label>
                  <Input
                    id="royalty"
                    type="number"
                    value={mintForm.royaltyPercentage}
                    onChange={(e) => setMintForm(prev => ({ ...prev, royaltyPercentage: parseInt(e.target.value) || 0 }))}
                    placeholder="5"
                    min="0"
                    max="20"
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price (MATIC)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={mintForm.price}
                    onChange={(e) => setMintForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.0"
                    step="0.01"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleMintNFT} className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Mint NFT
                  </Button>
                  <Button variant="outline" onClick={() => setShowMintDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listings">Fixed Price</TabsTrigger>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          {listingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : listings?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((nft: NFT) => (
                <NFTCard key={nft._id} nft={nft} type="listing" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No NFTs currently listed for sale</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="auctions" className="mt-6">
          {auctionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : auctions?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {auctions.map((nft: NFT) => (
                <NFTCard key={nft._id} nft={nft} type="auction" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No active auctions</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
