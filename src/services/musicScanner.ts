import { Capacitor } from '@capacitor/core';
import type { Song } from '@/store/playerStore';
import { saveAudioBlob } from './audioStorage';

// Helper to check Android SDK version
async function getAndroidSdkVersion(): Promise<number> {
  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    return parseInt(info.osVersion, 10) || 0;
  } catch {
    return 0;
  }
}

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
    
    // Request permissions — handles READ_MEDIA_AUDIO (Android 13+) and READ_EXTERNAL_STORAGE (older)
    const permResult = await CapacitorMediaStore.requestPermissions();
    console.log('[MusicScanner] Permission result:', JSON.stringify(permResult));

    const sdkVersion = await getAndroidSdkVersion();
    console.log('[MusicScanner] Android SDK version:', sdkVersion);

    // Scan both internal storage and SD card (external)
    const result = await CapacitorMediaStore.getMediasByType({
      mediaType: 'audio' as any,
      limit: 2000,
      includeExternal: true,
    });

    console.log('[MusicScanner] Raw result keys:', Object.keys(result));

    let files: MediaStoreFile[] = (result as any)?.media ?? (result as any)?.medias ?? (result as any)?.files ?? [];
    
    // If result is an array directly
    if (Array.isArray(result)) {
      files = result;
    }

    console.log('[MusicScanner] Found', files.length, 'audio files');
    if (files.length > 0) {
      console.log('[MusicScanner] Sample file:', JSON.stringify(files[0]));
      // Log paths to verify SD card inclusion
      const paths = files.slice(0, 5).map(f => f.path);
      console.log('[MusicScanner] Sample paths:', paths);
    }

    const songs: Song[] = files
      .filter(file => file.path) // only include files with valid paths
      .map((file, index) => ({
        id: file.id ?? `device-${index}-${file.path}`,
        title: file.title ?? file.path?.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Unknown Title',
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
