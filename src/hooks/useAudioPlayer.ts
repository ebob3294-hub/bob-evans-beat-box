import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { getAudioBlob } from '@/services/audioStorage';

/**
 * Global audio element managed by this hook.
 * Must be mounted once at app root level.
 */
let globalAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.preload = 'auto';
    (window as any).__bobEvanAudio = globalAudio;
  }
  return globalAudio;
}

export function useAudioPlayer() {
  const { currentSong, isPlaying, repeat, nextSong, setCurrentTime, equalizerBands } = usePlayerStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const currentSongIdRef = useRef<string | null>(null);

  // Setup equalizer
  const setupEqualizer = useCallback((audio: HTMLAudioElement) => {
    if (audioContextRef.current) return; // already set up
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      sourceRef.current = source;
      audioContextRef.current = ctx;

      const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const filters = frequencies.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === frequencies.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = ((equalizerBands[i] ?? 50) - 50) * 0.4; // -20 to +20 dB range
        filter.Q.value = 1.4;
        return filter;
      });

      // Chain: source -> filters -> destination
      let prev: AudioNode = source;
      filters.forEach((f) => {
        prev.connect(f);
        prev = f;
      });
      prev.connect(ctx.destination);

      filtersRef.current = filters;
    } catch (e) {
      console.warn('[AudioPlayer] EQ setup failed:', e);
    }
  }, []);

  // Update EQ bands
  useEffect(() => {
    filtersRef.current.forEach((filter, i) => {
      filter.gain.value = ((equalizerBands[i] ?? 50) - 50) * 0.4;
    });
  }, [equalizerBands]);

  // Load & play song
  useEffect(() => {
    if (!currentSong) return;
    if (currentSongIdRef.current === currentSong.id) return;
    currentSongIdRef.current = currentSong.id;

    const audio = getAudio();

    const loadSong = async () => {
      // Try to get blob from IndexedDB (web file picker songs)
      const blob = await getAudioBlob(currentSong.id);
      if (blob) {
        // Revoke previous object URL if any
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        audio.src = URL.createObjectURL(blob);
      } else if (currentSong.filePath) {
        // Native file path (Capacitor)
        audio.src = currentSong.filePath;
      } else {
        console.warn('[AudioPlayer] No audio source for song:', currentSong.title);
        return;
      }

      setupEqualizer(audio);

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      try {
        await audio.play();
      } catch (e) {
        console.warn('[AudioPlayer] Play failed:', e);
      }
    };

    loadSong();
  }, [currentSong, setupEqualizer]);

  // Play/pause sync
  useEffect(() => {
    const audio = getAudio();
    if (!currentSong) return;

    if (isPlaying) {
      if (audio.src) {
        audio.play().catch(() => {});
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong]);

  // Time update & ended handlers
  useEffect(() => {
    const audio = getAudio();

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextSong();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeat, nextSong, setCurrentTime]);

  // Seek function
  const seekTo = useCallback((time: number) => {
    const audio = getAudio();
    audio.currentTime = time;
  }, []);

  const getDuration = useCallback((): number => {
    return getAudio().duration || 0;
  }, []);

  return { seekTo, getDuration };
}
