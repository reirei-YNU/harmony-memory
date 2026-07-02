import { formatBytes } from '../lib/audio'

export function StorageMeter({
  usedBytes,
  limitBytes,
  fraction,
}: {
  usedBytes: number
  limitBytes: number
  fraction: number
}) {
  const level = fraction > 0.9 ? 'danger' : fraction > 0.7 ? 'warning' : 'ok'
  return (
    <div className="storage-meter" title={`${formatBytes(usedBytes)} / ${formatBytes(limitBytes)} 使用中`}>
      <div className="storage-meter-track">
        <div
          className={`storage-meter-fill storage-meter-fill--${level}`}
          style={{ width: `${Math.max(fraction * 100, 2)}%` }}
        />
      </div>
      <span className="storage-meter-label">
        {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
      </span>
    </div>
  )
}
