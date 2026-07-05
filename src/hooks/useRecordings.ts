import { useCallback, useEffect, useState } from 'react'
import { listRecordings, type Recording } from '../lib/db'

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setRecordings(await listRecordings())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { recordings, loading, refresh }
}
