// realtime-relay.mjs — pushes new alerts from the SQLite DB to connected
// browser clients over WebSocket, so captures appear the instant they land.
// Uses the installed `ws` package + Prisma. Run: node realtime-relay.mjs
import { WebSocketServer } from 'ws'
import { PrismaClient } from '@prisma/client'

const PORT = Number(process.env.RELAY_PORT || 3003)
const prisma = new PrismaClient()
const wss = new WebSocketServer({ port: PORT, path: '/' })

console.log(`[relay] WebSocket relay listening on :${PORT}`)

// Track the newest alert id we've already broadcast.
let lastId = null
async function seedLastId() {
  const a = await prisma.alert.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true } })
  lastId = a?.id ?? null
}
seedLastId().catch((e) => console.error('[relay] seed error', e))

function broadcast(obj) {
  const msg = JSON.stringify(obj)
  for (const c of wss.clients) {
    if (c.readyState === 1) c.send(msg)
  }
}

// Poll the DB for alerts newer than lastId, broadcast, repeat every 1s.
async function poll() {
  try {
    const where = lastId ? { id: { gt: lastId } } : {}
    const fresh = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 50,
    })
    for (const a of fresh) {
      lastId = a.id
      broadcast({ type: 'alert:new', alert: a })
    }
  } catch (e) {
    // DB transient error — ignore and retry next tick
  }
}
setInterval(poll, 1000)

wss.on('connection', (ws) => {
  console.log(`[relay] client connected (total ${wss.clients.size})`)
  ws.on('close', () => console.log(`[relay] client disconnected (total ${wss.clients.size})`))
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
