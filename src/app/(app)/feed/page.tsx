'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Recording, Comment } from '@/types/database'
import { EXPERIENCE_LABELS } from '@/lib/level'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function FeedPage() {
  const supabase = createClient()
  const [recordings, setRecordings] = useState<(Recording & { profiles: { display_name: string; experience: string } | null })[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [myId, setMyId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    loadFeed()
  }, [])

  async function loadFeed() {
    const { data: { user } } = await supabase.auth.getUser()
    setMyId(user?.id ?? null)
    const { data } = await supabase
      .from('recordings')
      .select('*, profiles(display_name, experience)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(50)
    setRecordings((data as typeof recordings) ?? [])
  }

  async function playRec(rec: Recording) {
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    audioRef.current?.pause()
    const { data } = await supabase.storage.from('recordings').createSignedUrl(rec.audio_path, 60)
    if (!data?.signedUrl) return
    const audio = new Audio(data.signedUrl)
    audioRef.current = audio
    audio.onended = () => setPlayingId(null)
    audio.play()
    setPlayingId(rec.id)
  }

  async function loadComments(recId: string) {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(display_name)')
      .eq('recording_id', recId)
      .order('created_at', { ascending: true })
    setComments(c => ({ ...c, [recId]: (data as Comment[]) ?? [] }))
  }

  async function postComment(recId: string) {
    const text = commentText[recId]?.trim()
    if (!text) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('comments').insert({ recording_id: recId, user_id: user.id, text })
    setCommentText(t => ({ ...t, [recId]: '' }))
    loadComments(recId)
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      if (!comments[id]) loadComments(id)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">みんなの演奏</h1>

      {recordings.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>まだ公開録音がありません</p>
      )}

      {recordings.map(rec => (
        <div
          key={rec.id}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)' }}
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={() => playRec(rec)}
              className="flex h-12 w-12 items-center justify-center rounded-full flex-shrink-0"
              style={{ background: 'var(--primary)' }}
            >
              {playingId === rec.id ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{rec.piece}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {rec.profiles?.display_name ?? '匿名'} · Lv.{rec.level_n} {rec.level_title}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {EXPERIENCE_LABELS[rec.profiles?.experience ?? ''] ?? ''} · {fmt(rec.duration_sec)}
              </p>
            </div>
            <button
              onClick={() => toggleExpand(rec.id)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: expandedId === rec.id ? 'var(--primary)' : 'var(--surface2)',
                color: expandedId === rec.id ? '#fff' : 'var(--muted)',
              }}
            >
              コメント
            </button>
          </div>

          {expandedId === rec.id && (
            <div className="border-t px-4 py-3 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
              {(comments[rec.id] ?? []).length === 0 && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>まだコメントがありません。最初のコメントを送ろう！</p>
              )}
              {(comments[rec.id] ?? []).map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="flex-1">
                    <span className="text-xs font-semibold mr-2">{(c as Comment & { profiles?: { display_name: string } }).profiles?.display_name ?? '匿名'}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{c.created_at.slice(0, 10)}</span>
                    <p className="text-sm mt-1">{c.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  placeholder="アドバイスを送る..."
                  value={commentText[rec.id] ?? ''}
                  onChange={e => setCommentText(t => ({ ...t, [rec.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && postComment(rec.id)}
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
                <button
                  onClick={() => postComment(rec.id)}
                  className="rounded-xl px-3 py-2"
                  style={{ background: 'var(--primary)' }}
                >
                  <Send size={16} color="#fff" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
