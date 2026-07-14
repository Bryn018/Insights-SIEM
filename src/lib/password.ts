import crypto from 'crypto'

// NIST-approved scrypt password hashing (Node built-in, no external deps).
// Format: scrypt$N$<saltHex>$<hashHex>  — salt + hash stored together.

const KEYLEN = 64
const N = 16384 // CPU/memory cost (scrypt N)
const R = 8
const P = 1

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, saltHex, hashHex] = stored.split('$')
    if (scheme !== 'scrypt' || !nStr || !saltHex || !hashHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: parseInt(nStr, 10),
      r: R,
      p: P,
    })
    return crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
