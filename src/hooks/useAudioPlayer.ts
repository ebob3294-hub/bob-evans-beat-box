import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePlayerStore } from '@/store/playerStore';
import { getAudioBlob } from '@/services/audioStorage';
import { albumCovers } from '@/components/player/AlbumCovers';
import {
  showMusicControls,
  updateMusicControlsPlayState,
  hideMusicControls,
  onMusicControlAction,
} from '@/services/nativeMusicControls';

/**
 * Global audio element managed by this hook.
 * Must be mounted once at app root level.
 */
let globalAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.preload = 'auto';
    globalAudio.controls = false;
    // Required so the browser routes audio to system output (incl. Bluetooth)
    // and so MediaElementSource works without a CORS taint
    globalAudio.crossOrigin = 'anonymous';
    // Hint the browser this is foreground media playback (helps audio focus
    // negotiation with Bluetooth A2DP / car kits on Android)
    globalAudio.setAttribute('playsinline', 'true');
    globalAudio.setAttribute('controls', 'false');
    globalAudio.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
    globalAudio.setAttribute('x-webkit-airplay', 'deny');
    (globalAudio as any).playsInline = true;
    if ('disableRemotePlayback' in globalAudio) {
      (globalAudio as any).disableRemotePlayback = true;
    }
    (window as any).__bobEvanAudio = globalAudio;
  }
  return globalAudio;
}

