import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSongs } from '../hooks/useSongs'
import { useRecordings } from '../hooks/useRecordings'
import { useLevels } from '../hooks/useLevels'
import { useStorageUsage } from '../hooks/useStorageUsage'
import { StorageMeter } from '../components/StorageMeter'
import { StatsWidget } from '../components/StatsWidget'
import { CalendarWidget } from '../components/CalendarWidget'
import { RecordingListItem } from '../components/RecordingListItem'
import { deleteRecording, saveSong, type Recording } from '../lib/db'

type ViewMode = 'song' | 'level'

interface Section {
  key: string
  heading: string
  recordings: Recording[]
}

export function HomePage() {
  const { songs, refresh: refreshSongs } = useSongs()
  const { recordings, refresh: refreshRecordings } = useRecordings()
  const { levels } = useLevels()
  const storageUsage = useStorageUsage([recordings.length])

  const [viewMode, setViewMode] = useState<ViewMode>('song')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set())
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest')
  const [editingGoalSongId, setEditingGoalSongId] = useState<string | null>(null)
  const [goalDraft, setGoalDraft] = useState('')

  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])

  function toggleLevelFilter(level: string) {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recordings.filter((r) => {
      if (levelFilter.size > 0 && !levelFilter.has(r.level)) return false
      if (!q) return true
      const song = songMap.get(r.songId)
      const haystack = `${song?.title ?? ''} ${r.title ?? ''} ${r.memo ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [recordings, levelFilter, search, songMap])

  const sections = useMemo<Section[]>(() => {
    const sorted = [...filtered].sort((a, b) =>
      dateSort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    )

    if (viewMode === 'song') {
      const bySong = new Map<string, Recording[]>()
      for (const r of sorted) {
        const list = bySong.get(r.songId) ?? []
        list.push(r)
        bySong.set(r.songId, list)
      }
      return Array.from(bySong.entries())
        .map(([songId, recs]) => ({
          key: songId,
          heading: songMap.get(songId)?.title ?? '(不明な曲)',
          recordings: recs.sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level)),
        }))
        .sort((a, b) => a.heading.localeCompare(b.heading, 'ja'))
    }

    const byLevel = new Map<string, Recording[]>()
    for (const r of sorted) {
      const list = byLevel.get(r.level) ?? []
      list.push(r)
      byLevel.set(r.level, list)
    }
    return Array.from(byLevel.entries())
      .map(([level, recs]) => ({ key: level, heading: level, recordings: recs }))
      .sort((a, b) => levels.indexOf(a.key) - levels.indexOf(b.key))
  }, [filtered, viewMode, dateSort, songMap, levels])

  async function handleDeleteRecording(id: string) {
    await deleteRecording(id)
    await refreshRecordings()
  }

  function startEditingGoal(songId: string, currentGoal?: string) {
    setEditingGoalSongId(songId)
    setGoalDraft(currentGoal ?? '')
  }

  async function saveGoal(songId: string) {
    const song = songMap.get(songId)
    if (!song) return
    await saveSong({ ...song, goal: goalDraft.trim() || undefined })
    setEditingGoalSongId(null)
    await refreshSongs()
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Harmony Memory</h1>
        <p className="muted">練習の記録</p>
      </header>

      <StatsWidget recordings={recordings} />
      <CalendarWidget recordings={recordings} />
      <StorageMeter {...storageUsage} />

      <div className="toolbar">
        <input
          type="search"
          placeholder="曲名・メモで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'song' ? 'active' : ''}
            onClick={() => setViewMode('song')}
          >
            曲ごと
          </button>
          <button
            type="button"
            className={viewMode === 'level' ? 'active' : ''}
            onClick={() => setViewMode('level')}
          >
            レベルごと
          </button>
        </div>
        <select value={dateSort} onChange={(e) => setDateSort(e.target.value as 'newest' | 'oldest')}>
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
        </select>
      </div>

      <div className="level-filter-chips">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            className={`chip ${levelFilter.has(level) ? 'chip--active' : ''}`}
            onClick={() => toggleLevelFilter(level)}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="fab-row">
        <Link to="/record" className="btn-primary">
          + 録音する
        </Link>
      </div>

      {sections.length === 0 && (
        <p className="empty-state">まだ録音がありません。「+ 録音する」から始めましょう。</p>
      )}

      {sections.map((section) => {
        const song = viewMode === 'song' ? songMap.get(section.key) : undefined
        return (
          <section key={section.key} className="song-section">
            <h2 className="song-section-heading">{section.heading}</h2>
            {viewMode === 'song' && song && (
              <div className="song-goal">
                {editingGoalSongId === song.id ? (
                  <div className="field-row">
                    <input
                      type="text"
                      placeholder="目標・メモ（例: 次はテンポを安定させる）"
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      autoFocus
                    />
                    <button type="button" onClick={() => saveGoal(song.id)}>
                      保存
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="song-goal-display"
                    onClick={() => startEditingGoal(song.id, song.goal)}
                  >
                    {song.goal || '目標・メモを追加...'}
                  </button>
                )}
              </div>
            )}
            <ul className="recording-list">
              {section.recordings.map((r) => (
                <RecordingListItem
                  key={r.id}
                  recording={r}
                  songTitle={viewMode === 'level' ? songMap.get(r.songId)?.title : undefined}
                  onDelete={handleDeleteRecording}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
