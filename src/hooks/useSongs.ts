import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { Song } from '../types'

export function useSongs(groupId: string | undefined) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) {
      setSongs([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(db, 'songs'),
      where('groupId', '==', groupId),
      orderBy('title'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setSongs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Song, 'id'>) })))
      setLoading(false)
    })
    return unsub
  }, [groupId])

  return { songs, loading }
}
