#!/usr/bin/env node
// Ensure the single global RetentionPolicy row exists with defaults.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
db.retentionPolicy
  .upsert({ where: { id: 'global' }, update: {}, create: { id: 'global' } })
  .then(() => {
    console.log('retention policy ready')
    return db.$disconnect()
  })
  .catch((e) => {
    console.error('init failed:', e.message)
    process.exit(1)
  })
