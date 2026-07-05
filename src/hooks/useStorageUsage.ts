import { useEffect, useState } from 'react'
import { estimateStorageUsage } from '../lib/db'

// Browser-reported storage usage/quota for this origin (IndexedDB is what
// we actually use, but the quota is shared across all local storage APIs).
export function useStorageUsage(deps: readonly unknown[] = []) {
  const [usedBytes, setUsedBytes] = useState(0)
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null)

  useEffect(() => {
    estimateStorageUsage().then(({ usedBytes, quotaBytes }) => {
      setUsedBytes(usedBytes)
      setQuotaBytes(quotaBytes)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const limitBytes = quotaBytes ?? 1024 * 1024 * 1024
  const fraction = limitBytes > 0 ? Math.min(usedBytes / limitBytes, 1) : 0

  return { usedBytes, limitBytes, fraction }
}
