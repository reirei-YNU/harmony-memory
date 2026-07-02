import { useEffect, useState } from 'react'
import type { Recording } from '../types'
import { LevelBadge } from './LevelBadge'
import { AudioPlayer } from './AudioPlayer'
import { formatBytes, formatDuration } from '../lib/audio'
import { getRecordingPlaybackUrl } from '../lib/recordings'

export function RecordingListItem({
  recording,
  songTitle,
}: {
  recording: Recording
  songTitle?: string
}) {
  const [open, setOpen] = useState(false)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const createdDate = recording.createdAt
    ? new Date(recording.createdAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  useEffect(() => {
    if (!open || playbackUrl) return
    let cancelled = false
    getRecordingPlaybackUrl(recording.storagePath)
      .then((url) => {
        if (!cancelled) setPlaybackUrl(url)
      })
      .catch((err) => {
        if (!cancelled) {
          setUrlError(err instanceof Error ? err.message : '再生用URLの取得に失敗しました')
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, playbackUrl, recording.storagePath])

  return (
    <li className="recording-item">
      <button
        type="button"
        className="recording-item-header"
        onClick={() => setOpen((v) => !v)}
      >
        <LevelBadge level={recording.level} />
        <div className="recording-item-main">
          <span className="recording-item-title">
            {songTitle ? `${songTitle}` : recording.title || '無題の録音'}
          </span>
          <span className="recording-item-meta">
            {recording.createdByName} ・ {createdDate} ・ {formatDuration(recording.durationSec)} ・{' '}
            {formatBytes(recording.sizeBytes)}
          </span>
        </div>
        <span className="recording-item-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="recording-item-body">
          {recording.title && songTitle && (
            <p className="recording-item-note-title">{recording.title}</p>
          )}
          {recording.memo && <p className="recording-item-memo">{recording.memo}</p>}
          {urlError && <p className="error-text">{urlError}</p>}
          {playbackUrl ? <AudioPlayer src={playbackUrl} /> : !urlError && <p className="muted">読み込み中...</p>}
        </div>
      )}
    </li>
  )
}
