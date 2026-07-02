import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { mapSong, type SongRow } from '../lib/mappers'
import type { Song } from '../types'

export function useSongs(groupId: string | undefined) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!groupId) {
      setSongs([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('group_id', groupId)
      .order('title', { ascending: true })
    if (error) throw error
    setSongs((data as SongRow[]).map(mapSong))
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    refetch()
    if (!groupId) return
    const channel = supabase
      .channel(`songs:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs', filter: `group_id=eq.${groupId}` },
        () => refetch(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, refetch])

  return { songs, loading }
}
