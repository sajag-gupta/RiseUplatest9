
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Play, Pause, Heart, Share2, Plus, Download, ChevronLeft, Music, User, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePlayer } from "@/hooks/use-player";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";

export default function SongDetails() {
  const [location, navigate] = useLocation();
  const songId = location.split('/')[2]; // Extract from /song/:id
  const { user } = useAuth();
  const { play, pause, isPlaying, currentSong, addToQueue } = usePlayer();
  const queryClient = useQueryClient();
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const { data: song, isLoading } = useQuery({
    queryKey: ["/api/songs", songId],
    queryFn: async () => {
      const response = await fetch(`/api/songs/${songId}`);
      if (!response.ok) throw new Error("Failed to fetch song");
      const songData = await response.json();
      
      // Log analytics for song view
      if (user) {
        fetch("/api/analytics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
          },
          body: JSON.stringify({
            songId: songData._id,
            artistId: songData.artistId,
            action: "view",
            context: "song-details",
            metadata: { source: "direct" }
          })
        }).catch(console.error);
      }
      
      return songData;
    },
    enabled: !!songId,
  });

  const { data: artist } = useQuery({
    queryKey: ["/api/artists", song?.artistId],
    queryFn: async () => {
      const response = await fetch(`/api/artists/${song.artistId}`);
      if (!response.ok) throw new Error("Failed to fetch artist");
      return response.json();
    },
    enabled: !!song?.artistId,
  });

  const { data: relatedSongs } = useQuery({
    queryKey: ["/api/songs/related", songId],
    queryFn: async () => {
      const response = await fetch(`/api/songs?genre=${song?.genre}&limit=5`);
      if (!response.ok) return [];
      const songs = await response.json();
      return songs.filter((s: any) => s._id !== songId);
    },
    enabled: !!song?.genre,
  });

  const { data: playlists } = useQuery({
    queryKey: ["/api/playlists/mine"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: favorites } = useQuery<any>({
    queryKey: ["/api/users/me/favorites"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const isCurrentSongPlaying = currentSong?._id === songId && isPlaying;
  const isCurrentSong = currentSong?._id === songId;
  const isFavorited = favorites?.songs?.some((s: any) => s._id === songId);

  const togglePlayMutation = useMutation({
    mutationFn: async () => {
      if (isCurrentSong) {
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else {
        play(song);
        
        // Log play analytics
        if (user) {
          try {
            await fetch(`/api/songs/${songId}/play`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
              }
            });
          } catch (error) {
            console.error("Failed to log play:", error);
          }
        }
      }
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/songs/${songId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to toggle favorite");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.liked ? "Added to favorites" : "Removed from favorites",
        description: data.liked ? "Song added to your favorites" : "Song removed from favorites"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/favorites"] });
    }
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ name, songs: [songId] })
      });
      if (!response.ok) throw new Error("Failed to create playlist");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Playlist created",
        description: "Song added to new playlist"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists/mine"] });
      setShowAddToPlaylist(false);
      setNewPlaylistName("");
    }
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async (playlistName: string) => {
      const response = await fetch("/api/playlists/add-song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ playlistName, songId })
      });
      if (!response.ok) throw new Error("Failed to add to playlist");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to playlist",
        description: "Song added to playlist successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists/mine"] });
      setShowAddToPlaylist(false);
    }
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: song.title,
        text: `Check out "${song.title}" on Rise Up Creators`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Song link copied to clipboard"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0 || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading song details..." />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen pt-16 pb-24">
        <div className="container-custom py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Song not found</h3>
              <p className="text-muted-foreground">The song you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-custom py-8 max-w-6xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/discover")}
          className="mb-6 hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Music
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Song Header */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-80 h-80 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={song.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400"}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <Badge variant="secondary" className="mb-2">{song.genre}</Badge>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{song.title}</h1>
                  <p className="text-lg text-muted-foreground mb-4">
                    by <span className="text-primary font-semibold cursor-pointer hover:underline"
                           onClick={() => navigate(`/artist/${song.artistId}`)}>{song.artistName || "Unknown Artist"}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatDuration(song.durationSec || 0)}
                  </div>
                  <div className="flex items-center">
                    <Headphones className="w-4 h-4 mr-2" />
                    {(song.plays || 0).toLocaleString()} plays
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => togglePlayMutation.mutate()}
                    className="bg-primary hover:bg-primary/80 text-white"
                    size="lg"
                  >
                    {isCurrentSongPlaying ? (
                      <Pause className="w-5 h-5 mr-2" />
                    ) : (
                      <Play className="w-5 h-5 mr-2" />
                    )}
                    {isCurrentSongPlaying ? "Pause" : "Play"}
                  </Button>

                  {user && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => toggleFavoriteMutation.mutate()}
                        disabled={toggleFavoriteMutation.isPending}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
                        {isFavorited ? "Unfavorite" : "Favorite"}
                      </Button>

                      <Dialog open={showAddToPlaylist} onOpenChange={setShowAddToPlaylist}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Add to Playlist
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add to Playlist</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Select a playlist</Label>
                              {playlists && Array.isArray(playlists) && playlists.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {playlists.map((playlist: any) => (
                                    <Button
                                      key={playlist.name}
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => addToPlaylistMutation.mutate(playlist.name)}
                                      disabled={addToPlaylistMutation.isPending}
                                    >
                                      <Music className="w-4 h-4 mr-2" />
                                      <span className="truncate">{playlist.name}</span>
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {playlist.songs.length} songs
                                      </span>
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground py-4">
                                  No playlists yet. Create one below.
                                </p>
                              )}
                            </div>

                            <div className="space-y-3 border-t pt-4">
                              <Label htmlFor="playlist-name">Create new playlist</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="playlist-name"
                                  placeholder="Enter playlist name..."
                                  value={newPlaylistName}
                                  onChange={(e) => setNewPlaylistName(e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  onClick={() => createPlaylistMutation.mutate(newPlaylistName)}
                                  disabled={!newPlaylistName.trim() || createPlaylistMutation.isPending}
                                  size="sm"
                                >
                                  Create
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => addToQueue([song])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Queue
                  </Button>
                </div>
              </div>
            </div>

            {/* Artist Info */}
            {artist && (
              <Card>
                <CardHeader>
                  <CardTitle>About the Artist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-4">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${artist.email}`}
                      alt={artist.name}
                      className="w-16 h-16 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{artist.name}</h3>
                      <p className="text-muted-foreground mb-4">{artist.bio || "No bio available"}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                        <span>{artist.followers?.length || 0} followers</span>
                        <span>{artist.totalPlays?.toLocaleString() || 0} total plays</span>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/artist/${artist._id}`)}
                      >
                        <User className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Songs */}
            {relatedSongs && relatedSongs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>More Like This</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatedSongs.slice(0, 5).map((relatedSong: any, index: number) => (
                      <div 
                        key={relatedSong._id}
                        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/song/${relatedSong._id}`)}
                      >
                        <img 
                          src={relatedSong.artworkUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100"}
                          alt={relatedSong.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{relatedSong.title}</h4>
                          <p className="text-sm text-muted-foreground">{relatedSong.artistName || "Artist"}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDuration(relatedSong.durationSec || 0)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            play(relatedSong);
                          }}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Song Stats */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Song Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plays</span>
                    <span className="font-semibold">{song.plays?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Likes</span>
                    <span className="font-semibold">{song.likes?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-semibold">{formatDuration(song.durationSec || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Genre</span>
                    <Badge variant="secondary">{song.genre}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download/Purchase Options */}
            {song.visibility === "PUBLIC" && (
              <Card>
                <CardHeader>
                  <CardTitle>Download Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      High Quality (Premium)
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Upgrade to premium for high-quality downloads
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
