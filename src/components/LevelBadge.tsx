const COLORS = ['#4c3b8f', '#a35d29', '#2f7a52', '#a3324f', '#2e6b8f', '#7a5a2f']

function colorForLevel(level: string): string {
  let hash = 0
  for (let i = 0; i < level.length; i++) {
    hash = (hash * 31 + level.charCodeAt(i)) >>> 0
  }
  return COLORS[hash % COLORS.length]
}

export function LevelBadge({ level }: { level: string }) {
  return (
    <span className="level-badge" style={{ backgroundColor: colorForLevel(level) }}>
      {level}
    </span>
  )
}
