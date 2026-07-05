import { useCallback, useEffect, useState } from 'react'
import { listSongs, type Song } from '../lib/db'

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setSongs(await listSongs())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { songs, loading, refresh }
}
