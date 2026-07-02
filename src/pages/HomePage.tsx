import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { useSongs } from '../hooks/useSongs'
import { useRecordings } from '../hooks/useRecordings'
import { useGroupStorageUsage } from '../hooks/useGroupStorageUsage'
import { StorageMeter } from '../components/StorageMeter'
import { RecordingListItem } from '../components/RecordingListItem'
import type { Recording } from '../types'

type ViewMode = 'song' | 'level'

interface Section {
  key: string
  heading: string
  recordings: Recording[]
}

export function HomePage() {
  const { user, logOut } = useAuth()
  const { activeGroup } = useGroup()
  const { songs } = useSongs(activeGroup?.id)
  const { recordings } = useRecordings(activeGroup?.id)
  const storageUsage = useGroupStorageUsage(recordings)

  const [viewMode, setViewMode] = useState<ViewMode>('song')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set())
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest')

  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])
  const levels = useMemo(() => activeGroup?.levels ?? [], [activeGroup])

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

    // group by level
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

  if (!activeGroup) return null

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{activeGroup.name}</h1>
          <p className="muted">招待コード: {activeGroup.inviteCode}</p>
        </div>
        <div className="page-header-actions">
          <span className="muted">{user?.displayName}</span>
          <button type="button" onClick={() => logOut()}>
            ログアウト
          </button>
        </div>
      </header>

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
        <Link to="/group" className="btn-secondary">
          グループ設定
        </Link>
      </div>

      {sections.length === 0 && (
        <p className="empty-state">まだ録音がありません。「+ 録音する」から始めましょう。</p>
      )}

      {sections.map((section) => (
        <section key={section.key} className="song-section">
          <h2 className="song-section-heading">{section.heading}</h2>
          <ul className="recording-list">
            {section.recordings.map((r) => (
              <RecordingListItem
                key={r.id}
                recording={r}
                songTitle={viewMode === 'level' ? songMap.get(r.songId)?.title : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
