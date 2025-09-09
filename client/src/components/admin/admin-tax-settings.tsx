import React, { useState } from "react";
import { Settings, Save, Calculator, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";

interface TaxSettings {
  _id?: string;
  gstRate: number;
  isInclusive: boolean;
  isActive: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export default function AdminTaxSettings() {
  const [settings, setSettings] = useState<TaxSettings>({
    gstRate: 18,
    isInclusive: false,
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch current tax settings
  const { data: currentSettings, isLoading } = useQuery<TaxSettings>({
    queryKey: ["/api/admin/tax-settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update settings when data is loaded
  React.useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Update tax settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: TaxSettings) => {
      const response = await fetch("/api/admin/tax-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update tax settings (${response.status})`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-settings"] });
      toast({
        title: "Success",
        description: "Tax settings updated successfully"
      });
    },
    onError: (error: any) => {
      console.error("Tax settings update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tax settings",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    // Validate GST rate
    if (settings.gstRate < 0 || settings.gstRate > 100) {
      toast({
        title: "Invalid GST Rate",
        description: "GST rate must be between 0 and 100",
        variant: "destructive"
      });
      return;
    }

    updateSettingsMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" text="Loading tax settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tax Settings</h2>
          <p className="text-muted-foreground">Configure GST rates for your platform</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="bg-primary hover:bg-primary/90"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GST Rate Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              GST Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="gstRate" className="text-sm font-medium">
                GST Rate (%)
              </Label>
              <Input
                id="gstRate"
                type="number"
                value={settings.gstRate}
                onChange={(e) => setSettings({ ...settings, gstRate: Number(e.target.value) })}
                min="0"
                max="100"
                step="0.01"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Current GST rate applied to all transactions
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-sm font-medium">Tax Inclusive Pricing</Label>
                <p className="text-xs text-muted-foreground">
                  {settings.isInclusive
                    ? "Prices include GST (₹100 = ₹100 with GST)"
                    : "GST added to price (₹100 + GST = final price)"
                  }
                </p>
              </div>
              <Switch
                checked={settings.isInclusive}
                onCheckedChange={(checked) => setSettings({ ...settings, isInclusive: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-sm font-medium">Enable Tax Calculations</Label>
                <p className="text-xs text-muted-foreground">
                  {settings.isActive
                    ? "GST will be calculated on all orders"
                    : "No GST will be applied to orders"
                  }
                </p>
              </div>
              <Switch
                checked={settings.isActive}
                onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Calculation Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <IndianRupee className="w-5 h-5 mr-2" />
              Tax Calculation Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Sample Calculation</h4>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Item Price:</span>
                  <span className="font-medium">₹1,000</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>GST Rate:</span>
                  <span className="font-medium">{settings.gstRate}%</span>
                </div>

                {settings.isActive && (
                  <div className="flex justify-between text-sm">
                    <span>GST Amount:</span>
                    <span className="font-medium text-primary">
                      ₹{(1000 * settings.gstRate / 100).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-primary">
                      ₹{settings.isActive
                        ? (settings.isInclusive
                          ? "1,000"
                          : (1000 + (1000 * settings.gstRate / 100)).toFixed(2)
                        )
                        : "1,000"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Settings Summary</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Tax Type: {settings.isInclusive ? 'Inclusive' : 'Exclusive'}</div>
                <div>• GST Rate: {settings.gstRate}%</div>
                <div>• Status: {settings.isActive ? 'Active' : 'Inactive'}</div>
                <div>• Applies to: All merchandise and digital products</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Changes apply to new orders only.
                Existing orders retain their original tax rates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
