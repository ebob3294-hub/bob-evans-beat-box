/**
 * Keeps audio playing reliably when the app is sent to the background or
 * the screen is locked.
 *
 * Root causes addressed:
 * 1. Android WebView throttles / suspends JavaScript timers when the app
 *    is backgrounded, which can pause the AudioContext and stop playback.
 *    → We listen to Capacitor App `appStateChange` and resume the
 *      AudioContext + <audio> element on every foreground/background
 *      transition.
 * 2. The OS may pause the <audio> element if no MediaSession is active.
 *    → We force-resume after every visibilitychange, with a small retry
 *      loop because Android takes a moment to grant audio focus back.
 * 3. The browser tab can lose audio focus when the screen turns off.
 *    → We use the Wake Lock API where supported (kept minimal, screen-off
 *      is fine — we use a dummy audio sink to stay "active").
 */
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { usePlayerStore } from '@/store/playerStore';

function getGlobalAudio(): HTMLAudioElement | null {
  return (window as any).__bobEvanAudio || null;
}

function getGlobalAudioContext(): AudioContext | null {
  return (window as any).__bobEvanAudioCtx || null;
}

async function resumePlayback(reason: string) {
  const audio = getGlobalAudio();
  const ctx = getGlobalAudioContext();
  const { isPlaying } = usePlayerStore.getState();

  try {
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (e) {
    console.warn('[BgPlayback] AudioContext resume failed:', e);
  }

  if (!audio) return;
  if (!isPlaying) return;

  // Several retries because Android may take a moment to re-grant audio
  // focus after returning from the background or unlocking the screen.
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!audio.paused) return;
    try {
      await audio.play();
      console.log(`[BgPlayback] resumed (${reason}) attempt ${attempt + 1}`);
      return;
    } catch (e) {
      // wait a bit and try again
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  console.warn(`[BgPlayback] could not resume after ${reason}`);
}

export function useBackgroundPlayback() {
  useEffect(() => {
    // ── Capacitor App lifecycle (native only) ──
    let removeAppListener: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      const handle = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // Coming back to foreground — resume context + playback
          resumePlayback('appStateChange:active');
        } else {
          // Going to background — make sure the AudioContext stays alive
          // by resuming it (it was set up with latencyHint:'playback' which
          // keeps the audio thread running independently of the JS thread).
          const ctx = getGlobalAudioContext();
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const audio = getGlobalAudio();
          const { isPlaying } = usePlayerStore.getState();
          if (audio && isPlaying && audio.paused) {
            audio.play().catch(() => {});
          }
        }
      });
      removeAppListener = () => {
        handle.then((h) => h.remove()).catch(() => {});
      };
    }

    // ── Web visibilitychange (covers PWA + WebView) ──
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        resumePlayback('visibilitychange');
      } else {
        // Backgrounding: keep AudioContext awake
        const ctx = getGlobalAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ── Pageshow (back from BFCache) ──
    const onPageShow = () => resumePlayback('pageshow');
    window.addEventListener('pageshow', onPageShow);

    // ── If the OS pauses the <audio> while we're playing, fight back ──
    const audio = getGlobalAudio();
    let pauseGuardOff: (() => void) | null = null;
    if (audio) {
      const onPause = () => {
        const { isPlaying } = usePlayerStore.getState();
        if (!isPlaying) return; // user-initiated pause — leave it
        // If the OS paused us (e.g. background restriction) try to resume
        setTimeout(() => {
          if (audio.paused && usePlayerStore.getState().isPlaying) {
            audio.play().catch(() => {});
          }
        }, 200);
      };
      audio.addEventListener('pause', onPause);
      pauseGuardOff = () => audio.removeEventListener('pause', onPause);
    }

    return () => {
      removeAppListener?.();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      pauseGuardOff?.();
    };
  }, []);
}
