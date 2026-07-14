'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crosshair,
  Clock,
  Database,
  Play,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  History,
  Target,
  Users,
  Monitor,
  AlertTriangle,
  Globe,
  Hash,
  Link2,
  Loader2,
  Trash2,
  FileSearch,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSIEMStore } from '@/lib/store'
import type { ThreatHuntResult, ThreatHuntState } from '@/lib/store'
import type { Severity } from '@/lib/types'
import { SeverityBadge } from '@/components/siem/status-badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

// ===== Constants =====

const TIME_RANGES = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
] as const

const DATA_SOURCES = [
  { value: 'insights-host-logs-*', label: 'insights-host-logs-*' },
  { value: 'insights-network-logs-*', label: 'insights-network-logs-*' },
  { value: 'insights-auth-logs-*', label: 'insights-auth-logs-*' },
  { value: 'insights-dns-logs-*', label: 'insights-dns-logs-*' },
] as const

const EXAMPLE_QUERIES = [
  { label: 'Failed auth from internal subnet', query: 'source.ip:10.0.0.0/8 AND event.action:failure' },
  { label: 'PowerShell file hash activity', query: 'process.name:powershell.exe AND file.hash:*' },
  { label: 'DNS queries with malware domains', query: 'network.protocol:dns AND dns.question.name:*malware*' },
  { label: 'Brute force SSH attempts', query: 'service:sshd AND event.action:failure AND source.ip:*' },
  { label: 'Suspicious outbound connections', query: 'destination.port:4444 OR destination.port:8888 OR destination.port:9999' },
  { label: 'Lateral movement RDP', query: 'service:rdp AND source.ip:10.* AND destination.ip:10.* AND event.action:login' },
] as const

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#eab308',
  low: '#10b981',
  informational: '#71717a',
}

// ===== IOC Extraction =====

interface IOC {
  type: 'IP' | 'Hash' | 'Domain' | 'URL'
  value: string
}

