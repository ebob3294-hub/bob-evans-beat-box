/**
 * Native lockscreen + notification media controls.
 *
 * Uses capacitor-music-controls-plugin-v3 on native (Android/iOS) to display
 * a rich, persistent media notification with previous / play-pause / next
 * buttons that work even when the screen is off.
 *
 * On the web (or if the plugin is unavailable) all calls become no-ops, so
 * the standard MediaSession API in useAudioPlayer continues to handle things.
 */
import { Capacitor } from '@capacitor/core';
import type { Song } from '@/store/playerStore';
import { albumCovers } from '@/components/player/AlbumCovers';

type Listener = (action: 'play' | 'pause' | 'next' | 'previous' | 'destroy') => void;

let plugin: any = null;
let listenersBound = false;
const listeners = new Set<Listener>();

async function getPlugin(): Promise<any | null> {
  if (plugin) return plugin;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod: any = await import('capacitor-music-controls-plugin-v3');
    plugin = mod.CapacitorMusicControls || mod.default || mod;
    return plugin;
  } catch (e) {
    console.warn('[NativeMusicControls] plugin unavailable:', e);
    return null;
  }
}

function resolveCover(coverIndex: number): string {
  const src = albumCovers[coverIndex] || albumCovers[0];
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

/** Subscribe to button presses coming from the native notification. */
export function onMusicControlAction(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

async function bindControlListener() {
  if (listenersBound) return;
  const p = await getPlugin();
  if (!p) return;
  try {
    p.addListener('controlsNotification', (info: any) => {
      const message: string = info?.message || '';
      // Plugin emits messages like 'music-controls-play', 'music-controls-pause',
      // 'music-controls-next', 'music-controls-previous', 'music-controls-destroy',
      // 'music-controls-toggle-play-pause', 'music-controls-headset-unplugged' …
      let action: 'play' | 'pause' | 'next' | 'previous' | 'destroy' | null = null;
      if (message.includes('next')) action = 'next';
      else if (message.includes('previous')) action = 'previous';
      else if (message.includes('toggle-play-pause')) action = 'play'; // toggled, listener decides
      else if (message.includes('pause')) action = 'pause';
      else if (message.includes('headset-unplugged')) action = 'pause';
      else if (message.includes('play')) action = 'play';
      else if (message.includes('destroy')) action = 'destroy';
      if (action) listeners.forEach((cb) => cb(action!));
    });
    listenersBound = true;
  } catch (e) {
    console.warn('[NativeMusicControls] addListener failed:', e);
  }
}

/** Show / refresh the lockscreen + notification card for the current song. */
export async function showMusicControls(song: Song, isPlaying: boolean) {
  const p = await getPlugin();
  if (!p) return;
  await bindControlListener();
  try {
    // Destroy any previous notification so the artwork & metadata fully refresh
    try { await p.destroy(); } catch { /* ignore */ }

    await p.create({
      track: song.title || 'Unknown Title',
      artist: song.artist || 'Unknown Artist',
      album: song.album || '',
      cover: resolveCover(song.coverIndex),
      isPlaying,

      // Buttons shown in the notification
      hasPrev: true,
      hasNext: true,
      hasClose: false,
      hasSkipForward: false,
      hasSkipBackward: false,
      hasScrubbing: false,

      // Android styling — make it persistent so it survives screen off
      dismissable: false,
      ticker: `Now playing: ${song.artist} - ${song.title}`,
      playIcon: 'media_play',
      pauseIcon: 'media_pause',
      prevIcon: 'media_prev',
      nextIcon: 'media_next',
      closeIcon: 'media_close',
      notificationIcon: 'notification',
    });
  } catch (e) {
    console.warn('[NativeMusicControls] create failed:', e);
  }
}

/** Update only the play/pause state (cheaper than re-creating the notification). */
export async function updateMusicControlsPlayState(isPlaying: boolean) {
  const p = await getPlugin();
  if (!p) return;
  try {
    await p.updateIsPlaying({ isPlaying });
  } catch (e) {
    // Some plugin versions accept a boolean directly
    try { await p.updateIsPlaying(isPlaying); } catch { /* ignore */ }
  }
}

/** Tear the notification down (e.g. when no song is loaded). */
export async function hideMusicControls() {
  const p = await getPlugin();
  if (!p) return;
  try { await p.destroy(); } catch { /* ignore */ }
}
