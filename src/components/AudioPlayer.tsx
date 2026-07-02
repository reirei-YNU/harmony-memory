import { useRef, useState } from 'react'

const SPEEDS = [0.75, 1, 1.25, 1.5]

export function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [speed, setSpeed] = useState(1)

  function changeSpeed(next: number) {
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} controls preload="none" />
      <div className="audio-player-speeds">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`speed-btn ${s === speed ? 'speed-btn--active' : ''}`}
            onClick={() => changeSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
