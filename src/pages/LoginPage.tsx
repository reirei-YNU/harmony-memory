import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signUp') {
        await signUp(email, password, displayName || 'ピアニスト')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--centered">
      <div className="card auth-card">
        <h1>Harmony Memory</h1>
        <p className="muted">曲ごとの練習録音を、先生や仲間と共有しよう。</p>

        <div className="segmented">
          <button
            type="button"
            className={mode === 'signIn' ? 'active' : ''}
            onClick={() => setMode('signIn')}
          >
            ログイン
          </button>
          <button
            type="button"
            className={mode === 'signUp' ? 'active' : ''}
            onClick={() => setMode('signUp')}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stacked-form">
          {mode === 'signUp' && (
            <input
              type="text"
              placeholder="表示名（例: 山田太郎）"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {mode === 'signUp' ? '登録する' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
