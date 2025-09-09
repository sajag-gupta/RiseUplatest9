import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Campaign } from "../types";
import CampaignCard from "./CampaignCard";

interface CampaignListProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onStatusUpdate: (campaignId: string, status: string) => void;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
  isUpdating: boolean;
}

export default function CampaignList({
  campaigns,
  isLoading,
  onStatusUpdate,
  onEdit,
  onDelete,
  isUpdating
}: CampaignListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Campaigns</h3>
          <p className="text-muted-foreground">Create your first ad campaign to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign._id}
          campaign={campaign}
          onStatusUpdate={onStatusUpdate}
          onEdit={onEdit}
          onDelete={onDelete}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );
}
