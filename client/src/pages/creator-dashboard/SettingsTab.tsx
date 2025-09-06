import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import type { ArtistProfile } from "./types";

// ---------- COMPONENT ----------
export default function SettingsTab() {
  const auth = useRequireRole("artist");

  // ---------- QUERIES ----------
  const { data: artistProfile } = useQuery({
    queryKey: ["artistProfile"],
    queryFn: () => fetch("/api/artists/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` }
    }).then(res => res.json()),
    enabled: !!auth.user,
  });

  // ---------- SAFE DEFAULTS ----------
  const safeArtistProfile: ArtistProfile = {
    _id: artistProfile?._id || "",
    userId: artistProfile?.userId || auth.user?._id || "",
    bio: artistProfile?.bio || "",
    socialLinks: artistProfile?.socialLinks || {},
    followers: artistProfile?.followers || [],
    totalPlays: artistProfile?.totalPlays || 0,
    totalLikes: artistProfile?.totalLikes || 0,
    revenue: {
      subscriptions: artistProfile?.revenue?.subscriptions || 0,
      merch: artistProfile?.revenue?.merch || 0,
      events: artistProfile?.revenue?.events || 0,
      ads: artistProfile?.revenue?.ads || 0
    },
    trendingScore: artistProfile?.trendingScore || 0,
    featured: artistProfile?.featured || false,
    verified: artistProfile?.verified || false,
    createdAt: artistProfile?.createdAt || new Date(),
    updatedAt: artistProfile?.updatedAt || new Date()
  };

  return (
    <TabsContent value="settings">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Artist Profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update your public artist information
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                defaultValue={safeArtistProfile.bio}
                placeholder="Tell fans about yourself..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  defaultValue={safeArtistProfile.socialLinks.instagram}
                  placeholder="https://instagram.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  defaultValue={safeArtistProfile.socialLinks.youtube}
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  defaultValue={safeArtistProfile.socialLinks.website}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="x">X (Twitter)</Label>
                <Input
                  id="x"
                  defaultValue={safeArtistProfile.socialLinks.x}
                  placeholder="https://x.com/username"
                />
              </div>
            </div>

            <Button className="bg-primary hover:bg-primary/80">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monetization</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure how you earn from your content
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Subscription Tiers</p>
                <p className="text-sm text-muted-foreground">
                  Offer exclusive content to subscribers
                </p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Ad Revenue</p>
                <p className="text-sm text-muted-foreground">
                  Earn from ads played before songs
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
