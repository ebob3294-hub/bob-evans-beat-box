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
  playlists: { name: string; songs: Song[] }[];
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
  addToQueue: (song: Song) => void;
  removeFromQueue: (id: string) => void;
  nextSong: () => void;
  prevSong: () => void;
  addToPlaylist: (playlistName: string, songs: Song[]) => void;
  createPlaylist: (name: string) => void;
  setBgColor: (color: string) => void;
  setBgImage: (url: string | null) => void;
  setPermissionGranted: (granted: boolean) => void;
  setIsScanning: (scanning: boolean) => void;
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
  bgColor: '',
  bgImage: null,
  playlists: [],
  permissionGranted: false,
  isScanning: false,

  setSongs: (songs) => set({ songs }),
  addSongs: (newSongs) => set((s) => ({ 
    songs: [...s.songs, ...newSongs.filter(ns => !s.songs.find(es => es.id === ns.id))] 
  })),
  setCurrentSong: (song) => set({ currentSong: song, isPlaying: true }),
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
  addToQueue: (song) => set((s) => ({ queue: [...s.queue, song] })),
  removeFromQueue: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
  nextSong: () => {
    const { songs, currentSong, shuffle, queue } = get();
    if (queue.length > 0) {
      const next = queue[0];
      set({ currentSong: next, queue: queue.slice(1), isPlaying: true });
      return;
    }
    if (!currentSong) return;
    if (shuffle) {
      const random = songs[Math.floor(Math.random() * songs.length)];
      set({ currentSong: random, isPlaying: true });
    } else {
      const idx = songs.findIndex((s) => s.id === currentSong.id);
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
  addToPlaylist: (name, newSongs) => set((s) => ({
    playlists: s.playlists.map((p) =>
      p.name === name ? { ...p, songs: [...p.songs, ...newSongs.filter((ns) => !p.songs.find((ps) => ps.id === ns.id))] } : p
    ),
  })),
  createPlaylist: (name) => set((s) => ({
    playlists: [...s.playlists, { name, songs: [] }],
  })),
  setBgColor: (color) => set({ bgColor: color, bgImage: null }),
  setBgImage: (url) => set({ bgImage: url }),
  setPermissionGranted: (granted) => set({ permissionGranted: granted }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
}));
