import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useGroup } from '../context/GroupContext'
import { DEFAULT_LEVELS } from '../types'
import { getErrorMessage } from '../lib/errors'

export function GroupPage() {
  const { groups, activeGroup, setActiveGroupId, createGroup, joinGroup, refetchGroups } = useGroup()
  const navigate = useNavigate()

  const [newGroupName, setNewGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [newLevel, setNewLevel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createGroup(newGroupName.trim())
      setNewGroupName('')
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, '作成に失敗しました'))
      console.error('createGroup failed', err)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setBusy(true)
    setError(null)
    try {
      await joinGroup(inviteCode.trim())
      setInviteCode('')
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, '参加に失敗しました'))
      console.error('joinGroup failed', err)
    } finally {
      setBusy(false)
    }
  }

  async function handleAddLevel(e: FormEvent) {
    e.preventDefault()
    if (!activeGroup || !newLevel.trim()) return
    if (activeGroup.levels.includes(newLevel.trim())) {
      setNewLevel('')
      return
    }
    const { error: updateError } = await supabase
      .from('groups')
      .update({ levels: [...activeGroup.levels, newLevel.trim()] })
      .eq('id', activeGroup.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNewLevel('')
    await refetchGroups()
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>グループ設定</h1>
        {activeGroup && (
          <button type="button" onClick={() => navigate('/')}>
            戻る
          </button>
        )}
      </header>

      {groups.length > 0 && (
        <section className="card">
          <h2>参加中のグループ</h2>
          <ul className="group-switch-list">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className={g.id === activeGroup?.id ? 'active' : ''}
                  onClick={() => setActiveGroupId(g.id)}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeGroup && (
        <section className="card">
          <h2>{activeGroup.name} の招待コード</h2>
          <p className="invite-code">{activeGroup.inviteCode}</p>
          <p className="muted">
            このコードを先生や練習仲間に伝えると、録音を共有するグループに参加できます。
          </p>

          <h3>レベルのラベル</h3>
          <div className="level-filter-chips">
            {activeGroup.levels.map((l) => (
              <span key={l} className="chip">
                {l}
              </span>
            ))}
          </div>
          <form onSubmit={handleAddLevel} className="field-row">
            <input
              type="text"
              placeholder="新しいレベルを追加（例: コンクール用）"
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
            />
            <button type="submit">追加</button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>新しいグループを作る</h2>
        <form onSubmit={handleCreate} className="field-row">
          <input
            type="text"
            placeholder="グループ名（例: 〇〇ピアノ教室）"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            作成
          </button>
        </form>
        <p className="muted">レベルの初期値: {DEFAULT_LEVELS.join(' / ')}</p>
      </section>

      <section className="card">
        <h2>招待コードでグループに参加</h2>
        <form onSubmit={handleJoin} className="field-row">
          <input
            type="text"
            placeholder="招待コード（例: AB12CD）"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            参加
          </button>
        </form>
      </section>

      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
