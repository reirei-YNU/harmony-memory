import type { Recording } from './db'

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Consecutive practiced days, counting back from today (or yesterday, if
 * today has no recording yet so the streak isn't prematurely broken). */
export function computeStreak(recordings: Pick<Recording, 'createdAt'>[]): number {
  const practicedDays = new Set(recordings.map((r) => dayKey(r.createdAt)))
  let cursor = Date.now()
  if (!practicedDays.has(dayKey(cursor))) {
    cursor -= ONE_DAY_MS
  }
  let streak = 0
  while (practicedDays.has(dayKey(cursor))) {
    streak++
    cursor -= ONE_DAY_MS
  }
  return streak
}

export interface CalendarDay {
  date: Date
  key: string
  count: number
}

/** Grid of the last `weeks` weeks (Sun–Sat columns), oldest first, for a
 * GitHub-contributions-style heatmap. */
export function buildCalendarGrid(
  recordings: Pick<Recording, 'createdAt'>[],
  weeks = 12,
): CalendarDay[][] {
  const countByDay = new Map<string, number>()
  for (const r of recordings) {
    const key = dayKey(r.createdAt)
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalDays = weeks * 7
  // Align the grid so it ends on the most recent Saturday and starts on a Sunday.
  const endOffset = 6 - today.getDay()
  const gridEnd = new Date(today)
  gridEnd.setDate(gridEnd.getDate() + endOffset)

  const days: CalendarDay[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(gridEnd)
    date.setDate(date.getDate() - i)
    const key = dayKey(date.getTime())
    days.push({ date, key, count: countByDay.get(key) ?? 0 })
  }

  const columns: CalendarDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7))
  }
  return columns
}

export function totalDurationSince(
  recordings: Pick<Recording, 'createdAt' | 'durationSec'>[],
  sinceTs: number,
): number {
  return recordings
    .filter((r) => r.createdAt >= sinceTs)
    .reduce((sum, r) => sum + r.durationSec, 0)
}

export function formatHoursMinutes(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}分`
  return `${hours}時間${minutes}分`
}

export function startOfWeek(from = new Date()): number {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.getTime()
}

export function startOfMonth(from = new Date()): number {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  return d.getTime()
}
