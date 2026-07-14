'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wifi,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowRightLeft,
  ShieldAlert,
  ExternalLink,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Globe,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ===== Types =====

type Protocol = 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'HTTP' | 'HTTPS' | 'SSH' | 'FTP'
type Direction = 'Inbound' | 'Outbound'
type Risk = 'Low' | 'Medium' | 'High' | 'Critical'
type AnomalyType = 'Port Scan' | 'DGA Domain' | 'Beacon' | 'Data Exfil' | 'Tunnel' | 'C2'
type AnomalySeverity = 'Critical' | 'High' | 'Medium' | 'Low'

interface NetworkFlow {
  id: string
  sourceIp: string
  sourcePort: number
  destIp: string
  destPort: number
  protocol: Protocol
  bytes: number
  packets: number
  direction: Direction
  risk: Risk
  timestamp: string
}

interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  source: string
  destination: string
  description: string
  detectedAt: string
}

interface TopTalker {
  ip: string
  bytes: number
  packets: number
  flows: number
  risk: Risk
}

interface GeoEntry {
  country: string
  flag: string
  ipCount: number
  totalBytes: number
}

// ===== Protocol Color Map =====

const PROTOCOL_COLORS: Record<Protocol, string> = {
  TCP: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  UDP: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ICMP: 'bg-red-500/20 text-red-400 border-red-500/30',
  DNS: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  HTTP: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  HTTPS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  SSH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  FTP: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const PROTOCOL_BAR_COLORS: Record<string, string> = {
  'HTTP/HTTPS': '#10b981',
  DNS: '#06b6d4',
  SSH: '#8b5cf6',
  FTP: '#f97316',
  SMTP: '#eab308',
  Other: '#71717a',
}

const RISK_COLORS: Record<Risk, string> = {
  Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  High: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const DIRECTION_COLORS: Record<Direction, string> = {
  Inbound: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Outbound: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  'Port Scan': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'DGA Domain': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Beacon: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Data Exfil': 'bg-red-500/20 text-red-400 border-red-500/30',
  Tunnel: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  C2: 'bg-red-600/20 text-red-500 border-red-600/30',
}

const ANOMALY_SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  High: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

// ===== No mock data =====
// This view only shows data from a real connected capture feed
// (Suricata/Zeek). When none is attached, every panel renders an
// explicit "no capture" / empty state so nothing is fabricated.


// ===== Helpers =====

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

function formatBytesShort(bytes: number): string {
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}K`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}M`
  return `${(bytes / 1073741824).toFixed(1)}G`
}

// ===== Sub-Components =====

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  value,
  label,
  trend,
  trendUp,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  value: string
  label: string
  trend: string
  trendUp: boolean
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">{label}</p>
            <p className="text-2xl font-bold text-zinc-100">{value}</p>
          </div>
          <div className={cn('rounded-lg p-2', iconBg)}>
            <Icon className={cn('size-5', iconColor)} />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {trendUp ? (
            <TrendingUp className="size-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="size-3.5 text-red-400" />
          )}
          <span className={cn('text-xs font-medium', trendUp ? 'text-emerald-400' : 'text-red-400')}>
            {trend}
          </span>
          <span className="text-xs text-zinc-500">vs last hour</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ProtocolBar({ name, pct, color }: { name: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-zinc-300 font-medium truncate">{name}</span>
      <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right text-xs font-mono text-zinc-300">{pct}%</span>
    </div>
  )
}

function BandwidthSparkline() {
  const w = 600
  const h = 80
  const padX = 4
  const padY = 8
  // No live capture → flat baseline, no fabricated bandwidth curve.
  const y = h - padY
  const points = `${padX},${y} ${w - padX},${y}`
  const areaPoints = `${padX},${y} ${points} ${w - padX},${y}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#bwGrad)" />
      <polyline points={points} fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TopTalkerRow({ talker, maxBytes }: { talker: TopTalker; maxBytes: number }) {
  const pct = (talker.bytes / maxBytes) * 100
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-32 text-xs font-mono text-zinc-300 truncate">{talker.ip}</span>
      <div className="flex-1 h-3 bg-zinc-800 rounded overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn(
            'h-full rounded',
            talker.risk === 'Critical' ? 'bg-red-500' :
            talker.risk === 'High' ? 'bg-amber-500' :
            talker.risk === 'Medium' ? 'bg-yellow-500' :
            'bg-emerald-500'
          )}
        />
      </div>
      <span className="w-16 text-right text-xs font-mono text-zinc-400">{formatBytesShort(talker.bytes)}</span>
      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 border', RISK_COLORS[talker.risk])}>
        {talker.risk}
      </Badge>
      <span className="w-8 text-right text-[10px] text-zinc-500">{talker.flows}f</span>
    </div>
  )
}

function GeoRow({ entry, maxBytes }: { entry: GeoEntry; maxBytes: number }) {
  const pct = (entry.totalBytes / maxBytes) * 100
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-6 text-base">{entry.flag}</span>
      <span className="w-28 text-xs text-zinc-300 truncate">{entry.country}</span>
      <div className="flex-1 h-3 bg-zinc-800 rounded overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded bg-emerald-500/70"
        />
      </div>
      <span className="w-14 text-right text-xs font-mono text-zinc-400">{entry.ipCount} IPs</span>
      <span className="w-16 text-right text-xs font-mono text-zinc-500">{formatBytesShort(entry.totalBytes)}</span>
    </div>
  )
}

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 border', ANOMALY_TYPE_COLORS[anomaly.type])}>
            {anomaly.type}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 border', ANOMALY_SEVERITY_COLORS[anomaly.severity])}>
            {anomaly.severity}
          </Badge>
        </div>
        <span className="text-[10px] text-zinc-500 whitespace-nowrap">{anomaly.detectedAt}</span>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-zinc-300">{anomaly.source}</span>
        <ArrowRightLeft className="size-3 text-zinc-600" />
        <span className="text-zinc-300">{anomaly.destination}</span>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{anomaly.description}</p>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-zinc-700 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/30">
          <ExternalLink className="size-3" />
          Investigate
        </Button>
      </div>
    </div>
  )
}

// ===== Main Component =====

export function NetworkView() {
  const [filterProtocol, setFilterProtocol] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortCol, setSortCol] = useState<string>('timestamp')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const protocolFilters = ['all', 'TCP', 'UDP', 'ICMP', 'DNS', 'HTTP/HTTPS', 'SSH'] as const

  const filteredFlows = useMemo(() => {
    // No live network capture is connected in this deployment, so no flows
    // are shown. The filter/sort logic is preserved for when a real feed
    // (Suricata/Zeek) is attached.
    const flows: NetworkFlow[] = []
    return flows
  }, [])

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  // No live capture → no top-talker/geo aggregates to display.
  const maxSrcBytes = 0
  const maxDstBytes = 0
  const maxGeoBytes = 0

  const renderSortIcon = (col: string) => (
    <span className="inline-flex ml-1">
      {sortCol === col ? (
        sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
      ) : (
        <ChevronDown className="size-3 opacity-30" />
      )}
    </span>
  )

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
            <Wifi className="size-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Network Traffic Analysis</h1>
            <p className="text-sm text-zinc-400">Monitor network flows, detect anomalies, and analyze traffic patterns</p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard icon={Activity} iconColor="text-emerald-400" iconBg="bg-emerald-500/10 border border-emerald-500/20" value="—" label="Total Flows" trend="no capture" trendUp={false} />
        <StatCard icon={Wifi} iconColor="text-cyan-400" iconBg="bg-cyan-500/10 border border-cyan-500/20" value="—" label="Bandwidth" trend="no capture" trendUp={false} />
        <StatCard icon={AlertTriangle} iconColor="text-red-400" iconBg="bg-red-500/10 border border-red-500/20" value="0" label="Anomalies Detected" trend="no capture" trendUp={false} />
        <StatCard icon={Globe} iconColor="text-purple-400" iconBg="bg-purple-500/10 border border-purple-500/20" value="—" label="Top Protocol" trend="no capture" trendUp={false} />
      </motion.div>

      {/* Traffic Flow Table + Right Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Flow Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
          className="xl:col-span-2"
        >
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base text-zinc-100">Traffic Flows</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                    <Input
                      placeholder="Search IP / port..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7 w-44 pl-8 text-xs bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              </div>
              {/* Protocol filter buttons */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {protocolFilters.map(pf => (
                  <Button
                    key={pf}
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterProtocol(pf)}
                    className={cn(
                      'h-6 text-[10px] px-2 border-zinc-700 transition-all',
                      filterProtocol === pf
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    )}
                  >
                    {pf === 'all' ? 'All' : pf}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-[10px] text-zinc-500 h-8 cursor-pointer select-none" onClick={() => toggleSort('sourceIp')}>
                        Source IP:Port {renderSortIcon('sourceIp')}
                      </TableHead>
                      <TableHead className="text-[10px] text-zinc-500 h-8 cursor-pointer select-none" onClick={() => toggleSort('destIp')}>
                        Dest IP:Port {renderSortIcon('destIp')}
                      </TableHead>
                      <TableHead className="text-[10px] text-zinc-500 h-8 cursor-pointer select-none" onClick={() => toggleSort('protocol')}>
                        Protocol {renderSortIcon('protocol')}
                      </TableHead>
                      <TableHead className="text-[10px] text-zinc-500 h-8 cursor-pointer select-none" onClick={() => toggleSort('bytes')}>
                        Bytes {renderSortIcon('bytes')}
                      </TableHead>
                      <TableHead className="text-[10px] text-zinc-500 h-8 cursor-pointer select-none" onClick={() => toggleSort('packets')}>
                        Pkts {renderSortIcon('packets')}
                      </TableHead>
                      <TableHead className="text-[10px] text-zinc-500 h-8">Direction</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 h-8 cursor-pointer select-none" onClick={() => toggleSort('risk')}>
                        Risk {renderSortIcon('risk')}
                      </TableHead>
                      <TableHead className="text-[10px] text-zinc-500 h-8 w-12">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFlows.map(flow => (
                      <TableRow key={flow.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                        <TableCell className="py-1.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono text-zinc-200">{flow.sourceIp}</span>
                            <span className="text-[10px] font-mono text-zinc-500">:{flow.sourcePort}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono text-zinc-200">{flow.destIp}</span>
                            <span className="text-[10px] font-mono text-zinc-500">:{flow.destPort}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 border font-medium', PROTOCOL_COLORS[flow.protocol])}>
                            {flow.protocol}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs font-mono text-zinc-300">{formatBytes(flow.bytes)}</TableCell>
                        <TableCell className="py-1.5 text-xs font-mono text-zinc-300">{flow.packets.toLocaleString()}</TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1">
                            {flow.direction === 'Inbound' ? (
                              <ArrowDownRight className="size-3 text-cyan-400" />
                            ) : (
                              <ArrowUpRight className="size-3 text-orange-400" />
                            )}
                            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 border', DIRECTION_COLORS[flow.direction])}>
                              {flow.direction}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 border font-medium', RISK_COLORS[flow.risk])}>
                            {flow.risk}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-[10px] text-zinc-500 whitespace-nowrap">{flow.timestamp}</TableCell>
                      </TableRow>
                    ))}
                    {filteredFlows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-sm text-zinc-500">
                          No flows match the current filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="border-t border-zinc-800 px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Showing {filteredFlows.length} flows · no live capture connected</span>
                <span className="text-[10px] text-zinc-600">Last updated: just now</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Protocol Distribution + Bandwidth Sparkline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}
          className="space-y-6"
        >
          {/* Protocol Distribution */}
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-100">Protocol Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <p className="text-xs text-zinc-600">No protocol data — connect a live capture feed (Suricata/Zeek) to populate.</p>
            </CardContent>
          </Card>

          {/* Bandwidth Over Time */}
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-zinc-100">Bandwidth (24h)</CardTitle>
                <span className="text-xs text-zinc-500">no capture</span>
              </div>
            </CardHeader>
            <CardContent>
              <BandwidthSparkline />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-600">24h ago</span>
                <span className="text-[9px] text-zinc-600">Now</span>
              </div>
            </CardContent>
          </Card>

          {/* Geo IP Summary */}
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-100">Geo IP Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs text-zinc-600">No Geo IP data — connect a live capture feed (Suricata/Zeek) to populate.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom: Top Talkers + Anomaly Detection */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Talkers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
          className="xl:col-span-1"
        >
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-100">Top Talkers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-2">Top Source IPs</h4>
                <div className="space-y-0.5">
                  <p className="text-xs text-zinc-600 py-2">No source traffic recorded.</p>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-3">
                <h4 className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">Top Destination IPs</h4>
                <div className="space-y-0.5">
                  <p className="text-xs text-zinc-600 py-2">No destination traffic recorded.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Anomaly Detection Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}
          className="xl:col-span-2"
        >
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-red-400" />
                  <CardTitle className="text-sm text-zinc-100">Anomaly Detection</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 px-2">
                  0 Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <div className="space-y-3">
                  <p className="text-xs text-zinc-600 py-2">No anomalies detected — no live capture feed connected.</p>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
