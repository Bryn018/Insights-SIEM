'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Gauge,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  ArrowDownToLine,
  ArrowUpFromLine,
  Timer,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

// All values come from the real /api/system/diagnostics endpoint, which reads
// actual host metrics. External SIEM services report "Not connected" honestly
// when no live pipeline is attached. Nothing here is simulated.

interface ServiceStatus {
  name: string
  connected: boolean
  note?: string
}

interface DiagnosticsData {
  measuredAt: string
  host: { hostname: string; platform: string; arch: string; cpuCores: number; loadAverage: number[]; uptimeSec: number }
  resources: {
    cpuPercent: number
    memory: { usedPct: number; usedGb: number; totalGb: number; cachedPct: number; freePct: number }
    disk: { usedPct: number; usedGb: number; totalGb: number }
    network: { inMbps: number; outMbps: number }
    diskIo: { readMbps: number; writeMbps: number }
  }
  services: ServiceStatus[]
  pipeline: {
    ingestedEps: number
    processedEps: number
    queueDepth: number
    latencyP50Ms: number | null
    latencyP95Ms: number | null
    latencyP99Ms: number | null
    alertRatePerMin: number
    mttaMin: number | null
    mttrMin: number | null
    escalationRatePct: number | null
  }
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function PctBar({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? 'bg-red-400' : value >= 60 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-500">{label}</span>
        <span className={cn('font-medium', value >= 80 ? 'text-red-400' : 'text-zinc-300')}>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-1 font-mono text-lg text-zinc-100">{value}</div>
      {sub && <div className="text-[9px] text-zinc-500">{sub}</div>}
    </div>
  )
}

function ServiceDot({ connected }: { connected: boolean }) {
  return (
    <span className={cn('inline-block h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-zinc-600')} />
  )
}

export function SystemDiagnostics() {
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDiagnostics = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/system/diagnostics')
      if (res.ok) setData(await res.json())
    } catch {
      /* keep last known state on transient failure */
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDiagnostics()
    intervalRef.current = setInterval(fetchDiagnostics, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchDiagnostics])

  const connectedCount = data ? data.services.filter((s) => s.connected).length : 0
  const totalCount = data ? data.services.length : 0

  if (!data) {
    return (
      <Card className="border-zinc-800 bg-zinc-950">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading diagnostics...
          </div>
        </CardContent>
      </Card>
    )
  }

  const r = data.resources

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-zinc-800 bg-zinc-950 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none border-b border-zinc-800 bg-zinc-950 px-4 py-3 hover:bg-zinc-900/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium text-zinc-200">System Diagnostics</CardTitle>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Server className="h-2.5 w-2.5 text-zinc-400" />
                      {data.host.hostname}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span>{connectedCount}/{totalCount} services connected</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    fetchDiagnostics()
                  }}
                >
                  <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                </Button>
                <span className="text-[9px] text-zinc-600">
                  {new Date(data.measuredAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-4 space-y-4">
            {/* Host resources — measured from this server */}
            <div>
              <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Host Resources ({data.host.platform} · {data.host.cpuCores} cores · load {data.host.loadAverage[0]})
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <PctBar value={r.cpuPercent} label="CPU" />
                  <PctBar value={r.memory.usedPct} label="Memory" />
                  <PctBar value={r.disk.usedPct} label="Disk" />
                  <div className="flex flex-wrap gap-3 pt-1 text-[9px] text-zinc-500">
                    <span>Mem {r.memory.usedGb}/{r.memory.totalGb} GB</span>
                    <span>Cached {r.memory.cachedPct}%</span>
                    <span>Free {r.memory.freePct}%</span>
                    <span>Disk {r.disk.usedGb}/{r.disk.totalGb} GB</span>
                  </div>
                </div>
                <Metric
                  label="Network In"
                  value={r.network.inMbps > 0 ? `${r.network.inMbps} Mbps` : '—'}
                  sub="measured from host"
                />
                <Metric
                  label="Network Out"
                  value={r.network.outMbps > 0 ? `${r.network.outMbps} Mbps` : '—'}
                  sub="measured from host"
                />
              </div>
            </div>

            {/* External services — honest connection state */}
            <div>
              <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">Services</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {data.services.map((s) => (
                  <div
                    key={s.name}
                    className={cn(
                      'rounded-lg border p-2.5 transition-colors',
                      s.connected ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-800/60 bg-zinc-900/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <ServiceDot connected={s.connected} />
                      <span className={cn('text-[8px] font-medium uppercase', s.connected ? 'text-emerald-400' : 'text-zinc-500')}>
                        {s.connected ? 'online' : 'offline'}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-xs font-medium text-zinc-200">{s.name}</p>
                    <p className="mt-1 text-[9px] text-zinc-500">{s.connected ? 'Connected' : s.note ?? 'Not connected'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Event pipeline — real or explicitly empty */}
            <div>
              <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">Event Pipeline</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="Ingested" value={data.pipeline.ingestedEps > 0 ? `${data.pipeline.ingestedEps} EPS` : '0 EPS'} />
                <Metric label="Processed" value={data.pipeline.processedEps > 0 ? `${data.pipeline.processedEps} EPS` : '0 EPS'} />
                <Metric label="Queue" value={data.pipeline.queueDepth > 0 ? `${data.pipeline.queueDepth}` : '0'} />
                <Metric label="Latency p95" value={data.pipeline.latencyP95Ms != null ? `${data.pipeline.latencyP95Ms} ms` : '—'} />
                <Metric label="MTTA" value={data.pipeline.mttaMin != null ? `${data.pipeline.mttaMin} min` : '—'} sub="from real alerts" />
                <Metric label="MTTR" value={data.pipeline.mttrMin != null ? `${data.pipeline.mttrMin} min` : '—'} sub="from real alerts" />
              </div>
              {data.pipeline.ingestedEps === 0 && (
                <p className="mt-2 text-[10px] text-amber-400/80">
                  No live ingest pipeline attached — EPS, latency and throughput show 0. Connect OpenSearch/Suricata to populate.
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
