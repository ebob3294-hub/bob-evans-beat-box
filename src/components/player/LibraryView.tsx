import { usePlayerStore } from '@/store/playerStore';
import { albumCovers } from './AlbumCovers';
import { Play, Pause, Search, Music, FolderOpen, Plus, Heart, Clock, ListMusic, Trash2, X, History, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { scanDeviceMusic, pickMusicFiles } from '@/services/musicScanner';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

type LibraryTab = 'all' | 'recent' | 'liked' | 'history' | 'playlists';

const LibraryView = () => {
  const { songs, currentSong, isPlaying, setCurrentSong, setActiveView, addSongs, setIsScanning, likedIds, toggleLike, playlists, createPlaylist, addToPlaylist, deletePlaylist, removeFromPlaylist, removeSong, history, clearHistory } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<string | null>(null);
  const [showPlaylistSongPicker, setShowPlaylistSongPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

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

  const tabs: { id: LibraryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'recent', label: 'Recently Added', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'liked', label: 'Liked', icon: <Heart className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'playlists', label: 'Playlists', icon: <ListMusic className="w-3.5 h-3.5" /> },
  ];

  // "Recently Added" — songs added in the last 7 days, newest first.
  // Falls back to the latest 30 if none have a fresh `addedAt` timestamp.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const freshlyAdded = songs
    .filter((s) => s.addedAt && now - s.addedAt < SEVEN_DAYS_MS)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  const recentSongs = freshlyAdded.length > 0
    ? freshlyAdded
    : [...songs].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 30);
  const recentlyAddedCount = freshlyAdded.length;
  const isRecentlyAdded = (id: string) => freshlyAdded.some((s) => s.id === id);
  const likedSongs = songs.filter((s) => likedIds.includes(s.id));
  const historySongs = history.map(h => h.song);
  const selectedPlaylistData = selectedPlaylist
    ? playlists.find((playlist) => playlist.name === selectedPlaylist) ?? null
    : null;
  const selectedPlaylistAvailableSongs = selectedPlaylistData
    ? songs.filter((song) => !selectedPlaylistData.songs.some((playlistSong) => playlistSong.id === song.id))
    : [];

  const filterBySearch = (list: typeof songs) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  };

  const getDisplaySongs = (): typeof songs => {
    if (activeTab === 'recent') return filterBySearch(recentSongs);
    if (activeTab === 'liked') return filterBySearch(likedSongs);
    if (activeTab === 'history') return filterBySearch(historySongs);
    if (activeTab === 'playlists' && selectedPlaylist) {
      return filterBySearch(playlists.find((p) => p.name === selectedPlaylist)?.songs || []);
    }
    return filterBySearch(songs);
  };

  const displaySongs = getDisplaySongs();

  const handleCreatePlaylist = () => {
    const trimmedName = newPlaylistName.trim();
    if (!trimmedName) return;

    const existingPlaylist = playlists.find((playlist) => playlist.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingPlaylist) {
      setSelectedPlaylist(existingPlaylist.name);
      setActiveTab('playlists');
      setNewPlaylistName('');
      setShowNewPlaylist(false);
      return;
    }

    createPlaylist(trimmedName);
    setSelectedPlaylist(trimmedName);
    setActiveTab('playlists');
    setNewPlaylistName('');
    setShowNewPlaylist(false);
  };

  const renderSongItem = (song: typeof songs[0], i: number) => (
    <motion.div
      key={song.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: Math.min(i * 0.02, 0.3) }}
      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
        currentSong?.id === song.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary'
      }`}
    >
      <button onClick={() => setCurrentSong(song)} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {albumCovers[song.coverIndex] ? (
            <img src={albumCovers[song.coverIndex]} alt={song.album} className="w-12 h-12 rounded-md object-cover" />
          ) : (
            <Music className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-primary' : 'text-foreground'}`}>
              {song.title}
            </p>
            {isRecentlyAdded(song.id) && (
              <span className="flex-shrink-0 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-primary">
                <Sparkles className="w-2 h-2" />
                New
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
        </div>
      </button>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">{song.duration}</span>
        <button onClick={() => toggleLike(song.id)} className="p-1">
          <Heart className={`w-4 h-4 ${likedIds.includes(song.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
        <button onClick={() => setAddToPlaylistSong(song.id)} className="p-1">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => {
            if (selectedPlaylistData) {
              removeFromPlaylist(selectedPlaylistData.name, song.id);
              return;
            }
            removeSong(song.id);
          }}
          className="p-1"
        >
          {selectedPlaylistData ? (
            <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
          ) : (
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          )}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-bold tracking-tight">
            <span className="text-primary">BOB</span>{' '}
            <span className="text-foreground">EVAN</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 bg-primary/10 rounded-lg">
            <Search className="w-4 h-4 text-primary" />
          </button>
          <button onClick={handleAddMusic} className="p-2 bg-primary/10 rounded-lg">
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5"
          >
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 mb-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="search"
                inputMode="search"
                name="library-search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or artist..."
                className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedPlaylist(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'liked' && likedSongs.length > 0 && (
              <span className="bg-primary-foreground/20 rounded-full px-1.5 text-[10px]">{likedSongs.length}</span>
            )}
            {tab.id === 'recent' && recentlyAddedCount > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] ${activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-primary/20 text-primary'}`}>
                {recentlyAddedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Playlists list */}
      {activeTab === 'playlists' && !selectedPlaylist && (
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">My Playlists</h3>
            <button onClick={() => setShowNewPlaylist(true)} className="text-xs text-primary font-medium">+ New</button>
          </div>

          {showNewPlaylist && (
            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                inputMode="text"
                name="playlist-name"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1 rounded-lg bg-secondary text-sm text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                autoFocus
              />
              <button type="button" onClick={handleCreatePlaylist} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                Add
              </button>
              <button type="button" onClick={() => setShowNewPlaylist(false)} className="px-2 py-2 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ListMusic className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No playlists yet</p>
              <button onClick={() => setShowNewPlaylist(true)} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                Create Playlist
              </button>
            </div>
          ) : (
            playlists.map((pl) => (
              <div
                key={pl.name}
                className="mb-1 flex items-center gap-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setSelectedPlaylist(pl.name)}
                  className="flex flex-1 items-center gap-3 p-3 text-left"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ListMusic className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
                    <p className="text-xs text-muted-foreground">{pl.songs.length} songs</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => deletePlaylist(pl.name)}
                  className="p-3 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete playlist ${pl.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Selected playlist header */}
      {activeTab === 'playlists' && selectedPlaylist && (
        <div className="flex items-center gap-2 px-5 pb-2">
          <button onClick={() => setSelectedPlaylist(null)} className="text-xs text-primary">← Back</button>
          <h3 className="text-lg font-bold text-foreground">{selectedPlaylist}</h3>
          <span className="text-xs text-muted-foreground">({displaySongs.length})</span>
          <button
            onClick={() => setShowPlaylistSongPicker(true)}
            className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            Add songs
          </button>
        </div>
      )}

      {/* History header with clear */}
      {activeTab === 'history' && history.length > 0 && (
        <div className="flex items-center justify-between px-5 pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Playback History</h3>
          <button onClick={clearHistory} className="text-xs text-primary font-medium">Clear All</button>
        </div>
      )}

      {/* Song list */}
      {(activeTab !== 'playlists' || selectedPlaylist) && (
        <div className="flex-1 overflow-y-auto px-3 pb-24">
          {displaySongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                {activeTab === 'liked' ? <Heart className="w-7 h-7 text-primary" /> : activeTab === 'history' ? <History className="w-7 h-7 text-primary" /> : <FolderOpen className="w-7 h-7 text-primary" />}
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {activeTab === 'liked' ? 'No liked songs' : activeTab === 'history' ? 'No history yet' : activeTab === 'recent' ? 'No recently added songs' : selectedPlaylist ? 'Playlist is empty' : 'No music yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'liked' ? 'Tap ♥ on songs you love' : activeTab === 'history' ? 'Songs you play will appear here' : 'Add music to get started'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {displaySongs.map((song, i) => renderSongItem(song, i))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Add to playlist modal */}
      {addToPlaylistSong && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-end justify-center" onClick={() => setAddToPlaylistSong(null)}>
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            className="w-full bg-card border-t border-border rounded-t-2xl p-5 max-h-[60%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-3">Add to Playlist</h3>
            {playlists.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">No playlists yet</p>
                <button
                  onClick={() => { setAddToPlaylistSong(null); setActiveTab('playlists'); setShowNewPlaylist(true); }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                >
                  Create One
                </button>
              </div>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.name}
                  onClick={() => {
                    const song = songs.find((s) => s.id === addToPlaylistSong);
                    if (song) addToPlaylist(pl.name, [song]);
                    setAddToPlaylistSong(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <ListMusic className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{pl.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{pl.songs.length} songs</span>
                </button>
              ))
            )}
          </motion.div>
        </div>
      )}

      {showPlaylistSongPicker && selectedPlaylistData && (
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-end justify-center"
          onClick={() => setShowPlaylistSongPicker(false)}
        >
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            className="w-full bg-card border-t border-border rounded-t-2xl p-5 max-h-[70%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-bold">Add Songs</h3>
                <p className="text-xs text-muted-foreground">{selectedPlaylistData.name}</p>
              </div>
              <button onClick={() => setShowPlaylistSongPicker(false)} className="p-1 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPlaylistAvailableSongs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                All songs are already in this playlist.
              </div>
            ) : (
              selectedPlaylistAvailableSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => addToPlaylist(selectedPlaylistData.name, [song])}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {albumCovers[song.coverIndex] ? (
                      <img src={albumCovers[song.coverIndex]} alt={song.album} className="w-10 h-10 rounded-md object-cover" />
                    ) : (
                      <Music className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              ))
            )}
          </motion.div>
        </div>
      )}

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
              <img src={albumCovers[currentSong.coverIndex]} alt={currentSong.album} className="w-10 h-10 rounded-full object-cover" />
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
            {isPlaying ? (
              <Pause className="w-4 h-4 text-primary-foreground" />
            ) : (
              <Play className="w-4 h-4 text-primary-foreground" />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LibraryView;
