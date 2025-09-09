import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campaign, AudioAd, BannerAd } from "../types";

interface AdFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adData: any) => void;
  editingAd?: AudioAd | BannerAd | null;
  adType: "audio" | "banner";
  campaigns: Campaign[];
  isSubmitting: boolean;
}

export default function AdForm({
  isOpen,
  onClose,
  onSubmit,
  editingAd,
  adType,
  campaigns,
  isSubmitting
}: AdFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    campaignId: "",
    audioUrl: "",
    imageUrl: "",
    size: "300x250" as string | { width: number; height: number },
    customSize: { width: 300, height: 250 },
    durationSec: 30,
    placements: ["home"], // Default placement for banner ads
    callToAction: {
      text: "",
      url: ""
    }
  });

  // Reset form when dialog opens/closes or editing ad changes
  useEffect(() => {
    if (isOpen) {
      if (editingAd) {
        const isBannerAd = 'imageUrl' in editingAd;
        setFormData({
          title: editingAd.title,
          campaignId: editingAd.campaignId || "",
          audioUrl: isBannerAd ? "" : (editingAd as AudioAd).audioUrl,
          imageUrl: isBannerAd ? (editingAd as BannerAd).imageUrl : "",
          size: isBannerAd ? (editingAd as BannerAd).size : "300x250",
          customSize: isBannerAd && typeof (editingAd as BannerAd).size === 'object' && (editingAd as BannerAd).size
            ? { width: ((editingAd as BannerAd).size as { width: number; height: number }).width, height: ((editingAd as BannerAd).size as { width: number; height: number }).height }
            : { width: 300, height: 250 },
          durationSec: isBannerAd ? 30 : (editingAd as AudioAd).durationSec,
          placements: isBannerAd ? (editingAd as BannerAd).placements || ["home"] : ["home"],
          callToAction: editingAd.callToAction
        });
      } else {
        setFormData({
          title: "",
          campaignId: "",
          audioUrl: "",
          imageUrl: "",
          size: "300x250",
          customSize: { width: 300, height: 250 },
          durationSec: 30,
          placements: ["home"],
          callToAction: {
            text: "",
            url: ""
          }
        });
      }
    }
  }, [isOpen, editingAd]);

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      return;
    }

    if (adType === "audio" && !formData.audioUrl) {
      return;
    }

    if (adType === "banner" && !formData.imageUrl) {
      return;
    }

    // Prepare ad data - only include campaignId if it's not empty
    const { campaignId, ...adData } = formData;
    const finalAdData = campaignId ? { ...adData, campaignId } : adData;

    onSubmit(finalAdData);
  };

  const isBannerAd = adType === "banner";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingAd ? `Edit ${isBannerAd ? "Banner" : "Audio"} Ad` : `Create ${isBannerAd ? "Banner" : "Audio"} Ad`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ad-title">Title</Label>
            <Input
              id="ad-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter ad title"
            />
          </div>

          <div>
            <Label htmlFor="campaign-select">Campaign (Optional)</Label>
            <Select
              value={formData.campaignId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, campaignId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select campaign (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Campaign</SelectItem>
                {campaigns?.map((campaign) => (
                  <SelectItem key={campaign._id} value={campaign._id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isBannerAd ? (
            <>
              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="Enter image URL"
                />
              </div>

              <div>
                <Label htmlFor="banner-size">Banner Size</Label>
                <Select
                  value={typeof formData.size === 'string' ? formData.size : 'custom'}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setFormData(prev => ({
                        ...prev,
                        size: { width: prev.customSize.width, height: prev.customSize.height }
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, size: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300x250">300x250 (Medium Rectangle)</SelectItem>
                    <SelectItem value="728x90">728x90 (Leaderboard)</SelectItem>
                    <SelectItem value="320x50">320x50 (Mobile Banner)</SelectItem>
                    <SelectItem value="300x600">300x600 (Large Skyscraper)</SelectItem>
                    <SelectItem value="custom">Custom Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.size === "custom" || (formData.size && typeof formData.size === 'object')) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="custom-width">Width (px)</Label>
                    <Input
                      id="custom-width"
                      type="number"
                      min="100"
                      max="2000"
                      value={formData.size && typeof formData.size === 'object' ? formData.size.width : formData.customSize.width}
                      onChange={(e) => {
                        const width = parseInt(e.target.value) || 300;
                        const height = formData.size && typeof formData.size === 'object' ? formData.size.height : formData.customSize.height;
                        setFormData(prev => ({
                          ...prev,
                          customSize: { ...prev.customSize, width },
                          size: { width, height }
                        }));
                      }}
                      placeholder="300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-height">Height (px)</Label>
                    <Input
                      id="custom-height"
                      type="number"
                      min="50"
                      max="2000"
                      value={formData.size && typeof formData.size === 'object' ? formData.size.height : formData.customSize.height}
                      onChange={(e) => {
                        const height = parseInt(e.target.value) || 250;
                        const width = formData.size && typeof formData.size === 'object' ? formData.size.width : formData.customSize.width;
                        setFormData(prev => ({
                          ...prev,
                          customSize: { ...prev.customSize, height },
                          size: { width, height }
                        }));
                      }}
                      placeholder="250"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="audio-url">Audio URL</Label>
                <Input
                  id="audio-url"
                  value={formData.audioUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, audioUrl: e.target.value }))}
                  placeholder="Enter audio file URL"
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="300"
                  value={formData.durationSec}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationSec: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="cta-text">Call to Action Text</Label>
            <Input
              id="cta-text"
              value={formData.callToAction.text}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                callToAction: { ...prev.callToAction, text: e.target.value }
              }))}
              placeholder="e.g., Learn More, Shop Now"
            />
          </div>

          <div>
            <Label htmlFor="cta-url">Call to Action URL</Label>
            <Input
              id="cta-url"
              value={formData.callToAction.url}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                callToAction: { ...prev.callToAction, url: e.target.value }
              }))}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {editingAd ? "Update" : "Create"} Ad
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
