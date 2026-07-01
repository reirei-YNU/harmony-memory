import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable, type UploadTaskSnapshot } from 'firebase/storage'
import { db, storage } from '../firebase'
import type { Song } from '../types'

export async function createSong(
  groupId: string,
  title: string,
  composer: string | undefined,
  createdBy: string,
): Promise<Song> {
  const songsRef = collection(db, 'songs')
  const docRef = await addDoc(songsRef, {
    groupId,
    title: title.trim(),
    composer: composer?.trim() || null,
    createdBy,
    createdAt: serverTimestamp(),
  })
  return {
    id: docRef.id,
    groupId,
    title: title.trim(),
    composer: composer?.trim() || undefined,
    createdBy,
    createdAt: Date.now(),
  }
}

export interface UploadRecordingInput {
  groupId: string
  songId: string
  level: string
  title?: string
  memo?: string
  blob: Blob
  fileExtension: string
  durationSec: number
  createdBy: string
  createdByName: string
  onProgress?: (fraction: number) => void
}

export async function uploadRecording(input: UploadRecordingInput): Promise<void> {
  const recordingId = crypto.randomUUID()
  const storagePath = `groups/${input.groupId}/songs/${input.songId}/${recordingId}.${input.fileExtension}`
  const storageRef = ref(storage, storagePath)

  const task = uploadBytesResumable(storageRef, input.blob, {
    contentType: input.blob.type,
  })

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        input.onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes)
      },
      reject,
      () => resolve(),
    )
  })

  const downloadURL = await getDownloadURL(storageRef)

  await setDoc(doc(db, 'recordings', recordingId), {
    groupId: input.groupId,
    songId: input.songId,
    level: input.level,
    title: input.title?.trim() || null,
    memo: input.memo?.trim() || null,
    storagePath,
    downloadURL,
    durationSec: input.durationSec,
    sizeBytes: input.blob.size,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
  })
}
