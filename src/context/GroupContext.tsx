import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthContext'
import { DEFAULT_LEVELS, type Group } from '../types'
import { generateInviteCode } from '../lib/inviteCode'
import { mapGroup, type GroupRow } from '../lib/mappers'

const ACTIVE_GROUP_STORAGE_KEY = 'harmony-memory:activeGroupId'

interface GroupContextValue {
  groups: Group[]
  activeGroup: Group | null
  loading: boolean
  setActiveGroupId: (id: string) => void
  createGroup: (name: string) => Promise<Group>
  joinGroup: (inviteCode: string) => Promise<Group>
  refetchGroups: () => Promise<void>
}

const GroupContext = createContext<GroupContextValue | undefined>(undefined)

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY),
  )
  const [loading, setLoading] = useState(true)

  const refetchGroups = useCallback(async () => {
    if (!user) {
      setGroups([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', user.id)
      if (error) throw error
      const rows = (data ?? []) as unknown as { groups: GroupRow | null }[]
      setGroups(rows.filter((r) => r.groups).map((r) => mapGroup(r.groups as GroupRow)))
    } catch (err) {
      console.error('Failed to load groups', err)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refetchGroups()
  }, [refetchGroups])

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
    const { data: groupRow, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        invite_code: inviteCode,
        owner_id: user.id,
        levels: DEFAULT_LEVELS,
      })
      .select()
      .single()
    if (groupError) throw groupError

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: groupRow.id,
      user_id: user.id,
      display_name: user.displayName,
    })
    if (memberError) throw memberError

    const group = mapGroup(groupRow as GroupRow)
    setActiveGroupId(group.id)
    await refetchGroups()
    return group
  }

  async function joinGroup(inviteCode: string): Promise<Group> {
    if (!user) throw new Error('ログインが必要です')
    const normalized = inviteCode.trim().toUpperCase()
    // Joining goes through a security-definer RPC rather than a direct table
    // query: non-members have no SELECT access to `groups`, so this is the
    // only way to resolve an invite code to a group id. The function returns
    // a single `groups` row (not SETOF), so PostgREST hands it back as one
    // object rather than an array.
    const { data: groupRow, error } = await supabase.rpc('join_group_by_invite_code', {
      code: normalized,
      member_display_name: user.displayName,
    })
    if (error) {
      throw error.message.includes('invalid_invite_code')
        ? new Error('招待コードが見つかりません')
        : error
    }

    const group = mapGroup(groupRow as GroupRow)
    setActiveGroupId(group.id)
    await refetchGroups()
    return group
  }

  return (
    <GroupContext.Provider
      value={{ groups, activeGroup, loading, setActiveGroupId, createGroup, joinGroup, refetchGroups }}
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
