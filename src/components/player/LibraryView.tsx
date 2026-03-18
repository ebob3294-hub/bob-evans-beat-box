import { usePlayerStore } from '@/store/playerStore';
import { albumCovers } from './AlbumCovers';
import { Play, Search, SlidersHorizontal, Music, FolderOpen, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { scanDeviceMusic, pickMusicFiles } from '@/services/musicScanner';

const LibraryView = () => {
  const { songs, currentSong, isPlaying, setCurrentSong, setActiveView, addSongs, setIsScanning } = usePlayerStore();

  const handleAddMusic = async () => {
    setIsScanning(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const newSongs = await scanDeviceMusic();
        if (newSongs.length > 0) addSongs(newSongs);
      } else {
        const newSongs = await pickMusicFiles();
        if (newSongs.length > 0) addSongs(newSongs);
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold tracking-tight">
            <span className="text-primary">BOB</span>{' '}
            <span className="text-foreground">EVAN</span>
          </h1>
        </div>
        <Search className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Title + Add button */}
      <div className="flex items-center justify-between px-5 pb-3">
        <h2 className="text-3xl font-display font-bold">My Music</h2>
        <button
          onClick={handleAddMusic}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Song list or empty state */}
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No music yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Add music from your device to start listening
            </p>
            <button
              onClick={handleAddMusic}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
            >
              {Capacitor.isNativePlatform() ? 'Scan Device' : 'Select Files'}
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {songs.map((song, i) => (
              <motion.button
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setCurrentSong(song)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  currentSong?.id === song.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-secondary'
                }`}
              >
                <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
                  {albumCovers[song.coverIndex] ? (
                    <img
                      src={albumCovers[song.coverIndex]}
                      alt={song.album}
                      className="w-14 h-14 rounded-md object-cover"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-primary' : 'text-foreground'}`}>
                    {song.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{song.artist} • {song.album}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{song.duration}</span>
                  <Play className={`w-4 h-4 ${currentSong?.id === song.id && isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Mini player */}
      {currentSong && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          className="absolute bottom-16 left-0 right-0 mx-3 bg-card border border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer glow-red"
          onClick={() => setActiveView('nowPlaying')}
        >
          <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ${isPlaying ? 'vinyl-spin' : ''}`}>
            {albumCovers[currentSong.coverIndex] ? (
              <img
                src={albumCovers[currentSong.coverIndex]}
                alt={currentSong.album}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <Music className="w-5 h-5 text-primary" />
            )}
          </div>
          <p className="flex-1 text-sm font-medium truncate">
            {currentSong.artist} – {currentSong.title}
          </p>
          <div
            onClick={(e) => {
              e.stopPropagation();
              usePlayerStore.getState().togglePlay();
            }}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
          >
            <Play className={`w-4 h-4 text-primary-foreground ${isPlaying ? 'hidden' : ''}`} />
            {isPlaying && <div className="w-2.5 h-2.5 border-2 border-primary-foreground rounded-sm" />}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LibraryView;
