import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { formatBytes, formatDuration } from '../lib/audio'
import { AudioPlayer } from '../components/AudioPlayer'
import {
  deleteLocalRecording,
  listLocalRecordings,
  saveLocalRecording,
  type LocalRecording,
} from '../lib/localRecordings'

// Standalone recording playground: no login, no group, no Supabase. Takes
// are saved to this browser's IndexedDB only, so they survive reloads but
// never leave the device — a way to verify the recording UX and keep
// accumulating takes while the backend setup is still being sorted out.
export function TryRecordingPage() {
  const recorder = useAudioRecorder()
  const [title, setTitle] = useState('')
  const [saved, setSaved] = useState<LocalRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const objectUrlsRef = useRef(new Map<string, string>())

  const previewUrl = useMemo(
    () => (recorder.result ? URL.createObjectURL(recorder.result.blob) : null),
    [recorder.result],
  )

  async function refresh() {
    setSaved(await listLocalRecordings())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const urls = objectUrlsRef.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function urlFor(rec: LocalRecording): string {
    let url = objectUrlsRef.current.get(rec.id)
    if (!url) {
      url = URL.createObjectURL(rec.blob)
      objectUrlsRef.current.set(rec.id, url)
    }
    return url
  }

  async function handleSave() {
    if (!recorder.result) return
    setSaving(true)
    try {
      await saveLocalRecording({
        id: crypto.randomUUID(),
        title: title.trim() || '無題の録音',
        blob: recorder.result.blob,
        mimeType: recorder.result.mimeType,
        durationSec: recorder.result.durationSec,
        sizeBytes: recorder.result.blob.size,
        createdAt: Date.now(),
      })
      setTitle('')
      recorder.reset()
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteLocalRecording(id)
    const url = objectUrlsRef.current.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      objectUrlsRef.current.delete(id)
    }
    await refresh()
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>録音だけ試す</h1>
        <Link to="/">ログインへ</Link>
      </header>

      <p className="muted">
        この画面はログインもグループも不要です。録音はこの端末（ブラウザ）だけに保存され、他の人とは共有されません。
      </p>

      <section className="card">
        <h2>録音する</h2>
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
            <input
              type="text"
              placeholder="タイトル（例: 1回目のテイク）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="field-row">
              <button type="button" onClick={recorder.reset} disabled={saving}>
                録音し直す
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : 'この端末に保存する'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>保存した録音（{saved.length}件）</h2>
        {loading && <p className="muted">読み込み中...</p>}
        {!loading && saved.length === 0 && (
          <p className="muted">まだ保存された録音はありません。</p>
        )}
        <ul className="recording-list">
          {saved.map((rec) => (
            <li key={rec.id} className="recording-item">
              <div className="recording-item-body" style={{ borderTop: 'none', paddingTop: 12 }}>
                <p className="recording-item-note-title">{rec.title}</p>
                <p className="recording-item-meta">
                  {new Date(rec.createdAt).toLocaleString('ja-JP')} ・{' '}
                  {formatDuration(rec.durationSec)} ・ {formatBytes(rec.sizeBytes)}
                </p>
                <AudioPlayer src={urlFor(rec)} />
                <button type="button" onClick={() => handleDelete(rec.id)}>
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
