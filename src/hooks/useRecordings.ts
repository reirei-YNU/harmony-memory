import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { mapRecording, type RecordingRow } from '../lib/mappers'
import type { Recording } from '../types'

/** Live recordings for a group, optionally scoped to a single song. */
export function useRecordings(groupId: string | undefined, songId?: string) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!groupId) {
      setRecordings([])
      setLoading(false)
      return
    }
    setLoading(true)
    let query = supabase
      .from('recordings')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
    if (songId) query = query.eq('song_id', songId)
    const { data, error } = await query
    if (error) throw error
    setRecordings((data as RecordingRow[]).map(mapRecording))
    setLoading(false)
  }, [groupId, songId])

  useEffect(() => {
    refetch()
    if (!groupId) return
    const channel = supabase
      .channel(`recordings:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recordings', filter: `group_id=eq.${groupId}` },
        () => refetch(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, refetch])

  return { recordings, loading }
}
