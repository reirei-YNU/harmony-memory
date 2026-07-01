export interface Group {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  memberIds: string[]
  levels: string[]
  createdAt: number
}

export interface Song {
  id: string
  groupId: string
  title: string
  composer?: string
  createdBy: string
  createdAt: number
}

export interface Recording {
  id: string
  groupId: string
  songId: string
  level: string
  title?: string
  memo?: string
  storagePath: string
  downloadURL: string
  durationSec: number
  sizeBytes: number
  createdBy: string
  createdByName: string
  createdAt: number
}

export interface Member {
  uid: string
  displayName: string
}

export const DEFAULT_LEVELS = ['初級', '中級', '上級', '発表会用']

export type SortKey = 'song' | 'level' | 'newest' | 'oldest'
