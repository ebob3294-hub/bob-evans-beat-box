import { Capacitor } from '@capacitor/core';
import type { Song } from '@/store/playerStore';
import { saveAudioBlob } from './audioStorage';

type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

interface MediaPermissionStatus {
  readExternalStorage?: PermissionState;
  readMediaAudio?: PermissionState;
  publicStorage?: PermissionState;
  status?: PermissionState;
}

interface MediaStorePlugin {
  checkPermissions?: () => Promise<MediaPermissionStatus>;
  requestPermissions: (options?: { types?: string[]; permissions?: string[] }) => Promise<MediaPermissionStatus>;
  getMediasByType: (options: {
    mediaType: 'audio';
    limit?: number;
    sortBy?: 'DATE_ADDED' | 'DATE_MODIFIED' | 'DISPLAY_NAME' | 'SIZE' | 'TITLE';
    sortOrder?: 'ASC' | 'DESC';
    includeExternal?: boolean;
  }) => Promise<{ media?: MediaStoreFile[] } | MediaStoreFile[]>;
}

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
  uri?: string;
  displayName?: string;
  mimeType?: string;
  isExternal?: boolean;
}

function isGranted(value: PermissionState | undefined): boolean {
  return value === 'granted';
}

function hasAudioPermission(status: MediaPermissionStatus | null | undefined): boolean {
  if (!status) return false;
  // Accept any "granted" signal across plugin versions / Android versions
  return (
    isGranted(status.readMediaAudio) ||
    isGranted(status.readExternalStorage) ||
    isGranted(status.publicStorage) ||
    isGranted(status.status)
  );
}

async function ensureAudioPermission(plugin: MediaStorePlugin): Promise<boolean> {
  try {
    const currentStatus = await plugin.checkPermissions?.();
    console.log('[MusicScanner] Current permissions:', JSON.stringify(currentStatus));
    if (hasAudioPermission(currentStatus)) {
      return true;
    }
  } catch (e) {
    console.warn('[MusicScanner] checkPermissions failed:', e);
  }

  try {
    const requestStatus = await plugin.requestPermissions({ types: ['audio'] });
    console.log('[MusicScanner] After request:', JSON.stringify(requestStatus));
    if (hasAudioPermission(requestStatus)) {
      return true;
    }
  } catch (e) {
    console.warn('[MusicScanner] requestPermissions(audio) failed, retrying with no args:', e);
    try {
      const fallback = await plugin.requestPermissions();
      console.log('[MusicScanner] Fallback request:', JSON.stringify(fallback));
      if (hasAudioPermission(fallback)) return true;
    } catch (err) {
      console.error('[MusicScanner] Fallback requestPermissions failed:', err);
    }
  }

  // Final check
  try {
    const finalStatus = await plugin.checkPermissions?.();
    return hasAudioPermission(finalStatus);
  } catch {
    return false;
  }
}

function stripExtension(value: string): string {
  return value.replace(/\.[^.]+$/, '');
}

function getSongSource(file: MediaStoreFile): string | undefined {
  return file.path ?? file.uri;
}

function mapMediaFileToSong(file: MediaStoreFile, index: number): Song | null {
  const source = getSongSource(file);
  if (!source) return null;

  const fallbackName = source.split('/').pop()?.split('?')[0] ?? 'Unknown Title';

  return {
    id: file.id ?? source ?? `device-${index}`,
    title: stripExtension(file.title ?? file.displayName ?? fallbackName),
    artist: file.artist ?? 'Unknown Artist',
    album: file.album ?? 'Unknown Album',
    duration: formatDuration(file.duration ?? 0),
    coverIndex: index % 5,
    category: 'All',
    filePath: source,
  };
}

export async function openAppSettings(): Promise<void> {
  try {
    const { NativeSettings, AndroidSettings } = await import('capacitor-native-settings');
    await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
  } catch (err) {
    console.error('[MusicScanner] Failed to open app settings:', err);
  }
}

export async function scanDeviceMusic(): Promise<Song[]> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[MusicScanner] Not a native platform — skipping device scan.');
    return [];
  }

  try {
    const { CapacitorMediaStore } = await import('@odion-cloud/capacitor-mediastore');
    const mediaStore = CapacitorMediaStore as MediaStorePlugin;

    const sdkVersion = await getAndroidSdkVersion();
    console.log('[MusicScanner] Android version:', sdkVersion);

    const granted = await ensureAudioPermission(mediaStore);
    console.log('[MusicScanner] Audio permission granted:', granted);

    if (!granted) {
      console.warn('[MusicScanner] ⚠️ Audio permission denied. The "Music and audio" permission may not be declared in AndroidManifest.xml. See ANDROID_PERMISSIONS_FIX.md');
      throw new Error('MUSIC_PERMISSION_DENIED');
    }

    const result = await mediaStore.getMediasByType({
      mediaType: 'audio',
      limit: 5000,
      sortBy: 'TITLE',
      sortOrder: 'ASC',
      includeExternal: true,
    });

    let files: MediaStoreFile[] = (result as any)?.media ?? (result as any)?.medias ?? (result as any)?.files ?? [];
    if (Array.isArray(result)) {
      files = result;
    }

    console.log('[MusicScanner] Found', files.length, 'audio files');
    if (files.length > 0) {
      console.log('[MusicScanner] Sample file:', JSON.stringify(files[0]));
    }

    const songs = files
      .map(mapMediaFileToSong)
      .filter((song): song is Song => Boolean(song));

    const uniqueSongs = songs.filter((song, index, array) =>
      array.findIndex((candidate) => candidate.filePath === song.filePath) === index,
    );

    console.log('[MusicScanner] Imported songs:', uniqueSongs.length);
    return uniqueSongs;
  } catch (err) {
    if (err instanceof Error && err.message === 'MUSIC_PERMISSION_DENIED') {
      throw err;
    }
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
