import { create } from 'zustand';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverIndex: number;
  category: string;
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
}

const SONGS: Song[] = [
  { id: '1', title: 'Midnight Drive', artist: 'The Neons', album: 'After Dark', duration: '4:08', coverIndex: 0, category: 'Road' },
  { id: '2', title: 'Red Light District', artist: 'Velvet Crash', album: 'Neon Nights', duration: '3:42', coverIndex: 1, category: 'Road' },
  { id: '3', title: 'City of Shadows', artist: 'Dark Pulse', album: 'Urban Decay', duration: '5:15', coverIndex: 2, category: 'Classic' },
  { id: '4', title: 'Vinyl Dreams', artist: 'Retro Wave', album: 'Analog Heart', duration: '3:58', coverIndex: 3, category: 'Classic' },
  { id: '5', title: 'Unplugged Soul', artist: 'Acoustic Fire', album: 'Raw Sessions', duration: '4:33', coverIndex: 4, category: 'Road' },
  { id: '6', title: 'Bassline Fury', artist: 'The Neons', album: 'After Dark', duration: '3:21', coverIndex: 0, category: 'Trap' },
  { id: '7', title: 'Crimson Wave', artist: 'Velvet Crash', album: 'Neon Nights', duration: '4:47', coverIndex: 1, category: 'Trap' },
  { id: '8', title: 'Neon Skyline', artist: 'Dark Pulse', album: 'Urban Decay', duration: '3:55', coverIndex: 2, category: 'Save' },
  { id: '9', title: 'Analog Sunrise', artist: 'Retro Wave', album: 'Analog Heart', duration: '5:02', coverIndex: 3, category: 'Save' },
  { id: '10', title: 'Fire & Strings', artist: 'Acoustic Fire', album: 'Raw Sessions', duration: '4:19', coverIndex: 4, category: 'Others' },
];

export const usePlayerStore = create<PlayerState>((set, get) => ({
  songs: SONGS,
  currentSong: null,
  isPlaying: false,
  shuffle: false,
  repeat: 'off',
  queue: [],
  currentTime: 0,
  activeCategory: 'Road',
  activeView: 'library',
  equalizerBands: [50, 60, 75, 80, 70, 55, 65, 72, 60, 50],
  bgColor: '',
  bgImage: null,
  playlists: [
    { name: 'Favorites', songs: [SONGS[0], SONGS[3], SONGS[4]] },
    { name: 'Workout', songs: [SONGS[1], SONGS[5], SONGS[6]] },
  ],

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
}));
