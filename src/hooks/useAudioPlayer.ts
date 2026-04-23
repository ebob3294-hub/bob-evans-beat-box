import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
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
  const preGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const postGainRef = useRef<GainNode | null>(null);
  const currentSongIdRef = useRef<string | null>(null);

  // Convert slider value (0-100, 50 = neutral) to dB gain.
  // Reduced from ±20 dB to ±8 dB to avoid distortion/clipping.
  const sliderToDb = (val: number) => ((val ?? 50) - 50) * 0.16;

  // Sum of positive EQ gains determines how much we need to attenuate
  // the pre-gain to keep the signal from clipping.
  const computePreGain = (bands: number[]) => {
    const maxBoostDb = Math.max(
      0,
      ...bands.map((b) => sliderToDb(b))
    );
    // Headroom: drop input by the largest boost so peaks stay below 0 dBFS
    const linear = Math.pow(10, -maxBoostDb / 20);
    return linear;
  };

  // Setup equalizer + clean signal chain
  const setupEqualizer = useCallback((audio: HTMLAudioElement) => {
    if (audioContextRef.current) return; // already set up
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      sourceRef.current = source;
      audioContextRef.current = ctx;

      // Pre-gain attenuates input to leave headroom for EQ boosts (prevents clipping)
      const preGain = ctx.createGain();
      preGain.gain.value = computePreGain(equalizerBands);
      preGainRef.current = preGain;

      const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const filters = frequencies.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === frequencies.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = sliderToDb(equalizerBands[i]);
        // Lower Q = smoother, less ringing/harshness
        filter.Q.value = 0.7;
        return filter;
      });

      // Soft-knee compressor catches any residual peaks transparently
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -3;
      compressor.knee.value = 24;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.1;
      compressorRef.current = compressor;

      // Post-gain restores perceived loudness after pre-attenuation
      const postGain = ctx.createGain();
      postGain.gain.value = 1.0;
      postGainRef.current = postGain;

      // Chain: source -> preGain -> filters -> compressor -> postGain -> destination
      let prev: AudioNode = source;
      prev.connect(preGain);
      prev = preGain;
      filters.forEach((f) => {
        prev.connect(f);
        prev = f;
      });
      prev.connect(compressor);
      compressor.connect(postGain);
      postGain.connect(ctx.destination);

      filtersRef.current = filters;
    } catch (e) {
      console.warn('[AudioPlayer] EQ setup failed:', e);
    }
  }, []);

  // Update EQ bands + adjust headroom dynamically
  useEffect(() => {
    const ctx = audioContextRef.current;
    filtersRef.current.forEach((filter, i) => {
      const db = sliderToDb(equalizerBands[i]);
      if (ctx) {
        filter.gain.setTargetAtTime(db, ctx.currentTime, 0.02);
      } else {
        filter.gain.value = db;
      }
    });
    if (preGainRef.current && ctx) {
      preGainRef.current.gain.setTargetAtTime(
        computePreGain(equalizerBands),
        ctx.currentTime,
        0.05
      );
    }
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
        // Native file path — convert for WebView access
        const convertedSrc = Capacitor.convertFileSrc(currentSong.filePath);
        console.log('[AudioPlayer] Playing native file:', convertedSrc);
        audio.src = convertedSrc;
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
