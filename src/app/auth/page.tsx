'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'login'

  const [tab, setTab] = useState<'login' | 'signup'>(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Create profile from onboarding data
        const onboarding = sessionStorage.getItem('onboarding')
        if (onboarding) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { displayName, experience } = JSON.parse(onboarding)
            await supabase.from('profiles').upsert({
              id: user.id,
              display_name: displayName,
              experience,
              recording_count: 0,
            })
            sessionStorage.removeItem('onboarding')
          }
        }
        router.push('/home')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/home')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'var(--primary)' }}
        >
          <Music size={32} color="#fff" />
        </div>
        <h1 className="text-2xl font-bold">ハーモニーメモリー</h1>

        {showReset ? (
          <form onSubmit={handleReset} className="flex flex-col gap-4 w-full">
            <h2 className="text-lg font-semibold">パスワードリセット</h2>
            {resetSent ? (
              <p className="text-sm" style={{ color: 'var(--primary-light)' }}>
                メールを送信しました。受信箱を確認してください。
              </p>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-base outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl py-4 font-bold text-white disabled:opacity-40"
                  style={{ background: 'var(--primary)' }}
                >
                  送信
                </button>
              </>
            )}
            <button type="button" onClick={() => setShowReset(false)} className="text-sm" style={{ color: 'var(--muted)' }}>
              ← ログインに戻る
            </button>
          </form>
        ) : (
          <>
            <div className="flex rounded-2xl overflow-hidden w-full" style={{ background: 'var(--surface2)' }}>
              {(['login', 'signup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-3 text-sm font-semibold transition-all"
                  style={{
                    background: tab === t ? 'var(--primary)' : 'transparent',
                    color: tab === t ? '#fff' : 'var(--muted)',
                  }}
                >
                  {t === 'login' ? 'ログイン' : '新規登録'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                required
              />
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                required
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-4 font-bold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: 'var(--primary)' }}
              >
                {loading ? '処理中...' : tab === 'login' ? 'ログイン' : 'アカウント作成'}
              </button>
            </form>

            <div className="flex items-center gap-3 w-full">
              <hr className="flex-1" style={{ borderColor: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>または</span>
              <hr className="flex-1" style={{ borderColor: 'var(--border)' }} />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full rounded-2xl py-4 font-semibold transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Googleでログイン
            </button>

            {tab === 'login' && (
              <button
                onClick={() => setShowReset(true)}
                className="text-sm"
                style={{ color: 'var(--muted)' }}
              >
                パスワードを忘れた方
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
