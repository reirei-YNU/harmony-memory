import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { timestampToMillis } from '../lib/firestoreHelpers'
import type { Recording } from '../types'

/** Live recordings for a group, optionally scoped to a single song. */
export function useRecordings(groupId: string | undefined, songId?: string) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) {
      setRecordings([])
      setLoading(false)
      return
    }
    setLoading(true)
    const clauses = songId
      ? [where('groupId', '==', groupId), where('songId', '==', songId)]
      : [where('groupId', '==', groupId)]
    const q = query(collection(db, 'recordings'), ...clauses, orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setRecordings(
        snap.docs.map((d) => {
          const data = d.data() as Omit<Recording, 'id' | 'createdAt'> & {
            createdAt: Timestamp | number | null
          }
          return { id: d.id, ...data, createdAt: timestampToMillis(data.createdAt) }
        }),
      )
      setLoading(false)
    })
    return unsub
  }, [groupId, songId])

  return { recordings, loading }
}
