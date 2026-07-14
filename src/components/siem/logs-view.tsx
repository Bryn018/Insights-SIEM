'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Clock,
  Play,
  Pause,
  Save,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Radio,
  Columns3,
  Download,
  Bookmark,
  PanelRightOpen,
  PanelRightClose,
  AlertTriangle,
  Info,
  XCircle,
  X,
  ArrowDown,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSIEMStore } from '@/lib/store'
import type { WsLogEvent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'

// ===== Constants =====

const TIME_RANGES = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
] as const

const INDEX_PATTERNS = [
  { value: 'insights-host-logs-*', label: 'insights-host-logs-*' },
  { value: 'insights-network-logs-*', label: 'insights-network-logs-*' },
  { value: 'insights-all-*', label: 'All indices' },
] as const

const AUTO_REFRESH_OPTIONS = [
  { value: '1', label: '1s' },
  { value: '5', label: '5s' },
  { value: '10', label: '10s' },
  { value: '30', label: '30s' },
  { value: '60', label: '1m' },
  { value: '0', label: 'Off' },
] as const

const LEVEL_COLORS: Record<string, { text: string; bg: string; icon: React.ElementType }> = {
  error: { text: 'text-red-400', bg: 'bg-red-500/5', icon: XCircle },
  critical: { text: 'text-red-500', bg: 'bg-red-500/8', icon: XCircle },
  warn: { text: 'text-amber-400', bg: 'bg-amber-500/5', icon: AlertTriangle },
  warning: { text: 'text-amber-400', bg: 'bg-amber-500/5', icon: AlertTriangle },
  info: { text: 'text-blue-400', bg: '', icon: Info },
  debug: { text: 'text-zinc-500', bg: '', icon: Info },
}


// ===== Syntax Highlighting Helper =====

function syntaxHighlightJson(json: Record<string, unknown>): React.ReactNode[] {
  const str = JSON.stringify(json, null, 2)
  const lines = str.split('\n')
  return lines.map((line, i) => {
    // Match key-value pairs
    const keyMatch = line.match(/^(\s*)"([^"]+)":/)
    if (keyMatch) {
      const [, indent, key] = keyMatch
      const rest = line.slice(keyMatch[0].length)
      return (
        <div key={i}>
          <span>{indent}</span>
          <span className="text-emerald-400">"{key}"</span>
          <span className="text-zinc-500">:</span>
          {highlightValue(rest)}
        </div>
      )
    }
    // Match array values and closing braces
    return <div key={i}>{highlightValue(line)}</div>
  })
}

function highlightValue(str: string): React.ReactNode {
  // String values
  const stringMatch = str.match(/^ (.*)"([^"]*)"(,?)$/)
  if (stringMatch) {
    const [, space, val, comma] = stringMatch
    return (
      <>
        {space}<span className="text-amber-300">"{val}"</span>{comma && <span className="text-zinc-500">{comma}</span>}
      </>
    )
  }
  // Number values
  const numberMatch = str.match(/^ (\d+)(,?)$/)
  if (numberMatch) {
    const [, num, comma] = numberMatch
    return (
      <>
        <span className="text-cyan-300"> {num}</span>{comma && <span className="text-zinc-500">{comma}</span>}
      </>
    )
  }
  // Boolean values
  if (str.includes('true') || str.includes('false')) {
    return <span className="text-purple-300">{str}</span>
  }
  // null
  if (str.includes('null')) {
    return <span className="text-red-300">{str}</span>
  }
  // Brackets / braces
  return <span className="text-zinc-400">{str}</span>
}

// ===== Highlight Search Terms =====
// (Deprecated in favor of highlightLogFields which combines field
// colorization with search-term highlighting. Kept as a thin wrapper
// in case external callers exist.)

function highlightSearchTerm(text: string, query: string): React.ReactNode {
  return highlightLogFields(text, query)
}

// ===== Log Field Syntax Highlighting =====
// Wraps common log artifacts (IPs, URLs, severity keywords, numbers) in
// colored spans. Operates on plain strings; safe to chain after search-term
// highlighting by applying it to the raw message and passing the search
// query through unchanged.

