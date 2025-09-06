import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, List, Heart, Share2, X, Plus, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlayer } from "@/hooks/use-player";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import AudioAd from "@/components/ads/audio-ad";

// Analytics tracking helper
const trackAnalytics = async (action: string, data: any = {}) => {
  try {
    const user = JSON.parse(localStorage.getItem('ruc_user_data') || '{}');
    if (!user._id) return;

    await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
      },
      body: JSON.stringify({
        userId: user._id,
        action,
        context: 'music_player',
        metadata: {
          ...data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      })
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

export default function MusicPlayer() {
  const [, navigate] = useLocation();
  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [currentAd, setCurrentAd] = useState<any>(null);
  const [showAd, setShowAd] = useState(false);
  const [pendingSong, setPendingSong] = useState<any>(null);
  const [playTime, setPlayTime] = useState(0);
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    currentTime,
    duration,
    queue,
    shuffle,
    repeat,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    stop,
    removeFromQueue,
  } = usePlayer();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user playlists
  const { data: playlists } = useQuery({
    queryKey: ["/api/playlists/mine"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user favorites to check if current song is liked
  const { data: favorites } = useQuery({
    queryKey: ["/api/users/me/favorites"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // Check if current song is liked
  const isCurrentSongLiked = currentSong && favorites && Array.isArray(favorites) && favorites.some((song: any) => song._id === currentSong._id);

  // Check if user is premium (skip ads for premium users)
  const isPremiumUser = user?.plan?.type === "PREMIUM";

  // Track play time for mid-roll ads
  useEffect(() => {
    if (isPlaying && !showAd && !isPremiumUser) {
      const interval = setInterval(() => {
        setPlayTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, showAd, isPremiumUser]);

  // Check for mid-roll ads (every 5 minutes)
  useEffect(() => {
    if (playTime > 0 && playTime % 300 === 0 && !showAd && !isPremiumUser) {
      checkForMidRollAd();
    }
  }, [playTime, showAd, isPremiumUser]);

  // Fetch ads for audio
  const { data: audioAds } = useQuery<any[]>({
    queryKey: ["/api/ads/for-user", { type: "PRE_ROLL" }],
    enabled: !!user && !isPremiumUser,
    staleTime: 5 * 60 * 1000,
  });

  const checkForMidRollAd = async () => {
    try {
      const response = await fetch("/api/ads/for-user?type=MID_ROLL", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (response.ok) {
        const ads = await response.json();
        if (ads && ads.length > 0) {
          setCurrentAd(ads[0]);
          setShowAd(true);
          pause(); // Pause the music while ad plays
        }
      }
    } catch (error) {
      console.error('Error checking for mid-roll ad:', error);
    }
  };

  const handleAdComplete = () => {
    setShowAd(false);
    setCurrentAd(null);
    if (pendingSong) {
      play(pendingSong);
      setPendingSong(null);
    } else {
      play(); // Resume current song
    }
  };

  const handleAdSkip = () => {
    setShowAd(false);
    setCurrentAd(null);
    if (pendingSong) {
      play(pendingSong);
      setPendingSong(null);
    } else {
      play(); // Resume current song
    }
  };

  // Override play function to check for pre-roll ads
  const handlePlay = (song?: any) => {
    if (isPremiumUser) {
      play(song);
      return;
    }

    // Check for pre-roll ad
    if (audioAds && audioAds.length > 0 && !song) {
      // This is resuming current song, check if we need pre-roll
      const hasPlayedBefore = localStorage.getItem(`played_${currentSong?._id}`);
      if (!hasPlayedBefore) {
        setCurrentAd(audioAds[0]);
        setShowAd(true);
        setPendingSong(song);
        localStorage.setItem(`played_${currentSong?._id}`, 'true');
        return;
      }
    }

    play(song);
  };

  // Create new playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ name, songs: [currentSong?._id] })
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

  // Add to existing playlist mutation
  const addToPlaylistMutation = useMutation({
    mutationFn: async (playlistName: string) => {
      const response = await fetch("/api/playlists/add-song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ playlistName, songId: currentSong?._id })
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
    }
  });

  if (!currentSong) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    seek(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const handleLike = async () => {
    if (!user || !currentSong) return;

    try {
      const response = await fetch(`/api/songs/${currentSong._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });

      if (response.ok) {
        const { liked } = await response.json();
        toast({
          title: liked ? "Added to favorites" : "Removed from favorites",
          description: liked ? "Song added to your favorites" : "Song removed from your favorites"
        });
        // Invalidate favorites query to update UI
        queryClient.invalidateQueries({ queryKey: ["/api/users/me/favorites"] });

        // Track analytics
        trackAnalytics(liked ? 'like' : 'unlike', {
          songId: currentSong._id,
          songTitle: currentSong.title,
          artistId: currentSong.artistId,
          liked
        });
      }
    } catch (error) {
      console.error('Failed to like song:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share && currentSong) {
      navigator.share({
        title: currentSong.title,
        text: `Check out "${currentSong.title}" on Rise Up Creators`,
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast({
        title: "Link copied",
        description: "Song link copied to clipboard"
      });
    }

    // Track analytics
    trackAnalytics('share', {
      songId: currentSong._id,
      songTitle: currentSong.title,
      artistId: currentSong.artistId,
      shareMethod: typeof navigator.share === 'function' ? 'native' : 'clipboard'
    });
  };

  return (
    <>
      {/* Audio Ad Overlay */}
      {showAd && currentAd && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AudioAd
              adId={currentAd._id}
              onComplete={handleAdComplete}
              onSkip={handleAdSkip}
              canSkip={false} // Pre-roll ads typically can't be skipped
            />
          </div>
        </div>
      )}

      {/* Main Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-effect border-t border-border p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between gap-4">

            {/* Currently Playing */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* Song Artwork */}
              <div
                className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/song/${currentSong._id}`)}
              >
                <img
                  src={currentSong.artworkUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                  }}
                />
              </div>

              {/* Song Details */}
              <div className="min-w-0 flex-1">
                <h4
                  className="text-sm font-semibold truncate hover:text-primary transition-colors"
                  data-testid="current-song-title"
                >
                  {currentSong.title}
                </h4>
                <p
                  className="text-xs text-muted-foreground truncate"
                  data-testid="current-song-artist"
                >
                  {currentSong.artistName || "Unknown Artist"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={handleLike}
                  data-testid="like-current-song"
                >
                  <Heart
                    className={`w-4 h-4 ${isCurrentSongLiked ? "fill-primary text-primary" : ""
                      }`}
                  />
                </Button>

                {/* Share Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={handleShare}
                  data-testid="share-current-song"
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                {/* Add to Playlist */}
                {user && (
                  <Dialog open={showAddToPlaylist} onOpenChange={setShowAddToPlaylist}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        data-testid="add-to-playlist-button"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
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

                        {/* Create New Playlist */}
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
                              disabled={
                                !newPlaylistName.trim() || createPlaylistMutation.isPending
                              }
                              size="sm"
                            >
                              Create
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Close Player */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => stop()}
                  data-testid="close-player"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex flex-col items-center flex-1 max-w-md">
              <div className="flex items-center space-x-2 mb-2">
                {/* Shuffle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={toggleShuffle}
                  data-testid="shuffle-button"
                >
                  <Shuffle
                    className={`w-4 h-4 ${shuffle ? "text-primary" : "text-muted-foreground"
                      }`}
                  />
                </Button>

                {/* Previous */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={previous}
                  data-testid="previous-button"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                {/* Play/Pause */}
                <Button
                  className="w-10 h-10 rounded-full gradient-primary hover:opacity-90"
                  onClick={() => {
                    if (isPlaying) {
                      pause();
                      trackAnalytics('pause', {
                        songId: currentSong._id,
                        songTitle: currentSong.title,
                        artistId: currentSong.artistId,
                        currentTime,
                        duration
                      });
                    } else {
                      play();
                      trackAnalytics('play', {
                        songId: currentSong._id,
                        songTitle: currentSong.title,
                        artistId: currentSong.artistId,
                        duration
                      });
                    }
                  }}
                  data-testid="play-pause-button"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </Button>

                {/* Next */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={next}
                  data-testid="next-button"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                {/* Repeat */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 relative"
                  onClick={toggleRepeat}
                  data-testid="repeat-button"
                >
                  <Repeat
                    className={`w-4 h-4 ${repeat !== "none" ? "text-primary" : "text-muted-foreground"
                      }`}
                  />
                  {repeat === "one" && (
                    <span className="absolute -top-1 -right-1 text-xs text-primary">1</span>
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center space-x-2 w-full text-xs text-muted-foreground">
                <span data-testid="current-time">{formatTime(currentTime)}</span>
                <Slider
                  value={[progress]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="flex-1"
                  data-testid="progress-slider"
                />
                <span data-testid="duration">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume & Queue */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
              {/* Volume Control */}
              <div className="hidden md:flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20"
                  data-testid="volume-slider"
                />
              </div>

              {/* Queue Popover */}
              <Popover open={showQueue} onOpenChange={setShowQueue}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    data-testid="queue-button"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <Card className="border-0">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-semibold">Queue</h3>
                      <p className="text-sm text-muted-foreground">{queue.length} songs</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {queue.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No songs in queue
                        </div>
                      ) : (
                        queue.map((song, index) => (
                          <div
                            key={song._id}
                            className={`p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0 ${song._id === currentSong._id ? "bg-primary/10" : ""
                              }`}
                            onClick={() => play(song)}
                            data-testid={`queue-item-${index}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <img
                                  src={song.artworkUrl}
                                  alt={song.title}
                                  className="w-8 h-8 rounded object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100";
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{song.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {song.artistName || "Artist"}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromQueue(index);
                                  toast({
                                    title: "Removed from queue",
                                    description: "Song removed from queue",
                                  });
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
