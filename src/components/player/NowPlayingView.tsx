import { usePlayerStore } from '@/store/playerStore';
import { albumCovers } from './AlbumCovers';
import { ChevronDown, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Repeat1, Music, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import MusicVisualizer from './MusicVisualizer';

const NowPlayingView = () => {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong, shuffle, toggleShuffle, repeat, cycleRepeat, setActiveView, currentTime } = usePlayerStore();
  const [duration, setDuration] = useState(0);

  // Poll duration from the global audio element
  useEffect(() => {
    const interval = setInterval(() => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null;
      // Use the global audio singleton
      if ((window as any).__bobEvanAudio) {
        const d = (window as any).__bobEvanAudio.duration;
        if (d && isFinite(d)) setDuration(d);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [currentSong]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (!duration) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    let angle = Math.atan2(x, -y); // angle from top
    if (angle < 0) angle += 2 * Math.PI;
    const pct = angle / (2 * Math.PI);
    const newTime = pct * duration;
    if ((window as any).__bobEvanAudio) {
      (window as any).__bobEvanAudio.currentTime = newTime;
    }
  }, [duration]);

  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-40 h-40 rounded-full bg-secondary flex items-center justify-center border-4 border-border">
          <Music className="w-16 h-16 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg">Not Playing</p>
        <div className="flex items-center gap-8 mt-6">
          <SkipBack className="w-6 h-6 text-muted-foreground" />
          <Play className="w-8 h-8 text-muted-foreground" />
          <SkipForward className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const currentMin = Math.floor(currentTime / 60);
  const currentSec = Math.floor(currentTime % 60);
  const totalMin = Math.floor(duration / 60);
  const totalSec = Math.floor(duration % 60);

  return (
    <div className="flex flex-col h-full items-center">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-5 pt-6 pb-4">
        <button onClick={() => setActiveView('library')}>
          <ChevronDown className="w-6 h-6 text-foreground" />
        </button>
        <Music className="w-6 h-6 text-primary" />
        <MoreVertical className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Vinyl disc */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <svg className="w-64 h-64 cursor-pointer" viewBox="0 0 200 200" onClick={handleSeek}>
            <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="100" cy="100" r="95"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray={`${progress * 5.97} ${597 - progress * 5.97}`}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              className="transition-all duration-200"
            />
          </svg>
          <motion.div
            className={`absolute inset-8 rounded-full overflow-hidden border-4 border-secondary shadow-2xl ${isPlaying ? 'vinyl-spin' : 'vinyl-spin-paused'}`}
          >
            <img
              src={albumCovers[currentSong.coverIndex]}
              alt={currentSong.album}
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-primary glow-red" />
          </div>
          <div
            className="absolute w-3 h-3 rounded-full bg-primary glow-red"
            style={{
              top: `${100 - 95 * Math.cos((progress / 100) * 2 * Math.PI - Math.PI / 2) - 6}px`,
              left: `${100 + 95 * Math.sin((progress / 100) * 2 * Math.PI - Math.PI / 2) - 6}px`,
              transform: 'translate(26px, 26px)',
            }}
          />
        </div>
      </div>

      {/* Time */}
      <div className="flex justify-between w-full px-10 text-xs text-muted-foreground mb-2">
        <span>{currentMin}:{currentSec.toString().padStart(2, '0')}</span>
        <span>{totalMin}:{totalSec.toString().padStart(2, '0')}</span>
      </div>

      {/* Controls row 1 */}
      <div className="flex items-center justify-center gap-8 mb-2">
        <button onClick={toggleShuffle}>
          <Shuffle className={`w-5 h-5 ${shuffle ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>
        <div className="w-px h-4 bg-border" />
        <button onClick={() => setActiveView('queue')} className="text-xs text-muted-foreground font-medium">
          Queue
        </button>
      </div>

      {/* Song info */}
      <p className="text-sm font-medium text-center px-8 truncate max-w-full mb-3">
        {currentSong.artist} – {currentSong.title}
      </p>

      {/* Music visualizer */}
      <div className="w-full px-10 h-12 mb-3">
        <MusicVisualizer isPlaying={isPlaying} bars={42} />
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-10 mb-10">
        <button onClick={prevSong}>
          <SkipBack className="w-7 h-7 text-foreground" />
        </button>
        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center glow-red"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-primary-foreground" />
          ) : (
            <Play className="w-7 h-7 text-primary-foreground ml-1" />
          )}
        </button>
        <button onClick={nextSong}>
          <SkipForward className="w-7 h-7 text-foreground" />
        </button>
      </div>

      {/* Repeat */}
      <button onClick={cycleRepeat} className="mb-6">
        {repeat === 'one' ? (
          <Repeat1 className="w-5 h-5 text-primary" />
        ) : (
          <Repeat className={`w-5 h-5 ${repeat === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
        )}
      </button>
    </div>
  );
};

export default NowPlayingView;