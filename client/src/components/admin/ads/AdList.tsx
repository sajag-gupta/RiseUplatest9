import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Eye } from "lucide-react";
import { AudioAd, BannerAd } from "../types";
import AdCard from "./AdCard";

interface AdListProps {
  audioAds: AudioAd[];
  bannerAds: BannerAd[];
  audioAdsLoading: boolean;
  bannerAdsLoading: boolean;
  selectedAdType: "audio" | "banner";
  onAdTypeChange: (type: "audio" | "banner") => void;
  onEditAd: (ad: AudioAd | BannerAd, type: "audio" | "banner") => void;
  onDeleteAd: (adId: string) => void;
  isDeleting: boolean;
}

export default function AdList({
  audioAds,
  bannerAds,
  audioAdsLoading,
  bannerAdsLoading,
  selectedAdType,
  onAdTypeChange,
  onEditAd,
  onDeleteAd,
  isDeleting
}: AdListProps) {
  const renderAdList = (ads: (AudioAd | BannerAd)[], type: "audio" | "banner", isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!ads || ads.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            {type === "audio" ? (
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            ) : (
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold mb-2">
              No {type === "audio" ? "Audio" : "Banner"} Ads
            </h3>
            <p className="text-muted-foreground">
              Create your first {type === "audio" ? "audio" : "banner"} ad to get started.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {ads.map((ad) => (
          <AdCard
            key={ad._id}
            ad={ad}
            type={type}
            onEdit={onEditAd}
            onDelete={onDeleteAd}
            isDeleting={isDeleting}
          />
        ))}
      </div>
    );
  };

  return (
    <Tabs value={selectedAdType} onValueChange={(value) => onAdTypeChange(value as "audio" | "banner")}>
      <TabsList>
        <TabsTrigger value="audio">Audio Ads</TabsTrigger>
        <TabsTrigger value="banner">Banner Ads</TabsTrigger>
      </TabsList>

      <TabsContent value="audio" className="space-y-4">
        {renderAdList(audioAds, "audio", audioAdsLoading)}
      </TabsContent>

      <TabsContent value="banner" className="space-y-4">
        {renderAdList(bannerAds, "banner", bannerAdsLoading)}
      </TabsContent>
    </Tabs>
  );
}
