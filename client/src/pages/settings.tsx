import { useState, useEffect } from "react";
import { User, Lock, Bell, Shield, CreditCard, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Loading from "@/components/common/loading";

// ---------------- Schema Validations ----------------
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  bio: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  x: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(6, "Password min 6 chars"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const settingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    newMusic: z.boolean().default(true),
    events: z.boolean().default(true),
    marketing: z.boolean().default(false),
    followers: z.boolean().default(true),
    revenue: z.boolean().default(true),
  }),
  privacy: z.object({
    visibility: z.enum(["public", "followers", "private"]).default("public"),
    activity: z.boolean().default(true),
    history: z.boolean().default(true),
    personalizedAds: z.boolean().default(false),
  })
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;

// ---------------- Main Component ----------------
export default function Settings() {
  const auth = useRequireAuth();
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  // Tabs state
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get("tab") || "profile");

  // API Queries
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/users/me/settings"],
    enabled: !!auth.user,
  });

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/users/me"],
    enabled: !!auth.user,
  });

  // Forms
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: auth.user?.name || "",
      email: auth.user?.email || "",
      bio: "",
      website: "",
      instagram: "",
      youtube: "",
      x: "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      notifications: { email: true, newMusic: true, events: true, marketing: false, followers: true, revenue: true },
      privacy: { visibility: "public", activity: true, history: true, personalizedAds: false }
    }
  });

  // Reset forms when data arrives
  useEffect(() => {
    if (userProfile) {
      const profile = userProfile as any;
      profileForm.reset({
        name: profile.name || "",
        email: profile.email || "",
        bio: "",
        website: "",
        instagram: "",
        youtube: "",
        x: "",
      });
    }

    // Use settings data for artist-specific fields if available
    if (userSettings && (userSettings as any).user) {
      const settingsUser = (userSettings as any).user;
      const profile = userProfile as any;
      profileForm.reset({
        name: settingsUser.name || profile?.name || "",
        email: settingsUser.email || profile?.email || "",
        bio: settingsUser.bio || "",
        website: settingsUser.website || "",
        instagram: settingsUser.instagram || "",
        youtube: settingsUser.youtube || "",
        x: settingsUser.x || "",
      });
    }

    if (userSettings) {
      // Extract only the notifications and privacy settings
      const settingsData = {
        notifications: (userSettings as any).notifications || {
          email: true,
          newMusic: true,
          events: true,
          marketing: false,
          followers: true,
          revenue: true,
        },
        privacy: (userSettings as any).privacy || {
          visibility: "public",
          activity: true,
          history: true,
          personalizedAds: false,
        }
      };
      settingsForm.reset(settingsData);
    }
  }, [userProfile, userSettings, profileForm, settingsForm]);

  // ---------------- Profile Update Mutation ----------------
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      // Update user name/email
      const userRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}`,
        },
        body: JSON.stringify({ name: data.name, email: data.email }),
      });
      if (!userRes.ok) throw new Error("Failed to update user profile");

      // Update artist profile if role=artist
      if (auth.user?.role === "artist") {
        await fetch("/api/users/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}`,
          },
          body: JSON.stringify({
            artist: {
              bio: data.bio,
              socialLinks: {
                website: data.website,
                instagram: data.instagram,
                youtube: data.youtube,
                x: data.x,
              },
            },
          }),
        });
      }

      return userRes.json();
    },
    onSuccess: async (updatedUser) => {
      // Update auth context with latest user data
      auth.updateUser(updatedUser);
      
      // Fetch the latest complete user data to ensure consistency
      try {
        const freshUserRes = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}`,
          },
        });
        if (freshUserRes.ok) {
          const freshUser = await freshUserRes.json();
          auth.updateUser(freshUser);
        }
      } catch (error) {
        console.warn("Failed to fetch fresh user data:", error);
      }
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists/profile"] });
      
      toast({ title: "Profile updated", description: "Changes saved successfully" });
    },
    onError: () => toast({ title: "Update failed", description: "Try again later", variant: "destructive" }),
  });

  // ---------------- Password Change Mutation ----------------
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Password change failed");
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: "Password updated", description: "Password changed successfully" });
    },
    onError: () => toast({ title: "Error", description: "Current password invalid", variant: "destructive" }),
  });

  // ---------------- Avatar Upload Mutation ----------------
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: async (data) => {
      // Update auth context with new avatar URL immediately
      if (auth.user) {
        auth.updateUser({ ...auth.user, avatarUrl: data.avatarUrl });
      }
      
      // Fetch the latest complete user data to ensure consistency
      try {
        const freshUserRes = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}`,
          },
        });
        if (freshUserRes.ok) {
          const freshUser = await freshUserRes.json();
          auth.updateUser(freshUser);
        }
      } catch (error) {
        console.warn("Failed to fetch fresh user data:", error);
      }
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists/profile"] });
      
      toast({ title: "Avatar updated", description: "Profile picture changed" });
      setIsUploading(false);
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      setIsUploading(false);
    },
  });

  // ---------------- Delete Account Mutation ----------------
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      // Clear all auth-related data and queries
      queryClient.clear();
      auth.logout();
      toast({ title: "Account deleted", description: "Your account has been removed. Thank you for being part of Rise Up Creators!" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete account", variant: "destructive" }),
  });

  // ---------------- Save Settings Mutation ----------------
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const res = await fetch("/api/users/me/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/settings"] });
      toast({ title: "Settings saved", description: "Your preferences are updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save settings", variant: "destructive" }),
  });

  // ---------------- Handlers ----------------
  const handleProfileSubmit = (data: ProfileForm) => updateProfileMutation.mutate(data);
  const handlePasswordSubmit = (data: PasswordForm) => changePasswordMutation.mutate(data);
  const handleSettingsSubmit = (data: SettingsForm) => saveSettingsMutation.mutate(data);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Select an image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Too large", description: "Max 5MB allowed", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    uploadAvatarMutation.mutate(file);
  };

  if (auth.isLoading || settingsLoading || profileLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading settings..." />
      </div>
    );
  }

  if (!auth.user) return null;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-custom py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" /> Profile
            </TabsTrigger>
            <TabsTrigger value="account">
              <Shield className="w-4 h-4 mr-2" /> Account
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Lock className="w-4 h-4 mr-2" /> Privacy
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="w-4 h-4 mr-2" /> Billing
            </TabsTrigger>
          </TabsList>

          {/* ---------------- Profile Tab ---------------- */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update your public profile information
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center space-x-6">
                    <Avatar className="w-24 h-24">
                      <AvatarImage
                        src={
                          (userSettings as any)?.user?.avatarUrl ||
                          auth.user?.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.user.email}`
                        }
                      />
                      <AvatarFallback className="text-2xl">
                        {auth.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button
                        variant="outline"
                        disabled={isUploading}
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                        type="button"
                      >
                        {isUploading ? <Loading size="sm" /> : <><Upload className="w-4 h-4 mr-2" /> Change Photo</>}
                      </Button>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                  </div>

                  {/* Name + Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" {...profileForm.register("name")} />
                      {profileForm.formState.errors.name && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...profileForm.register("email")} />
                      {profileForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" placeholder="Tell us about yourself..." {...profileForm.register("bio")} />
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Social Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" {...profileForm.register("website")} />
                        {profileForm.formState.errors.website && (
                          <p className="text-sm text-destructive">{profileForm.formState.errors.website.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input id="instagram" placeholder="@username" {...profileForm.register("instagram")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="youtube">YouTube</Label>
                        <Input id="youtube" placeholder="Channel URL" {...profileForm.register("youtube")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="x">X (Twitter)</Label>
                        <Input id="x" placeholder="@username" {...profileForm.register("x")} />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="gradient-primary text-white" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? <Loading size="sm" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Account Tab ---------------- */}
          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <p className="text-sm text-muted-foreground">Keep your account secure</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} />
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                      {passwordForm.formState.errors.newPassword && (
                        <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? <Loading size="sm" /> : "Change Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">This will permanently remove all your data.</p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => deleteAccountMutation.mutate()}
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? <Loading size="sm" /> : "Delete Account"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* ---------------- Notifications Tab ---------------- */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <p className="text-sm text-muted-foreground">Choose what notifications you want to receive</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("notifications.email")}
                      onCheckedChange={(checked) =>
                        settingsForm.setValue("notifications.email", checked)
                      }
                    />
                  </div>

                  {/* New Music */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">New Music from Artists You Follow</h4>
                      <p className="text-sm text-muted-foreground">Get notified when artists release new music</p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("notifications.newMusic")}
                      onCheckedChange={(checked) =>
                        settingsForm.setValue("notifications.newMusic", checked)
                      }
                    />
                  </div>

                  {/* Event Updates */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Event Updates</h4>
                      <p className="text-sm text-muted-foreground">Notifications about upcoming events</p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("notifications.events")}
                      onCheckedChange={(checked) =>
                        settingsForm.setValue("notifications.events", checked)
                      }
                    />
                  </div>

                  {/* Marketing Emails */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Emails</h4>
                      <p className="text-sm text-muted-foreground">Promotional content and platform updates</p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("notifications.marketing")}
                      onCheckedChange={(checked) =>
                        settingsForm.setValue("notifications.marketing", checked)
                      }
                    />
                  </div>

                  {/* Artist-specific Notifications */}
                  {auth.user.role === "artist" && (
                    <>
                      <Separator />
                      <h3 className="font-semibold">Artist Notifications</h3>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">New Followers</h4>
                          <p className="text-sm text-muted-foreground">When someone follows you</p>
                        </div>
                        <Switch
                          checked={settingsForm.watch("notifications.followers")}
                          onCheckedChange={(checked) =>
                            settingsForm.setValue("notifications.followers", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Revenue Updates</h4>
                          <p className="text-sm text-muted-foreground">Monthly earnings reports</p>
                        </div>
                        <Switch
                          checked={settingsForm.watch("notifications.revenue")}
                          onCheckedChange={(checked) =>
                            settingsForm.setValue("notifications.revenue", checked)
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                <Button
                  className="gradient-primary text-white"
                  onClick={settingsForm.handleSubmit(handleSettingsSubmit)}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? <Loading size="sm" /> : "Save Notification Preferences"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Privacy Tab ---------------- */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Control your privacy and data preferences</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Profile Visibility */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Profile Visibility</h4>
                      <p className="text-sm text-muted-foreground">Who can see your profile</p>
                    </div>
                    <Select
                      value={settingsForm.watch("privacy.visibility")}
                      onValueChange={(value) =>
                        settingsForm.setValue("privacy.visibility", value as "public" | "followers" | "private")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Activity Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Activity Status</h4>
                      <p className="text-sm text-muted-foreground">Show when you're online</p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("privacy.activity")}
                      onCheckedChange={(checked) =>
                        settingsForm.setValue("privacy.activity", checked)
                      }
                    />
                  </div>

                  {/* Listening History */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Listening History</h4>
                      <p className="text-sm text-muted-foreground">Save your music listening history</p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("privacy.history")}
                      onCheckedChange={(checked) =>
                        settingsForm.setValue("privacy.history", checked)
                      }
                    />
                  </div>

                  {/* Personalized Ads */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Personalized Ads</h4>
                      <p className="text-sm text-muted-foreground">Show relevant ads based on your activity</p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("privacy.personalizedAds")}
                      onCheckedChange={(checked) =>
                        settingsForm.setValue("privacy.personalizedAds", checked)
                      }
                    />
                  </div>

                  <Separator />

                  {/* Data Management */}
                  <h3 className="font-semibold">Data Management</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Download Your Data</h4>
                      <p className="text-sm text-muted-foreground">Get a copy of your account data</p>
                    </div>
                    <Button variant="outline">Download</Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Clear Listening History</h4>
                      <p className="text-sm text-muted-foreground">Remove all your listening history</p>
                    </div>
                    <Button variant="outline">Clear</Button>
                  </div>
                </div>

                <Button
                  className="gradient-primary text-white"
                  onClick={settingsForm.handleSubmit(handleSettingsSubmit)}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? <Loading size="sm" /> : "Save Privacy Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          {/* ---------------- Billing Tab ---------------- */}
          <TabsContent value="billing">
            <div className="space-y-6">
              {/* Current Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {auth.user.plan?.type || "FREE"} Plan
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {auth.user.plan?.type && auth.user.plan.type !== "FREE"
                          ? "Enjoy ad-free music and exclusive features"
                          : "Upgrade to premium for an ad-free experience"}
                      </p>
                    </div>
                    {auth.user.plan?.type !== "PREMIUM" && (
                      <Button className="gradient-primary text-white">
                        Upgrade to Premium
                      </Button>
                    )}
                  </div>

                  {auth.user.plan?.renewsAt && (
                    <p className="text-sm text-muted-foreground">
                      {auth.user.plan.type === "PREMIUM" ? "Renews" : "Expires"} on{" "}
                      {new Date(auth.user.plan.renewsAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              {auth.user.plan?.type === "PREMIUM" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">•••• •••• •••• 1234</p>
                          <p className="text-sm text-muted-foreground">Expires 12/25</p>
                        </div>
                      </div>
                      <Button variant="outline">Update</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Billing History */}
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auth.user.plan?.type === "PREMIUM" ? (
                      <>
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">Premium Plan - Monthly</p>
                            <p className="text-sm text-muted-foreground">Dec 1, 2024</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹199</p>
                            <Button variant="ghost" size="sm">
                              Download
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">Premium Plan - Monthly</p>
                            <p className="text-sm text-muted-foreground">Nov 1, 2024</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹199</p>
                            <Button variant="ghost" size="sm">
                              Download
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No billing history available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          </Tabs>
          </div>
          </div>
          );
          }
