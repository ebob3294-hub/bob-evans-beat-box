import { Capacitor } from '@capacitor/core';
import type { Song } from '@/store/playerStore';

interface MediaStoreFile {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  path?: string;
  mimeType?: string;
}

/**
 * Scans the device for music files using the CapacitorMediaStore plugin (Android).
 * Falls back gracefully in web/browser environments.
 */
export async function scanDeviceMusic(): Promise<Song[]> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[MusicScanner] Not a native platform — skipping device scan.');
    return [];
  }

  try {
    // Dynamically import to avoid errors on web
    const { CapacitorMediaStore } = await import('@odion-cloud/capacitor-mediastore');

    // Request permission
    const permResult = await CapacitorMediaStore.requestPermissions();
    console.log('[MusicScanner] Permission result:', permResult);

    // Get all audio files
    const result = await CapacitorMediaStore.getMediasByType({
      mediaType: 'audio' as any,
      limit: 500,
      includeExternal: true,
    });

    const files: MediaStoreFile[] = (result as any)?.media ?? (result as any)?.medias ?? [];

    const songs: Song[] = files.map((file, index) => ({
      id: file.id ?? `device-${index}`,
      title: file.title ?? 'Unknown Title',
      artist: file.artist ?? 'Unknown Artist',
      album: file.album ?? 'Unknown Album',
      duration: formatDuration(file.duration ?? 0),
      coverIndex: index % 5,
      category: 'All',
      filePath: file.path,
    }));

    return songs;
  } catch (err) {
    console.error('[MusicScanner] Error scanning music:', err);
    return [];
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * For web fallback: let users pick files manually via file input
 */
export function pickMusicFiles(): Promise<Song[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      const songs: Song[] = files.map((file, i) => ({
        id: `local-${Date.now()}-${i}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        artist: 'Local File',
        album: 'My Music',
        duration: '0:00',
        coverIndex: i % 5,
        category: 'All',
      }));
      resolve(songs);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}
