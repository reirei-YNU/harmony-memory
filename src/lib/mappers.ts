import type { Group, Recording, Song } from '../types'

export interface GroupRow {
  id: string
  name: string
  invite_code: string
  owner_id: string
  levels: string[]
  created_at: string
}

export function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    levels: row.levels,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export interface SongRow {
  id: string
  group_id: string
  title: string
  composer: string | null
  created_by: string
  created_at: string
}

export function mapSong(row: SongRow): Song {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    composer: row.composer ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export interface RecordingRow {
  id: string
  group_id: string
  song_id: string
  level: string
  title: string | null
  memo: string | null
  storage_path: string
  duration_sec: number
  size_bytes: number
  created_by: string
  created_by_name: string
  created_at: string
}

export function mapRecording(row: RecordingRow): Recording {
  return {
    id: row.id,
    groupId: row.group_id,
    songId: row.song_id,
    level: row.level,
    title: row.title ?? undefined,
    memo: row.memo ?? undefined,
    storagePath: row.storage_path,
    durationSec: Number(row.duration_sec),
    sizeBytes: Number(row.size_bytes),
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: new Date(row.created_at).getTime(),
  }
}
