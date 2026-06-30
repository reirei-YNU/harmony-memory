'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Play, Square, Plus, Trash2, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PracticeSession } from '@/types/database'

function fmt(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}時間${m}分`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  return `${m}m`
}

export default function HomePage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [piece, setPiece] = useState('')
  const [note, setNote] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manualMin, setManualMin] = useState('')
  const [manualPiece, setManualPiece] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const since = new Date()
    since.setDate(since.getDate() - 6)
    const { data } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: false })
    setSessions(data ?? [])
  }

  function startTimer() {
    startRef.current = Date.now() - elapsed * 1000
    setRunning(true)
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setRunning(false)
  }

  async function saveTimer() {
    stopTimer()
    if (elapsed < 10) return
    await saveSession(elapsed, piece || null, note || null)
    setElapsed(0)
    setPiece('')
    setNote('')
  }

  async function saveSession(durationSec: number, piece: string | null, note: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('practice_sessions').insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      duration_sec: durationSec,
      piece,
      note,
    })
    loadSessions()
  }

  async function deleteSession(id: string) {
    await supabase.from('practice_sessions').delete().eq('id', id)
    setSessions(s => s.filter(x => x.id !== id))
  }

  async function handleManualSave() {
    const min = parseInt(manualMin)
    if (!min || min <= 0) return
    await saveSession(min * 60, manualPiece || null, null)
    setManualMin('')
    setManualPiece('')
    setShowManual(false)
  }

  // Build week data (last 7 days)
  const today = new Date()
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const totalSec = sessions.filter(s => s.date === dateStr).reduce((a, b) => a + b.duration_sec, 0)
    return { date: dateStr, label: ['日', '月', '火', '水', '木', '金', '土'][d.getDay()], totalSec }
  })

  const maxSec = Math.max(...weekData.map(d => d.totalSec), 1)
  const totalSec = sessions.reduce((a, b) => a + b.duration_sec, 0)

  // Streak
  let streak = 0
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (sessions.some(s => s.date === dateStr)) streak++
    else if (i > 0) break
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">練習ログ</h1>

      {/* Week bar chart */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)' }}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>今週の練習</span>
          <div className="flex items-center gap-3 text-sm">
            <span>合計 <b>{fmtHM(totalSec)}</b></span>
            <span className="flex items-center gap-1" style={{ color: '#f97316' }}>
              <Flame size={14} />
              <b>{streak}</b>日連続
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-24">
          {weekData.map(d => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: d.totalSec ? `${Math.max(4, (d.totalSec / maxSec) * 80)}px` : '4px',
                    background: d.date === today.toISOString().split('T')[0]
                      ? 'var(--primary)'
                      : 'var(--surface2)',
                    opacity: d.totalSec ? 1 : 0.3,
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--surface)' }}>
        <h2 className="text-base font-semibold">練習タイマー</h2>
        <div className="text-5xl font-mono font-bold text-center py-2">{fmt(elapsed)}</div>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="曲名（任意）"
            value={piece}
            onChange={e => setPiece(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
          <input
            type="text"
            placeholder="メモ（任意）"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>
        <div className="flex gap-3">
          {!running ? (
            <button
              onClick={startTimer}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white"
              style={{ background: 'var(--primary)' }}
            >
              <Play size={18} />開始
            </button>
          ) : (
            <button
              onClick={saveTimer}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white"
              style={{ background: '#ef4444' }}
            >
              <Square size={18} />終了・保存
            </button>
          )}
          <button
            onClick={() => setShowManual(v => !v)}
            className="rounded-2xl px-4 py-4 font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            <Plus size={18} />
          </button>
        </div>

        {showManual && (
          <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>手入力で記録</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="分数"
                value={manualMin}
                onChange={e => setManualMin(e.target.value)}
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              />
              <input
                type="text"
                placeholder="曲名（任意）"
                value={manualPiece}
                onChange={e => setManualPiece(e.target.value)}
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              />
            </div>
            <button
              onClick={handleManualSave}
              className="rounded-xl py-3 text-sm font-bold text-white"
              style={{ background: 'var(--primary)' }}
            >
              記録する
            </button>
          </div>
        )}
      </div>

      {/* Session list */}
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">最近の記録</h2>
        {sessions.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>まだ記録がありません</p>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'var(--surface)' }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{s.piece || '練習'}</span>
                <span className="text-xs" style={{ color: 'var(--primary-light)' }}>{fmt(s.duration_sec)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{s.date}</span>
                {s.note && <span className="text-xs" style={{ color: 'var(--muted)' }}>・{s.note}</span>}
              </div>
            </div>
            <button
              onClick={() => deleteSession(s.id)}
              className="p-2 rounded-lg transition-opacity hover:opacity-70"
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
