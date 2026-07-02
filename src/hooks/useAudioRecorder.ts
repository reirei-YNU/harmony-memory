import { useCallback, useRef, useState } from 'react'
import { pickRecordingMimeType, RECORDING_AUDIO_BITS_PER_SECOND } from '../lib/audio'

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error'

export interface RecordingResult {
  blob: Blob
  durationSec: number
  mimeType: string
}

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RecordingResult | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickRecordingMimeType()
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: RECORDING_AUDIO_BITS_PER_SECOND,
      })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const durationSec = (Date.now() - startTimeRef.current) / 1000
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        setResult({ blob, durationSec, mimeType: mimeType || 'audio/webm' })
        cleanupStream()
      }
      mediaRecorderRef.current = recorder
      startTimeRef.current = Date.now()
      recorder.start()
      setStatus('recording')
      setElapsedSec(0)
      timerRef.current = setInterval(() => {
        setElapsedSec((Date.now() - startTimeRef.current) / 1000)
      }, 200)
    } catch (err) {
      setError(
        err instanceof Error
          ? `マイクにアクセスできませんでした: ${err.message}`
          : 'マイクにアクセスできませんでした',
      )
      setStatus('error')
    }
  }, [cleanupStream])

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setStatus('stopped')
  }, [])

  const pause = useCallback(() => {
    mediaRecorderRef.current?.pause()
    setStatus('paused')
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const resume = useCallback(() => {
    mediaRecorderRef.current?.resume()
    setStatus('recording')
    timerRef.current = setInterval(() => {
      setElapsedSec((Date.now() - startTimeRef.current) / 1000)
    }, 200)
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setElapsedSec(0)
    setResult(null)
    setError(null)
    chunksRef.current = []
  }, [])

  return { status, elapsedSec, error, result, start, stop, pause, resume, reset }
}
