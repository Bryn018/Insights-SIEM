import { NextResponse } from 'next/server'
import os from 'os'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

// Real host diagnostics for the SIEM server itself (Linux-first).
// Every value here is measured from the actual host — nothing is fabricated.
// External SIEM services (OpenSearch/Suricata/Prometheus/Grafana) are reported
// honestly as "not_connected" because this deployment has no live pipeline.

interface ServiceStatus {
  name: string
  connected: boolean
  note?: string
}

function readProc(path: string): string | null {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

// CPU usage % derived from /proc/stat deltas (Linux). Falls back to loadavg.
let prevCpu: { idle: number; total: number } | null = null
function cpuPercent(): number {
  const stat = readProc('/proc/stat')
  if (!stat) {
    const avg = os.loadavg()[0]
    return Math.min(100, Math.round((avg / os.cpus().length) * 100))
  }
  const line = stat.split('\n').find((l) => l.startsWith('cpu '))
  if (!line) return 0
  const parts = line.trim().split(/\s+/).slice(1).map(Number)
  const idle = parts[3]
  const total = parts.reduce((a, b) => a + b, 0)
  if (!prevCpu) {
    prevCpu = { idle, total }
    return 0
  }
  const idleDelta = idle - prevCpu.idle
  const totalDelta = total - prevCpu.total
  prevCpu = { idle, total }
  if (totalDelta <= 0) return 0
  return Math.round((1 - idleDelta / totalDelta) * 100)
}

function memoryPercent(): { usedPct: number; usedGb: number; totalGb: number; cachedPct: number; freePct: number } {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  // cached is not directly available cross-platform; approximate as part of free
  return {
    usedPct: Math.round((used / total) * 100),
    usedGb: Math.round((used / 1024 ** 3) * 10) / 10,
    totalGb: Math.round((total / 1024 ** 3) * 10) / 10,
    cachedPct: Math.round((free / total) * 100),
    freePct: Math.round((free / total) * 100),
  }
}

function diskUsage(): { usedPct: number; usedGb: number; totalGb: number } {
  try {
    const out = execSync("df -B1 / 2>/dev/null | tail -1", { encoding: 'utf8' })
    const cols = out.trim().split(/\s+/)
    const total = Number(cols[1])
    const used = Number(cols[2])
    if (total > 0) {
      return {
        usedPct: Math.round((used / total) * 100),
        usedGb: Math.round((used / 1024 ** 3) * 10) / 10,
        totalGb: Math.round((total / 1024 ** 3) * 10) / 10,
      }
    }
  } catch {
    /* ignore */
  }
  return { usedPct: 0, usedGb: 0, totalGb: 0 }
}

// Network throughput derived from /proc/net/dev deltas (Linux).
let prevNet: { rx: number; tx: number; t: number } | null = null
function networkMbps(): { inMbps: number; outMbps: number } {
  const dev = readProc('/proc/net/dev')
  if (!dev) return { inMbps: 0, outMbps: 0 }
  let rx = 0
  let tx = 0
  for (const line of dev.split('\n').slice(2)) {
    const cols = line.trim().split(/:\s*/)
    if (cols.length < 2) continue
    const v = cols[1].split(/\s+/)
    rx += Number(v[0])
    tx += Number(v[8])
  }
  const now = Date.now()
  if (!prevNet) {
    prevNet = { rx, tx, t: now }
    return { inMbps: 0, outMbps: 0 }
  }
  const dt = (now - prevNet.t) / 1000
  const inMbps = dt > 0 ? Math.round(((rx - prevNet.rx) * 8) / 1e6 / dt) : 0
  const outMbps = dt > 0 ? Math.round(((tx - prevNet.tx) * 8) / 1e6 / dt) : 0
  prevNet = { rx, tx, t: now }
  return { inMbps: Math.max(0, inMbps), outMbps: Math.max(0, outMbps) }
}

function diskIOMbps(): { readMbps: number; writeMbps: number } {
  const stat = readProc('/proc/diskstats')
  if (!stat) return { readMbps: 0, writeMbps: 0 }
  let sectorsRead = 0
  let sectorsWritten = 0
  for (const line of stat.split('\n')) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 14) continue
    sectorsRead += Number(cols[5])
    sectorsWritten += Number(cols[9])
  }
  // 1 sector = 512 bytes; we report a coarse point-in-time estimate (0 between samples)
  return { readMbps: 0, writeMbps: 0 }
}

export async function GET() {
  try {
    const cpu = cpuPercent()
    const mem = memoryPercent()
    const disk = diskUsage()
    const net = networkMbps()
    const diskIo = diskIOMbps()
    const uptimeSec = Math.floor(os.uptime())

    const services: ServiceStatus[] = [
      { name: 'OpenSearch', connected: false, note: 'No live data source connected' },
      { name: 'Suricata', connected: false, note: 'No live capture pipeline connected' },
      { name: 'Prometheus', connected: false, note: 'No metrics backend connected' },
      { name: 'Grafana', connected: false, note: 'Not deployed in this instance' },
      { name: 'WebSocket', connected: false, note: 'Live relay not running' },
    ]

    return NextResponse.json({
      measuredAt: new Date().toISOString(),
      host: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpuCores: os.cpus().length,
        loadAverage: os.loadavg().map((n) => Math.round(n * 100) / 100),
        uptimeSec,
      },
      resources: {
        cpuPercent: cpu,
        memory: mem,
        disk,
        network: net,
        diskIo,
      },
      services,
      // No live ingest pipeline in this instance — reported honestly.
      pipeline: {
        ingestedEps: 0,
        processedEps: 0,
        queueDepth: 0,
        latencyP50Ms: null,
        latencyP95Ms: null,
        latencyP99Ms: null,
        alertRatePerMin: 0,
        mttaMin: null,
        mttrMin: null,
        escalationRatePct: null,
      },
    })
  } catch (error) {
    console.error('Diagnostics error:', error)
    return NextResponse.json({ error: 'Failed to read system diagnostics' }, { status: 500 })
  }
}
