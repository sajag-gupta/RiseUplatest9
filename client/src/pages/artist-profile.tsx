import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Play, Heart, Share2, UserPlus, Calendar, ShoppingBag, FileText, Users, Music, MapPin, Clock, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePlayer } from "@/hooks/use-player";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";
import BannerAd from "@/components/ads/banner-ad";

export default function ArtistProfile() {
  const [, params] = useRoute("/artist/:id");
  const artistId = params?.id;
  const [activeTab, setActiveTab] = useState("music");
  const { user } = useAuth();
  const { play, addToQueue } = usePlayer();
  const queryClient = useQueryClient();
  const setLocation = useLocation()[1];

  // Fetch artist profile data
  const { data: artist, isLoading: artistLoading, error: artistError } = useQuery({
    queryKey: [`/api/artists/${artistId}`],
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000,
  });

  // Track profile view when artist data loads
  useEffect(() => {
    if (user && artist && artistId) {
      fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({
          artistId: artistId,
          action: "view",
          context: "profile",
          metadata: {
            device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            referrer: document.referrer
          }
        })
      }).catch(console.error);
    }
  }, [user, artist, artistId]);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/follow/${artistId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to follow artist');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/artists/${artistId}`] });
      toast({
        title: "Success",
        description: "Artist followed successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to follow artist",
        variant: "destructive"
      });
    }
  });

  if (artistLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading artist profile..." />
      </div>
    );
  }

  if (artistError || !artist) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center p-8">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Artist Not Found</h2>
            <p className="text-muted-foreground">The artist you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFollowing = user?.following?.includes(artistId || '');
  const isSubscribed = false; // TODO: Implement subscription check when available

  const handlePlaySong = (song: any) => {
    if ((artist as any).songs) {
      addToQueue((artist as any).songs);
    }
    play(song);

    // Track song play from artist profile
    if (user) {
      fetch(`/api/songs/${song._id}/play`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      }).catch(console.error);

      // Track analytics
      fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({
          songId: song._id,
          artistId: artistId,
          action: "play",
          context: "profile",
          metadata: {
            device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
          }
        })
      }).catch(console.error);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    const artistData = artist as any;
    if (navigator.share) {
      navigator.share({
        title: `${artistData.name} - Rise Up Creators`,
        text: `Check out ${artistData.name} on Rise Up Creators`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Profile link copied to clipboard"
      });
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-24">
      {/* Hero Section */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={(artist as any).avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(artist as any).email || (artist as any).name}`}
          alt="Artist cover"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${(artist as any).email || (artist as any).name}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container-custom flex items-end space-x-6">
            <Avatar className="w-32 h-32 border-4 border-white">
              <AvatarImage src={(artist as any).avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(artist as any).email || (artist as any).name}`} />
              <AvatarFallback className="text-2xl">{(artist as any).name?.charAt(0) || 'A'}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-4xl font-bold text-white">{(artist as any).name || 'Artist'}</h1>
                {(artist as any).artist?.verified && (
                  <Badge className="bg-success text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {(artist as any).artist?.featured && (
                  <Badge className="bg-primary text-white">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-white/80 mb-4">{(artist as any).artist?.bio || 'Music Artist'}</p>

              {/* Social Links */}
              {(artist as any).artist?.socialLinks && (
                <div className="flex items-center space-x-4 mb-4">
                  {(artist as any).artist.socialLinks.website && (
                    <a
                      href={(artist as any).artist.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      🌐 Website
                    </a>
                  )}
                  {(artist as any).artist.socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${(artist as any).artist.socialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      📷 Instagram
                    </a>
                  )}
                  {(artist as any).artist.socialLinks.youtube && (
                    <a
                      href={(artist as any).artist.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      📺 YouTube
                    </a>
                  )}
                  {(artist as any).artist.socialLinks.x && (
                    <a
                      href={`https://twitter.com/${(artist as any).artist.socialLinks.x.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      🐦 X/Twitter
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-6 text-white/60 text-sm mb-4">
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {(artist as any).followers?.length || 0} followers
                </span>
                <span className="flex items-center">
                  <Music className="w-4 h-4 mr-1" />
                  {(artist as any).songs?.length || 0} songs
                </span>
                <span className="flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  {(artist as any).totalLikes || 0} likes
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  size="lg"
                  className="gradient-primary hover:opacity-90"
                  onClick={() => (artist as any).songs?.[0] && handlePlaySong((artist as any).songs[0])}
                  disabled={!(artist as any).songs?.length}
                  data-testid="play-artist-songs"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play
                </Button>

                {user && (
                  <Button 
                    variant="outline"
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    className="border-white text-white hover:bg-white hover:text-black"
                    data-testid="follow-artist-button"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}

                <Button 
                  variant="outline"
                  onClick={handleShare}
                  className="border-white text-white hover:bg-white hover:text-black"
                  data-testid="share-artist-button"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Ad - Only show for FREE users */}
      {user?.plan?.type === "FREE" && (
        <div className="flex justify-center py-8">
          <BannerAd
            placement="ARTIST_PROFILE"
            size="728x90"
            className="max-w-2xl"
          />
        </div>
      )}

      {/* Content Tabs */}
      <div className="container-custom py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="music" data-testid="music-tab">
              <Music className="w-4 h-4 mr-2" />
              Music
            </TabsTrigger>
            <TabsTrigger value="blogs" data-testid="blogs-tab">
              <FileText className="w-4 h-4 mr-2" />
              Blogs
            </TabsTrigger>
            <TabsTrigger value="merch" data-testid="merch-tab">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Merch
            </TabsTrigger>
            <TabsTrigger value="events" data-testid="events-tab">
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
          </TabsList>

          {/* Music Tab */}
          <TabsContent value="music">
            {(artist as any).songs && (artist as any).songs.length > 0 ? (
              <div className="space-y-4">
                {(artist as any).songs.map((song: any, index: number) => (
                  <div 
                    key={song._id}
                    className="music-card group cursor-pointer flex items-center space-x-4 p-4"
                    onClick={() => handlePlaySong(song)}
                    data-testid={`artist-song-${index}`}
                  >
                    <div className="relative">
                      <img
                        src={song.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100"}
                        alt={song.title}
                        className="w-16 h-16 rounded-lg object-cover shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100";
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/song/${song._id}`);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        {song.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">{song.genre}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {song.plays?.toLocaleString() || 0} plays
                        </span>
                        {song.visibility === 'SUBSCRIBER_ONLY' && (
                          <Badge variant="secondary" className="text-xs">Subscribers Only</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {Math.floor((song.durationSec || 0) / 60)}:{((song.durationSec || 0) % 60).toString().padStart(2, '0')}
                      </span>
                      <Button variant="ghost" size="icon">
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No songs available</h3>
                  <p className="text-muted-foreground">This artist hasn't uploaded any songs yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Blogs Tab */}
          <TabsContent value="blogs">
            {(artist as any).blogs && (artist as any).blogs.length > 0 ? (
              <div className="space-y-6">
                {(artist as any).blogs.map((blog: any, index: number) => (
                  <Card key={blog._id} data-testid={`artist-blog-${index}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-xl">{blog.title}</h3>
                            {blog.visibility === "SUBSCRIBER_ONLY" && (
                              <Badge variant="secondary" className="text-xs">
                                Subscribers Only
                              </Badge>
                            )}
                          </div>
                          <div className="prose prose-sm max-w-none mb-4">
                            <p className="text-muted-foreground line-clamp-3">
                              {blog.content.replace(/[#*>]/g, '').substring(0, 200)}...
                            </p>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>
                              {new Date(blog.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                            {blog.tags && blog.tags.length > 0 && (
                              <div className="flex items-center space-x-1">
                                {blog.tags.slice(0, 3).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {blog.images && blog.images.length > 0 && (
                          <div className="ml-6">
                            <img
                              src={blog.images[0]}
                              alt={blog.title}
                              className="w-24 h-24 rounded-lg object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation(`/blogs/${blog._id}`)}
                        >
                          Read More
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No blogs available</h3>
                  <p className="text-muted-foreground">This artist hasn't published any blogs yet.</p>
                  {!isSubscribed && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Subscribe to access exclusive content when available.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Merch Tab */}
          <TabsContent value="merch">
            {(artist as any).merch && (artist as any).merch.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(artist as any).merch.map((item: any, index: number) => (
                  <div 
                    key={item._id}
                    className="merch-card group"
                    data-testid={`artist-merch-${index}`}
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                      <img 
                        src={item.images?.[0] || "https://images.unsplash.com/photo-1521572163474-686449cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                    <h4 className="font-semibold mb-1 truncate">{item.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">₹{item.price}</span>
                      <Button size="sm" className="bg-primary hover:bg-primary/80">
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No merchandise available</h3>
                  <p className="text-muted-foreground">This artist hasn't listed any merchandise yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            {(artist as any).events && (artist as any).events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(artist as any).events.map((event: any, index: number) => (
                  <div 
                    key={event._id}
                    className="event-card group"
                    data-testid={`artist-event-${index}`}
                  >
                    <div className="relative h-48 rounded-t-2xl overflow-hidden">
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=100&h=100";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-muted-foreground opacity-50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <Badge className="absolute top-4 right-4 bg-primary text-white">
                        {new Date(event.date) > new Date() ? 'UPCOMING' : 'PAST'}
                      </Badge>
                    </div>

                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                            {event.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                            {event.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-primary">
                            {new Date(event.date).getDate()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2" />
                          {event.location}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          {new Date(event.date).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-primary">₹{event.ticketPrice}</span>
                          <span className="text-sm text-muted-foreground ml-1">onwards</span>
                        </div>
                        <Button 
                          className="bg-primary hover:bg-primary/80 text-white"
                          disabled={new Date(event.date) < new Date()}
                        >
                          {new Date(event.date) > new Date() ? 'Get Tickets' : 'Past Event'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No events scheduled</h3>
                  <p className="text-muted-foreground">This artist hasn't scheduled any events yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
