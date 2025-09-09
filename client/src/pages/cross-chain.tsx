import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WalletConnect } from "@/components/wallet-connect";
import { Loader2, ArrowRightLeft, Network, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface NetworkInfo {
  name: string;
  chainId: number;
  key: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface BridgeTransaction {
  transactionHash: string;
  bridgeFee: string;
  sourceChain: string;
  targetChain: string;
  tokenId: string;
  status: "pending" | "completed" | "failed";
}

export default function CrossChain() {
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [sourceChain, setSourceChain] = useState<string>("polygonAmoy");
  const [targetChain, setTargetChain] = useState<string>("ethereumSepolia");
  const [recipient, setRecipient] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's NFTs
  const { data: userNFTs, isLoading: nftsLoading } = useQuery({
    queryKey: ["user-nfts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nfts/user/me");
      return res.json();
    },
  });

  // Fetch available networks
  const { data: networks, isLoading: networksLoading } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/crosschain/networks");
      return res.json();
    },
  });

  // Bridge NFT mutation
  const bridgeMutation = useMutation({
    mutationFn: async (bridgeData: {
      sourceChain: string;
      targetChain: string;
      tokenContract: string;
      tokenId: string;
      recipient: string;
    }) => {
      const res = await apiRequest("POST", "/api/crosschain/bridge", bridgeData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bridge Initiated",
        description: `NFT bridge transaction submitted. Hash: ${data.transactionHash}`,
      });
      queryClient.invalidateQueries({ queryKey: ["user-nfts"] });
      setSelectedNFT(null);
    },
    onError: () => {
      toast({
        title: "Bridge Failed",
        description: "Failed to initiate NFT bridge",
        variant: "destructive",
      });
    },
  });

  // Estimate bridge cost
  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ["bridge-estimate", selectedNFT?.tokenId, sourceChain, targetChain],
    queryFn: async () => {
      if (!selectedNFT) return null;
      const res = await apiRequest("POST", "/api/crosschain/estimate", {
        sourceChain,
        targetChain,
        tokenContract: selectedNFT.contractAddress,
        tokenId: selectedNFT.tokenId
      });
      return res.json();
    },
    enabled: !!selectedNFT,
  });

  const handleBridgeNFT = () => {
    if (!selectedNFT) return;

    bridgeMutation.mutate({
      sourceChain,
      targetChain,
      tokenContract: selectedNFT.contractAddress,
      tokenId: selectedNFT.tokenId,
      recipient: recipient || "0x0000000000000000000000000000000000000000"
    });
  };

  const NetworkCard = ({ network, isSelected, onSelect }: {
    network: NetworkInfo;
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="font-semibold">{network.name}</h3>
              <p className="text-sm text-muted-foreground">Chain ID: {network.chainId}</p>
            </div>
          </div>
          {isSelected && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline">{network.nativeCurrency.symbol}</Badge>
          <span className="text-sm text-muted-foreground">
            {network.nativeCurrency.name}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const NFTCard = ({ nft }: { nft: any }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="aspect-square relative">
        <img
          src={nft.metadata?.image || "/placeholder-nft.png"}
          alt={nft.metadata?.name || "NFT"}
          className="w-full h-full object-cover rounded-t-lg"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{nft.metadata?.name || "Unnamed NFT"}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {nft.metadata?.description || "No description"}
        </p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Token ID</span>
          <span className="font-mono text-sm">#{nft.tokenId}</span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="w-full"
              onClick={() => setSelectedNFT(nft)}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Bridge NFT
            </Button>
          </DialogTrigger>
        </Dialog>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cross-Chain Bridge</h1>
          <p className="text-muted-foreground">
            Bridge your NFTs between different blockchain networks
          </p>
        </div>
        <WalletConnect />
      </div>

      <Tabs defaultValue="bridge" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bridge">Bridge NFTs</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="history">Bridge History</TabsTrigger>
        </TabsList>

        <TabsContent value="bridge" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* NFT Selection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Your NFTs</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select an NFT to bridge to another network
                  </p>
                </CardHeader>
                <CardContent>
                  {nftsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  ) : userNFTs?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userNFTs.map((nft: any) => (
                        <NFTCard key={nft._id} nft={nft} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No NFTs found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bridge Configuration */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Bridge Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Source Network</Label>
                    <Select value={sourceChain} onValueChange={setSourceChain}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {networks?.networks?.map((network: NetworkInfo) => (
                          <SelectItem key={network.key} value={network.key}>
                            {network.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Network</Label>
                    <Select value={targetChain} onValueChange={setTargetChain}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {networks?.networks?.map((network: NetworkInfo) => (
                          <SelectItem key={network.key} value={network.key}>
                            {network.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Recipient Address (Optional)</Label>
                    <Input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>

                  {estimate && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Bridge Cost Estimate</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Bridge Fee:</span>
                          <span>{estimate.bridgeFee} MATIC</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gas Cost:</span>
                          <span>{estimate.gasCost} MATIC</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>{estimate.totalCost} MATIC</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleBridgeNFT}
                    disabled={!selectedNFT || bridgeMutation.isPending}
                  >
                    {bridgeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                    )}
                    Bridge NFT
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="networks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {networks?.networks?.map((network: NetworkInfo) => (
              <NetworkCard
                key={network.key}
                network={network}
                isSelected={sourceChain === network.key}
                onSelect={() => setSourceChain(network.key)}
              />
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Network Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {networks?.networks?.map((network: NetworkInfo) => (
                  <div key={network.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{network.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Block Explorer: {network.blockExplorer}
                      </p>
                    </div>
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bridge Transaction History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your cross-chain NFT transfers
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No bridge transactions yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your bridge history will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bridge Dialog */}
      <Dialog open={!!selectedNFT} onOpenChange={() => setSelectedNFT(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bridge NFT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedNFT && (
              <div className="text-center">
                <img
                  src={selectedNFT.metadata?.image || "/placeholder-nft.png"}
                  alt={selectedNFT.metadata?.name}
                  className="w-32 h-32 object-cover rounded-lg mx-auto mb-4"
                />
                <h3 className="font-semibold">{selectedNFT.metadata?.name}</h3>
                <p className="text-sm text-muted-foreground">Token ID: #{selectedNFT.tokenId}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm font-semibold">From</p>
                <p className="text-xs text-muted-foreground">
                  {networks?.networks?.find((n: NetworkInfo) => n.key === sourceChain)?.name}
                </p>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-semibold">To</p>
                <p className="text-xs text-muted-foreground">
                  {networks?.networks?.find((n: NetworkInfo) => n.key === targetChain)?.name}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleBridgeNFT} disabled={bridgeMutation.isPending} className="flex-1">
                {bridgeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                )}
                Confirm Bridge
              </Button>
              <Button variant="outline" onClick={() => setSelectedNFT(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
