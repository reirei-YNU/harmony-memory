const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // avoid ambiguous chars (0/O, 1/I)

export function generateInviteCode(length = 6): string {
  let code = ''
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return code
}
