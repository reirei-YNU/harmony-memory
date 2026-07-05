import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSongs } from '../hooks/useSongs'
import { useLevels } from '../hooks/useLevels'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { saveRecording, saveSong, type Song } from '../lib/db'
import { formatBytes, formatDuration } from '../lib/audio'
import { getErrorMessage } from '../lib/errors'

export function RecordPage() {
  const { songs, refresh: refreshSongs } = useSongs()
  const { levels } = useLevels()
  const recorder = useAudioRecorder()
  const navigate = useNavigate()

  const [songMode, setSongMode] = useState<'existing' | 'new'>(
    songs.length > 0 ? 'existing' : 'new',
  )
  const [songId, setSongId] = useState('')
  const [newSongTitle, setNewSongTitle] = useState('')
  const [newSongComposer, setNewSongComposer] = useState('')
  const [level, setLevel] = useState('')
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const previewUrl = useMemo(
    () => (recorder.result ? URL.createObjectURL(recorder.result.blob) : null),
    [recorder.result],
  )

  const effectiveLevel = level || levels[0] || ''

  const canSubmit =
    Boolean(recorder.result) &&
    Boolean(effectiveLevel) &&
    (songMode === 'existing' ? Boolean(songId) : newSongTitle.trim().length > 0)

  async function handleSubmit() {
    if (!recorder.result) return
    setSubmitError(null)
    setSaving(true)
    try {
      let targetSongId = songId
      if (songMode === 'new') {
        const song: Song = {
          id: crypto.randomUUID(),
          title: newSongTitle.trim(),
          composer: newSongComposer.trim() || undefined,
          createdAt: Date.now(),
        }
        await saveSong(song)
        targetSongId = song.id
        await refreshSongs()
      }
      await saveRecording({
        id: crypto.randomUUID(),
        songId: targetSongId,
        level: effectiveLevel,
        title: title.trim() || undefined,
        memo: memo.trim() || undefined,
        blob: recorder.result.blob,
        mimeType: recorder.result.mimeType,
        durationSec: recorder.result.durationSec,
        sizeBytes: recorder.result.blob.size,
        createdAt: Date.now(),
      })
      setDone(true)
      setTimeout(() => navigate('/'), 700)
    } catch (err) {
      setSubmitError(getErrorMessage(err, '保存に失敗しました'))
      console.error('recording save failed', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>録音する</h1>
        <button type="button" onClick={() => navigate('/')}>
          戻る
        </button>
      </header>

      <section className="card">
        <h2>1. 曲を選ぶ</h2>
        <div className="segmented">
          <button
            type="button"
            className={songMode === 'existing' ? 'active' : ''}
            onClick={() => setSongMode('existing')}
            disabled={songs.length === 0}
          >
            既存の曲から選ぶ
          </button>
          <button
            type="button"
            className={songMode === 'new' ? 'active' : ''}
            onClick={() => setSongMode('new')}
          >
            新しい曲を追加
          </button>
        </div>

        {songMode === 'existing' ? (
          <select value={songId} onChange={(e) => setSongId(e.target.value)}>
            <option value="">曲を選択...</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.composer ? `（${s.composer}）` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div className="field-row">
            <input
              type="text"
              placeholder="曲名（例: エリーゼのために）"
              value={newSongTitle}
              onChange={(e) => setNewSongTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="作曲者（任意）"
              value={newSongComposer}
              onChange={(e) => setNewSongComposer(e.target.value)}
            />
          </div>
        )}
      </section>

      <section className="card">
        <h2>2. レベルを選ぶ</h2>
        <div className="level-filter-chips">
          {levels.map((l) => (
            <button
              key={l}
              type="button"
              className={`chip ${effectiveLevel === l ? 'chip--active' : ''}`}
              onClick={() => setLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>3. 録音する</h2>
        <div className="recorder-controls">
          {recorder.status === 'idle' || recorder.status === 'error' ? (
            <button type="button" className="btn-record" onClick={recorder.start}>
              ● 録音開始
            </button>
          ) : null}
          {(recorder.status === 'recording' || recorder.status === 'paused') && (
            <>
              <span className="recorder-timer">{formatDuration(recorder.elapsedSec)}</span>
              {recorder.status === 'recording' ? (
                <button type="button" onClick={recorder.pause}>
                  一時停止
                </button>
              ) : (
                <button type="button" onClick={recorder.resume}>
                  再開
                </button>
              )}
              <button type="button" className="btn-record btn-record--stop" onClick={recorder.stop}>
                ■ 停止
              </button>
            </>
          )}
        </div>
        {recorder.error && <p className="error-text">{recorder.error}</p>}

        {previewUrl && recorder.result && (
          <div className="recorder-preview">
            <audio src={previewUrl} controls />
            <p className="muted">
              {formatDuration(recorder.result.durationSec)} ・{' '}
              {formatBytes(recorder.result.blob.size)}
            </p>
            <button type="button" onClick={recorder.reset}>
              録音し直す
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>4. メモ（任意）</h2>
        <input
          type="text"
          placeholder="タイトル（例: 3回目のテイク）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="メモ（例: テンポが走り気味。次は落ち着いて）"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
        />
      </section>

      {submitError && <p className="error-text">{submitError}</p>}

      <button
        type="button"
        className="btn-primary btn-submit"
        disabled={!canSubmit || saving}
        onClick={handleSubmit}
      >
        {done ? '保存しました ✓' : saving ? '保存中...' : 'この端末に保存する'}
      </button>
    </div>
  )
}
