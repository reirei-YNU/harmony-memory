import { buildCalendarGrid, type CalendarDay } from '../lib/stats'
import type { Recording } from '../lib/db'

function levelForCount(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  return 3
}

export function CalendarWidget({ recordings }: { recordings: Recording[] }) {
  const columns = buildCalendarGrid(recordings, 12)

  return (
    <div className="calendar-widget">
      <div className="calendar-grid">
        {columns.map((column, i) => (
          <div key={i} className="calendar-column">
            {column.map((day: CalendarDay) => (
              <div
                key={day.key}
                className={`calendar-cell calendar-cell--${levelForCount(day.count)}`}
                title={`${day.date.toLocaleDateString('ja-JP')}: ${day.count}件`}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="muted calendar-caption">直近12週間の練習記録</p>
    </div>
  )
}
