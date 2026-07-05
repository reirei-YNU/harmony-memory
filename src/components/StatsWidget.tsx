import { useMemo } from 'react'
import type { Recording } from '../lib/db'
import {
  computeStreak,
  formatHoursMinutes,
  startOfMonth,
  startOfWeek,
  totalDurationSince,
} from '../lib/stats'

export function StatsWidget({ recordings }: { recordings: Recording[] }) {
  const { streak, weekTotal, monthTotal } = useMemo(() => {
    return {
      streak: computeStreak(recordings),
      weekTotal: totalDurationSince(recordings, startOfWeek()),
      monthTotal: totalDurationSince(recordings, startOfMonth()),
    }
  }, [recordings])

  return (
    <div className="stats-widget">
      <div className="stat-tile">
        <span className="stat-tile-value">🔥 {streak}</span>
        <span className="stat-tile-label">日連続</span>
      </div>
      <div className="stat-tile">
        <span className="stat-tile-value">{formatHoursMinutes(weekTotal)}</span>
        <span className="stat-tile-label">今週の練習時間</span>
      </div>
      <div className="stat-tile">
        <span className="stat-tile-value">{formatHoursMinutes(monthTotal)}</span>
        <span className="stat-tile-label">今月の練習時間</span>
      </div>
    </div>
  )
}
