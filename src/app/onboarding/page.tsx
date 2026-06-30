'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Music } from 'lucide-react'
import { EXPERIENCE_LABELS } from '@/lib/level'
import type { Experience } from '@/types/database'

const EXPERIENCES: { value: Experience; label: string }[] = [
  { value: 'beginner0', label: '初心者（〜半年）' },
  { value: 'beginner1', label: '初級（半年〜2年）' },
  { value: 'inter', label: '中級（2〜5年）' },
  { value: 'advanced', label: '上級（5〜10年）' },
  { value: 'pro', label: '10年以上・専門教育あり' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'welcome' | 'profile'>('welcome')
  const [displayName, setDisplayName] = useState('')
  const [experience, setExperience] = useState<Experience | ''>('')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {step === 'welcome' ? (
        <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-3xl"
            style={{ background: 'var(--primary)' }}
          >
            <Music size={48} color="#fff" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">ハーモニーメモリー</h1>
            <p className="text-base" style={{ color: 'var(--muted)' }}>
              ピアノの練習を記録して、<br />演奏を仲間と共有しよう
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => setStep('profile')}
              className="w-full rounded-2xl py-4 text-base font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)' }}
            >
              はじめる
            </button>
            <button
              onClick={() => router.push('/auth')}
              className="w-full rounded-2xl py-4 text-base font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--primary-light)', background: 'var(--surface2)' }}
            >
              すでにアカウントをお持ちの方
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-sm w-full">
          <h2 className="text-2xl font-bold">プロフィール設定</h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              表示名
            </label>
            <input
              type="text"
              placeholder="あなたの名前"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-base outline-none focus:ring-2"
              style={{
                background: 'var(--surface2)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              演奏経験
            </label>
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
            onClick={() => {
              if (!displayName.trim() || !experience) return
              // Store in sessionStorage, then redirect to auth
              sessionStorage.setItem('onboarding', JSON.stringify({ displayName: displayName.trim(), experience }))
              router.push('/auth?mode=signup')
            }}
            disabled={!displayName.trim() || !experience}
            className="w-full rounded-2xl py-4 text-base font-bold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'var(--primary)' }}
          >
            次へ → アカウント作成
          </button>
        </div>
      )}
    </div>
  )
}
