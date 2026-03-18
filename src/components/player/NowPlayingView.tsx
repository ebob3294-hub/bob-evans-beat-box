import { usePlayerStore } from '@/store/playerStore';
import { albumCovers } from './AlbumCovers';
import { ChevronDown, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Repeat1, Music, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const NowPlayingView = () => {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong, shuffle, toggleShuffle, repeat, cycleRepeat, setActiveView } = usePlayerStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

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

  const durationParts = currentSong.duration.split(':');
  const totalSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
  const currentSeconds = Math.floor((progress / 100) * totalSeconds);
  const currentMin = Math.floor(currentSeconds / 60);
  const currentSec = currentSeconds % 60;

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
          {/* Outer ring */}
          <svg className="w-64 h-64" viewBox="0 0 200 200">
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
          {/* Album art center */}
          <motion.div
            className={`absolute inset-8 rounded-full overflow-hidden border-4 border-secondary shadow-2xl ${isPlaying ? 'vinyl-spin' : ''}`}
          >
            <img
              src={albumCovers[currentSong.coverIndex]}
              alt={currentSong.album}
              className="w-full h-full object-cover"
            />
          </motion.div>
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-primary glow-red" />
          </div>
          {/* Progress indicator dot */}
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
        <span>{currentSong.duration}</span>
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
      <p className="text-sm font-medium text-center px-8 truncate max-w-full mb-4">
        {currentSong.artist} – {currentSong.title}
      </p>

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