// Build a short impulse response for a smooth hall-style reverb
function createImpulseResponse(ctx: AudioContext, durationSec = 2.2, decay = 2.5) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export function useAudioPlayer() {
  const {
    currentSong,
    isPlaying,
    repeat,
    nextSong,
    setCurrentTime,
    equalizerBands,
    bassBoost,
    virtualizer,
    reverb,
    loudness,
    effectsEnabled,
  } = usePlayerStore();

  // Grab actions outside of effect deps to avoid re-binding session handlers
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const prevSong = usePlayerStore((s) => s.prevSong);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const preGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const postGainRef = useRef<GainNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const widthDelayRef = useRef<DelayNode | null>(null);
  const widthGainRef = useRef<GainNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbWetRef = useRef<GainNode | null>(null);
  const reverbDryRef = useRef<GainNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentSongIdRef = useRef<string | null>(null);

  // Slider (0-100, 50 neutral) -> ±8 dB EQ band gain
  const sliderToDb = (val: number) => ((val ?? 50) - 50) * 0.16;

  const computePreGain = (bands: number[]) => {
    const maxBoostDb = Math.max(0, ...bands.map((b) => sliderToDb(b)));
    return Math.pow(10, -maxBoostDb / 20);
  };

  // Setup full effect chain
  const setupEqualizer = useCallback((audio: HTMLAudioElement) => {
    if (audioContextRef.current) return;
    try {
      // latencyHint 'playback' tells the browser/OS to optimize the audio
      // pipeline for music playback (larger buffers, fewer dropouts) which
      // dramatically improves stability over Bluetooth speakers/headphones.
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'playback',
        sampleRate: 44100,
      });
      const source = ctx.createMediaElementSource(audio);
      sourceRef.current = source;
      audioContextRef.current = ctx;

      // Pre-gain: headroom for EQ boosts
      const preGain = ctx.createGain();
      preGain.gain.value = computePreGain(equalizerBands);
      preGainRef.current = preGain;

      // Bass boost (low shelf, separate from EQ band so user can stack)
      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 120;
      bass.gain.value = (bassBoost / 100) * 12; // up to +12 dB
      bassFilterRef.current = bass;

      // 10-band EQ
      const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const filters = frequencies.map((freq, i) => {
        const f = ctx.createBiquadFilter();
        f.type = i === 0 ? 'lowshelf' : i === frequencies.length - 1 ? 'highshelf' : 'peaking';
        f.frequency.value = freq;
        f.gain.value = sliderToDb(equalizerBands[i]);
        f.Q.value = 0.7;
        return f;
      });
      filtersRef.current = filters;

      // Virtualizer (Haas-effect stereo widener)
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const widthDelay = ctx.createDelay(0.05);
      widthDelay.delayTime.value = (virtualizer / 100) * 0.025; // 0-25 ms
      const widthGain = ctx.createGain();
      widthGain.gain.value = virtualizer / 100;
      splitterRef.current = splitter;
      mergerRef.current = merger;
      widthDelayRef.current = widthDelay;
      widthGainRef.current = widthGain;

      // Reverb (convolver with wet/dry mix)
      const convolver = ctx.createConvolver();
      convolver.buffer = createImpulseResponse(ctx);
      const reverbWet = ctx.createGain();
      reverbWet.gain.value = reverb / 100;
      const reverbDry = ctx.createGain();
      reverbDry.gain.value = 1;
      reverbNodeRef.current = convolver;
      reverbWetRef.current = reverbWet;
      reverbDryRef.current = reverbDry;

      // Compressor (transparent peak limiting)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -3;
      compressor.knee.value = 24;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.1;
      compressorRef.current = compressor;

      // Master/loudness
      const postGain = ctx.createGain();
      postGain.gain.value = 1.0;
      postGainRef.current = postGain;

      const master = ctx.createGain();
      master.gain.value = (loudness / 50); // 50 = unity, 100 = 2x
      masterRef.current = master;

      // Analyser for visualizer (taps the master output, post-effects)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.78;
      analyserRef.current = analyser;
      (window as any).__bobEvanAnalyser = analyser;

      // Chain:
      // source -> preGain -> bass -> EQ filters -> [splitter -> (L direct, R delayed) -> merger]
      //   -> dry path & convolver wet path -> compressor -> postGain -> master -> analyser -> destination
      let prev: AudioNode = source;
      prev.connect(preGain); prev = preGain;
      prev.connect(bass); prev = bass;
      filters.forEach((f) => { prev.connect(f); prev = f; });

      // Stereo widener: L stays, R is delayed slightly (Haas) and mixed back
      prev.connect(splitter);
      // L channel direct
      splitter.connect(merger, 0, 0);
      // R channel: pass-through + delayed copy scaled by widthGain
      splitter.connect(merger, 1, 1);
      splitter.connect(widthDelay, 1);
      widthDelay.connect(widthGain);
      widthGain.connect(merger, 0, 1);

      // Wet/dry reverb
      merger.connect(reverbDry);
      merger.connect(convolver);
      convolver.connect(reverbWet);

      reverbDry.connect(compressor);
      reverbWet.connect(compressor);

      compressor.connect(postGain);
      postGain.connect(master);
      master.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (e) {
      console.warn('[AudioPlayer] Audio chain setup failed:', e);
    }
  }, []);

  // Update EQ bands + headroom
  useEffect(() => {
    const ctx = audioContextRef.current;
    filtersRef.current.forEach((filter, i) => {
      const db = effectsEnabled ? sliderToDb(equalizerBands[i]) : 0;
      if (ctx) filter.gain.setTargetAtTime(db, ctx.currentTime, 0.02);
      else filter.gain.value = db;
    });
    if (preGainRef.current && ctx) {
      preGainRef.current.gain.setTargetAtTime(
        effectsEnabled ? computePreGain(equalizerBands) : 1,
        ctx.currentTime,
        0.05
      );
    }
  }, [equalizerBands, effectsEnabled]);

  // Update bass boost
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (bassFilterRef.current && ctx) {
      const target = effectsEnabled ? (bassBoost / 100) * 12 : 0;
      bassFilterRef.current.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
    }
  }, [bassBoost, effectsEnabled]);

  // Update virtualizer
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (widthDelayRef.current && widthGainRef.current && ctx) {
      const v = effectsEnabled ? virtualizer / 100 : 0;
      widthDelayRef.current.delayTime.setTargetAtTime(v * 0.025, ctx.currentTime, 0.05);
      widthGainRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    }
  }, [virtualizer, effectsEnabled]);

  // Update reverb mix
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (reverbWetRef.current && reverbDryRef.current && ctx) {
      const wet = effectsEnabled ? reverb / 100 : 0;
      reverbWetRef.current.gain.setTargetAtTime(wet * 0.6, ctx.currentTime, 0.05);
      reverbDryRef.current.gain.setTargetAtTime(1 - wet * 0.3, ctx.currentTime, 0.05);
    }
  }, [reverb, effectsEnabled]);

  // Update master loudness
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (masterRef.current && ctx) {
      masterRef.current.gain.setTargetAtTime(loudness / 50, ctx.currentTime, 0.05);
    }
  }, [loudness]);

  // Load & play song
  useEffect(() => {
    if (!currentSong) return;
    if (currentSongIdRef.current === currentSong.id) return;
    currentSongIdRef.current = currentSong.id;

    const audio = getAudio();

    const loadSong = async () => {
      const blob = await getAudioBlob(currentSong.id);
      if (blob) {
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        audio.src = URL.createObjectURL(blob);
      } else if (currentSong.filePath) {
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

  // ── Bluetooth / external audio device routing ──
  // When a Bluetooth speaker (Baffles, JBL, car kit, etc.) connects or
  // disconnects, the AudioContext can stall on a stale output. Listening to
  // mediaDevices.devicechange lets us refresh the routing so playback resumes
  // on the new device immediately, instead of staying silent.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    const handleDeviceChange = async () => {
      const ctx = audioContextRef.current;
      const audio = getAudio();
      try {
        if (ctx && ctx.state === 'suspended') {
          await ctx.resume();
        }
        // sinkId is supported on newer Chromium WebViews; if available, force
        // re-routing to the current default device (which becomes the just-
        // connected Bluetooth speaker on Android).
        if ('setSinkId' in audio && typeof (audio as any).setSinkId === 'function') {
          try { await (audio as any).setSinkId('default'); } catch { /* ignore */ }
        }
        // Nudge playback so the OS re-establishes the audio focus on A2DP
        if (usePlayerStore.getState().isPlaying) {
          const t = audio.currentTime;
          audio.currentTime = t; // triggers a buffer refresh
          await audio.play().catch(() => {});
        }
      } catch (e) {
        console.warn('[AudioPlayer] devicechange handling failed:', e);
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  // Pause cleanly when the user unplugs headphones or moves out of Bluetooth
  // range (the audio element fires a stalled/suspend event in that case).
  useEffect(() => {
    const audio = getAudio();
    const handleStall = () => {
      console.log('[AudioPlayer] audio stalled — likely audio device change');
    };
    audio.addEventListener('stalled', handleStall);
    audio.addEventListener('suspend', handleStall);
    return () => {
      audio.removeEventListener('stalled', handleStall);
      audio.removeEventListener('suspend', handleStall);
    };
  }, []);

  // Time + ended handlers
  useEffect(() => {
    const audio = getAudio();
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
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

  const seekTo = useCallback((time: number) => {
    getAudio().currentTime = time;
  }, []);

  const getDuration = useCallback((): number => {
    return getAudio().duration || 0;
  }, []);

  // ── Lockscreen / Notification media controls (MediaSession API) ──
  // Lets the user play/pause/skip from the lockscreen or notification shade
  // when the screen is off (Android Chrome / Capacitor WebView).
  //
  // For Android to actually display the lockscreen notification, the audio
  // element MUST be playing (Chromium only surfaces the system media UI for
  // tabs that are currently producing sound). Setting metadata + handlers
  // here ensures the controls are ready as soon as playback begins.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentSong) {
      try { navigator.mediaSession.metadata = null; } catch { /* ignore */ }
      return;
    }

    // Resolve cover artwork to an absolute URL so the system can fetch it
    const coverSrc = albumCovers[currentSong.coverIndex] || albumCovers[0];
    const artworkUrl = new URL(coverSrc, window.location.href).href;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: currentSong.artist || 'Unknown Artist',
        album: currentSong.album || '',
        artwork: [
          { src: artworkUrl, sizes: '96x96',   type: 'image/jpeg' },
          { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (e) {
      console.warn('[MediaSession] metadata failed:', e);
    }

    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch { /* ignore */ }

    const audio = getAudio();

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => {
        audio.play().catch(() => {});
        if (!usePlayerStore.getState().isPlaying) togglePlay();
      }],
      ['pause', () => {
        audio.pause();
        if (usePlayerStore.getState().isPlaying) togglePlay();
      }],
      ['previoustrack', () => prevSong()],
      ['nexttrack', () => nextSong()],
      ['stop', () => {
        audio.pause();
        if (usePlayerStore.getState().isPlaying) togglePlay();
      }],
      ['seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        audio.currentTime = Math.max(0, audio.currentTime - skip);
      }],
      ['seekforward', (details) => {
        const skip = details.seekOffset || 10;
        audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + skip);
      }],
      ['seekto', (details) => {
        if (details.seekTime != null) {
          if (details.fastSeek && 'fastSeek' in audio) {
            (audio as any).fastSeek(details.seekTime);
          } else {
            audio.currentTime = details.seekTime;
          }
        }
      }],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions may not be supported on all platforms — ignore
      }
    });

    // Mirror the <audio> element's own play/pause events into the session
    // so the system UI updates instantly even when state changes natively.
    const onPlay = () => {
      try { navigator.mediaSession.playbackState = 'playing'; } catch { /* ignore */ }
    };
    const onPause = () => {
      try { navigator.mediaSession.playbackState = 'paused'; } catch { /* ignore */ }
    };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      });
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentSong, isPlaying, nextSong, prevSong, togglePlay]);

  // Keep position state in sync so the lockscreen scrubber updates
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;
    const audio = getAudio();
    if (!audio.duration || !isFinite(audio.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        position: Math.min(audio.currentTime, audio.duration),
        playbackRate: audio.playbackRate || 1,
      });
    } catch {
      // ignore
    }
  }, [currentSong, isPlaying]);

  // ── Native lockscreen / notification controls (Capacitor) ──
  // Shows a persistent media notification with cover, title, artist and
  // prev / play-pause / next buttons that work when the screen is off.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!currentSong) {
      hideMusicControls();
      return;
    }
    showMusicControls(currentSong, isPlaying);
    // Only re-create when the song changes; play state is updated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  // Cheap update when only the play state changes (avoids re-creating the card)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!currentSong) return;
    updateMusicControlsPlayState(isPlaying);
  }, [isPlaying, currentSong]);

  // Wire native notification button presses into the player store
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const audio = getAudio();
    const off = onMusicControlAction((action) => {
      switch (action) {
        case 'play':
          audio.play().catch(() => {});
          if (!usePlayerStore.getState().isPlaying) togglePlay();
          break;
        case 'pause':
          audio.pause();
          if (usePlayerStore.getState().isPlaying) togglePlay();
          break;
        case 'next':
          nextSong();
          break;
        case 'previous':
          prevSong();
          break;
        case 'destroy':
          audio.pause();
          if (usePlayerStore.getState().isPlaying) togglePlay();
          break;
      }
    });
    return () => { off(); };
  }, [nextSong, prevSong, togglePlay]);

  // Cleanup the notification when the hook unmounts (e.g. app reload)
  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        hideMusicControls();
      }
    };
  }, []);

  return { seekTo, getDuration };
}
