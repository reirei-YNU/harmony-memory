import type { Timestamp } from 'firebase/firestore'

// Firestore serverTimestamp() fields come back as a Timestamp object (and
// briefly as null before the server ack lands). Normalize to epoch millis
// so the rest of the app can treat createdAt as a plain number.
export function timestampToMillis(value: Timestamp | number | null | undefined): number {
  if (value == null) return Date.now()
  if (typeof value === 'number') return value
  return value.toMillis()
}
