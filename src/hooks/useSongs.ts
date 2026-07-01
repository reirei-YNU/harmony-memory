import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { timestampToMillis } from '../lib/firestoreHelpers'
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
      setSongs(
        snap.docs.map((d) => {
          const data = d.data() as Omit<Song, 'id' | 'createdAt'> & {
            createdAt: Timestamp | number | null
          }
          return { id: d.id, ...data, createdAt: timestampToMillis(data.createdAt) }
        }),
      )
      setLoading(false)
    })
    return unsub
  }, [groupId])

  return { songs, loading }
}
