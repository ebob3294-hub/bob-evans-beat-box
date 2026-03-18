import { usePlayerStore } from '@/store/playerStore';
import { albumCovers } from './AlbumCovers';
import { Play, Search, SlidersHorizontal, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['Others', 'Road', 'Save', 'Classic', 'Trap'];

const LibraryView = () => {
  const { songs, activeCategory, setActiveCategory, setCurrentSong, currentSong, isPlaying, setActiveView } = usePlayerStore();

  const filtered = songs.filter((s) => s.category === activeCategory);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold tracking-tight">Bob Evan</h1>
        </div>
        <Search className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Category heading */}
      <div className="flex items-center justify-between px-5 pb-3">
        <h2 className="text-3xl font-display font-bold">{activeCategory}</h2>
        <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-5 pb-4 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm whitespace-nowrap transition-all ${
              cat === activeCategory
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        <AnimatePresence mode="popLayout">
          {filtered.map((song, i) => (
            <motion.button
              key={song.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setCurrentSong(song)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                currentSong?.id === song.id
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-secondary'
              }`}
            >
              <img
                src={albumCovers[song.coverIndex]}
                alt={song.album}
                className="w-14 h-14 rounded-md object-cover"
              />
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-primary' : 'text-foreground'}`}>
                  {song.artist} – {song.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{song.album}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{song.duration}</span>
                <Play className={`w-4 h-4 ${currentSong?.id === song.id && isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Mini player */}
      {currentSong && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          className="absolute bottom-16 left-0 right-0 mx-3 bg-card border border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer glow-red"
          onClick={() => setActiveView('nowPlaying')}
        >
          <img
            src={albumCovers[currentSong.coverIndex]}
            alt={currentSong.album}
            className={`w-10 h-10 rounded-full object-cover ${isPlaying ? 'vinyl-spin' : ''}`}
          />
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
