import { useCallback, useEffect, useState } from 'react'
import { addLevel as addLevelToDb, getLevels } from '../lib/db'

export function useLevels() {
  const [levels, setLevels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLevels(await getLevels())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addLevel(level: string) {
    setLevels(await addLevelToDb(level))
  }

  return { levels, loading, addLevel }
}
