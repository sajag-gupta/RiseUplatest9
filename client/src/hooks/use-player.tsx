import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Song, MusicPlayerState } from "@/types";

// Analytics tracking function
const trackAnalytics = async (userId: string, action: string, metadata: any = {}) => {
  try {
    await apiRequest("POST", "/api/analytics/track", {
      userId,
      action,
      context: "player",
      metadata
    });
  } catch (error) {
    console.error("Analytics tracking failed:", error);
  }
};

interface PlayerContextType extends MusicPlayerState {
  play: (song?: Song) => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (songs: Song[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setCurrentTime: (time: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [progress, setProgress] = useState<number>(0);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTimeState] = useState<number>(0);
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]);

  // Refs to access current values in event handlers
  const repeatRef = useRef(repeat);
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const lastCurrentSongRef = useRef<Song | null>(null);

  // Update refs when state changes
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    // Audio event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime || 0;
      const duration = audio.duration || 0;
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

      setCurrentTimeState(currentTime);
      setProgress(progress);
    };

    const handleEnded = () => {
      const currentRepeat = repeatRef.current;
      const currentQueue = queueRef.current;
      const currentIdx = currentIndexRef.current;

      if (currentRepeat === "one") {
        // Repeat current song
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
        return;
      }

      // Auto-advance to next song
      if (currentQueue.length > 0) {
        let nextIndex = currentIdx + 1;

        if (nextIndex >= currentQueue.length) {
          if (currentRepeat === "all") {
            nextIndex = 0; // Loop back to start
          } else {
            // End of queue
            setIsPlaying(false);
            setProgress(0);
            setCurrentTimeState(0);
            return;
          }
        }

        const nextSong = currentQueue[nextIndex];
        setCurrentIndex(nextIndex);
        setCurrentSong(nextSong);
        // Audio will auto-play due to useEffect below
      } else {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTimeState(0);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Load saved state
    const savedQueue = localStorage.getItem(STORAGE_KEYS.PLAYER_QUEUE);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.PLAYER_SETTINGS);

    if (savedQueue) {
      try {
        const parsedQueue = JSON.parse(savedQueue);
        setQueue(parsedQueue);
        setOriginalQueue(parsedQueue);
      } catch (error) {
        console.error('Failed to load saved queue:', error);
      }
    }

    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setVolumeState(settings.volume || 0.8);
        setShuffle(settings.shuffle || false);
        setRepeat(settings.repeat || 'none');
        if (audioRef.current) {
          audioRef.current.volume = settings.volume || 0.8;
        }
      } catch (error) {
        console.error('Failed to load saved settings:', error);
      }
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLAYER_QUEUE, JSON.stringify(queue));
    localStorage.setItem(STORAGE_KEYS.PLAYER_SETTINGS, JSON.stringify({
      volume: volume,
      shuffle: shuffle,
      repeat: repeat,
    }));
  }, [queue, volume, shuffle, repeat]);

  // Effect to play the song when currentSong or currentIndex changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      const audio = audioRef.current;
      const shouldSetSrc = lastCurrentSongRef.current?._id !== currentSong._id;
      if (shouldSetSrc) {
        audio.src = currentSong.fileUrl;
        audio.load();
        lastCurrentSongRef.current = currentSong;

        // Track song play analytics
        if (user) {
          trackAnalytics(user._id, "play", {
            songId: currentSong._id,
            songTitle: currentSong.title,
            artistId: currentSong.artistId
          });
        }
      }
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        toast({
          title: "Playback Error",
          description: "Failed to play this track. Please check your internet connection.",
          variant: "destructive"
        });
      });
      setIsPlaying(true);
    }
  }, [currentSong, currentIndex, user]);

  const play = (song?: Song) => {
    if (song) {
      // Validate song has required fields
      if (!song.fileUrl) {
        console.error('Song missing fileUrl:', song);
        toast({
          title: "Playback Error",
          description: "This song cannot be played - missing audio file.",
          variant: "destructive"
        });
        return;
      }

      // Find song in current queue or add it
      const songIndex = queue.findIndex(q => q._id === song._id);
      if (songIndex !== -1) {
        setCurrentIndex(songIndex);
        setCurrentSong(song);
      } else {
        // Add to queue and set as current
        setQueue(prev => {
          const newQueue = [...prev, song];
          setCurrentIndex(newQueue.length - 1);
          return newQueue;
        });
        setCurrentSong(song);
      }
    } else if (currentSong && audioRef.current) {
      // Resume current song if no new song is provided
      try {
        audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to resume audio:', error);
        toast({
          title: "Playback Error",
          description: "Failed to resume playback.",
          variant: "destructive"
        });
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);

    // Track pause analytics
    if (user && currentSong) {
      trackAnalytics(user._id, "pause", {
        songId: currentSong._id,
        currentTime: currentTime
      });
    }
  };

  const stop = () => {
    setCurrentSong(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTimeState(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
  };

  const next = () => {
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;

    // Handle repeat modes
    if (repeat === "one") {
      // Stay on current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (nextIndex >= queue.length) {
      if (repeat === "all") {
        nextIndex = 0; // Loop back to start
      } else {
        // End of queue, stop playback
        stop();
        return;
      }
    }

    const nextSong = queue[nextIndex];
    setCurrentIndex(nextIndex);
    setCurrentSong(nextSong);
  };

  const previous = () => {
    if (queue.length === 0) return;

    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      if (repeat === "all") {
        prevIndex = queue.length - 1; // Loop to end
      } else {
        prevIndex = 0; // Stay at first song
      }
    }

    const prevSong = queue[prevIndex];
    setCurrentIndex(prevIndex);
    setCurrentSong(prevSong);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTimeState(time);
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setVolumeState(volume);
    }
  };

  const addToQueue = (songs: Song[]) => {
    setQueue(prev => {
      const newQueue = [...prev];
      songs.forEach(song => {
        if (!newQueue.find(q => q._id === song._id)) {
          newQueue.push(song);
        }
      });
      return newQueue;
    });

    toast({
      title: "Added to queue",
      description: `${songs.length} song(s) added to queue`
    });

    // Track add to queue analytics
    if (user) {
      trackAnalytics(user._id, "add_to_playlist", {
        songsAdded: songs.length,
        totalQueueLength: queue.length + songs.length
      });
    }
  };

  const removeFromQueue = (index: number) => {
    setQueue(prevQueue => {
      const newQueue = prevQueue.filter((_, i) => i !== index);
      // Adjust currentIndex if the removed song was before the current song
      if (index < currentIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (index === currentIndex && newQueue.length > 0) {
        // If the current song is removed, play the next one if available
        const nextIndex = currentIndex < newQueue.length ? currentIndex : 0;
        setCurrentIndex(nextIndex);
        setCurrentSong(newQueue[nextIndex]);
      } else if (newQueue.length === 0) {
        stop();
      }
      return newQueue;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(0);
    stop();
  };

  const toggleShuffle = () => {
    const newShuffle = !shuffle;
    setShuffle(newShuffle);

    if (newShuffle) {
      // Save original queue order
      setOriginalQueue([...queue]);

      // Create shuffled queue
      const shuffled = [...queue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setQueue(shuffled);
    } else {
      // Restore original queue order
      if (originalQueue.length > 0) {
        setQueue(originalQueue);
        // Find current song position in original queue
        if (currentSong) {
          const newIndex = originalQueue.findIndex(s => s._id === currentSong._id);
          if (newIndex !== -1) {
            setCurrentIndex(newIndex);
          }
        }
      }
    }
  };

  const toggleRepeat = () => {
    setRepeat(prevRepeat => {
      if (prevRepeat === 'none') return 'one';
      if (prevRepeat === 'one') return 'all';
      return 'none';
    });
  };

  const setCurrentTime = (time: number) => {
    setCurrentTimeState(time);
  };

  const contextValue: PlayerContextType = {
    currentSong,
    isPlaying,
    volume,
    progress,
    currentTime,
    duration,
    queue,
    shuffle,
    repeat,
    currentIndex,
    play,
    pause,
    stop,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setCurrentTime,
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextType {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
