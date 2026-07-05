// Fully local (per-browser) storage via IndexedDB. There is no backend:
// everything the app knows about lives on this device only.

const DB_NAME = 'harmony-memory'
const DB_VERSION = 1
const SONGS_STORE = 'songs'
const RECORDINGS_STORE = 'recordings'
const SETTINGS_STORE = 'settings'
const LEVELS_KEY = 'levels'

export const DEFAULT_LEVELS = ['初級', '中級', '上級', '発表会用']

export interface Song {
  id: string
  title: string
  composer?: string
  goal?: string
  createdAt: number
}

export interface Recording {
  id: string
  songId: string
  level: string
  title?: string
  memo?: string
  blob: Blob
  mimeType: string
  durationSec: number
  sizeBytes: number
  createdAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(SONGS_STORE)) {
        db.createObjectStore(SONGS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        const store = db.createObjectStore(RECORDINGS_STORE, { keyPath: 'id' })
        store.createIndex('songId', 'songId')
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function runTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const req = fn(tx.objectStore(storeName))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------

export async function listSongs(): Promise<Song[]> {
  const rows = await runTx<Song[]>(SONGS_STORE, 'readonly', (s) => s.getAll())
  return rows.sort((a, b) => a.title.localeCompare(b.title, 'ja'))
}

export async function saveSong(song: Song): Promise<void> {
  await runTx(SONGS_STORE, 'readwrite', (s) => s.put(song))
}

export async function deleteSong(id: string): Promise<void> {
  await runTx(SONGS_STORE, 'readwrite', (s) => s.delete(id))
}

// ---------------------------------------------------------------------------
// Recordings
// ---------------------------------------------------------------------------

export async function listRecordings(): Promise<Recording[]> {
  const rows = await runTx<Recording[]>(RECORDINGS_STORE, 'readonly', (s) => s.getAll())
  return rows.sort((a, b) => b.createdAt - a.createdAt)
}

export async function saveRecording(recording: Recording): Promise<void> {
  await runTx(RECORDINGS_STORE, 'readwrite', (s) => s.put(recording))
}

export async function deleteRecording(id: string): Promise<void> {
  await runTx(RECORDINGS_STORE, 'readwrite', (s) => s.delete(id))
}

// ---------------------------------------------------------------------------
// Settings (custom level labels)
// ---------------------------------------------------------------------------

export async function getLevels(): Promise<string[]> {
  const row = await runTx<{ key: string; value: string[] } | undefined>(
    SETTINGS_STORE,
    'readonly',
    (s) => s.get(LEVELS_KEY),
  )
  return row?.value ?? DEFAULT_LEVELS
}

export async function addLevel(level: string): Promise<string[]> {
  const current = await getLevels()
  if (current.includes(level)) return current
  const next = [...current, level]
  await runTx(SETTINGS_STORE, 'readwrite', (s) =>
    s.put({ key: LEVELS_KEY, value: next }),
  )
  return next
}

export async function estimateStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number | null }> {
  if (navigator.storage?.estimate) {
    const { usage, quota } = await navigator.storage.estimate()
    return { usedBytes: usage ?? 0, quotaBytes: quota ?? null }
  }
  return { usedBytes: 0, quotaBytes: null }
}
