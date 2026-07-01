import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { useSongs } from '../hooks/useSongs'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { createSong, uploadRecording } from '../lib/recordings'
import { formatBytes, formatDuration } from '../lib/audio'

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
}

function extensionFor(mimeType: string): string {
  const base = mimeType.split(';')[0]
  return EXTENSION_BY_MIME[base] ?? 'webm'
}

export function RecordPage() {
  const { user } = useAuth()
  const { activeGroup } = useGroup()
  const { songs } = useSongs(activeGroup?.id)
  const recorder = useAudioRecorder()
  const navigate = useNavigate()

  const [songMode, setSongMode] = useState<'existing' | 'new'>(
    songs.length > 0 ? 'existing' : 'new',
  )
  const [songId, setSongId] = useState('')
  const [newSongTitle, setNewSongTitle] = useState('')
  const [newSongComposer, setNewSongComposer] = useState('')
  const [level, setLevel] = useState(activeGroup?.levels[0] ?? '')
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [uploadFraction, setUploadFraction] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const previewUrl = useMemo(
    () => (recorder.result ? URL.createObjectURL(recorder.result.blob) : null),
    [recorder.result],
  )

  const canSubmit =
    Boolean(recorder.result) &&
    Boolean(level) &&
    (songMode === 'existing' ? Boolean(songId) : newSongTitle.trim().length > 0)

  async function handleSubmit() {
    if (!activeGroup || !user || !recorder.result) return
    setSubmitError(null)
    setUploadFraction(0)
    try {
      let targetSongId = songId
      if (songMode === 'new') {
        const song = await createSong(activeGroup.id, newSongTitle, newSongComposer, user.uid)
        targetSongId = song.id
      }
      await uploadRecording({
        groupId: activeGroup.id,
        songId: targetSongId,
        level,
        title,
        memo,
        blob: recorder.result.blob,
        fileExtension: extensionFor(recorder.result.mimeType),
        durationSec: recorder.result.durationSec,
        createdBy: user.uid,
        createdByName: user.displayName ?? '名無し',
        onProgress: setUploadFraction,
      })
      setDone(true)
      setTimeout(() => navigate('/'), 900)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'アップロードに失敗しました')
      setUploadFraction(null)
    }
  }

  if (!activeGroup) return null

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
          {activeGroup.levels.map((l) => (
            <button
              key={l}
              type="button"
              className={`chip ${level === l ? 'chip--active' : ''}`}
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
        disabled={!canSubmit || uploadFraction !== null}
        onClick={handleSubmit}
      >
        {done
          ? '保存しました ✓'
          : uploadFraction !== null
            ? `アップロード中... ${Math.round(uploadFraction * 100)}%`
            : '保存して共有する'}
      </button>
    </div>
  )
}
