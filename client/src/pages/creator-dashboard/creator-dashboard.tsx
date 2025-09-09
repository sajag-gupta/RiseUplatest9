import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, Music, Calendar, ShoppingBag,
  DollarSign, Users, Heart, Play, Plus, Edit, Trash2, BookOpen,
  TrendingUp, BarChart3, PieChart, Activity, Palette, Crown, Vote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";
import Sidebar from "@/components/layout/sidebar";
import { MUSIC_GENRES } from "@/lib/constants";
import { sidebarEventBus } from "@/components/layout/sidebar";

// Import tab components
import OverviewTab from "./OverviewTab.tsx";
import UploadTab from "./UploadTab.tsx";
import SongsTab from "./SongsTab.tsx";
import NFTsTab from "./NFTsTab.tsx";
import FanClubTab from "./FanClubTab.tsx";
import DAOTab from "./DAOTab.tsx";
import EventsTab from "./EventsTab.tsx";
import MerchTab from "./MerchTab.tsx";
import BlogsTab from "./BlogsTab.tsx";
import AnalyticsTab from "./AnalyticsTab.tsx";
import SettingsTab from "./SettingsTab.tsx";

// Import types
import type { ArtistProfile, Song, Event, Merch, Analytics, Blog } from "./types";

// ---------- COMPONENT ----------
export default function CreatorDashboard() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Extract tab from URL search params or route params
  const getTabFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) return tabParam;

    const pathParts = location.split('/');
    return pathParts[2] || "overview";
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl());

  useEffect(() => {
    const currentTab = getTabFromUrl();
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);

      // Refetch data when switching to specific tabs
      if (currentTab === "songs") {
        queryClient.invalidateQueries({ queryKey: ["artistSongs"] });
      } else if (currentTab === "events") {
        queryClient.invalidateQueries({ queryKey: ["artistEvents"] });
      } else if (currentTab === "merch") {
        queryClient.invalidateQueries({ queryKey: ["artistMerch"] });
      } else if (currentTab === "analytics") {
        // Invalidate all analytics-related queries when viewing analytics
        queryClient.invalidateQueries({ queryKey: ["artistAnalytics"] });
        queryClient.invalidateQueries({ queryKey: ["artistProfile"] });
        queryClient.invalidateQueries({ queryKey: ["artistNFTAlytics"] });
      }
    }
  }, [location, activeTab, queryClient]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "overview") {
      setLocation("/creator");
    } else {
      setLocation(`/creator?tab=${value}`);
    }
  };

  // Check if user is artist, if not redirect to plans
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== "artist") {
        setShowSubscriptionModal(true);
        // Redirect to plans after showing modal
        setTimeout(() => {
          setLocation("/plans");
        }, 3000);
      }
    }
  }, [user, isLoading, setLocation]);

  // ---------- LOADING STATES ----------
  if (isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading creator dashboard..." />
      </div>
    );
  }

  if (!user) return null;

  // If user is not an artist, show subscription modal and redirect
  if (user.role !== "artist") {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Dialog open={showSubscriptionModal} onOpenChange={() => {}}>
          <DialogContent className="glass-effect border-border max-w-md w-full">
            <DialogHeader>
              <DialogTitle className="text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-primary" />
                Become a Creator
              </DialogTitle>
              <DialogDescription className="text-center">
                To access the creator dashboard and upload music, you need to subscribe to our Artist Pro plan.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <Button
                onClick={() => setLocation("/plans")}
                className="gradient-primary"
              >
                View Plans
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-24 flex">
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64">
        <div className="container-custom py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your music, track performance, and grow your audience
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-11 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="songs">Songs</TabsTrigger>
              <TabsTrigger value="nfts">NFTs</TabsTrigger>
              <TabsTrigger value="fanclub">Fan Club</TabsTrigger>
              <TabsTrigger value="dao">DAO</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="merch">Merch</TabsTrigger>
              <TabsTrigger value="blogs">Blogs</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <OverviewTab />
            <UploadTab />
            <SongsTab />
            <NFTsTab />
            <FanClubTab />
            <DAOTab />
            <EventsTab />
            <MerchTab />
            <BlogsTab />
            <AnalyticsTab />
            <SettingsTab />
          </Tabs>
        </div>
      </main>
    </div>
  );
}
