'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Play, Pause, Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LevelBadge from '@/components/LevelBadge'
import type { Recording, Visibility } from '@/types/database'
import { EXPERIENCE_LABELS } from '@/lib/level'

const MAX_RECORD_SEC = 180

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RecordPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<{ recording_count: number } | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [piece, setPiece] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [saving, setSaving] = useState(false)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('recording_count').eq('id', user.id).single()
    setProfile(prof)
    const { data: recs } = await supabase
      .from('recordings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setRecordings(recs ?? [])
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    chunksRef.current = []
    mr.ondataavailable = e => chunksRef.current.push(e.data)
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
    }
    mr.start(100)
    mediaRef.current = mr
    setElapsed(0)
    setRecording(true)
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e >= MAX_RECORD_SEC - 1) {
          stopRecording()
          return e
        }
        return e + 1
      })
    }, 1000)
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRef.current?.stop()
    setRecording(false)
  }

  function discardRecording() {
    setAudioBlob(null)
    setElapsed(0)
    setPiece('')
    setNote('')
  }

  async function saveRecording() {
    if (!audioBlob || !piece) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) return

      const path = `${user.id}/${Date.now()}.webm`
      const { error: uploadErr } = await supabase.storage.from('recordings').upload(path, audioBlob)
      if (uploadErr) throw uploadErr

      const { getLevel } = await import('@/lib/level')
      const level = getLevel(prof.recording_count)

      await supabase.from('recordings').insert({
        user_id: user.id,
        piece,
        note: note || null,
        visibility,
        duration_sec: elapsed,
        audio_path: path,
        level_n: level.n,
        level_title: level.title,
        experience: prof.experience,
      })

      await supabase.from('profiles').update({ recording_count: prof.recording_count + 1 }).eq('id', user.id)

      discardRecording()
      loadData()
    } finally {
      setSaving(false)
    }
  }

  async function playRecording(rec: Recording) {
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const { data } = await supabase.storage.from('recordings').createSignedUrl(rec.audio_path, 60)
    if (!data?.signedUrl) return
    const audio = new Audio(data.signedUrl)
    audioRef.current = audio
    audio.onended = () => setPlayingId(null)
    audio.play()
    setPlayingId(rec.id)
  }

  async function deleteRecording(rec: Recording) {
    await supabase.storage.from('recordings').remove([rec.audio_path])
    await supabase.from('recordings').delete().eq('id', rec.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && profile) {
      await supabase.from('profiles').update({ recording_count: Math.max(0, profile.recording_count - 1) }).eq('id', user.id)
    }
    setRecordings(r => r.filter(x => x.id !== rec.id))
    loadData()
  }

  const VISIBILITIES: { value: Visibility; label: string }[] = [
    { value: 'public', label: '公開' },
    { value: 'private', label: '自分のみ' },
  ]

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">録音</h1>

      {profile && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)' }}>
          <LevelBadge recordingCount={profile.recording_count} showProgress />
        </div>
      )}

      {/* Recorder */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">マイク録音</h2>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>最大{MAX_RECORD_SEC / 60}分</span>
        </div>

        {!audioBlob ? (
          <>
            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(elapsed / MAX_RECORD_SEC) * 100}%`, background: recording ? '#ef4444' : 'var(--primary)' }}
              />
            </div>
            <div className="text-4xl font-mono font-bold text-center">{fmt(elapsed)}</div>

            {!recording ? (
              <button
                onClick={startRecording}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white"
                style={{ background: '#ef4444' }}
              >
                <Mic size={20} />録音開始
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white animate-pulse"
                style={{ background: '#ef4444' }}
              >
                <Square size={20} />録音停止
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--primary-light)' }}>
              録音完了（{fmt(elapsed)}）
            </p>
            <input
              type="text"
              placeholder="曲名 *"
              value={piece}
              onChange={e => setPiece(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <input
              type="text"
              placeholder="一言メモ（任意）"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <div className="flex gap-2">
              {VISIBILITIES.map(v => (
                <button
                  key={v.value}
                  onClick={() => setVisibility(v.value)}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
                  style={{
                    background: visibility === v.value ? 'var(--primary)' : 'var(--surface2)',
                    color: visibility === v.value ? '#fff' : 'var(--muted)',
                    border: `1px solid ${visibility === v.value ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={discardRecording}
                className="rounded-2xl px-4 py-4 font-semibold"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={saveRecording}
                disabled={!piece || saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white disabled:opacity-40"
                style={{ background: 'var(--primary)' }}
              >
                <Save size={18} />{saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* My recordings */}
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">自分の録音</h2>
        {recordings.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>まだ録音がありません</p>
        )}
        {recordings.map(rec => (
          <div
            key={rec.id}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'var(--surface)' }}
          >
            <button
              onClick={() => playRecording(rec)}
              className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
              style={{ background: 'var(--primary)' }}
            >
              {playingId === rec.id ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">{rec.piece}</span>
                <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                  {rec.visibility === 'public' ? '公開' : '非公開'}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {fmt(rec.duration_sec)} · Lv.{rec.level_n} {rec.level_title} · {rec.created_at.slice(0, 10)}
              </div>
            </div>
            <button
              onClick={() => deleteRecording(rec)}
              className="p-2 rounded-lg transition-opacity hover:opacity-70 flex-shrink-0"
              style={{ color: 'var(--muted)' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
