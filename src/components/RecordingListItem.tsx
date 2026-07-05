import { useEffect, useMemo, useState } from 'react'
import type { Recording } from '../lib/db'
import { LevelBadge } from './LevelBadge'
import { AudioPlayer } from './AudioPlayer'
import { formatBytes, formatDuration } from '../lib/audio'

export function RecordingListItem({
  recording,
  songTitle,
  onDelete,
}: {
  recording: Recording
  songTitle?: string
  onDelete?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const playbackUrl = useMemo(() => URL.createObjectURL(recording.blob), [recording.blob])

  useEffect(() => {
    return () => URL.revokeObjectURL(playbackUrl)
  }, [playbackUrl])

  const createdDate = recording.createdAt
    ? new Date(recording.createdAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

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
            {createdDate} ・ {formatDuration(recording.durationSec)} ・{' '}
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
          <AudioPlayer src={playbackUrl} />
          {onDelete && (
            <button type="button" onClick={() => onDelete(recording.id)}>
              削除
            </button>
          )}
        </div>
      )}
    </li>
  )
}
