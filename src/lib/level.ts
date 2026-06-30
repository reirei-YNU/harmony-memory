export const LEVELS = [
  { n: 1, title: 'はじめの一歩', min: 0 },
  { n: 2, title: '練習生', min: 3 },
  { n: 3, title: '精進中', min: 7 },
  { n: 4, title: '熟練', min: 15 },
  { n: 5, title: 'マエストロ', min: 30 },
]

export function getLevel(recordingCount: number) {
  let level = LEVELS[0]
  for (const l of LEVELS) {
    if (recordingCount >= l.min) level = l
  }
  return level
}

export function getNextLevel(recordingCount: number) {
  const current = getLevel(recordingCount)
  return LEVELS.find(l => l.n === current.n + 1) ?? null
}

export function getLevelProgress(recordingCount: number) {
  const current = getLevel(recordingCount)
  const next = getNextLevel(recordingCount)
  if (!next) return 100
  const range = next.min - current.min
  const progress = recordingCount - current.min
  return Math.round((progress / range) * 100)
}

export const EXPERIENCE_LABELS: Record<string, string> = {
  beginner0: '初心者（〜半年）',
  beginner1: '初級（半年〜2年）',
  inter: '中級（2〜5年）',
  advanced: '上級（5〜10年）',
  pro: '10年以上・専門教育あり',
}
