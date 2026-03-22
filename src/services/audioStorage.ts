/**
 * IndexedDB storage for audio files and song metadata persistence.
 */

const DB_NAME = 'bob-evan-music';
const DB_VERSION = 1;
const AUDIO_STORE = 'audio-blobs';
const SONGS_KEY = 'bob-evan-songs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    tx.objectStore(AUDIO_STORE).put({ id, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const req = tx.objectStore(AUDIO_STORE).get(id);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    tx.objectStore(AUDIO_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function saveSongsMetadata(songs: { id: string; title: string; artist: string; album: string; duration: string; coverIndex: number; category: string; filePath?: string }[]) {
  try {
    localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
  } catch (e) {
    console.error('[AudioStorage] Failed to save songs metadata:', e);
  }
}

export function loadSongsMetadata(): any[] {
  try {
    const data = localStorage.getItem(SONGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
