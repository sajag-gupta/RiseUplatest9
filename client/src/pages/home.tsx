import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Play, Pause, Plus, Heart, Users, TrendingUp, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-auth";
import { usePlayer } from "@/hooks/use-player";
import Loading from "@/components/common/loading";
import Sidebar, { sidebarEventBus } from "@/components/layout/sidebar";
import CreateEventForm from "@/components/forms/create-event-form";
import MerchForm from "@/components/forms/merch-form";
import BannerAd from "@/components/ads/banner-ad";

export default function Home() {
  const auth = useRequireAuth();
  const { play, addToQueue, pause, currentSong, isPlaying } = usePlayer();
  const setLocation = useLocation()[1];
  
  // Modal states for sidebar quick actions
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showAddMerchModal, setShowAddMerchModal] = useState(false);

  // Connect sidebar event bus
  useEffect(() => {
    sidebarEventBus.openEventModal = () => setShowCreateEventModal(true);
    sidebarEventBus.openMerchModal = () => setShowAddMerchModal(true);
  }, []);



  // Fetch personalized content
  const { data: yourArtists = [], isLoading: artistsLoading } = useQuery({
    queryKey: ["/api/users/me/following-content"],
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000,
  });

  // Invalidate ad queries when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab, refresh ad data
        // This ensures ads appear immediately after admin creates them
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const { data: recommended = [], isLoading: recommendedLoading } = useQuery({
    queryKey: ["/api/songs/recommended"],
    enabled: !!auth.user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: trending = [], isLoading: trendingLoading } = useQuery({
    queryKey: ["/api/songs/trending"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentlyPlayed = [], isLoading: recentLoading } = useQuery({
    queryKey: ["/api/users/me/recent-plays"],
    enabled: !!auth.user,
    staleTime: 2 * 60 * 1000,
  });

  if (auth.isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading your personalized feed..." />
      </div>
    );
  }

  if (!auth.user) {
    return null; // Will redirect in useEffect
  }

  const handlePlaySong = (song: any) => {
    play(song);
  };

  const handleAddToQueue = (songs: any[]) => {
    addToQueue(songs);
  };

  return (
    <div className="min-h-screen pt-16 pb-24 flex">
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64">
        <div className="container-custom py-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {auth.user.name}!
            </h1>
            <p className="text-muted-foreground">
              Discover new music and catch up with your favorite artists
            </p>
          </div>

          {/* Premium Upgrade Banner */}
          {auth.user.plan?.type && auth.user.plan.type === "FREE" && (
            <Card className="mb-8 gradient-primary text-white border-0">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Upgrade to Premium</h3>
                  <p className="opacity-90">Enjoy ad-free music and exclusive features</p>
                </div>
                <Link href="/plans">
                  <Button variant="secondary" data-testid="upgrade-premium">
                    <Star className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Banner Ad - Only show for FREE users */}
          {auth.user.plan?.type === "FREE" && (
            <div className="flex justify-center mb-8">
              <BannerAd
                placement="HOME"
                size="728x90"
                className="max-w-2xl"
              />
            </div>
          )}

          <div className="space-y-8">
            {/* Recently Played */}
            {Array.isArray(recentlyPlayed) && recentlyPlayed.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Recently Played</h2>
                </div>

                {recentLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="aspect-square bg-muted rounded-lg mb-2"></div>
                        <div className="h-4 bg-muted rounded mb-1"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {recentlyPlayed?.slice(0, 6).map((item: any, index: number) => (
                      <div
                        key={item._id}
                        className="group cursor-pointer"
                        onClick={() => handlePlaySong(item)}
                        data-testid={`recent-song-${index}`}
                      >
                        <div className="aspect-square relative rounded-lg overflow-hidden mb-2 hover-glow">
                          <img
                            src={item.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentSong?._id === item._id && isPlaying) {
                                  pause();
                                } else {
                                  play(item);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100"
                            >
                              {currentSong?._id === item._id && isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">{item.artistName || "Artist"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Your Artists Updates */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">From Your Artists</h2>
                <Link href="/discover">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>

              {artistsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="music-card animate-pulse flex items-center space-x-4">
                      <div className="w-16 h-16 bg-muted rounded-xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : Array.isArray(yourArtists) && yourArtists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {yourArtists.slice(0, 4).map((item: any, index: number) => (
                    <div
                      key={item._id}
                      className="music-card group cursor-pointer flex items-center space-x-4"
                      onClick={() => handlePlaySong(item)}
                      data-testid={`artist-update-${index}`}
                    >
                      <img
                        src={item.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">{item.artistName || "Artist Name"}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            2 days ago
                          </span>
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No updates yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Follow some artists to see their latest releases here
                    </p>
                    <Link href="/discover">
                      <Button data-testid="discover-artists">Discover Artists</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Recommended For You */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Recommended For You</h2>
                <Button variant="outline" size="sm">Refresh</Button>
              </div>

              {recommendedLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="music-card animate-pulse">
                      <div className="w-full aspect-square bg-muted rounded-lg mb-3"></div>
                      <div className="h-4 bg-muted rounded mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.isArray(recommended) && recommended.slice(0, 5).map((song: any, index: number) => (
                    <div
                      key={song._id}
                      className="song-card group cursor-pointer"
                      onClick={() => handlePlaySong(song)}
                      data-testid={`recommended-song-${index}`}
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                        <img
                          src={song.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentSong?._id === song._id && isPlaying) {
                                pause();
                              } else {
                                play(song);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            {currentSong?._id === song._id && isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="px-1">
                        <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {song.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {song.artistName || "Artist Name"}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {song.plays > 1000 ? `${(song.plays / 1000).toFixed(0)}K` : song.plays || 0}
                          </span>
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {song.genre}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="col-span-full">
                      <Card className="text-center py-8">
                        <CardContent>
                          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Personalized recommendations coming soon</h3>
                          <p className="text-muted-foreground">
                            Listen to more music to get personalized recommendations
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* NFT Marketplace Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">NFT Marketplace</h2>
                <Link href="/nft-marketplace">
                  <Button variant="outline" size="sm">Explore NFTs</Button>
                </Link>
              </div>

              <Card className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎨</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Discover Unique Digital Assets</h3>
                <p className="text-muted-foreground mb-4">
                  Collect exclusive NFTs from your favorite artists, join fan clubs, and participate in DAO governance
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <Badge variant="secondary">🎵 Music NFTs</Badge>
                  <Badge variant="secondary">🎭 Fan Clubs</Badge>
                  <Badge variant="secondary">🏛️ DAO Governance</Badge>
                  <Badge variant="secondary">🏆 Achievements</Badge>
                </div>
                <div className="flex gap-2 justify-center">
                  <Link href="/nft-marketplace">
                    <Button>Browse NFTs</Button>
                  </Link>
                  <Link href="/fan-club">
                    <Button variant="outline">Join Fan Club</Button>
                  </Link>
                  <Link href="/dao">
                    <Button variant="outline">DAO Governance</Button>
                  </Link>
                </div>
              </Card>
            </section>

            {/* Trending Now */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Trending Now</h2>
                <Link href="/discover">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>

              {trendingLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="music-card animate-pulse flex items-center space-x-4">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.isArray(trending) && trending.slice(0, 4).map((song: any, index: number) => (
                    <div
                      key={song._id}
                      className="music-card group cursor-pointer flex items-center space-x-4"
                      onClick={() => handlePlaySong(song)}
                      data-testid={`trending-song-${index}`}
                    >
                      <div className="relative">
                        <img
                          src={song.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                          alt={song.title}
                          className="w-12 h-12 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentSong?._id === song._id && isPlaying) {
                                pause();
                              } else {
                                play(song);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            {currentSong?._id === song._id && isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-primary">#{index + 1}</span>
                          <div>
                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                              {song.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">{song.artistName || "Artist Name"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          {song.plays?.toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  )) || (
                    <Card className="col-span-full text-center py-12">
                      <CardContent>
                        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No trending songs yet</h3>
                        <p className="text-muted-foreground">
                          Check back later for trending music
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Modals for sidebar quick actions */}
      <Dialog open={showCreateEventModal} onOpenChange={setShowCreateEventModal}>
        <DialogContent className="max-w-lg max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Set up a new event for your fans</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <CreateEventForm
              onSubmit={(data) => {
                // Handle form submission here or redirect to creator dashboard
                setLocation("/creator?tab=events");
                setShowCreateEventModal(false);
              }}
              onCancel={() => setShowCreateEventModal(false)}
              isLoading={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddMerchModal} onOpenChange={setShowAddMerchModal}>
        <DialogContent className="max-w-lg max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Merchandise</DialogTitle>
            <DialogDescription>Add a new product to your store</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <MerchForm
              onSubmit={(data) => {
                // Handle form submission here or redirect to creator dashboard
                setLocation("/creator?tab=merch");
                setShowAddMerchModal(false);
              }}
              onCancel={() => setShowAddMerchModal(false)}
              isLoading={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
