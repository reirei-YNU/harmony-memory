'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LevelBadge from '@/components/LevelBadge'
import type { Profile, Experience } from '@/types/database'
import { EXPERIENCE_LABELS } from '@/lib/level'

const EXPERIENCES: { value: Experience; label: string }[] = [
  { value: 'beginner0', label: '初心者（〜半年）' },
  { value: 'beginner1', label: '初級（半年〜2年）' },
  { value: 'inter', label: '中級（2〜5年）' },
  { value: 'advanced', label: '上級（5〜10年）' },
  { value: 'pro', label: '10年以上・専門教育あり' },
]

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [experience, setExperience] = useState<Experience>('beginner0')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setDisplayName(data.display_name)
      setExperience(data.experience as Experience)
    }
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName, experience }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadProfile()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/onboarding')
  }

  async function handleDelete() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Delete user data
    await supabase.from('practice_sessions').delete().eq('user_id', user.id)
    await supabase.from('comments').delete().eq('user_id', user.id)
    // Delete recordings from storage
    const { data: recs } = await supabase.from('recordings').select('audio_path').eq('user_id', user.id)
    if (recs?.length) {
      await supabase.storage.from('recordings').remove(recs.map((r: { audio_path: string }) => r.audio_path))
    }
    await supabase.from('recordings').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/onboarding')
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">プロフィール</h1>

      {profile && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)' }}>
          <LevelBadge recordingCount={profile.recording_count} showProgress />
        </div>
      )}

      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--surface)' }}>
        <h2 className="text-base font-semibold">プロフィール編集</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm" style={{ color: 'var(--muted)' }}>表示名</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm" style={{ color: 'var(--muted)' }}>演奏経験</label>
          <div className="flex flex-col gap-2">
            {EXPERIENCES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setExperience(value)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all"
                style={{
                  background: experience === value ? 'var(--primary)' : 'var(--surface2)',
                  border: `1px solid ${experience === value ? 'var(--primary)' : 'var(--border)'}`,
                  color: experience === value ? '#fff' : 'var(--foreground)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          className="w-full rounded-2xl py-4 font-bold text-white disabled:opacity-40"
          style={{ background: 'var(--primary)' }}
        >
          {saved ? '保存しました ✓' : saving ? '保存中...' : '保存する'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <LogOut size={18} />ログアウト
        </button>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="text-sm py-2 transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted)' }}
          >
            アカウントを削除する
          </button>
        ) : (
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid #ef4444' }}>
            <p className="text-sm text-red-400 font-semibold">本当に削除しますか？</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              すべての練習記録・録音・コメントが削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 rounded-xl py-3 text-sm font-semibold"
                style={{ background: 'var(--surface2)' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
                style={{ background: '#ef4444' }}
              >
                <Trash2 size={16} />削除する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
