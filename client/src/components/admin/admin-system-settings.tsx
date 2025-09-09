import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, RotateCcw, Shield, CreditCard, Image, Clock, Users, AlertTriangle } from "lucide-react";
import Loading from "@/components/common/loading";

interface SystemSettings {
  platformFee: number;
  maxMintPerArtist: number;
  defaultAuctionDuration: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  enableIPFS: boolean;
  enableCloudinary: boolean;
  enableRazorpay: boolean;
  walletAddresses: {
    polygon: string;
    ethereum: string;
  };
  apiKeys: {
    cloudinary: string;
    razorpay: string;
    ipfs: string;
  };
  security: {
    maxLoginAttempts: number;
    sessionTimeout: number;
    enable2FA: boolean;
  };
}

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    platformFee: 2.5,
    maxMintPerArtist: 10,
    defaultAuctionDuration: 7,
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    enableIPFS: true,
    enableCloudinary: true,
    enableRazorpay: true,
    walletAddresses: {
      polygon: "",
      ethereum: ""
    },
    apiKeys: {
      cloudinary: "",
      razorpay: "",
      ipfs: ""
    },
    security: {
      maxLoginAttempts: 5,
      sessionTimeout: 24,
      enable2FA: false
    }
  });

  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json())
  });

  // Update settings when data is loaded
  useEffect(() => {
    if (currentSettings) {
      setSettings(prev => ({ ...prev, ...currentSettings }));
    }
  }, [currentSettings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<SystemSettings>) => {
      const response = await fetch("/api/admin/settings", {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Success", description: "Settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleResetSettings = () => {
    if (currentSettings) {
      setSettings(prev => ({ ...prev, ...currentSettings }));
      toast({ title: "Settings Reset", description: "Settings have been reset to last saved values" });
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = (parent: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof SystemSettings] as any,
        [key]: value
      }
    }));
  };

  if (isLoading) {
    return <Loading size="lg" text="Loading system settings..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-muted-foreground">Configure platform-wide settings and configurations</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleResetSettings}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Platform Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="platform-fee">Platform Fee (%)</Label>
              <Input
                id="platform-fee"
                type="number"
                step="0.1"
                value={settings.platformFee}
                onChange={(e) => updateSetting('platformFee', parseFloat(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Commission charged on NFT transactions
              </p>
            </div>

            <div>
              <Label htmlFor="max-mint">Max NFTs per Artist</Label>
              <Input
                id="max-mint"
                type="number"
                value={settings.maxMintPerArtist}
                onChange={(e) => updateSetting('maxMintPerArtist', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Daily limit to prevent spamming
              </p>
            </div>

            <div>
              <Label htmlFor="auction-duration">Default Auction Duration (days)</Label>
              <Input
                id="auction-duration"
                type="number"
                value={settings.defaultAuctionDuration}
                onChange={(e) => updateSetting('defaultAuctionDuration', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Default duration for new auctions
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable platform for maintenance
                </p>
              </div>
              <Switch
                id="maintenance-mode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new-registrations">Allow New Registrations</Label>
                <p className="text-sm text-muted-foreground">
                  Enable/disable new user registrations
                </p>
              </div>
              <Switch
                id="new-registrations"
                checked={settings.allowNewRegistrations}
                onCheckedChange={(checked) => updateSetting('allowNewRegistrations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-verification">Require Email Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Force email verification for new accounts
                </p>
              </div>
              <Switch
                id="email-verification"
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => updateSetting('requireEmailVerification', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Service Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-ipfs">Enable IPFS Storage</Label>
                <p className="text-sm text-muted-foreground">
                  Use IPFS for decentralized file storage
                </p>
              </div>
              <Switch
                id="enable-ipfs"
                checked={settings.enableIPFS}
                onCheckedChange={(checked) => updateSetting('enableIPFS', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-cloudinary">Enable Cloudinary</Label>
                <p className="text-sm text-muted-foreground">
                  Use Cloudinary for image optimization
                </p>
              </div>
              <Switch
                id="enable-cloudinary"
                checked={settings.enableCloudinary}
                onCheckedChange={(checked) => updateSetting('enableCloudinary', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-razorpay">Enable Razorpay</Label>
                <p className="text-sm text-muted-foreground">
                  Enable payment processing
                </p>
              </div>
              <Switch
                id="enable-razorpay"
                checked={settings.enableRazorpay}
                onCheckedChange={(checked) => updateSetting('enableRazorpay', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Wallet Addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="polygon-wallet">Polygon Wallet Address</Label>
            <Input
              id="polygon-wallet"
              placeholder="0x..."
              value={settings.walletAddresses.polygon}
              onChange={(e) => updateNestedSetting('walletAddresses', 'polygon', e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Platform wallet for Polygon transactions
            </p>
          </div>

          <div>
            <Label htmlFor="ethereum-wallet">Ethereum Wallet Address</Label>
            <Input
              id="ethereum-wallet"
              placeholder="0x..."
              value={settings.walletAddresses.ethereum}
              onChange={(e) => updateNestedSetting('walletAddresses', 'ethereum', e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Platform wallet for Ethereum transactions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Image className="w-5 h-5 mr-2" />
            API Keys & Secrets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="cloudinary-key">Cloudinary API Key</Label>
              <Input
                id="cloudinary-key"
                type="password"
                placeholder="Enter Cloudinary API key"
                value={settings.apiKeys.cloudinary}
                onChange={(e) => updateNestedSetting('apiKeys', 'cloudinary', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="razorpay-key">Razorpay API Key</Label>
              <Input
                id="razorpay-key"
                type="password"
                placeholder="Enter Razorpay API key"
                value={settings.apiKeys.razorpay}
                onChange={(e) => updateNestedSetting('apiKeys', 'razorpay', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="ipfs-key">IPFS API Key</Label>
              <Input
                id="ipfs-key"
                type="password"
                placeholder="Enter IPFS API key"
                value={settings.apiKeys.ipfs}
                onChange={(e) => updateNestedSetting('apiKeys', 'ipfs', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
              <Input
                id="max-login-attempts"
                type="number"
                value={settings.security.maxLoginAttempts}
                onChange={(e) => updateNestedSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Before account lockout
              </p>
            </div>

            <div>
              <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => updateNestedSetting('security', 'sessionTimeout', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Auto-logout after inactivity
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-2fa">Enable Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require 2FA for admin accounts
              </p>
            </div>
            <Switch
              id="enable-2fa"
              checked={settings.security.enable2FA}
              onCheckedChange={(checked) => updateNestedSetting('security', 'enable2FA', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleResetSettings}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Changes
        </Button>
        <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
