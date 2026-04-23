import { create } from 'zustand';
import { saveSongsMetadata, loadSongsMetadata } from '@/services/audioStorage';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverIndex: number;
  category: string;
  filePath?: string;
  addedAt?: number;
}

interface Playlist {
  name: string;
  songs: Song[];
  createdAt: number;
}

const LIKED_KEY = 'bob-evan-liked';
const PLAYLISTS_KEY = 'bob-evan-playlists';
const PERMISSION_KEY = 'bob-evan-permission';
const HISTORY_KEY = 'bob-evan-history';

interface HistoryEntry {
  song: Song;
  playedAt: number;
}

function loadLiked(): string[] {
  try { return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'); } catch { return []; }
}
function saveLiked(ids: string[]) {
  localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
}
function loadPlaylists(): Playlist[] {
  try { return JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || '[]'); } catch { return []; }
}
function savePlaylists(p: Playlist[]) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(p));
}
function loadPermission(): boolean {
  return localStorage.getItem(PERMISSION_KEY) === 'true';
}
function savePermission(v: boolean) {
  localStorage.setItem(PERMISSION_KEY, String(v));
}
function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

interface PlayerState {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  queue: Song[];
  currentTime: number;
  activeCategory: string;
  activeView: 'library' | 'nowPlaying' | 'equalizer' | 'queue' | 'settings';
  equalizerBands: number[];
  bassBoost: number;        // 0-100
  virtualizer: number;      // 0-100 (stereo width)
  reverb: number;           // 0-100 (wet mix)
  loudness: number;         // 0-100 (master gain, 50 = unity)
  effectsEnabled: boolean;
  playlists: Playlist[];
  likedIds: string[];
  bgColor: string;
  bgImage: string | null;
  permissionGranted: boolean;
  isScanning: boolean;

  setSongs: (songs: Song[]) => void;
  addSongs: (songs: Song[]) => void;
  setCurrentSong: (song: Song) => void;
  togglePlay: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setCurrentTime: (time: number) => void;
  setActiveCategory: (cat: string) => void;
  setActiveView: (view: PlayerState['activeView']) => void;
  setEqualizerBand: (index: number, value: number) => void;
  setBassBoost: (v: number) => void;
  setVirtualizer: (v: number) => void;
  setReverb: (v: number) => void;
  setLoudness: (v: number) => void;
  setEffectsEnabled: (v: boolean) => void;
  resetEffects: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (id: string) => void;
  nextSong: () => void;
  prevSong: () => void;
  addToPlaylist: (playlistName: string, songs: Song[]) => void;
  removeFromPlaylist: (playlistName: string, songId: string) => void;
  createPlaylist: (name: string) => void;
  deletePlaylist: (name: string) => void;
  toggleLike: (songId: string) => void;
  isLiked: (songId: string) => boolean;
  setBgColor: (color: string) => void;
  setBgImage: (url: string | null) => void;
  setPermissionGranted: (granted: boolean) => void;
  setIsScanning: (scanning: boolean) => void;
  removeSong: (songId: string) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  songs: loadSongsMetadata(),
  currentSong: null,
  isPlaying: false,
  shuffle: false,
  repeat: 'off',
  queue: [],
  currentTime: 0,
  activeCategory: 'All',
  activeView: 'library',
  equalizerBands: [50, 60, 75, 80, 70, 55, 65, 72, 60, 50],
  bassBoost: 0,
  virtualizer: 0,
  reverb: 0,
  loudness: 50,
  effectsEnabled: true,
  bgColor: '',
  bgImage: null,
  playlists: loadPlaylists(),
  likedIds: loadLiked(),
  permissionGranted: loadPermission(),
  isScanning: false,
  history: loadHistory(),