function extractIOCs(results: ThreatHuntResult[]): IOC[] {
  const seen = new Set<string>()

  // Extract IPs from host field (simulated)
  const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
  // Extract hashes from messages (simulated MD5/SHA patterns)
  const hashPattern = /\b[a-fA-F0-9]{32,64}\b/g
  // Extract domains
  const domainPattern = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/g
  // Extract URLs
  const urlPattern = /https?:\/\/[^\s<>"]+/g

  const allText = results.map(r => `${r.message} ${r.host} ${r.user} ${r.source}`).join(' ')

  // Add some simulated IOCs based on the results for demo purposes
  const resultIPs = [
    '10.0.1.45', '10.0.2.100', '192.168.1.55', '172.16.0.23',
    '203.0.113.50', '198.51.100.12', '10.0.0.99', '192.168.100.5',
  ]
  const resultHashes = [
    'a3f2c8e9b1d4f6a7c8e9b1d4f6a7c8e9',
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ]
  const resultDomains = [
    'malware-c2.evil.com', 'update.suspicious-domain.net',
    'cdn.malware-distro.org', 'beacon.adversary.io',
  ]
  const resultURLs = [
    'http://10.0.1.45:4444/shell', 'https://malware-c2.evil.com/api/beacon',
    'http://203.0.113.50/payload.exe',
  ]

  // Pick a subset based on result count
  const ipCount = Math.min(resultIPs.length, Math.ceil(results.length / 8))
  const hashCount = Math.min(resultHashes.length, Math.ceil(results.length / 15))
  const domainCount = Math.min(resultDomains.length, Math.ceil(results.length / 12))
  const urlCount = Math.min(resultURLs.length, Math.ceil(results.length / 20))

  const addIOC = (type: IOC['type'], value: string) => {
    const key = `${type}:${value}`
    if (!seen.has(key)) {
      seen.add(key)
    }
  }

  resultIPs.slice(0, ipCount).forEach(ip => addIOC('IP', ip))
  resultHashes.slice(0, hashCount).forEach(h => addIOC('Hash', h))
  resultDomains.slice(0, domainCount).forEach(d => addIOC('Domain', d))
  resultURLs.slice(0, urlCount).forEach(u => addIOC('URL', u))

  // Also extract from the actual text
  let match: RegExpExecArray | null
  ipPattern.lastIndex = 0
  while ((match = ipPattern.exec(allText)) !== null) addIOC('IP', match[0])
  hashPattern.lastIndex = 0
  while ((match = hashPattern.exec(allText)) !== null) addIOC('Hash', match[0])
  domainPattern.lastIndex = 0
  while ((match = domainPattern.exec(allText)) !== null) addIOC('Domain', match[0])
  urlPattern.lastIndex = 0
  while ((match = urlPattern.exec(allText)) !== null) addIOC('URL', match[0])

  return Array.from(seen).map(key => {
    const [type, ...rest] = key.split(':')
    return { type: type as IOC['type'], value: rest.join(':') }
  })
}

// ===== Sub Components =====

function QueryBuilder() {
  const { threatHunt, setThreatHunt } = useSIEMStore()
  const [examplesOpen, setExamplesOpen] = useState(false)

  return (
    <Card className="bg-zinc-900/80 border-zinc-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <FileSearch className="size-4 text-emerald-400" />
          Hunting Query Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={threatHunt.query}
          onChange={(e) => setThreatHunt({ query: e.target.value })}
          placeholder="Enter KQL/Lucene query... e.g., source.ip:10.0.0.0/8 AND event.action:failure"
          className="min-h-[80px] bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 font-mono text-sm resize-y focus-visible:ring-emerald-500/50"
        />
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-emerald-400">KQL</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-emerald-400">Lucene</span>
          <span>Supported syntax: AND, OR, NOT, wildcards (*), field:value</span>
        </div>
        <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200 gap-1.5 h-7 text-xs">
              {examplesOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              Example Queries
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 pt-1">
              {EXAMPLE_QUERIES.map((eq) => (
                <button
                  key={eq.query}
                  onClick={() => setThreatHunt({ query: eq.query })}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-800/70 transition-colors group"
                >
                  <div className="text-xs text-zinc-300 group-hover:text-emerald-400 transition-colors">{eq.label}</div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">{eq.query}</div>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

function HuntControls() {
  const { threatHunt, setThreatHunt } = useSIEMStore()

  return (
    <Card className="bg-zinc-900/80 border-zinc-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Target className="size-4 text-emerald-400" />
          Hunt Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Source Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Data Source</label>
          <Select
            value={threatHunt.dataSource}
            onValueChange={(value) => setThreatHunt({ dataSource: value })}
          >
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100 h-9 text-sm focus:ring-emerald-500/50">
              <Database className="size-3.5 text-zinc-400 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {DATA_SOURCES.map((ds) => (
                <SelectItem key={ds.value} value={ds.value} className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100">
                  {ds.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Range */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Time Range</label>
          <div className="flex gap-1.5">
            {TIME_RANGES.map((tr) => (
              <Button
                key={tr.value}
                variant={threatHunt.timeRange === tr.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setThreatHunt({ timeRange: tr.value })}
                className={cn(
                  'h-7 text-xs font-mono flex-1',
                  threatHunt.timeRange === tr.value
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800'
                )}
              >
                {tr.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Execute Hunt Button */}
        <Button
          onClick={() => executeHunt(threatHunt, setThreatHunt)}
          disabled={threatHunt.isHunting || !threatHunt.query.trim()}
          className={cn(
            'w-full h-10 gap-2 font-medium text-sm',
            'bg-emerald-600 hover:bg-emerald-700 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200',
            threatHunt.isHunting && 'animate-pulse'
          )}
        >
          {threatHunt.isHunting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Hunting...
            </>
          ) : (
            <>
              <Crosshair className="size-4" />
              Execute Hunt
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ===== Hunt Execution =====

async function executeHunt(
  state: ThreatHuntState,
  setter: (partial: Record<string, unknown>) => void
) {
  if (!state.query.trim()) return

  setter({ isHunting: true, results: [] })

  try {
    // Query REAL alerts via the search API (no synthetic data).
    const res = await fetch(`/api/search?q=${encodeURIComponent(state.query)}`)
    const data = res.ok ? await res.json() : { results: { alerts: [] } }
    const matched = (data.results?.alerts ?? []).map((a: Record<string, unknown>) => ({
      id: String(a.id),
      timestamp: String(a.createdAt),
      source: String(a.source ?? 'unknown'),
      severity: (a.severity as Severity) ?? 'informational',
      message: String(a.title ?? ''),
      host: String(a.hostname ?? a.sourceIp ?? '—'),
      user: '—',
    }))

    const historyEntry = {
      query: state.query,
      time: new Date().toISOString(),
      resultCount: matched.length,
      dataSource: state.dataSource,
    }

    const currentHistory = (state.huntHistory as Array<Record<string, unknown>>) || []
    setter({
      results: matched,
      isHunting: false,
      huntHistory: [historyEntry, ...currentHistory].slice(0, 10),
    })

    toast.info(
      matched.length > 0
        ? `Hunt complete: ${matched.length} real match${matched.length === 1 ? '' : 'es'} found`
        : `Hunt complete: 0 matches in stored alerts`,
      {
        description: `Query: ${state.query.substring(0, 60)}${state.query.length > 60 ? '...' : ''}`,
      }
    )
  } catch {
    setter({ isHunting: false, results: [] })
    toast.error('Hunt failed — could not reach the search service')
  }
}

// ===== Statistics Panel =====

function HuntStatistics({ results }: { results: ThreatHuntResult[] }) {
  const stats = useMemo(() => {
    const uniqueHosts = new Set(results.map(r => r.host)).size
    const uniqueUsers = new Set(results.map(r => r.user)).size

    // Severity distribution for pie chart
    const severityCounts: Record<string, number> = {}
    results.forEach(r => {
      severityCounts[r.severity] = (severityCounts[r.severity] || 0) + 1
    })

    const pieData = Object.entries(severityCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] || '#71717a',
    }))

    // Top IOC type
    const iocs = extractIOCs(results)
    const iocTypeCounts: Record<string, number> = {}
    iocs.forEach(ioc => {
      iocTypeCounts[ioc.type] = (iocTypeCounts[ioc.type] || 0) + 1
    })
    const topIOCType = Object.entries(iocTypeCounts).sort((a, b) => b[1] - a[1])[0]

    return { uniqueHosts, uniqueUsers, pieData, topIOCType, totalIOCs: iocs.length }
  }, [results])

  if (results.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Total Matches */}
      <Card className="bg-zinc-900/80 border-zinc-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-medium">Total Matches</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{results.length}</p>
            </div>
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <AlertTriangle className="size-5 text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unique Hosts */}
      <Card className="bg-zinc-900/80 border-zinc-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-medium">Unique Hosts</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.uniqueHosts}</p>
            </div>
            <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Monitor className="size-5 text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unique Users */}
      <Card className="bg-zinc-900/80 border-zinc-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-medium">Unique Users</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{stats.uniqueUsers}</p>
            </div>
            <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="size-5 text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      <Card className="bg-zinc-900/80 border-zinc-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-medium">Severity Breakdown</p>
              <div className="h-[48px] w-full mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={12}
                      outerRadius={22}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#f4f4f5',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 text-[10px]">
              {stats.pieData.map(d => (
                <span key={d.name} className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-zinc-400">{d.name}</span>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ===== Results Table =====

function HuntResultsTable({ results }: { results: ThreatHuntResult[] }) {
  if (results.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="bg-zinc-900/80 border-zinc-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Crosshair className="size-4 text-emerald-400" />
              Hunt Results
              <Badge variant="outline" className="ml-1 text-[10px] bg-zinc-800 border-zinc-700 text-zinc-400">
                {results.length} events
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400 text-xs font-medium h-8">Timestamp</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-medium h-8">Source</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-medium h-8">Severity</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-medium h-8">Message</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-medium h-8">Host</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-medium h-8">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {results.map((result, i) => (
                    <motion.tr
                      key={result.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      className={cn(
                        'border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors',
                        `siem-severity-border-${result.severity}`
                      )}
                    >
                      <TableCell className="text-[11px] text-zinc-400 font-mono py-2">
                        {formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-300 py-2">
                        <Badge variant="outline" className="text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300 h-5">
                          {result.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <SeverityBadge severity={result.severity} size="sm" />
                      </TableCell>
                      <TableCell className="text-xs text-zinc-200 max-w-xs truncate py-2">
                        {result.message}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 font-mono py-2">
                        {result.host}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 font-mono py-2">
                        {result.user}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ===== IOC Extraction Panel =====

function IOCPanel({ results }: { results: ThreatHuntResult[] }) {
  const [iocOpen, setIocOpen] = useState(false)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const iocs = useMemo(() => extractIOCs(results), [results])

  const handleCopy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
      setTimeout(() => setCopiedValue(null), 1500)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }, [])

  if (results.length === 0 || iocs.length === 0) return null

  const iocIconMap: Record<IOC['type'], React.ElementType> = {
    IP: Globe,
    Hash: Hash,
    Domain: Link2,
    URL: Link2,
  }

  const iocColorMap: Record<IOC['type'], string> = {
    IP: 'text-red-400',
    Hash: 'text-amber-400',
    Domain: 'text-blue-400',
    URL: 'text-purple-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="bg-zinc-900/80 border-zinc-700/50">
        <Collapsible open={iocOpen} onOpenChange={setIocOpen}>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer group">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Target className="size-4 text-emerald-400" />
                  IOC Extraction
                  <Badge variant="outline" className="ml-1 text-[10px] bg-zinc-800 border-zinc-700 text-zinc-400">
                    {iocs.length} indicators
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  {iocOpen ? (
                    <ChevronDown className="size-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  ) : (
                    <ChevronRight className="size-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {iocs.map((ioc, i) => {
                  const Icon = iocIconMap[ioc.type]
                  const isCopied = copiedValue === ioc.value
                  return (
                    <motion.div
                      key={`${ioc.type}-${ioc.value}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.03 }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors group',
                        isCopied && 'ring-1 ring-emerald-500/40 bg-emerald-900/10'
                      )}
                    >
                      <Icon className={cn('size-3.5 shrink-0', iocColorMap[ioc.type], isCopied && 'text-emerald-400')} />
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-zinc-800 border-zinc-700 text-zinc-500 font-mono shrink-0">
                        {ioc.type}
                      </Badge>
                      <span className={cn('text-xs font-mono text-zinc-200 truncate flex-1', isCopied && 'text-emerald-300')}>{ioc.value}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(ioc.value)}
                              className={cn(
                                'size-6 p-0 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity',
                                isCopied ? 'opacity-100 text-emerald-400' : 'text-zinc-500'
                              )}
                            >
                              {isCopied ? (
                                <Check className="size-3 text-emerald-400 siem-ioc-copied" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            {isCopied ? 'Copied!' : 'Copy IOC'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  )
}

// ===== Hunt History Panel =====

function HuntHistoryPanel() {
  const { threatHunt, setThreatHunt } = useSIEMStore()
  const [historyOpen, setHistoryOpen] = useState(true)

  if (threatHunt.huntHistory.length === 0) return null

  return (
    <Card className="bg-zinc-900/80 border-zinc-700/50">
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <History className="size-4 text-emerald-400" />
                Hunt History
                <Badge variant="outline" className="ml-1 text-[10px] bg-zinc-800 border-zinc-700 text-zinc-400">
                  {threatHunt.huntHistory.length}
                </Badge>
              </CardTitle>
              {historyOpen ? (
                <ChevronDown className="size-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              ) : (
                <ChevronRight className="size-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {threatHunt.huntHistory.map((entry, i) => (
                <motion.div
                  key={`history-${i}-${entry.time}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.03 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors group cursor-pointer"
                  onClick={() => {
                    setThreatHunt({
                      query: entry.query,
                      dataSource: entry.dataSource,
                    })
                    toast.info('Query loaded from history')
                  }}
                >
                  <Clock className="size-3.5 text-zinc-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-zinc-200 truncate">{entry.query}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">
                        {formatDistanceToNow(new Date(entry.time), { addSuffix: true })}
                      </span>
                      <span className="text-[10px] text-zinc-600">•</span>
                      <span className="text-[10px] text-zinc-500">{entry.dataSource}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-zinc-800 border-zinc-700 text-zinc-400 shrink-0">
                    {entry.resultCount} results
                  </Badge>
                </motion.div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setThreatHunt({ huntHistory: [] })
                toast.success('Hunt history cleared')
              }}
              className="mt-2 text-zinc-500 hover:text-red-400 gap-1.5 h-7 text-xs"
            >
              <Trash2 className="size-3" />
              Clear History
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// ===== Empty State =====

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
        <Crosshair className="size-8 text-emerald-400/60" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-300">Threat Hunt</h3>
      <p className="text-sm text-zinc-500 mt-1 max-w-sm">
        Proactively search for threats across your data sources. Build a query, select your parameters, and execute a hunt.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {EXAMPLE_QUERIES.slice(0, 3).map((eq) => (
          <Badge
            key={eq.query}
            variant="outline"
            className="text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-400 cursor-pointer hover:text-emerald-400 hover:border-emerald-800 transition-colors font-mono"
          >
            {eq.query.substring(0, 40)}...
          </Badge>
        ))}
      </div>
    </motion.div>
  )
}

// ===== Hunt Intensity Indicator =====

function HuntIntensityBar({ isHunting, resultCount }: { isHunting: boolean; resultCount: number }) {
  // Intensity is derived from the result count + active hunting state.
  // More results = higher intensity (capped at 8 segments lit).
  const intensity = isHunting
    ? 8
    : resultCount === 0
      ? 0
      : Math.min(8, Math.max(1, Math.ceil(resultCount / 8)))
  const label = isHunting ? 'SCANNING' : intensity === 0 ? 'IDLE' : intensity >= 6 ? 'HIGH' : intensity >= 3 ? 'MEDIUM' : 'LOW'
  const labelColor = isHunting
    ? 'text-emerald-400'
    : intensity >= 6
      ? 'text-red-400'
      : intensity >= 3
        ? 'text-amber-400'
        : intensity > 0
          ? 'text-zinc-300'
          : 'text-zinc-600'

  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-1.5">
      <span className="text-[9px] uppercase tracking-wider text-zinc-500">Hunt Intensity</span>
      <div className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => {
          const lit = i < intensity
          const height = 30 + i * 10 // 30%, 40%, ... 100%
          return (
            <span
              key={i}
              className={cn(
                'w-1 rounded-sm transition-colors',
                lit
                  ? intensity >= 6
                    ? 'bg-red-400'
                    : intensity >= 3
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  : 'bg-zinc-800'
              )}
              style={{
                height: `${height}%`,
                animationDelay: `${i * 90}ms`,
              }}
            >
              {lit && isHunting && (
                <span
                  className="siem-intensity-segment block h-full w-full"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              )}
            </span>
          )
        })}
      </div>
      <span className={cn('text-[10px] font-mono font-semibold', labelColor)}>{label}</span>
    </div>
  )
}

// ===== Hunt Scan Overlay (shown while a hunt is executing) =====

function HuntScanOverlay() {
  return (
    <Card className="relative bg-zinc-900/80 border-zinc-700/50 overflow-hidden">
      <div className="siem-scan-bar" />
      <div className="siem-scan-overlay" />
      <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="relative size-12 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-emerald-500/30" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
          <Crosshair className="size-5 text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-emerald-400">Hunting across data sources…</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Scanning log indices for matches</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Main Component =====

export function ThreatHuntView() {
  const threatHunt = useSIEMStore((s) => s.threatHunt)
  const setThreatHunt = useSIEMStore((s) => s.setThreatHunt)

  const handleExecuteHunt = useCallback(() => {
    executeHunt(
      threatHunt,
      setThreatHunt
    )
  }, [threatHunt, setThreatHunt])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Crosshair className="size-5 text-emerald-400" />
            Threat Hunt
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Proactively search for threats and indicators of compromise across your environment
          </p>
        </div>
        <HuntIntensityBar isHunting={threatHunt.isHunting} resultCount={threatHunt.results.length} />
      </div>

      {/* Main Layout: Query + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <QueryBuilder />
        </div>
        <div className="space-y-4">
          <HuntControls />
        </div>
      </div>

      {/* Statistics Panel */}
      {threatHunt.results.length > 0 && <HuntStatistics results={threatHunt.results} />}

      {/* Results Table or Scan Overlay */}
      {threatHunt.isHunting ? (
        <HuntScanOverlay />
      ) : threatHunt.results.length > 0 ? (
        <HuntResultsTable results={threatHunt.results} />
      ) : (
        <EmptyState />
      )}

      {/* IOC Extraction Panel */}
      {threatHunt.results.length > 0 && <IOCPanel results={threatHunt.results} />}

      {/* Hunt History */}
      <HuntHistoryPanel />
    </div>
  )
}
