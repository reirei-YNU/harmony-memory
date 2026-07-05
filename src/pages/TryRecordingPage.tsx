import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { formatBytes, formatDuration } from '../lib/audio'

// Standalone recording playground: no login, no group, nothing saved to
// Supabase. Lets the recording UX be verified in isolation while the backend
// setup is still being sorted out.
export function TryRecordingPage() {
  const recorder = useAudioRecorder()

  const previewUrl = useMemo(
    () => (recorder.result ? URL.createObjectURL(recorder.result.blob) : null),
    [recorder.result],
  )

  return (
    <div className="page">
      <header className="page-header">
        <h1>録音だけ試す</h1>
        <Link to="/">ログインへ</Link>
      </header>

      <p className="muted">
        この画面はログインもグループも不要です。ここで録音したものは保存・共有されません（動作確認用）。
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
            <button type="button" onClick={recorder.reset}>
              録音し直す
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