const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const URL_REGEX = /\bhttps?:\/\/[^\s<>"]+/gi
const SEVERITY_KEYWORDS = /\b(ERROR|FAILED|FAILURE|FAIL|CRITICAL|DROP|REJECT|OOM|DENIED|BLOCKED|WARN|WARNING|SLOW|ALERT|INFO|DEBUG|NOTICE)\b/g
const NUM_REGEX = /\b(?<![\w.])(\d{2,6})(?![\w.])\b/g

function highlightLogFields(
  text: string,
  query: string,
  options: { highlightSearch?: boolean } = {}
): React.ReactNode {
  const { highlightSearch = true } = options

  // First, if there's a search query, isolate the matched regions so we
  // don't double-colorize inside <mark> tags.
  if (highlightSearch && query.trim()) {
    try {
      const searchRegex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      const parts = text.split(searchRegex)
      return (
        <>
          {parts.map((part, i) =>
            searchRegex.test(part) ? (
              <mark key={i} className="bg-yellow-400/25 text-yellow-200 rounded px-0.5">{part}</mark>
            ) : (
              <span key={i}>{colorizeLogText(part)}</span>
            )
          )}
        </>
      )
    } catch {
      // fall through to plain colorize
    }
  }

  return colorizeLogText(text)
}

function colorizeLogText(text: string): React.ReactNode[] {
  // Tokenize by collecting all regex matches with their positions, then
  // walking through the string and emitting colored spans for matches and
  // plain spans for the gaps.
  type Match = { start: number; end: number; text: string; cls: string }
  const matches: Match[] = []

  const collect = (re: RegExp, cls: string) => {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], cls })
      // Prevent infinite loop on zero-length matches
      if (m[0].length === 0) re.lastIndex++
    }
  }

  // Order matters: URLs first (so we don't double-color IPs inside URLs),
  // then IPs, then severity keywords, then numbers.
  collect(URL_REGEX, 'siem-log-url')
  collect(IP_REGEX, 'siem-log-ip')
  collect(SEVERITY_KEYWORDS, 'siem-log-sev')
  collect(NUM_REGEX, 'siem-log-num')

  // Remove overlaps (earlier-collected = higher priority)
  matches.sort((a, b) => a.start - b.start || a.end - b.end)
  const filtered: Match[] = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m)
      lastEnd = m.end
    }
  }

  const nodes: React.ReactNode[] = []
  let cursor = 0
  filtered.forEach((m, i) => {
    if (m.start > cursor) {
      nodes.push(<span key={`txt-${i}`}>{text.slice(cursor, m.start)}</span>)
    }
    nodes.push(<span key={`hl-${i}`} className={m.cls}>{m.text}</span>)
    cursor = m.end
  })
  if (cursor < text.length) {
    nodes.push(<span key="txt-tail">{text.slice(cursor)}</span>)
  }
  return nodes
}

// ===== Log Row Component =====

