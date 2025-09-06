import { useState, useEffect } from "react";
import { Search, Filter, TrendingUp, Users, Music, Calendar, Heart, Play, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePlayer } from "@/hooks/use-player";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";
import { MUSIC_GENRES } from "@/lib/constants";
import BannerAd from "@/components/ads/banner-ad";

export default function Discover() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [sortBy, setSortBy] = useState("popular");
  const { user } = useAuth();
  const { play, addToQueue } = usePlayer();
  const queryClient = useQueryClient();

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ type, id, quantity = 1 }: { type: 'merch' | 'event'; id: string; quantity?: number }) => {
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ type, id, quantity })
      });
      if (!response.ok) throw new Error("Failed to add to cart");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: "Item added to your cart successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  });

  // Get query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
    }
  }, [location]);

  // Fetch discover data
  const { data: trendingSongs = [], isLoading: trendingLoading } = useQuery({
    queryKey: ["/api/songs/trending"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredArtists = [], isLoading: artistsLoading } = useQuery({
    queryKey: ["/api/artists/featured"],
    staleTime: 5 * 60 * 1000,
  });

  // Type assertions for proper typing
  const trendingSongsArray = (trendingSongs as any[]) || [];
  const featuredArtistsArray = (featuredArtists as any[]) || [];

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/songs/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/songs/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!searchQuery,
    staleTime: 30 * 1000,
  });

  const { data: allSongs = [], isLoading: allSongsLoading } = useQuery({
    queryKey: ["/api/songs"],
    enabled: !searchQuery,
    staleTime: 2 * 60 * 1000,
  });

  const { data: allArtists = [], isLoading: allArtistsLoading } = useQuery({
    queryKey: ["/api/artists"],
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/discover?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
  };

  const handlePlaySong = (song: any) => {
    play(song);
  };

  const isLoading = searchQuery ? searchLoading : allSongsLoading;
  const songs = searchQuery ? searchResults : allSongs;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-custom py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Discover Music</h1>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for songs, artists, albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border rounded-2xl"
                  data-testid="search-input"
                />
              </div>
            </form>

            <div className="flex gap-2">
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-40" data-testid="genre-filter">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-genres">All Genres</SelectItem>
                  {MUSIC_GENRES.map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40" data-testid="sort-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Banner Ad - Only show for FREE users */}
        {user?.plan?.type === "FREE" && (
          <div className="flex justify-center mb-8">
            <BannerAd
              placement="DISCOVER"
              size="728x90"
              className="max-w-2xl"
            />
          </div>
        )}

        <Tabs defaultValue="songs" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="songs" data-testid="songs-tab">Songs</TabsTrigger>
            <TabsTrigger value="artists" data-testid="artists-tab">Artists</TabsTrigger>
            <TabsTrigger value="trending" data-testid="trending-tab">Trending</TabsTrigger>
            <TabsTrigger value="genres" data-testid="genres-tab">Genres</TabsTrigger>
          </TabsList>

          {/* Songs Tab */}
          <TabsContent value="songs" className="mt-8">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-2xl mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : songs && songs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {songs.map((song: any, index: number) => (
                  <div
                    key={song._id}
                    className="music-card group cursor-pointer"
                    data-testid={`song-card-${index}`}
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 hover-glow">
                      <img
                        src={song.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300"}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="icon"
                          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/80 mr-2"
                          onClick={() => handlePlaySong(song)}
                          data-testid="play-song-button"
                        >
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="w-10 h-10 rounded-full"
                          onClick={() => addToQueue([song])}
                          data-testid="add-to-queue-button"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {song.visibility === 'SUBSCRIBER_ONLY' && (
                        <Badge className="absolute top-2 left-2 bg-secondary text-white">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        {song.title}
                      </h4>
                      <p 
                        className="text-sm text-muted-foreground truncate hover:text-primary cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/artist/${song.artistId}`);
                        }}
                      >
                        {song.artistName || "Unknown Artist"}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{song.genre}</span>
                        <span>{song.plays?.toLocaleString() || 0} plays</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? "No songs found" : "No songs available"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? `No songs match your search for "${searchQuery}"` 
                      : "Try adjusting your filters or check back later."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Artists Tab */}
          <TabsContent value="artists" className="mt-8">
            {artistsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-full h-48 bg-muted rounded-2xl mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : featuredArtistsArray && featuredArtistsArray.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredArtistsArray.map((artist: any, index: number) => (
                  <div
                    key={artist._id}
                    className="artist-card group cursor-pointer"
                    onClick={() => setLocation(`/artist/${artist._id}`)}
                    data-testid={`artist-card-${index}`}
                  >
                    <div className="relative mb-4">
                      <img
                        src={artist.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${artist.email || artist.name}`}
                        alt={`${artist.name} avatar`}
                        className="w-full h-48 object-cover rounded-2xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${artist.email || artist.name}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl"></div>
                      <div className="absolute bottom-4 left-4">
                        <h3 className="text-xl font-bold text-white">
                          {artist.name || 'Artist'}
                        </h3>
                        <p className="text-white/80">
                          {artist.artist?.bio ? artist.artist.bio.substring(0, 50) + '...' : 'Music Artist'}
                        </p>
                      </div>
                      {artist.artist?.verified && (
                        <Badge className="absolute top-4 right-4 bg-success text-white">
                          Verified
                        </Badge>
                      )}
                      {artist.artist?.featured && (
                        <Badge className="absolute top-4 left-4 bg-primary text-white">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <Users className="w-4 h-4 inline mr-1" />
                        {artist.artist?.followers?.length || 0} followers
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Music className="w-4 h-4 inline mr-1" />
                        {artist.songsCount || 0} songs
                      </div>
                      <Button size="sm" className="bg-primary hover:bg-primary/80 text-white">
                        Follow
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No artists found</h3>
                  <p className="text-muted-foreground">Check back later for featured artists.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="mt-8">
            {trendingLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 animate-pulse">
                    <div className="w-16 h-16 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : trendingSongsArray && trendingSongsArray.length > 0 ? (
              <div className="space-y-4">
                {trendingSongsArray.map((song: any, index: number) => (
                  <div
                    key={song._id}
                    className="music-card group flex items-center space-x-4 p-4 cursor-pointer"
                    onClick={() => handlePlaySong(song)}
                    data-testid={`trending-song-${index}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-primary w-8">
                        #{index + 1}
                      </div>
                      <img
                        src={song.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                        alt={song.title}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                        }}
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        {song.title}
                      </h4>
                      <p 
                        className="text-sm text-muted-foreground truncate hover:text-primary cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/artist/${song.artistId}`);
                        }}
                      >
                        {song.artistName || "Unknown Artist"}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          {song.plays?.toLocaleString() || 0} plays
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No trending songs</h3>
                  <p className="text-muted-foreground">Check back later for trending music.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Genres Tab */}
          <TabsContent value="genres" className="mt-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {MUSIC_GENRES.map((genre, index) => (
                <Card 
                  key={genre}
                  className="cursor-pointer hover-glow"
                  onClick={() => {
                    setSelectedGenre(genre);
                    setLocation('/discover');
                  }}
                  data-testid={`genre-card-${index}`}
                >
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className={`w-16 h-16 rounded-full gradient-primary mb-4 flex items-center justify-center`}>
                      <Music className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold">{genre}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
