import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
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
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Recording, 'id'>) })),
      )
      setLoading(false)
    })
    return unsub
  }, [groupId, songId])

  return { recordings, loading }
}
