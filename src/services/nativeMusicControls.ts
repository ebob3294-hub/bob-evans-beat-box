/**
 * Lockscreen + notification media controls — JEDRY HALL.
 *
 * Strategy: rely 100% on the standard Web MediaSession API, which Android
 * WebView (Chromium) natively bridges to the system MediaSession service.
 * This automatically renders the OS-native lockscreen + notification card
 * (artwork, title, artist, prev/play-pause/next buttons) — no third-party
 * Capacitor plugin required, and it works reliably inside the APK.
 *
 * The previous capacitor-music-controls-plugin-v3 dependency was unreliable
 * on Capacitor 8 (no auto-registration in MainActivity, missing native
 * service binding) which is why the bar disappeared in the released APK.
 *
 * All exports here are kept for backwards compatibility with existing
 * call sites in useAudioPlayer.ts but become no-ops; the real work is
 * done by the MediaSession code in useAudioPlayer.ts itself.
 */

type Listener = (action: 'play' | 'pause' | 'next' | 'previous' | 'destroy') => void;

const listeners = new Set<Listener>();

/** Subscribe to button presses. Kept for API compatibility — unused now. */
export function onMusicControlAction(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export async function showMusicControls(): Promise<void> {
  // No-op: handled by Web MediaSession in useAudioPlayer.ts
}

export async function updateMusicControlsPlayState(): Promise<void> {
  // No-op: handled by Web MediaSession in useAudioPlayer.ts
}

export async function hideMusicControls(): Promise<void> {
  // No-op: handled by Web MediaSession in useAudioPlayer.ts
}
