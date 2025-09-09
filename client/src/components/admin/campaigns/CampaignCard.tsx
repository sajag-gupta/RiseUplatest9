import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Edit, Trash2 } from "lucide-react";
import { Campaign } from "../types";

interface CampaignCardProps {
  campaign: Campaign;
  onStatusUpdate: (campaignId: string, status: string) => void;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
  isUpdating: boolean;
}

export default function CampaignCard({
  campaign,
  onStatusUpdate,
  onEdit,
  onDelete,
  isUpdating
}: CampaignCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold">{campaign.name}</h3>
              <Badge
                variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
              >
                {campaign.status}
              </Badge>
              <Badge variant="outline">{campaign.type}</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-medium">{formatCurrency(campaign.budget.total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Spent</p>
                <p className="font-medium">{formatCurrency(campaign.budget.spent || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target Users</p>
                <p className="font-medium">{campaign.targeting.userTypes.join(", ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusUpdate(campaign._id, campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
              disabled={isUpdating}
            >
              {campaign.status === 'ACTIVE' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={() => onEdit(campaign)}>
              <Edit className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(campaign._id)}
              disabled={isUpdating}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
