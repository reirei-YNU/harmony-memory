import { useMemo } from 'react'
import type { Recording } from '../types'

// Supabase free plan storage quota. Shown as a soft, non-blocking
// indicator so the group can see how much room they have left.
export const STORAGE_SOFT_LIMIT_BYTES = 1 * 1024 * 1024 * 1024

export function useGroupStorageUsage(recordings: Recording[]) {
  return useMemo(() => {
    const usedBytes = recordings.reduce((sum, r) => sum + (r.sizeBytes ?? 0), 0)
    const fraction = Math.min(usedBytes / STORAGE_SOFT_LIMIT_BYTES, 1)
    return { usedBytes, limitBytes: STORAGE_SOFT_LIMIT_BYTES, fraction }
  }, [recordings])
}
