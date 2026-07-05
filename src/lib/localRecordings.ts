// Purely local (per-browser) recording storage via IndexedDB, used by the
// no-login /try page. Independent of Supabase — nothing here is shared or
// synced, it just survives page reloads on this device.

const DB_NAME = 'harmony-memory-local'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

export interface LocalRecording {
  id: string
  title: string
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
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listLocalRecordings(): Promise<LocalRecording[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const rows = req.result as LocalRecording[]
      resolve(rows.sort((a, b) => b.createdAt - a.createdAt))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveLocalRecording(recording: LocalRecording): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(recording)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteLocalRecording(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
