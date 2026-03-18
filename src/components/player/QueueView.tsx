import { usePlayerStore } from '@/store/playerStore';
import { albumCovers } from './AlbumCovers';
import { ChevronDown, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QueueView = () => {
  const { queue, removeFromQueue, setActiveView, songs, addToQueue } = usePlayerStore();

  const availableSongs = songs.filter((s) => !queue.find((q) => q.id === s.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button onClick={() => setActiveView('nowPlaying')}>
          <ChevronDown className="w-6 h-6 text-foreground" />
        </button>
        <h2 className="text-lg font-display font-bold">Up Next</h2>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p className="text-sm">Queue is empty</p>
            <p className="text-xs mt-1">Add songs from below</p>
          </div>
        ) : (
          <AnimatePresence>
            {queue.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <img src={albumCovers[song.coverIndex]} alt="" className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground">{song.artist}</p>
                </div>
                <button onClick={() => removeFromQueue(song.id)}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Add songs section */}
        <div className="mt-6 mb-4">
          <h3 className="text-sm font-medium text-muted-foreground px-2 mb-2">Add to Queue</h3>
          {availableSongs.slice(0, 5).map((song) => (
            <button
              key={song.id}
              onClick={() => addToQueue(song)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <img src={albumCovers[song.coverIndex]} alt="" className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm truncate">{song.title}</p>
                <p className="text-xs text-muted-foreground">{song.artist}</p>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueueView;
