import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campaign } from "../types";

interface CampaignFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (campaignData: any) => void;
  editingCampaign?: Campaign | null;
  isSubmitting: boolean;
}

export default function CampaignForm({
  isOpen,
  onClose,
  onSubmit,
  editingCampaign,
  isSubmitting
}: CampaignFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "AUDIO",
    status: "DRAFT",
    targeting: {
      genres: [],
      regions: [],
      ageRanges: [],
      userTypes: ["FREE"]
    },
    schedule: {
      startDate: new Date().toISOString(),
      dailyLimit: 1000,
      totalLimit: 10000
    },
    budget: {
      total: 0,
      spent: 0,
      currency: "INR"
    }
  });

  // Reset form when dialog opens/closes or editing campaign changes
  useEffect(() => {
    if (isOpen) {
      if (editingCampaign) {
        setFormData({
          name: editingCampaign.name,
          type: editingCampaign.type,
          status: editingCampaign.status,
          targeting: editingCampaign.targeting,
          schedule: {
            startDate: new Date().toISOString(),
            dailyLimit: 1000,
            totalLimit: 10000
          },
          budget: editingCampaign.budget
        });
      } else {
        setFormData({
          name: "",
          type: "AUDIO",
          status: "DRAFT",
          targeting: {
            genres: [],
            regions: [],
            ageRanges: [],
            userTypes: ["FREE"]
          },
          schedule: {
            startDate: new Date().toISOString(),
            dailyLimit: 1000,
            totalLimit: 10000
          },
          budget: {
            total: 0,
            spent: 0,
            currency: "INR"
          }
        });
      }
    }
  }, [isOpen, editingCampaign]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCampaign ? "Edit Campaign" : "Create Ad Campaign"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter campaign name"
            />
          </div>

          <div>
            <Label htmlFor="campaign-type">Campaign Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUDIO">Audio Ads</SelectItem>
                <SelectItem value="BANNER">Banner Ads</SelectItem>
                <SelectItem value="GOOGLE_ADSENSE">Google AdSense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="budget">Budget (INR)</Label>
            <Input
              id="budget"
              type="number"
              value={formData.budget.total}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                budget: { ...prev.budget, total: parseFloat(e.target.value) || 0 }
              }))}
              placeholder="Enter budget amount"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {editingCampaign ? "Update" : "Create"} Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