  setSongs: (songs) => {
    saveSongsMetadata(songs);
    set({ songs });
  },
  addSongs: (newSongs) => set((s) => {
    const timestamp = Date.now();
    const tagged = newSongs.map((ns, i) => ({ ...ns, addedAt: timestamp + i }));
    const updated = [...s.songs, ...tagged.filter(ns => !s.songs.find(es => es.id === ns.id))];
    saveSongsMetadata(updated);
    return { songs: updated };
  }),
  setCurrentSong: (song) => set((s) => {
    const entry: HistoryEntry = { song, playedAt: Date.now() };
    const newHistory = [entry, ...s.history.filter(h => h.song.id !== song.id)].slice(0, 100);
    saveHistory(newHistory);
    return { currentSong: song, isPlaying: true, history: newHistory };
  }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set((s) => ({
    repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
  })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setActiveView: (view) => set({ activeView: view }),
  setEqualizerBand: (index, value) => set((s) => {
    const bands = [...s.equalizerBands];
    bands[index] = value;
    return { equalizerBands: bands };
  }),
  setBassBoost: (v) => set({ bassBoost: v }),
  setVirtualizer: (v) => set({ virtualizer: v }),
  setReverb: (v) => set({ reverb: v }),
  setLoudness: (v) => set({ loudness: v }),
  setEffectsEnabled: (v) => set({ effectsEnabled: v }),
  resetEffects: () => set({
    equalizerBands: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
    bassBoost: 0,
    virtualizer: 0,
    reverb: 0,
    loudness: 50,
  }),
  addToQueue: (song) => set((s) => ({ queue: [...s.queue, song] })),
  removeFromQueue: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
  nextSong: () => {
    const { songs, currentSong, shuffle, queue, repeat } = get();
    if (queue.length > 0) {
      const next = queue[0];
      set({ currentSong: next, queue: queue.slice(1), isPlaying: true });
      return;
    }
    if (!currentSong || songs.length === 0) return;
    if (shuffle) {
      const random = songs[Math.floor(Math.random() * songs.length)];
      set({ currentSong: random, isPlaying: true });
    } else {
      const idx = songs.findIndex((s) => s.id === currentSong.id);
      const isLast = idx === songs.length - 1;
      if (isLast && repeat === 'off') {
        // Reached end of library and repeat is off -> stop playback
        set({ isPlaying: false, currentTime: 0 });
        return;
      }
      // repeat === 'all' (or not last) -> wrap / advance
      const next = songs[(idx + 1) % songs.length];
      set({ currentSong: next, isPlaying: true });
    }
  },
  prevSong: () => {
    const { songs, currentSong, shuffle } = get();
    if (!currentSong) return;
    if (shuffle) {
      const random = songs[Math.floor(Math.random() * songs.length)];
      set({ currentSong: random, isPlaying: true });
    } else {
      const idx = songs.findIndex((s) => s.id === currentSong.id);
      const prev = songs[(idx - 1 + songs.length) % songs.length];
      set({ currentSong: prev, isPlaying: true });
    }
  },
  addToPlaylist: (name, newSongs) => set((s) => {
    const updated = s.playlists.map((p) =>
      p.name === name ? { ...p, songs: [...p.songs, ...newSongs.filter((ns) => !p.songs.find((ps) => ps.id === ns.id))] } : p
    );
    savePlaylists(updated);
    return { playlists: updated };
  }),
  removeFromPlaylist: (name, songId) => set((s) => {
    const updated = s.playlists.map((p) =>
      p.name === name ? { ...p, songs: p.songs.filter((ps) => ps.id !== songId) } : p
    );
    savePlaylists(updated);
    return { playlists: updated };
  }),
  createPlaylist: (name) => set((s) => {
    const updated = [...s.playlists, { name, songs: [], createdAt: Date.now() }];
    savePlaylists(updated);
    return { playlists: updated };
  }),
  deletePlaylist: (name) => set((s) => {
    const updated = s.playlists.filter((p) => p.name !== name);
    savePlaylists(updated);
    return { playlists: updated };
  }),
  toggleLike: (songId) => set((s) => {
    const liked = s.likedIds.includes(songId)
      ? s.likedIds.filter((id) => id !== songId)
      : [...s.likedIds, songId];
    saveLiked(liked);
    return { likedIds: liked };
  }),
  isLiked: (songId) => get().likedIds.includes(songId),
  setBgColor: (color) => set({ bgColor: color, bgImage: null }),
  setBgImage: (url) => set({ bgImage: url }),
  setPermissionGranted: (granted) => {
    savePermission(granted);
    set({ permissionGranted: granted });
  },
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  removeSong: (songId) => set((s) => {
    const updated = s.songs.filter((song) => song.id !== songId);
    saveSongsMetadata(updated);
    const newState: Partial<PlayerState> = { songs: updated };
    if (s.currentSong?.id === songId) {
      newState.currentSong = null;
      newState.isPlaying = false;
    }
    newState.queue = s.queue.filter((q) => q.id !== songId);
    newState.likedIds = s.likedIds.filter((id) => id !== songId);
    saveLiked(newState.likedIds as string[]);
    const updatedPlaylists = s.playlists.map((p) => ({ ...p, songs: p.songs.filter((ps) => ps.id !== songId) }));
    savePlaylists(updatedPlaylists);
    newState.playlists = updatedPlaylists;
    return newState;
  }),
  clearHistory: () => {
    saveHistory([]);
    set({ history: [] });
  },
}));
