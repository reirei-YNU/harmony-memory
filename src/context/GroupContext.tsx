import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  arrayUnion,
  collection,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import { DEFAULT_LEVELS, type Group } from '../types'
import { generateInviteCode } from '../lib/inviteCode'

const ACTIVE_GROUP_STORAGE_KEY = 'harmony-memory:activeGroupId'

interface GroupContextValue {
  groups: Group[]
  activeGroup: Group | null
  loading: boolean
  setActiveGroupId: (id: string) => void
  createGroup: (name: string) => Promise<Group>
  joinGroup: (inviteCode: string) => Promise<Group>
}

const GroupContext = createContext<GroupContextValue | undefined>(undefined)

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY),
  )
  const [loading, setLoading] = useState(true)

  // Watch the current user's profile doc for their list of group memberships.
  useEffect(() => {
    if (!user) {
      setGroupIds([])
      setGroups([])
      setLoading(false)
      return
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const ids = (snap.data()?.groupIds as string[]) ?? []
      setGroupIds(ids)
    })
    return unsub
  }, [user])

  // Fetch full group docs for the memberships. Firestore `in` queries cap at 30 ids.
  useEffect(() => {
    if (groupIds.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const chunks: string[][] = []
      for (let i = 0; i < groupIds.length; i += 30) {
        chunks.push(groupIds.slice(i, i + 30))
      }
      const results: Group[] = []
      for (const chunk of chunks) {
        const q = query(collection(db, 'groups'), where(documentId(), 'in', chunk))
        const snap = await getDocs(q)
        snap.forEach((d) => results.push({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }))
      }
      if (!cancelled) {
        setGroups(results)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [groupIds])

  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, activeGroupId)
    }
  }, [activeGroupId])

  const activeGroup = useMemo(() => {
    const found = groups.find((g) => g.id === activeGroupId)
    return found ?? groups[0] ?? null
  }, [groups, activeGroupId])

  function setActiveGroupId(id: string) {
    setActiveGroupIdState(id)
  }

  async function createGroup(name: string): Promise<Group> {
    if (!user) throw new Error('ログインが必要です')
    const inviteCode = generateInviteCode()
    const groupRef = doc(collection(db, 'groups'))
    const newGroup: Omit<Group, 'id' | 'createdAt'> = {
      name,
      inviteCode,
      ownerId: user.uid,
      memberIds: [user.uid],
      levels: DEFAULT_LEVELS,
    }
    await setDoc(groupRef, { ...newGroup, createdAt: serverTimestamp() })
    await updateDoc(doc(db, 'users', user.uid), {
      groupIds: arrayUnion(groupRef.id),
    })
    setActiveGroupId(groupRef.id)
    return { id: groupRef.id, ...newGroup, createdAt: Date.now() }
  }

  async function joinGroup(inviteCode: string): Promise<Group> {
    if (!user) throw new Error('ログインが必要です')
    const normalized = inviteCode.trim().toUpperCase()
    const q = query(collection(db, 'groups'), where('inviteCode', '==', normalized))
    const snap = await getDocs(q)
    if (snap.empty) {
      throw new Error('招待コードが見つかりません')
    }
    const groupDoc = snap.docs[0]
    await updateDoc(doc(db, 'groups', groupDoc.id), {
      memberIds: arrayUnion(user.uid),
    })
    await updateDoc(doc(db, 'users', user.uid), {
      groupIds: arrayUnion(groupDoc.id),
    })
    setActiveGroupId(groupDoc.id)
    return { id: groupDoc.id, ...(groupDoc.data() as Omit<Group, 'id'>) }
  }

  return (
    <GroupContext.Provider
      value={{ groups, activeGroup, loading, setActiveGroupId, createGroup, joinGroup }}
    >
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used within GroupProvider')
  return ctx
}
