// Some thrown values (DOMException in older engines, object-shaped errors
// from third-party libs) aren't real Error instances, so `err instanceof
// Error` alone can miss a perfectly good `message` field.
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
