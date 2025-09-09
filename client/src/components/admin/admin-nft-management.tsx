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
import { Search, MoreHorizontal, Eye, Edit, Trash2, Snowflake, Zap, Image as ImageIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Loading from "@/components/common/loading";

interface NFT {
  _id: string;
  tokenId: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
  ownerId: string;
  creatorId: string;
  price: number;
  currency: string;
  isListed: boolean;
  frozen?: boolean;
  burned?: boolean;
  createdAt: string;
}

export default function AdminNFTManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [burnDialogOpen, setBurnDialogOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [burnReason, setBurnReason] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    isListed: false
  });

  const queryClient = useQueryClient();

  // Fetch NFTs
  const { data: nftsData, isLoading } = useQuery({
    queryKey: ["/api/admin/nfts", statusFilter],
    queryFn: () => fetch(`/api/admin/nfts?status=${statusFilter}&limit=100`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
  });

  // Freeze/unfreeze NFT mutation
  const freezeNFTMutation = useMutation({
    mutationFn: async ({ nftId, frozen, reason }: { nftId: string; frozen: boolean; reason: string }) => {
      const response = await fetch(`/api/admin/nfts/${nftId}/freeze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ frozen, reason })
      });
      if (!response.ok) throw new Error('Failed to update NFT freeze status');
      return response.json();
    },
    onSuccess: (_, { frozen }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nfts"] });
      toast({
        title: "Success",
        description: `NFT ${frozen ? 'frozen' : 'unfrozen'} successfully`
      });
      setFreezeDialogOpen(false);
      setFreezeReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update NFT status", variant: "destructive" });
    }
  });

  // Edit NFT mutation
  const editNFTMutation = useMutation({
    mutationFn: async ({ nftId, updates }: { nftId: string; updates: any }) => {
      const response = await fetch(`/api/admin/nfts/${nftId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to edit NFT');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nfts"] });
      toast({ title: "Success", description: "NFT updated successfully" });
      setEditDialogOpen(false);
      setEditForm({ name: "", description: "", price: "", isListed: false });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update NFT", variant: "destructive" });
    }
  });

  // Burn NFT mutation
  const burnNFTMutation = useMutation({
    mutationFn: async ({ nftId, reason }: { nftId: string; reason: string }) => {
      const response = await fetch(`/api/admin/nfts/${nftId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('Failed to burn NFT');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nfts"] });
      toast({ title: "Success", description: "NFT burned successfully" });
      setBurnDialogOpen(false);
      setBurnReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to burn NFT", variant: "destructive" });
    }
  });

  const filteredNFTs = nftsData?.nfts?.filter((nft: NFT) =>
    nft.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nft.tokenId.includes(searchTerm)
  ) || [];

  const handleFreezeNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setFreezeDialogOpen(true);
  };

  const handleEditNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setEditForm({
      name: nft.metadata.name,
      description: nft.metadata.description,
      price: nft.price.toString(),
      isListed: nft.isListed
    });
    setEditDialogOpen(true);
  };

  const handleBurnNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setBurnDialogOpen(true);
  };

  if (isLoading) {
    return <Loading size="lg" text="Loading NFTs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>NFT Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search NFTs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or token ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All NFTs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All NFTs</SelectItem>
                  <SelectItem value="listed">Listed</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NFTs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNFTs.map((nft: NFT) => (
          <Card key={nft._id} className="overflow-hidden">
            <div className="aspect-square relative">
              <img
                src={nft.metadata.image}
                alt={nft.metadata.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="bg-black/50 hover:bg-black/70">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditNFT(nft)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit NFT
                    </DropdownMenuItem>
                    {nft.frozen ? (
                      <DropdownMenuItem onClick={() => handleFreezeNFT(nft)}>
                        <Zap className="w-4 h-4 mr-2" />
                        Unfreeze NFT
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleFreezeNFT(nft)}>
                        <Snowflake className="w-4 h-4 mr-2" />
                        Freeze NFT
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleBurnNFT(nft)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Burn NFT
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="absolute bottom-2 left-2 flex gap-2">
                {nft.isListed && (
                  <Badge variant="secondary" className="bg-green-500/90">
                    Listed
                  </Badge>
                )}
                {nft.frozen && (
                  <Badge variant="destructive">
                    Frozen
                  </Badge>
                )}
                {nft.burned && (
                  <Badge variant="destructive">
                    Burned
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-1">{nft.metadata.name}</h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {nft.metadata.description}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {nft.price} {nft.currency.toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Token ID: {nft.tokenId}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Freeze/Unfreeze NFT Dialog */}
      <Dialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedNFT?.frozen ? 'Unfreeze' : 'Freeze'} NFT
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {selectedNFT?.frozen
                ? 'Unfreezing this NFT will allow it to be traded again.'
                : 'Freezing this NFT will prevent it from being traded or transferred.'
              }
            </p>
            {!selectedNFT?.frozen && (
              <div>
                <Label htmlFor="freeze-reason">Reason for freezing</Label>
                <Input
                  id="freeze-reason"
                  placeholder="Enter reason for freezing this NFT..."
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setFreezeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={selectedNFT?.frozen ? "default" : "destructive"}
                onClick={() => selectedNFT && freezeNFTMutation.mutate({
                  nftId: selectedNFT._id,
                  frozen: !selectedNFT.frozen,
                  reason: freezeReason
                })}
                disabled={freezeNFTMutation.isPending}
              >
                {selectedNFT?.frozen ? 'Unfreeze' : 'Freeze'} NFT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit NFT Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit NFT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price</Label>
              <Input
                id="edit-price"
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-listed"
                checked={editForm.isListed}
                onChange={(e) => setEditForm(prev => ({ ...prev, isListed: e.target.checked }))}
              />
              <Label htmlFor="edit-listed">Listed for sale</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedNFT && editNFTMutation.mutate({
                  nftId: selectedNFT._id,
                  updates: {
                    metadata: {
                      ...selectedNFT.metadata,
                      name: editForm.name,
                      description: editForm.description
                    },
                    price: parseFloat(editForm.price),
                    isListed: editForm.isListed
                  }
                })}
                disabled={editNFTMutation.isPending}
              >
                Update NFT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Burn NFT Dialog */}
      <Dialog open={burnDialogOpen} onOpenChange={setBurnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Burn NFT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-destructive">
              Warning: Burning an NFT is permanent and cannot be undone. The NFT will be completely removed from circulation.
            </p>
            <div>
              <Label htmlFor="burn-reason">Reason for burning</Label>
              <Input
                id="burn-reason"
                placeholder="Enter reason for burning this NFT..."
                value={burnReason}
                onChange={(e) => setBurnReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setBurnDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedNFT && burnNFTMutation.mutate({
                  nftId: selectedNFT._id,
                  reason: burnReason
                })}
                disabled={burnNFTMutation.isPending}
              >
                Burn NFT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
