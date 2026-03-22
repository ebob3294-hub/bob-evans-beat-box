import { Capacitor } from '@capacitor/core';
import type { Song } from '@/store/playerStore';
import { saveAudioBlob } from './audioStorage';

interface MediaStoreFile {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  path?: string;
  mimeType?: string;
}

export async function scanDeviceMusic(): Promise<Song[]> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[MusicScanner] Not a native platform — skipping device scan.');
    return [];
  }

  try {
    const { CapacitorMediaStore } = await import('@odion-cloud/capacitor-mediastore');
    const permResult = await CapacitorMediaStore.requestPermissions();
    console.log('[MusicScanner] Permission result:', permResult);

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

function getAudioDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.onloadedmetadata = () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      URL.revokeObjectURL(url);
      resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('0:00');
    };
  });
}

export function pickMusicFiles(): Promise<Song[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const songs: Song[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = `local-${Date.now()}-${i}`;
        const duration = await getAudioDuration(file);

        // Save audio blob to IndexedDB for persistence
        await saveAudioBlob(id, file);

        songs.push({
          id,
          title: file.name.replace(/\.[^.]+$/, ''),
          artist: 'Local File',
          album: 'My Music',
          duration,
          coverIndex: i % 5,
          category: 'All',
        });
      }

      resolve(songs);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}
