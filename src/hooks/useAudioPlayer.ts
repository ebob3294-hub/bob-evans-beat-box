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
      const ctx = new AudioContext();
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

      // Chain:
      // source -> preGain -> bass -> EQ filters -> [splitter -> (L direct, R delayed) -> merger]
      //   -> dry path & convolver wet path -> compressor -> postGain -> master -> destination
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
      master.connect(ctx.destination);
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

  return { seekTo, getDuration };
}
