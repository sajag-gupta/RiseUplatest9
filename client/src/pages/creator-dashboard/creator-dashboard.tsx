import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, Music, Calendar, ShoppingBag,
  DollarSign, Users, Heart, Play, Plus, Edit, Trash2, BookOpen,
  TrendingUp, BarChart3, PieChart, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";
import Sidebar from "@/components/layout/sidebar";
import { MUSIC_GENRES } from "@/lib/constants";
import { sidebarEventBus } from "@/components/layout/sidebar";

// Import tab components
import OverviewTab from "./OverviewTab";
import UploadTab from "./UploadTab";
import SongsTab from "./SongsTab";
import EventsTab from "./EventsTab";
import MerchTab from "./MerchTab";
import BlogsTab from "./BlogsTab";
import AnalyticsTab from "./AnalyticsTab";
import SettingsTab from "./SettingsTab";

// Import types
import type { ArtistProfile, Song, Event, Merch, Analytics, Blog } from "./types";

// ---------- COMPONENT ----------
export default function CreatorDashboard() {
  const auth = useRequireRole("artist");
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

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

  // ---------- LOADING STATES ----------
  if (auth.isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading creator dashboard..." />
      </div>
    );
  }

  if (!auth.user) return null;

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
            <TabsList className="grid w-full grid-cols-8 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="songs">My Songs</TabsTrigger>
              <TabsTrigger value="events">My Events</TabsTrigger>
              <TabsTrigger value="merch">My Merch</TabsTrigger>
              <TabsTrigger value="blogs">My Blogs</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <OverviewTab />
            <UploadTab />
            <SongsTab />
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
