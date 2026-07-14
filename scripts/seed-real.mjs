// Seed REAL users only (no demo/seed alerts). Idempotent.
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const KEYLEN = 64, N = 16384, R = 8, P = 1
function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`
}

const db = new PrismaClient()
const users = [
  { email: 'admin@insights.local', name: 'Administrator', password: 'TestPass123!', role: 'admin' },
  { email: 'viewer@insights.local', name: 'Viewer User', password: 'ViewPass123!', role: 'viewer' },
]
for (const u of users) {
  const existing = await db.user.findUnique({ where: { email: u.email } })
  if (existing) {
    await db.user.update({ where: { email: u.email }, data: { passwordHash: hashPassword(u.password), role: u.role, isActive: true } })
    console.log('updated', u.email)
  } else {
    await db.user.create({ data: { email: u.email, name: u.name, passwordHash: hashPassword(u.password), role: u.role, isActive: true } })
    console.log('created', u.email)
  }
}
// retention policy row
await db.retentionPolicy.upsert({ where: { id: 'global' }, update: {}, create: { id: 'global', alertRetentionDays: 90, incidentRetentionDays: 365, legalHold: false } })
console.log('retention policy ready')
await db.$disconnect()