function LogRow({
  log,
  isExpanded,
  onToggle,
  query,
  lineNum,
}: {
  log: WsLogEvent
  isExpanded: boolean
  onToggle: () => void
  query: string
  lineNum: number
}) {
  const levelCfg = LEVEL_COLORS[log.level] || LEVEL_COLORS.info
  const LevelIcon = levelCfg.icon
  const ts = new Date(log.timestamp)
  const relativeTime = formatDistanceToNow(ts, { addSuffix: true })
  const absoluteTime = format(ts, 'yyyy-MM-dd HH:mm:ss.SSS')

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-2 border-b border-zinc-800/50 px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer siem-log-row-hover',
          levelCfg.bg,
          `siem-log-level-${log.level}`,
        )}
        onClick={onToggle}
      >
        {/* Expand Toggle */}
        <button className="mt-0.5 shrink-0" onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-zinc-500" />
          )}
        </button>

        {/* Line Number */}
        <span
          className="shrink-0 w-8 text-right text-zinc-700 select-none tabular-nums"
          title={`Line ${lineNum}`}
          aria-hidden="true"
        >
          {lineNum}
        </span>

        {/* Timestamp */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 w-36 text-zinc-500 tabular-nums">
                {format(ts, 'HH:mm:ss.SSS')}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs">
              <div className="space-y-0.5">
                <div>Relative: {relativeTime}</div>
                <div>Absolute: {absoluteTime}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Level */}
        <span className={cn('shrink-0 w-16 font-semibold flex items-center gap-1', levelCfg.text)}>
          <LevelIcon className="h-3 w-3" />
          {(log.level || 'info').toUpperCase()}
        </span>

        {/* Hostname */}
        <span className="shrink-0 w-28 truncate text-zinc-400" title={log.hostname}>
          {log.hostname || '—'}
        </span>

        {/* Source/Service */}
        <span className="shrink-0 w-20 truncate text-emerald-400/70" title={log.source || log.service}>
          {log.source || log.service}
        </span>

        {/* Message (with field highlighting + search highlight) */}
        <span className="flex-1 truncate text-zinc-300 min-w-0">
          {highlightLogFields(
            log.message.length > 200 ? log.message.slice(0, 200) + '...' : log.message,
            query
          )}
        </span>
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="border-b border-zinc-800 bg-zinc-950/80 overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {/* Full Message */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Full Message</span>
                <div className="mt-1 text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap break-all">
                  {highlightLogFields(log.message, query)}
                </div>
              </div>

              {/* JSON Document */}
              {log.raw && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Document JSON</span>
                  <div className="mt-1 max-h-64 overflow-auto rounded-md bg-zinc-900 border border-zinc-800 p-3 text-[11px] font-mono leading-relaxed custom-scrollbar">
                    {syntaxHighlightJson(log.raw)}
                  </div>
                </div>
              )}

              {/* Quick Fields */}
              <div className="flex flex-wrap gap-3 text-[10px]">
                <span className="text-zinc-500">Timestamp: <span className="text-zinc-300">{absoluteTime}</span></span>
                <span className="text-zinc-500">Host: <span className="text-zinc-300">{log.hostname}</span></span>
                <span className="text-zinc-500">Service: <span className="text-zinc-300">{log.service}</span></span>
                <span className="text-zinc-500">Level: <span className={levelCfg.text}>{log.level}</span></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ===== Field Statistics Sidebar =====

