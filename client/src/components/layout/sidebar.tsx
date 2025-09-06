import { Link, useLocation } from "wouter";
import {
  Home, Compass, Calendar, ShoppingBag, Heart, ListMusic,
  Settings, User, BarChart3, Upload, PlusCircle, Crown, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

// 🔑 Event Bus for cross-component communication
export const sidebarEventBus = {
  openEventModal: () => {},
  openMerchModal: () => {}
};

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user || isMobile) return null;

  // Check if link is active
  const isActive = (path: string) => {
    if (path === "/creator" && location === "/creator") return true;
    if (path.includes("?tab=")) {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const pathTab = path.split('tab=')[1];
      return location.startsWith("/creator") && tabParam === pathTab;
    }
    return location === path || location.startsWith(path);
  };

  // Navigate helper
  const handleNav = (href: string) => {
    setLocation(href);
  };

  // Fan navigation
  const fanLinks = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/discover", icon: Compass, label: "Discover" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/merch", icon: ShoppingBag, label: "Merch" },
    { href: "/cart", icon: ShoppingBag, label: "Cart" },
  ];

  const fanSecondaryLinks = [
    { href: "/dashboard", icon: User, label: "Dashboard" },
    { href: "/playlists", icon: ListMusic, label: "Playlists" },
    { href: "/favorites", icon: Heart, label: "Favorites" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  // Artist navigation
  const artistLinks = [
    { href: "/creator", icon: BarChart3, label: "Creator Dashboard" },
    { href: "/favorites", icon: Heart, label: "Favorites" },
    { href: "/dashboard?tab=orders", icon: ShoppingBag, label: "Orders" },
    { href: "/playlists", icon: ListMusic, label: "Playlists" },
  ];

  // Admin navigation
  const adminLinks = [
    { href: "/admin", icon: BarChart3, label: "Admin Panel" },
    { href: "/admin?tab=artists", icon: User, label: "Artists" },
    { href: "/admin?tab=content", icon: ListMusic, label: "Content" },
    { href: "/admin?tab=analytics", icon: BarChart3, label: "Analytics" },
    { href: "/admin?tab=ads", icon: Megaphone, label: "Ad Management" },
  ];

  // Role-based nav
  const getLinks = () => {
    switch (user.role) {
      case "artist":
        return { primary: artistLinks, secondary: [] };
      case "admin":
        return { primary: adminLinks, secondary: [] };
      default:
        return { primary: fanLinks, secondary: fanSecondaryLinks };
    }
  };

  const { primary, secondary } = getLinks();
  
  return (
    <div className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-card border-r border-border z-30 overflow-y-auto">
      <div className="p-4 space-y-6">

        {/* Primary Navigation */}
        <nav className="space-y-2">
          {primary.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.href}
                variant={isActive(link.href) ? "secondary" : "ghost"}
                className={`w-full justify-start ${
                  isActive(link.href) ? "bg-primary/10 text-primary" : ""
                }`}
                onClick={() => handleNav(link.href)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {link.label}
              </Button>
            );
          })}
        </nav>

        {/* 🔑 Quick Actions (directly open modals in CreatorDashboard) */}
        {user.role === "artist" && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => handleNav("/creator?tab=upload")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Song
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => sidebarEventBus.openEventModal()}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Create Event
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => sidebarEventBus.openMerchModal()}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Merch
              </Button>
            </div>
          </Card>
        )}

        {/* Secondary Navigation for Fans */}
        {secondary.length > 0 && (
          <>
            <hr className="border-border" />
            <nav className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-2 mb-2">Library</h3>
              {secondary.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.href}
                    variant={isActive(link.href) ? "secondary" : "ghost"}
                    className={`w-full justify-start ${
                      isActive(link.href) ? "bg-primary/10 text-primary" : ""
                    }`}
                    onClick={() => handleNav(link.href)}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {link.label}
                  </Button>
                );
              })}
            </nav>
          </>
        )}

        {/* Premium Banner */}
        {user.plan?.type === "FREE" && user.role === "fan" && (
          <Card className="p-4 gradient-primary text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Go Premium</h3>
            </div>
            <p className="text-xs opacity-90 mb-3">
              Enjoy ad-free music and exclusive features
            </p>
            <Link href="/plans">
              <Button size="sm" variant="secondary" className="w-full">
                Upgrade Now
              </Button>
            </Link>
          </Card>
        )}

        {/* Artist Stats */}
        {user.role === "artist" && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">This Month</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Streams</span>
                <span className="text-sm font-medium">12.5K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Followers</span>
                <span className="text-sm font-medium">1.2K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="text-sm font-medium">₹2,450</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
