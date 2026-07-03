// Supabase's PostgrestError/AuthError-like objects are plain objects with a
// `message` field, not real Error instances, so `err instanceof Error` misses
// them and callers fell back to a generic message that hid the real cause.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message
  }
  return fallback
}
