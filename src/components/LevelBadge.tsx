import { getLevel, getLevelProgress, getNextLevel } from '@/lib/level'

interface Props {
  recordingCount: number
  showProgress?: boolean
}

export default function LevelBadge({ recordingCount, showProgress = false }: Props) {
  const level = getLevel(recordingCount)
  const next = getNextLevel(recordingCount)
  const progress = getLevelProgress(recordingCount)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-sm font-bold"
          style={{ background: 'var(--primary)', color: '#fff' }}
        >
          Lv.{level.n}
        </span>
        <span className="font-semibold">{level.title}</span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          録音 {recordingCount} 件
        </span>
      </div>
      {showProgress && next && (
        <div>
          <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>次のレベル: {next.title}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--primary)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
