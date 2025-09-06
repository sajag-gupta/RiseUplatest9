import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthModalProvider, useAuthModal } from "@/hooks/use-auth-modal";
import { PlayerProvider } from "@/hooks/use-player";
import { ThemeProvider } from "@/hooks/use-theme";

// Pages
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ArtistProfile from "@/pages/artist-profile";
import Dashboard from "@/pages/dashboard";
import CreatorDashboard from "@/pages/creator-dashboard/creator-dashboard";
import AdminPanel from "@/pages/admin-panel";

import Discover from "@/pages/discover";
import Merch from "@/pages/merch";
import Events from "@/pages/events";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Plans from "@/pages/plans";

import ResetPassword from "@/pages/auth/reset-password";
import Settings from "@/pages/settings";
import Playlists from "@/pages/playlists";
import Favorites from "@/pages/favorites";
import OrderTracking from "@/pages/order-tracking";
import EventDetails from "@/pages/event-details";
import SongDetails from "@/pages/song-details";
import BlogDetails from "@/pages/blog-details";
import NotFound from "@/pages/not-found";

// Layout
import Header from "@/components/layout/header";
import MusicPlayer from "@/components/layout/music-player";
import VideoBackground from "@/components/common/video-background";
import GlobalAuthModal from "@/components/auth/global-auth-modal";

function AppRouter() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <VideoBackground />

      <Switch>
        {/* Public Routes */}
        <Route path="/" component={Landing} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/plans" component={Plans} />
        <Route path="/discover" component={Discover} />
        <Route path="/merch" component={Merch} />
        <Route path="/events" component={Events} />
        <Route path="/artist/:id" component={ArtistProfile} />

        {/* Protected Routes */}
        <Route path="/home" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/:tab" component={Dashboard} />
        <Route path="/creator" component={CreatorDashboard} />
        <Route path="/creator/:tab" component={CreatorDashboard} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/admin/:tab" component={AdminPanel} />

        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/settings" component={Settings} />
        <Route path="/playlists" component={Playlists} />
        <Route path="/favorites" component={Favorites} />
        <Route path="/order/:id" component={OrderTracking} />
        <Route path="/event/:id" component={EventDetails} />
        <Route path="/song/:id" component={SongDetails} />
        <Route path="/order/:orderId" component={OrderTracking} />
        <Route path="/blogs/:id" component={BlogDetails} />

        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>

      {/* Global Components */}
      <Header />
      <MusicPlayer />
    </div>
  );
}

function AppWithProviders() {
  return (
    <AuthModalProvider>
      <AppRouter />
      <GlobalAuthModal />
    </AuthModalProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <PlayerProvider>
              <Router>
                <AppWithProviders />
                <Toaster />
              </Router>
            </PlayerProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