function FieldStatisticsSidebar({
  logs,
  onFieldClick,
  visible,
  onToggle,
}: {
  logs: WsLogEvent[]
  onFieldClick: (field: string, value: string) => void
  visible: boolean
  onToggle: () => void
}) {
  const fields = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}

    // Analyze top-level fields
    const analyzers: Record<string, (log: WsLogEvent) => string | null> = {
      'host.name': (log) => log.hostname || null,
      'service': (log) => log.service || null,
      'log.level': (log) => log.level || null,
      'source': (log) => log.source || null,
    }

    // Also analyze raw JSON fields
    if (logs.length > 0 && logs[0].raw) {
      const sampleRaw = logs[0].raw as Record<string, unknown>
      const nestedPaths: string[] = []

      const findPaths = (obj: Record<string, unknown>, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            if (!nestedPaths.includes(path)) nestedPaths.push(path)
          } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            findPaths(v as Record<string, unknown>, path)
          }
        }
      }

      findPaths(sampleRaw)
      nestedPaths.slice(0, 10).forEach((path) => {
        analyzers[path] = (log) => {
          if (!log.raw) return null
          let current: unknown = log.raw
          for (const key of path.split('.')) {
            if (current && typeof current === 'object') {
              current = (current as Record<string, unknown>)[key]
            } else {
              return null
            }
          }
          return current != null ? String(current) : null
        }
      })
    }

    for (const [fieldName, analyzer] of Object.entries(analyzers)) {
      const counts: Record<string, number> = {}
      for (const log of logs) {
        const val = analyzer(log)
        if (val) counts[val] = (counts[val] || 0) + 1
      }
      if (Object.keys(counts).length > 0) {
        result[fieldName] = counts
      }
    }

    return result
  }, [logs])

  if (!visible) return null

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="shrink-0 border-l border-zinc-800 bg-zinc-900/50 overflow-y-auto custom-scrollbar"
    >
      <div className="p-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Field Statistics</h3>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggle}>
            <PanelRightClose className="h-3 w-3" />
          </Button>
        </div>

        {Object.entries(fields).map(([fieldName, counts]) => {
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
          const maxCount = sorted[0]?.[1] || 1

          return (
            <div key={fieldName}>
              <span className="text-[10px] font-semibold uppercase text-emerald-400/80 tracking-wider">{fieldName}</span>
              <div className="mt-1.5 space-y-1">
                {sorted.slice(0, 6).map(([val, count]) => (
                  <button
                    key={val}
                    className="w-full text-left group"
                    onClick={() => onFieldClick(fieldName, val)}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="truncate text-zinc-300 group-hover:text-emerald-300 transition-colors max-w-[140px]">{val}</span>
                      <span className="text-zinc-500 tabular-nums">{count}</span>
                    </div>
                    <div className="mt-0.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500/30 group-hover:bg-emerald-500/50 transition-colors"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ===== Main LogsView Component =====

export function LogsView() {
  const { logExplorer, setLogExplorer, wsConnected, liveMode, setLiveMode } = useSIEMStore()
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<WsLogEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(0)
  const [showFieldStats, setShowFieldStats] = useState(false)
  const [paused, setPaused] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null)

  // Combine API search results + live WS logs. No synthetic data is ever shown.
  const displayLogs = useMemo(() => {
    if (logExplorer.liveMode && logExplorer.logs.length > 0) {
      return [...logExplorer.logs, ...results].slice(0, 500)
    }
    if (results.length > 0) return results
    if (logExplorer.logs.length > 0) return logExplorer.logs.slice(0, 500)
    return []
  }, [logExplorer.liveMode, logExplorer.logs, results])

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!logExplorer.query.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    setError(null)
    try {
      // Try API first
      const res = await fetch(`/api/search?q=${encodeURIComponent(logExplorer.query)}`)
      if (res.ok) {
        const json = await res.json()
        // Map search results to log events
        const mapped: WsLogEvent[] = []
        if (json.results?.alerts) {
          for (const a of json.results.alerts as Record<string, unknown>[]) {
            mapped.push({
              id: String(a.id || ''),
              timestamp: String(a.createdAt || new Date().toISOString()),
              hostname: 'siem-server',
              message: String(a.title || ''),
              source: String(a.source || 'alerts'),
              service: 'alert-index',
              level: a.severity === 'critical' || a.severity === 'high' ? 'error' : a.severity === 'medium' ? 'warn' : 'info',
              raw: a as Record<string, unknown>,
            })
          }
        }
        if (json.results?.assets) {
          for (const a of json.results.assets as Record<string, unknown>[]) {
            mapped.push({
              id: String(a.id || ''),
              timestamp: String(a.createdAt || new Date().toISOString()),
              hostname: String(a.name || 'unknown'),
              message: `Asset: ${a.name} (${a.type}) - ${a.ipAddress || 'no IP'} [${a.status}]`,
              source: 'asset-index',
              service: 'asset-index',
              level: 'info',
              raw: a as Record<string, unknown>,
            })
          }
        }
        setResults(mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
      } else {
        setError('Search endpoint returned an error')
      }
    } catch {
      setError('Failed to connect to search endpoint')
    } finally {
      setSearching(false)
    }
  }, [logExplorer.query])

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current)
      autoRefreshRef.current = null
    }
    if (autoRefresh > 0) {
      autoRefreshRef.current = setInterval(() => {
        if (!logExplorer.liveMode) {
          handleSearch()
        }
      }, autoRefresh * 1000)
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [autoRefresh, logExplorer.liveMode, handleSearch])

  // Live mode: track unread count when paused
  useEffect(() => {
    if (logExplorer.liveMode && paused) {
      const prevCount = logExplorer.logs.length
      setUnreadCount(prevCount)
    } else {
      setUnreadCount(0)
    }
  }, [logExplorer.liveMode, paused, logExplorer.logs.length])

  // Auto-scroll when new logs arrive in live mode
  useEffect(() => {
    if (logExplorer.liveMode && autoScroll && !paused && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [logExplorer.liveMode, autoScroll, paused, logExplorer.logs.length])

  // Handle field click from sidebar
  const handleFieldClick = useCallback((field: string, value: string) => {
    const newQuery = logExplorer.query
      ? `${logExplorer.query} AND ${field}:"${value}"`
      : `${field}:"${value}"`
    setLogExplorer({ query: newQuery })
  }, [logExplorer.query, setLogExplorer])

  // Handle time range button click
  const handleTimeRange = useCallback((range: string) => {
    setLogExplorer({ timeRange: range })
  }, [setLogExplorer])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col"
    >
      {/* Search Bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder='Enter KQL/Lucene query (e.g., level:error AND service:sshd)'
              value={logExplorer.query}
              onChange={(e) => setLogExplorer({ query: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-800/50 pl-10 pr-24 text-sm font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden sm:inline-flex items-center rounded border border-zinc-600 bg-zinc-700/50 px-1.5 py-0.5 text-[9px] text-zinc-400 font-mono">
                ↵ Enter
              </kbd>
              <Button
                size="sm"
                className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                Search
              </Button>
            </div>
          </div>

          {/* Saved Searches (placeholder) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-1 border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200">
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-zinc-900 border-zinc-700 p-3" align="end">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-300">Saved Searches</span>
                <div className="space-y-1">
                  {[
                    { name: 'SSH Errors Last Hour', query: 'level:error AND service:sshd' },
                    { name: 'Suspicious Nginx Requests', query: 'service:nginx AND (401 OR 403 OR 404)' },
                    { name: 'All Firewall Drops', query: 'service:firewall AND level:warn' },
                  ].map((saved) => (
                    <button
                      key={saved.name}
                      className="w-full text-left rounded px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      onClick={() => {
                        setLogExplorer({ query: saved.query })
                        toast.info(`Loaded: ${saved.name}`)
                      }}
                    >
                      <div className="font-medium">{saved.name}</div>
                      <div className="text-[10px] text-zinc-600 font-mono truncate">{saved.query}</div>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-zinc-500 hover:text-zinc-300"
                    onClick={() => toast.success('Search saved!')}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save Current Search
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Buttons */}
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            {TIME_RANGES.map((tr) => (
              <Button
                key={tr.value}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 text-xs font-mono',
                  logExplorer.timeRange === tr.value
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                )}
                onClick={() => handleTimeRange(tr.value)}
              >
                {tr.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 border border-transparent">
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-zinc-900 border-zinc-700 p-3" align="start">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-300">Custom Time Range</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500">From</label>
                      <Input type="datetime-local" className="h-7 text-xs bg-zinc-800 border-zinc-700" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500">To</label>
                      <Input type="datetime-local" className="h-7 text-xs bg-zinc-800 border-zinc-700" />
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.info('Custom time range applied')}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-zinc-700" />

          {/* Index Pattern Selector */}
          <Select
            value={logExplorer.indexPattern}
            onValueChange={(v) => setLogExplorer({ indexPattern: v })}
          >
            <SelectTrigger className="h-7 w-44 text-xs border-zinc-700 bg-zinc-800/50">
              <Columns3 className="mr-1 h-3 w-3 text-zinc-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {INDEX_PATTERNS.map((ip) => (
                <SelectItem key={ip.value} value={ip.value} className="text-xs">{ip.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Separator */}
          <div className="h-5 w-px bg-zinc-700" />

          {/* Live Mode Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={logExplorer.liveMode}
              onCheckedChange={(checked) => {
                setLogExplorer({ liveMode: checked })
                setLiveMode(checked)
                if (checked) {
                  setPaused(false)
                  setAutoScroll(true)
                }
              }}
            />
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              {logExplorer.liveMode && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
              Live
            </span>
            {logExplorer.liveMode && (
              <Badge variant="outline" className="border-red-500/30 text-[9px] text-red-400 px-1.5 siem-live-pulse">
                <span className="relative mr-1 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                LIVE
              </Badge>
            )}
          </div>

          {/* Pause/Resume (Live Mode) */}
          {logExplorer.liveMode && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs border-zinc-700',
                paused ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-zinc-800/50 text-zinc-400'
              )}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
          )}

          {/* Unread Buffer Indicator */}
          {logExplorer.liveMode && paused && unreadCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] gap-1 px-1.5">
              <ArrowDown className="h-2.5 w-2.5" />
              {unreadCount} unread
            </Badge>
          )}

          {/* Separator */}
          <div className="h-5 w-px bg-zinc-700" />

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
            onClick={handleSearch}
            disabled={searching}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', searching && 'animate-spin')} />
          </Button>

          {/* Auto-Refresh Interval */}
          <Select
            value={String(autoRefresh)}
            onValueChange={(v) => setAutoRefresh(Number(v))}
          >
            <SelectTrigger className="h-7 w-20 text-[10px] border-zinc-700 bg-zinc-800/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {AUTO_REFRESH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Separator */}
          <div className="h-5 w-px bg-zinc-700" />

          {/* Auto-scroll Toggle (Live Mode) */}
          {logExplorer.liveMode && (
            <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 accent-emerald-500"
              />
              Auto-scroll
            </label>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Field Stats Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 gap-1 text-xs',
              showFieldStats ? 'bg-emerald-600/20 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            )}
            onClick={() => setShowFieldStats(!showFieldStats)}
          >
            {showFieldStats ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
            Fields
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-zinc-400 hover:text-zinc-200"
            onClick={() => {
              const csv = displayLogs.map((l) => `${l.timestamp},${l.level},${l.hostname},${l.service},"${l.message.replace(/"/g, '""')}"`).join('\n')
              const blob = new Blob([`timestamp,level,hostname,service,message\n${csv}`], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `siem-logs-${new Date().toISOString().slice(0, 10)}.csv`
              a.click()
              URL.revokeObjectURL(url)
              toast.success('Logs exported as CSV')
            }}
          >
            <Download className="h-3 w-3" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content Area (Table + Sidebar) */}
      <div className="flex flex-1 min-h-0">
        {/* Log Table */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Table Header */}
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sticky top-0 z-10">
            <span className="w-5" />
            <span className="w-8 text-right">#</span>
            <span className="w-36">Timestamp</span>
            <span className="w-16">Level</span>
            <span className="w-28">Hostname</span>
            <span className="w-20">Source</span>
            <span className="flex-1">Message</span>
          </div>

          {/* Log Rows / Loading / Empty */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
            {error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <XCircle className="h-8 w-8 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
                <Button variant="outline" size="sm" className="text-xs" onClick={handleSearch}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            ) : searching ? (
              <div className="p-3 space-y-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <Skeleton className="h-3 w-5 rounded" />
                    <Skeleton className="h-3 w-8 rounded" />
                    <Skeleton className="h-3 w-36 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 flex-1 rounded" />
                  </div>
                ))}
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Filter className="h-5 w-5 text-zinc-600" />
                </div>
                <span className="text-sm text-zinc-400">No logs to display</span>
                <div className="text-xs text-zinc-600 space-y-1 text-center">
                  <p>This instance has no live log source connected (OpenSearch / Fluent Bit / Syslog).</p>
                  <p>Search existing alerts and assets above, or connect a log pipeline to stream real events.</p>
                  <p>Example queries: <code className="text-emerald-400/80 font-mono">level:error</code> or <code className="text-emerald-400/80 font-mono">service:sshd</code></p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setLogExplorer({ query: '', liveMode: true })
                    setLiveMode(true)
                  }}
                >
                  <Radio className="h-3 w-3 mr-1" /> Enable Live Mode
                </Button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {displayLogs.map((log, idx) => {
                  const logId = log.id || `log-${idx}-${log.timestamp}`
                  return (
                    <LogRow
                      key={logId}
                      log={log}
                      isExpanded={expandedLog === logId}
                      onToggle={() => setExpandedLog(expandedLog === logId ? null : logId)}
                      query={logExplorer.query}
                      lineNum={idx + 1}
                    />
                  )
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-[10px] text-zinc-500">
            <div className="flex items-center gap-4">
              <span>{displayLogs.length.toLocaleString()} events</span>
              {logExplorer.query && <span>Query: <span className="text-emerald-400/80 font-mono">{logExplorer.query}</span></span>}
            </div>
            <div className="flex items-center gap-3">
              <span>Index: <span className="text-zinc-300">{logExplorer.indexPattern}</span></span>
              <span>Range: <span className="text-zinc-300">{logExplorer.timeRange}</span></span>
              <span className="flex items-center gap-1">
                <span className={cn('h-1.5 w-1.5 rounded-full', wsConnected ? 'bg-emerald-400' : 'bg-red-400')} />
                {wsConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Field Statistics Sidebar */}
        <AnimatePresence>
          {showFieldStats && (
            <FieldStatisticsSidebar
              logs={displayLogs}
              onFieldClick={handleFieldClick}
              visible={showFieldStats}
              onToggle={() => setShowFieldStats(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
