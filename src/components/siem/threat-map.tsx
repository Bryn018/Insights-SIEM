'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, MapPin, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ===== Types =====

type ThreatLevel = 'low' | 'moderate' | 'high' | 'critical'

interface RegionData {
  id: string
  name: string
  row: number
  col: number
  threatLevel: ThreatLevel
  attackCount: number
  flag: string
}

interface AttackPath {
  id: string
  from: string
  to: string
  count: number
  type: string
}

// ===== Constants =====

const THREAT_COLORS: Record<ThreatLevel, string> = {
  low: '#10b981',
  moderate: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

const THREAT_BG: Record<ThreatLevel, string> = {
  low: 'bg-emerald-500/20',
  moderate: 'bg-yellow-500/20',
  high: 'bg-amber-500/20',
  critical: 'bg-red-500/20',
}

const THREAT_BORDER: Record<ThreatLevel, string> = {
  low: 'border-emerald-500/30',
  moderate: 'border-yellow-500/30',
  high: 'border-amber-500/30',
  critical: 'border-red-500/30',
}

const REGIONS: RegionData[] = [
  { id: 'na-east', name: 'N. America East', row: 2, col: 5, threatLevel: 'moderate', attackCount: 34, flag: '🇺🇸' },
  { id: 'na-west', name: 'N. America West', row: 2, col: 2, threatLevel: 'low', attackCount: 8, flag: '🇺🇸' },
  { id: 'sa-north', name: 'S. America North', row: 5, col: 4, threatLevel: 'low', attackCount: 5, flag: '🇧🇷' },
  { id: 'sa-south', name: 'S. America South', row: 7, col: 5, threatLevel: 'low', attackCount: 3, flag: '🇦🇷' },
  { id: 'eu-west', name: 'Europe West', row: 2, col: 10, threatLevel: 'high', attackCount: 52, flag: '🇬🇧' },
  { id: 'eu-east', name: 'Europe East', row: 2, col: 12, threatLevel: 'critical', attackCount: 78, flag: '🇷🇺' },
  { id: 'af-north', name: 'Africa North', row: 4, col: 10, threatLevel: 'moderate', attackCount: 18, flag: '🇪🇬' },
  { id: 'af-south', name: 'Africa South', row: 7, col: 11, threatLevel: 'low', attackCount: 4, flag: '🇿🇦' },
  { id: 'me', name: 'Middle East', row: 4, col: 13, threatLevel: 'high', attackCount: 45, flag: '🇮🇷' },
  { id: 'as-central', name: 'Asia Central', row: 3, col: 15, threatLevel: 'critical', attackCount: 89, flag: '🇨🇳' },
  { id: 'as-south', name: 'Asia South', row: 5, col: 14, threatLevel: 'high', attackCount: 41, flag: '🇮🇳' },
  { id: 'as-east', name: 'Asia East', row: 3, col: 18, threatLevel: 'moderate', attackCount: 22, flag: '🇯🇵' },
  { id: 'as-se', name: 'Asia Southeast', row: 6, col: 16, threatLevel: 'moderate', attackCount: 15, flag: '🇻🇳' },
  { id: 'oce', name: 'Oceania', row: 8, col: 18, threatLevel: 'low', attackCount: 6, flag: '🇦🇺' },
]

const ATTACK_PATHS: AttackPath[] = [
  { id: 'ap1', from: 'eu-east', to: 'na-east', count: 34, type: 'RDP Exploit' },
  { id: 'ap2', from: 'as-central', to: 'na-east', count: 28, type: 'SSH Brute Force' },
  { id: 'ap3', from: 'as-central', to: 'eu-west', count: 22, type: 'Phishing' },
  { id: 'ap4', from: 'me', to: 'eu-west', count: 18, type: 'DDoS' },
  { id: 'ap5', from: 'eu-east', to: 'eu-west', count: 16, type: 'Lateral Movement' },
  { id: 'ap6', from: 'as-central', to: 'as-east', count: 14, type: 'Supply Chain' },
  { id: 'ap7', from: 'me', to: 'na-east', count: 12, type: 'Credential Stuffing' },
  { id: 'ap8', from: 'af-north', to: 'eu-west', count: 10, type: 'SQL Injection' },
  { id: 'ap9', from: 'as-south', to: 'eu-east', count: 9, type: 'Malware C2' },
  { id: 'ap10', from: 'as-central', to: 'as-south', count: 8, type: 'Reconnaissance' },
  { id: 'ap11', from: 'eu-east', to: 'na-west', count: 7, type: 'DNS Tunneling' },
  { id: 'ap12', from: 'me', to: 'af-north', count: 6, type: 'Botnet' },
  { id: 'ap13', from: 'as-se', to: 'as-east', count: 5, type: 'Web Shell' },
]

// ===== Component =====

export function ThreatMap() {
  const [liveMode, setLiveMode] = useState(false)
  const [activeAttacks, setActiveAttacks] = useState<Set<string>>(new Set(ATTACK_PATHS.map((p) => p.id)))
  const [liveAttackIndex, setLiveAttackIndex] = useState(0)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  // Grid dimensions
  const GRID_COLS = 20
  const GRID_ROWS = 10

  // Stable animation durations per path (avoids Math.random() on each render)
  const pathDurations = useMemo(() => {
    const map = new Map<string, number>()
    ATTACK_PATHS.forEach((p) => {
      map.set(p.id, 2 + ((p.id.charCodeAt(p.id.length - 1) % 10) / 10) * 2)
    })
    return map
  }, [])

  // Live mode animation: cycle through attacks appearing
  useEffect(() => {
    if (!liveMode) {
      setActiveAttacks(new Set(ATTACK_PATHS.map((p) => p.id)))
      return
    }

    // Start with no attacks, then add them one by one
    setActiveAttacks(new Set())
    setLiveAttackIndex(0)

    const interval = setInterval(() => {
      setLiveAttackIndex((prev) => {
        const next = prev + 1
        if (next >= ATTACK_PATHS.length) {
          // Reset cycle
          setActiveAttacks(new Set())
          return 0
        }
        setActiveAttacks((prevSet) => {
          const newSet = new Set(prevSet)
          newSet.add(ATTACK_PATHS[next].id)
          return newSet
        })
        return next
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [liveMode])

  // Build a map for region lookup
  const regionMap = useMemo(() => {
    const map = new Map<string, RegionData>()
    REGIONS.forEach((r) => map.set(r.id, r))
    return map
  }, [])

  // Top attacking countries (sorted by outgoing attack count)
  const topAttackers = useMemo(() => {
    const attackCounts: Record<string, { name: string; flag: string; count: number }> = {}
    ATTACK_PATHS.forEach((path) => {
      if (!attackCounts[path.from]) {
        const region = regionMap.get(path.from)
        if (region) {
          attackCounts[path.from] = { name: region.name, flag: region.flag, count: 0 }
        }
      }
      if (attackCounts[path.from]) {
        attackCounts[path.from].count += path.count
      }
    })
    return Object.values(attackCounts).sort((a, b) => b.count - a.count)
  }, [regionMap])

  // Generate grid cells
  const gridCells = useMemo(() => {
    const cells: (RegionData | null)[][] = []
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: (RegionData | null)[] = []
      for (let c = 0; c < GRID_COLS; c++) {
        const region = REGIONS.find((reg) => reg.row === r && reg.col === c) || null
        row.push(region)
      }
      cells.push(row)
    }
    return cells
  }, [])

  // Calculate SVG line coordinates from grid positions
  const getLineCoords = useCallback(
    (fromId: string, toId: string) => {
      const from = regionMap.get(fromId)
      const to = regionMap.get(toId)
      if (!from || !to) return null
      // Convert grid position to pixel coordinates (approximate for SVG overlay)
      const cellW = 100 / GRID_COLS
      const cellH = 100 / GRID_ROWS
      return {
        x1: `${from.col * cellW + cellW / 2}%`,
        y1: `${from.row * cellH + cellH / 2}%`,
        x2: `${to.col * cellW + cellW / 2}%`,
        y2: `${to.row * cellH + cellH / 2}%`,
      }
    },
    [regionMap]
  )

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-zinc-400">Threat Map</h3>
          <Badge variant="outline" className="border-zinc-700 text-[9px] text-zinc-500">
            {ATTACK_PATHS.filter((p) => activeAttacks.has(p.id)).length} active paths
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 text-[10px]',
            liveMode
              ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          )}
          onClick={() => setLiveMode(!liveMode)}
        >
          <Radio className={cn('h-3 w-3', liveMode && 'animate-pulse')} />
          {liveMode ? 'Live' : 'Static'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Map Grid */}
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            {/* SVG Attack Lines Overlay */}
            <svg
              className="pointer-events-none absolute inset-0 z-10 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="2"
                  markerHeight="1.5"
                  refX="1.5"
                  refY="0.75"
                  orient="auto"
                >
                  <polygon points="0 0, 2 0.75, 0 1.5" fill="#ef4444" opacity="0.6" />
                </marker>
              </defs>
              {ATTACK_PATHS.filter((p) => activeAttacks.has(p.id)).map((path) => {
                const coords = getLineCoords(path.from, path.to)
                if (!coords) return null
                const isSelected = selectedPath === path.id
                return (
                  <g key={path.id}>
                    <line
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke={isSelected ? '#ef4444' : '#ef4444'}
                      strokeWidth={isSelected ? 0.5 : 0.2}
                      strokeOpacity={isSelected ? 0.8 : 0.25}
                      markerEnd="url(#arrowhead)"
                      className={cn(liveMode && 'animate-pulse')}
                    />
                    {/* Animated dot traveling along line */}
                    <circle r="0.4" fill="#ef4444" opacity="0.6">
                      <animateMotion
                        dur={`${pathDurations.get(path.id) ?? 3}s`}
                        repeatCount="indefinite"
                        path={`M${coords.x1.replace('%', '')},${coords.y1.replace('%', '')} L${coords.x2.replace('%', '')},${coords.y2.replace('%', '')}`}
                      />
                    </circle>
                  </g>
                )
              })}
            </svg>

            {/* Grid */}
            <div
              className="relative z-0 grid gap-px p-1"
              style={{
                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
              }}
            >
              {gridCells.flat().map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="aspect-square rounded-sm bg-zinc-900/50"
                    />
                  )
                }

                const isHovered = hoveredRegion === cell.id
                const isSource = ATTACK_PATHS.some((p) => p.from === cell.id && activeAttacks.has(p.id))
                const isTarget = ATTACK_PATHS.some((p) => p.to === cell.id && activeAttacks.has(p.id))

                return (
                  <motion.div
                    key={cell.id}
                    className={cn(
                      'relative flex aspect-square cursor-pointer items-center justify-center rounded-sm border transition-all',
                      THREAT_BORDER[cell.threatLevel],
                      THREAT_BG[cell.threatLevel],
                      isHovered && 'scale-125 z-20 ring-1 ring-zinc-500',
                      isSource && 'ring-1 ring-red-500/40',
                      isTarget && 'ring-1 ring-amber-500/40'
                    )}
                    onMouseEnter={() => setHoveredRegion(cell.id)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    animate={{
                      boxShadow: isSource
                        ? `0 0 8px ${THREAT_COLORS[cell.threatLevel]}40`
                        : undefined,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Threat level indicator dot */}
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: THREAT_COLORS[cell.threatLevel] }}
                    />
                    {cell.threatLevel === 'critical' && (
                      <span
                        className="absolute h-1.5 w-1.5 rounded-full animate-ping"
                        style={{ backgroundColor: THREAT_COLORS[cell.threatLevel] }}
                      />
                    )}

                    {/* Hover tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[10px] shadow-lg"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{cell.flag}</span>
                            <span className="font-medium text-zinc-200">{cell.name}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-zinc-500">
                            <span className="flex items-center gap-1">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: THREAT_COLORS[cell.threatLevel] }}
                              />
                              {cell.threatLevel}
                            </span>
                            <span>{cell.attackCount} events</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px]">
            <span className="text-zinc-500">Threat Level:</span>
            {(Object.entries(THREAT_COLORS) as [ThreatLevel, string][]).map(([level, color]) => (
              <span key={level} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize text-zinc-400">{level}</span>
              </span>
            ))}
            <span className="text-zinc-600">|</span>
            <span className="flex items-center gap-1 text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-red-500/50 ring-1 ring-red-500/40" />
              Source
            </span>
            <span className="flex items-center gap-1 text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-amber-500/50 ring-1 ring-amber-500/40" />
              Target
            </span>
          </div>
        </div>

        {/* Side Panel: Top Attackers + Attack Paths */}
        <div className="space-y-3">
          {/* Top Attacking Countries */}
          <div>
            <h4 className="mb-2 text-[10px] font-medium text-zinc-500">
              <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-400" />
              Top Attack Origins
            </h4>
            <div className="space-y-1.5">
              {topAttackers.slice(0, 6).map((attacker, idx) => (
                <div
                  key={attacker.name}
                  className="flex items-center gap-2 rounded-md bg-zinc-800/30 px-2 py-1.5"
                >
                  <span className="text-[10px] font-bold text-zinc-600">#{idx + 1}</span>
                  <span className="text-xs">{attacker.flag}</span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-300">
                    {attacker.name}
                  </span>
                  <span className="text-[10px] font-mono text-red-400">{attacker.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Attack Paths */}
          <div>
            <h4 className="mb-2 text-[10px] font-medium text-zinc-500">
              Active Attack Paths
            </h4>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
              {ATTACK_PATHS.filter((p) => activeAttacks.has(p.id)).map((path) => {
                const fromRegion = regionMap.get(path.from)
                const toRegion = regionMap.get(path.to)
                if (!fromRegion || !toRegion) return null
                const isSelected = selectedPath === path.id
                return (
                  <button
                    key={path.id}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left transition-colors',
                      isSelected
                        ? 'border-red-500/30 bg-red-500/10'
                        : 'border-zinc-800 bg-zinc-800/20 hover:border-zinc-700 hover:bg-zinc-800/40'
                    )}
                    onClick={() => setSelectedPath(isSelected ? null : path.id)}
                  >
                    <span className="text-[10px]">{fromRegion.flag}</span>
                    <span className="text-[9px] text-zinc-600">→</span>
                    <span className="text-[10px]">{toRegion.flag}</span>
                    <span className="min-w-0 flex-1 truncate text-[9px] text-zinc-500">
                      {path.type}
                    </span>
                    <span className="text-[9px] font-mono text-red-400">{path.count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
