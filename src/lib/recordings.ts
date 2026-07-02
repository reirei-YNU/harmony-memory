import { supabase } from '../supabase'
import { mapSong, type SongRow } from './mappers'
import type { Song } from '../types'

export async function createSong(
  groupId: string,
  title: string,
  composer: string | undefined,
  createdBy: string,
): Promise<Song> {
  const { data, error } = await supabase
    .from('songs')
    .insert({
      group_id: groupId,
      title: title.trim(),
      composer: composer?.trim() || null,
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return mapSong(data as SongRow)
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
  const storagePath = `${input.groupId}/${input.songId}/${recordingId}.${input.fileExtension}`

  // supabase-js storage upload doesn't expose progress callbacks; report
  // start/finish so callers can still show a busy state.
  input.onProgress?.(0)
  const { error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(storagePath, input.blob, { contentType: input.blob.type })
  if (uploadError) throw uploadError
  input.onProgress?.(1)

  const { error: insertError } = await supabase.from('recordings').insert({
    id: recordingId,
    group_id: input.groupId,
    song_id: input.songId,
    level: input.level,
    title: input.title?.trim() || null,
    memo: input.memo?.trim() || null,
    storage_path: storagePath,
    duration_sec: input.durationSec,
    size_bytes: input.blob.size,
    created_by: input.createdBy,
    created_by_name: input.createdByName,
  })
  if (insertError) {
    await supabase.storage.from('recordings').remove([storagePath])
    throw insertError
  }
}

export async function getRecordingPlaybackUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('recordings')
    .createSignedUrl(storagePath, 60 * 60)
  if (error) throw error
  return data.signedUrl
}
