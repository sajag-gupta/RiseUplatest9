import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Calendar as CalendarIcon, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NFTMintFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface CustomAttribute {
  trait_type: string;
  value: string;
}

interface UnlockablePerk {
  id: string;
  name: string;
  description: string;
}

export default function NFTMintForm({ onSuccess, onCancel }: NFTMintFormProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    // Basic NFT Details
    name: "",
    description: "",
    category: "artwork",
    mainFile: null as File | null,
    previewImage: null as File | null,
    tags: [] as string[],
    editions: 1,

    // Monetization & Royalties
    price: 0,
    currency: "matic",
    royaltyPercentage: 5,
    platformFee: 2.5, // Auto-filled
    saleType: "fixed", // "fixed" or "auction"
    auctionStartPrice: 0,
    auctionDuration: "7", // days

    // Access & Perks
    unlockableDescription: "",
    unlockableFile: null as File | null,
    fanClubTier: "",
    perks: [] as UnlockablePerk[],

    // Advanced Settings
    externalLink: "",
    customAttributes: [] as CustomAttribute[],
    expirationDate: undefined as Date | undefined,
    allowResale: true
  });

  const [tagInput, setTagInput] = useState("");
  // Removed uploading states since we don't upload files immediately

  // For now, we'll use a simple file URL approach
  // In production, this should be replaced with proper Cloudinary or IPFS upload
  const createFileURL = (file: File): string => {
    // Create a temporary object URL for the file
    // In production, upload to IPFS or Cloudinary
    return URL.createObjectURL(file);
  };

  // Mint NFT mutation
  const mintNFTMutation = useMutation({
    mutationFn: async (nftData: any) => {
      const response = await apiRequest("POST", "/api/nfts/mint", nftData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "NFT minted successfully!",
      });

      // Award governance tokens for minting
      queryClient.invalidateQueries({ queryKey: ["user-governance-tokens"] });
      queryClient.invalidateQueries({ queryKey: ["artistNFTs"] });

      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to mint NFT",
        variant: "destructive",
      });
    },
  });

  // Handle file selection (no immediate upload)
  const handleFileSelect = (file: File, type: 'main' | 'preview' | 'unlockable') => {
    if (type === 'main') {
      setFormData(prev => ({ ...prev, mainFile: file }));
    } else if (type === 'preview') {
      setFormData(prev => ({ ...prev, previewImage: file }));
    } else if (type === 'unlockable') {
      setFormData(prev => ({ ...prev, unlockableFile: file }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addCustomAttribute = () => {
    setFormData(prev => ({
      ...prev,
      customAttributes: [...prev.customAttributes, { trait_type: "", value: "" }]
    }));
  };

  const updateCustomAttribute = (index: number, field: keyof CustomAttribute, value: string) => {
    setFormData(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.map((attr, i) =>
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };

  const removeCustomAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.filter((_, i) => i !== index)
    }));
  };

  const addPerk = () => {
    const newPerk: UnlockablePerk = {
      id: Date.now().toString(),
      name: "",
      description: ""
    };
    setFormData(prev => ({
      ...prev,
      perks: [...prev.perks, newPerk]
    }));
  };

  const updatePerk = (id: string, field: keyof UnlockablePerk, value: string) => {
    setFormData(prev => ({
      ...prev,
      perks: prev.perks.map(perk =>
        perk.id === id ? { ...perk, [field]: value } : perk
      )
    }));
  };

  const removePerk = (id: string) => {
    setFormData(prev => ({
      ...prev,
      perks: prev.perks.filter(perk => perk.id !== id)
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.description || !formData.mainFile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.price <= 0) {
      toast({
        title: "Error",
        description: "Please set a valid price",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create file URLs for the files
      let mainFileUrl = "";
      let previewImageUrl = "";
      let unlockableFileUrl = "";

      if (formData.mainFile) {
        mainFileUrl = createFileURL(formData.mainFile);
      }

      if (formData.previewImage) {
        previewImageUrl = createFileURL(formData.previewImage);
      }

      if (formData.unlockableFile) {
        unlockableFileUrl = createFileURL(formData.unlockableFile);
      }

      // Prepare NFT data
      const nftData = {
        name: formData.name,
        description: formData.description,
        image: mainFileUrl,
        previewImage: previewImageUrl,
        contentType: formData.category,
        royaltyPercentage: formData.royaltyPercentage,
        price: formData.price,
        currency: formData.currency,
        tags: formData.tags,
        editions: formData.editions,
        saleType: formData.saleType,
        auctionStartPrice: formData.auctionStartPrice,
        auctionDuration: formData.auctionDuration,
        unlockableDescription: formData.unlockableDescription,
        unlockableFile: unlockableFileUrl,
        fanClubTier: formData.fanClubTier,
        perks: formData.perks,
        externalLink: formData.externalLink,
        customAttributes: formData.customAttributes,
        expirationDate: formData.expirationDate,
        allowResale: formData.allowResale
      };

      mintNFTMutation.mutate(nftData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to prepare NFT data",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Basic NFT Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Basic NFT Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Title / Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter NFT title"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category / Type *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="song">🎵 Song</SelectItem>
                  <SelectItem value="album">💿 Album</SelectItem>
                  <SelectItem value="video">🎬 Video</SelectItem>
                  <SelectItem value="artwork">🎨 Artwork</SelectItem>
                  <SelectItem value="event">🎫 Event Pass</SelectItem>
                  <SelectItem value="merch">👕 Merchandise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your NFT in detail"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mainFile">Main File Upload *</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  id="mainFile"
                  type="file"
                  accept="image/*,audio/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file, 'main');
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="mainFile" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {formData.mainFile ? formData.mainFile.name : "Click to upload main file"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Supports images, audio, video
                  </span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="previewImage">Preview Image</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  id="previewImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file, 'preview');
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="previewImage" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {formData.previewImage ? formData.previewImage.name : "Click to upload preview"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Thumbnail for marketplace
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <Label>Tags / Genres</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="editions">Number of Editions *</Label>
            <Input
              id="editions"
              type="number"
              value={formData.editions}
              onChange={(e) => setFormData(prev => ({ ...prev, editions: parseInt(e.target.value) || 1 }))}
              min="1"
              max="10000"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              How many copies of this NFT can exist
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Monetization & Royalties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💰 Monetization & Royalties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">NFT Price *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency Type *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matic">MATIC (Crypto)</SelectItem>
                  <SelectItem value="inr">INR (Fiat)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="royalty">Royalty Percentage *</Label>
              <Input
                id="royalty"
                type="number"
                value={formData.royaltyPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, royaltyPercentage: parseInt(e.target.value) || 0 }))}
                min="0"
                max="20"
                required
              />
            </div>
          </div>

          <div>
            <Label>Platform Fee (Auto-calculated)</Label>
            <Input
              value={`${formData.platformFee}%`}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Platform takes this percentage from each sale
            </p>
          </div>

          <Separator />

          <div>
            <Label>Sale Type</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="fixed"
                  name="saleType"
                  value="fixed"
                  checked={formData.saleType === "fixed"}
                  onChange={(e) => setFormData(prev => ({ ...prev, saleType: e.target.value }))}
                />
                <Label htmlFor="fixed">Fixed Price</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="auction"
                  name="saleType"
                  value="auction"
                  checked={formData.saleType === "auction"}
                  onChange={(e) => setFormData(prev => ({ ...prev, saleType: e.target.value }))}
                />
                <Label htmlFor="auction">Auction</Label>
              </div>
            </div>
          </div>

          {formData.saleType === "auction" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auctionStartPrice">Auction Starting Price</Label>
                <Input
                  id="auctionStartPrice"
                  type="number"
                  value={formData.auctionStartPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, auctionStartPrice: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="auctionDuration">Auction Duration</Label>
                <Select
                  value={formData.auctionDuration}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, auctionDuration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access & Perks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎁 Access & Perks (Unlockable Content)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="unlockableDescription">Unlockable Content Description</Label>
            <Textarea
              id="unlockableDescription"
              value={formData.unlockableDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, unlockableDescription: e.target.value }))}
              placeholder="Describe what buyers will unlock (e.g., 'Behind-the-scenes video + lyrics PDF')"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="unlockableFile">Unlockable File Upload</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <input
                id="unlockableFile"
                type="file"
                accept="image/*,audio/*,video/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file, 'unlockable');
                  }
                }}
                className="hidden"
              />
              <label htmlFor="unlockableFile" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {formData.unlockableFile ? formData.unlockableFile.name : "Click to upload unlockable content"}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Hidden content for NFT holders only
                </span>
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="fanClubTier">Fan Club Tier Link</Label>
            <Select
              value={formData.fanClubTier}
              onValueChange={(value) => setFormData(prev => ({ ...prev, fanClubTier: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to fan club tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">🥉 Bronze Tier</SelectItem>
                <SelectItem value="silver">🥈 Silver Tier</SelectItem>
                <SelectItem value="gold">🥇 Gold Tier</SelectItem>
                <SelectItem value="platinum">💎 Platinum Tier</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              NFT holders get access to this fan club tier
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Perks List</Label>
              <Button type="button" onClick={addPerk} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Perk
              </Button>
            </div>

            <div className="space-y-3">
              {formData.perks.map((perk) => (
                <div key={perk.id} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Perk name"
                      value={perk.name}
                      onChange={(e) => updatePerk(perk.id, 'name', e.target.value)}
                    />
                    <Textarea
                      placeholder="Perk description"
                      value={perk.description}
                      onChange={(e) => updatePerk(perk.id, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => removePerk(perk.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚙️ Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="externalLink">External Link</Label>
            <Input
              id="externalLink"
              type="url"
              value={formData.externalLink}
              onChange={(e) => setFormData(prev => ({ ...prev, externalLink: e.target.value }))}
              placeholder="https://your-website.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Link to more info about the NFT or artist website
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Custom Attributes</Label>
              <Button type="button" onClick={addCustomAttribute} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Attribute
              </Button>
            </div>

            <div className="space-y-3">
              {formData.customAttributes.map((attr, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Trait type (e.g., Rarity)"
                    value={attr.trait_type}
                    onChange={(e) => updateCustomAttribute(index, 'trait_type', e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g., Legendary)"
                    value={attr.value}
                    onChange={(e) => updateCustomAttribute(index, 'value', e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={() => removeCustomAttribute(index)}
                    size="sm"
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>NFT Expiration Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expirationDate ? format(formData.expirationDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.expirationDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, expirationDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Set when this NFT access expires
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="allowResale"
              checked={formData.allowResale}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowResale: checked }))}
            />
            <Label htmlFor="allowResale">Allow Resale</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Control whether buyers can resell this NFT on the marketplace
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={mintNFTMutation.isPending}
          className="flex-1"
        >
          {mintNFTMutation.isPending ? "Minting NFT..." : "Mint NFT"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
