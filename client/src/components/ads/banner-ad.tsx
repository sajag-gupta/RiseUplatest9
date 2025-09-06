import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Google AdSense integration
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface BannerAdProps {
  placement: string;
  size?: "300x250" | "728x90" | "320x50" | "300x600";
  className?: string;
  onClose?: () => void;
}

export default function BannerAd({ placement, size = "300x250", className = "", onClose }: BannerAdProps) {
  const [currentAd, setCurrentAd] = useState<any>(null);
  const [showGoogleAd, setShowGoogleAd] = useState(false);

  // Fetch ads for this placement
  const { data: ads, isLoading } = useQuery<any[]>({
    queryKey: ["/api/ads/for-user", { type: "BANNER_" + placement.toUpperCase() }],
    enabled: !!placement,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track impression mutation
  const trackImpressionMutation = useMutation({
    mutationFn: async (adId: string) => {
      const response = await fetch("/api/ads/impressions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({
          adId,
          adType: "BANNER",
          placement: placement.toLowerCase(),
          deviceInfo: {
            type: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            os: navigator.platform,
            browser: navigator.userAgent
          }
        })
      });
      if (!response.ok) throw new Error("Failed to track impression");
      return response.json();
    }
  });

  // Track click mutation
  const trackClickMutation = useMutation({
    mutationFn: async (adId: string) => {
      const response = await fetch("/api/ads/clicks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({
          adId,
          adType: "BANNER",
          impressionId: currentAd?.impressionId // We'll set this when impression is tracked
        })
      });
      if (!response.ok) throw new Error("Failed to track click");
      return response.json();
    }
  });

  useEffect(() => {
    if (ads && Array.isArray(ads) && ads.length > 0) {
      const ad = ads[0]; // For now, just take the first ad
      setCurrentAd(ad);
      setShowGoogleAd(false); // Show internal ad

      // Track impression
      trackImpressionMutation.mutate(ad._id, {
        onSuccess: (impression) => {
          setCurrentAd((prev: any) => prev ? { ...prev, impressionId: impression._id } : prev);
        }
      });
    } else if (ads !== undefined && (!ads || ads.length === 0)) {
      // No internal ads available, show Google AdSense
      setShowGoogleAd(true);
      setCurrentAd(null);
    }
  }, [ads]);

  const handleAdClick = () => {
    if (currentAd?.callToAction?.url) {
      // Track click
      trackClickMutation.mutate(currentAd._id);

      // Open the URL
      window.open(currentAd.callToAction.url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="bg-muted h-32 rounded"></div>
        </div>
      </Card>
    );
  }

  const sizeClasses = {
    "300x250": "h-60 w-72",
    "728x90": "h-24 w-full max-w-2xl",
    "320x50": "h-12 w-80",
    "300x600": "h-96 w-72"
  };

  const googleAdSizes = {
    "300x250": [300, 250],
    "728x90": [728, 90],
    "320x50": [320, 50],
    "300x600": [300, 600]
  };

  // Show Google AdSense when no internal ads are available
  if (showGoogleAd) {
    return (
      <Card className={`relative overflow-hidden ${className}`}>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 w-6 h-6"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        )}

        <div className={`relative ${sizeClasses[size]}`}>
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your AdSense publisher ID
            data-ad-slot="XXXXXXXXXX" // Replace with your ad slot ID
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

        <div className="p-2 bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Advertisement
          </p>
        </div>
      </Card>
    );
  }

  if (!currentAd) {
    return null;
  }

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 w-6 h-6"
          onClick={onClose}
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      <div
        className={`relative cursor-pointer ${sizeClasses[size]}`}
        onClick={handleAdClick}
      >
        <img
          src={currentAd.imageUrl}
          alt={currentAd.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250";
          }}
        />

        {currentAd.callToAction && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {currentAd.callToAction.text}
              </span>
              <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" />
            </div>
          </div>
        )}
      </div>

      <div className="p-2 bg-muted/50">
        <p className="text-xs text-muted-foreground text-center">
          Sponsored • {currentAd.title}
        </p>
      </div>
    </Card>
  );
}
