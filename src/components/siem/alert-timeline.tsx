'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Clock,
  Filter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AlertSummary, Severity } from '@/lib/types'

// Renders REAL alerts passed in by the dashboard. No synthetic data is ever
// generated — if there are no alerts, it shows an honest empty state.

type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d'

interface TimelineAlert {
  id: string
  title: string
  severity: Severity
  timestamp: number
  source: string
  category: string | null
}

const SEVERITY_DOT_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  informational: '#6b7280',
}

const SEVERITY_BG: Record<Severity, string> = {
  critical: 'bg-red-500/40 hover:bg-red-500/60',
  high: 'bg-amber-500/40 hover:bg-amber-500/60',
  medium: 'bg-yellow-500/40 hover:bg-yellow-500/60',
  low: 'bg-blue-500/40 hover:bg-blue-500/60',
  informational: 'bg-zinc-500/40 hover:bg-zinc-500/60',
}

const TIME_RANGE_MS: Record<TimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

const ALL_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'informational']

export function AlertTimeline({ alerts = [] }: { alerts?: AlertSummary[] }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [zoom, setZoom] = useState(1)
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [hoveredAlert, setHoveredAlert] = useState<string | null>(null)
  const [severityFilters, setSeverityFilters] = useState<Set<Severity>>(
    new Set(ALL_SEVERITIES)
  )

  // Map real alerts to timeline shape (sorted oldest -> newest)
  const allAlerts = useMemo<TimelineAlert[]>(() => {
    return alerts
      .map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        timestamp: new Date(a.createdAt).getTime(),
        source: a.source ?? 'unknown',
        category: a.category ?? null,
      }))
      .sort((x, y) => x.timestamp - y.timestamp)
  }, [alerts])

  const filteredAlerts = useMemo(() => {
    const now = Date.now()
    const rangeStart = now - TIME_RANGE_MS[timeRange]
    return allAlerts.filter(
      (a) => a.timestamp >= rangeStart && severityFilters.has(a.severity)
    )
  }, [allAlerts, timeRange, severityFilters])

  const stats = useMemo(() => {
    const total = filteredAlerts.length
    const critical = filteredAlerts.filter((a) => a.severity === 'critical').length
    const rangeHours = TIME_RANGE_MS[timeRange] / (60 * 60 * 1000)
    const avgPerHour = rangeHours > 0 ? Math.round((total / rangeHours) * 10) / 10 : 0
    return { total, critical, avgPerHour }
  }, [filteredAlerts, timeRange])

  const timeBounds = useMemo(() => {
    const now = Date.now()
    return { start: now - TIME_RANGE_MS[timeRange], end: now }
  }, [timeRange])

  const timeTicks = useMemo(() => {
    const { start, end } = timeBounds
    const range = end - start
    const tickCount = Math.min(12, Math.max(4, Math.round(range / (60 * 60 * 1000))))
    const ticks: { timestamp: number; label: string }[] = []
    for (let i = 0; i <= tickCount; i++) {
      const ts = start + (range / tickCount) * i
      const date = new Date(ts)
      const label =
        timeRange === '7d'
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      ticks.push({ timestamp: ts, label })
    }
    return ticks
  }, [timeBounds, timeRange])

  const getAlertPosition = useCallback(
    (timestamp: number) => {
      const { start, end } = timeBounds
      const range = end - start
      if (range === 0) return 50
      return ((timestamp - start) / range) * 100
    },
    [timeBounds]
  )

  const toggleSeverityFilter = useCallback((sev: Severity) => {
    setSeverityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(sev)) {
        if (next.size > 1) next.delete(sev)
      } else {
        next.add(sev)
      }
      return next
    })
  }, [])

  const selectedAlertData = useMemo(
    () => filteredAlerts.find((a) => a.id === selectedAlert) || null,
    [filteredAlerts, selectedAlert]
  )

  const hoveredAlertData = useMemo(
    () => filteredAlerts.find((a) => a.id === hoveredAlert) || null,
    [filteredAlerts, hoveredAlert]
  )

  const realCount = allAlerts.length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-zinc-400">Alert Timeline</h3>
          {realCount === 0 && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-500">
              no real alerts
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-zinc-500">
              Total: <span className="font-mono text-zinc-300">{stats.total}</span>
            </span>
            <span className="text-zinc-500">
              Critical: <span className="font-mono text-red-400">{stats.critical}</span>
            </span>
            <span className="text-zinc-500">
              Avg/hr: <span className="font-mono text-zinc-300">{stats.avgPerHour}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {(Object.keys(TIME_RANGE_MS) as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 px-2 text-[10px]',
                timeRange === range
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              )}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-zinc-500" />
            {ALL_SEVERITIES.map((sev) => (
              <button
                key={sev}
                className={cn(
                  'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] transition-colors',
                  severityFilters.has(sev)
                    ? 'border-zinc-700 bg-zinc-800/50 text-zinc-300'
                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-600 line-through'
                )}
                onClick={() => toggleSeverityFilter(sev)}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SEVERITY_DOT_COLORS[sev] }} />
                {sev === 'informational' ? 'info' : sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-[9px] font-mono text-zinc-500">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              disabled={zoom >= 4}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <div className="flex items-center border-b border-zinc-800 px-2 py-1">
          {timeTicks.map((tick, i) => (
            <span key={i} className="flex-1 text-center text-[8px] text-zinc-600">
              {i % 2 === 0 ? tick.label : ''}
            </span>
          ))}
        </div>

        <div className="relative py-4" style={{ minHeight: `${60 * zoom}px` }}>
          <div className="absolute inset-0 flex">
            {timeTicks.map((_, i) => (
              <div key={i} className="flex-1 border-r border-zinc-800/50 last:border-r-0" />
            ))}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
              No alerts in selected range
            </div>
          ) : (
            (() => {
              const rows: { alert: TimelineAlert; row: number }[] = []
              const rowEnds: number[] = []
              const minGap = 1.5 / zoom

              filteredAlerts.forEach((alert) => {
                const pos = getAlertPosition(alert.timestamp)
                let placed = false
                for (let r = 0; r < rowEnds.length; r++) {
                  if (pos > rowEnds[r] + minGap) {
                    rows.push({ alert, row: r })
                    rowEnds[r] = pos
                    placed = true
                    break
                  }
                }
                if (!placed) {
                  rows.push({ alert, row: rowEnds.length })
                  rowEnds.push(pos)
                }
              })

              const totalRows = Math.max(rowEnds.length, 1)
              const rowHeight = Math.min(20 * zoom, 40)

              return rows.map(({ alert, row }) => {
                const pos = getAlertPosition(alert.timestamp)
                const isSelected = selectedAlert === alert.id
                const isHovered = hoveredAlert === alert.id
                const dotSize = alert.severity === 'critical' ? 10 : alert.severity === 'high' ? 8 : 6

                return (
                  <motion.button
                    key={alert.id}
                    className="absolute z-10 -translate-x-1/2 focus:outline-none"
                    style={{ left: `${pos}%`, top: `${8 + row * rowHeight}px` }}
                    onMouseEnter={() => setHoveredAlert(alert.id)}
                    onMouseLeave={() => setHoveredAlert(null)}
                    onClick={() => setSelectedAlert(isSelected ? null : alert.id)}
                    whileHover={{ scale: 1.4 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span
                      className={cn(
                        'block rounded-full transition-shadow',
                        isSelected && 'ring-2 ring-offset-1 ring-offset-zinc-950',
                        alert.severity === 'critical' && 'animate-pulse'
                      )}
                      style={{
                        width: dotSize * zoom,
                        height: dotSize * zoom,
                        backgroundColor: SEVERITY_DOT_COLORS[alert.severity],
                        boxShadow: isSelected || isHovered
                          ? `0 0 8px ${SEVERITY_DOT_COLORS[alert.severity]}60`
                          : `0 0 3px ${SEVERITY_DOT_COLORS[alert.severity]}30`,
                      }}
                    />
                  </motion.button>
                )
              })
            })()
          )}
        </div>
      </div>

      <AnimatePresence>
        {hoveredAlertData && hoveredAlertData.id !== selectedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 rounded-md border border-zinc-800 bg-zinc-800/40 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-[10px]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_DOT_COLORS[hoveredAlertData.severity] }} />
              <span className="font-medium text-zinc-300">{hoveredAlertData.title}</span>
              <Badge variant="outline" className={cn('h-4 border-0 text-[8px]', SEVERITY_BG[hoveredAlertData.severity])}>
                {hoveredAlertData.severity}
              </Badge>
              <span className="ml-auto text-zinc-500">
                {new Date(hoveredAlertData.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAlertData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: SEVERITY_DOT_COLORS[selectedAlertData.severity] }} />
                  <span className="text-sm font-medium text-zinc-200">{selectedAlertData.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-zinc-500 hover:text-zinc-300"
                  onClick={() => setSelectedAlert(null)}
                >
                  ×
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-[9px] text-zinc-600">Severity</p>
                  <Badge variant="outline" className={cn('mt-0.5 h-5 border-0 text-[9px]', SEVERITY_BG[selectedAlertData.severity])}>
                    {selectedAlertData.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-600">Source</p>
                  <p className="text-[10px] text-zinc-400">{selectedAlertData.source}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-600">Category</p>
                  <p className="text-[10px] text-zinc-400 capitalize">{selectedAlertData.category ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-600">Time</p>
                  <p className="text-[10px] font-mono text-zinc-400">
                    {new Date(selectedAlertData.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
