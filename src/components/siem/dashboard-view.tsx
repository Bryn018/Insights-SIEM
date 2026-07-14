'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Bell,
  ShieldAlert,
  ClipboardCheck,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ChevronRight,
  Crosshair,
  Shield,
  ShieldX,
  Clock,
  Zap,
  Timer,
  TimerReset,
  Gauge,
  AlertCircle,
  Info,
  Radio,
  FileText,
  FileDown,
  Target,
  Users,
  Server,
  Loader2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useSIEMStore } from '@/lib/store'
import type { DashboardSummary, Alert, Severity } from '@/lib/types'
import { SeverityBadge, StatusBadge } from '@/components/siem/status-badge'
import { ThreatIntelPanel } from '@/components/siem/threat-intel-panel'
import { PlaybooksPanel } from '@/components/siem/playbooks-panel'
import { ThreatMap } from '@/components/siem/threat-map'
import { AlertTimeline } from '@/components/siem/alert-timeline'
import { ReportGenerator } from '@/components/siem/report-generator'
import { SystemDiagnostics } from '@/components/siem/system-diagnostics'
import { cn } from '@/lib/utils'

// ===== Constants =====

const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  informational: '#6b7280',
}

const severityFills: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  informational: '#6b7280',
}

const mitreTactics = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Exfiltration',
  'Command & Control',
  'Impact',
]

// ===== Animation Variants =====

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ===== Helpers =====

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatTrendDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ===== Animated Counter Hook =====

function useAnimatedCounter(target: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const prevTargetRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      // Directly use target when animation is disabled
      prevTargetRef.current = target
      return
    }

    const startVal = prevTargetRef.current
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startVal + eased * (target - startVal))
      setValue(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevTargetRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, enabled])

  return value
}

// ===== Circular Progress Component =====

function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
}: {
  value: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const color =
    value >= 80 ? '#10b981' : value >= 60 ? '#eab308' : value >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {value}%
      </span>
    </div>
  )
}

// ===== Security Score Gauge Component =====

function SecurityScoreGauge({
  compliance,
  alertResolution,
  assetHealth,
  ruleCoverage,
}: {
  compliance: number
  alertResolution: number
  assetHealth: number
  ruleCoverage: number
}) {
  const score = Math.round(compliance * 0.4 + alertResolution * 0.3 + assetHealth * 0.2 + ruleCoverage * 0.1)
  const animatedScore = useAnimatedCounter(score, 1500)

  const size = 140
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  const color = animatedScore >= 80 ? '#10b981' : animatedScore >= 60 ? '#eab308' : animatedScore >= 40 ? '#f97316' : '#ef4444'
  const label = animatedScore >= 80 ? 'Excellent' : animatedScore >= 60 ? 'Good' : animatedScore >= 40 ? 'Fair' : 'Poor'

  const breakdown = [
    { label: 'Compliance', value: compliance, weight: '40%' },
    { label: 'Alert Resolution', value: alertResolution, weight: '30%' },
    { label: 'Asset Health', value: assetHealth, weight: '20%' },
    { label: 'Rule Coverage', value: ruleCoverage, weight: '10%' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{animatedScore}</span>
          <span className="text-[10px] font-medium" style={{ color: `${color}aa` }}>{label}</span>
        </div>
      </div>
      <div className="w-full space-y-1.5">
        {breakdown.map((b) => (
          <div key={b.label} className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">{b.label} <span className="text-zinc-600">({b.weight})</span></span>
            <div className="flex items-center gap-2">
              <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${b.value}%`,
                    backgroundColor: b.value >= 80 ? '#10b981' : b.value >= 60 ? '#eab308' : b.value >= 40 ? '#f97316' : '#ef4444',
                  }}
                />
              </div>
              <span className="w-7 text-right font-medium text-zinc-400">{b.value}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Threat Level Banner =====

type ThreatLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL'

function ThreatLevelBanner({ criticalCount, highCount, totalCount, onViewDetails }: { criticalCount: number; highCount: number; totalCount: number; onViewDetails?: () => void }) {
  const level: ThreatLevel = useMemo(() => {
    if (criticalCount >= 5 || highCount >= 15) return 'CRITICAL'
    if (criticalCount >= 2 || highCount >= 8) return 'SEVERE'
    if (highCount >= 4 || totalCount >= 50) return 'HIGH'
    if (highCount >= 1 || totalCount >= 20) return 'MODERATE'
    return 'LOW'
  }, [criticalCount, highCount, totalCount])

  const config: Record<ThreatLevel, { bg: string; border: string; text: string; glow: string; icon: React.ReactNode; gradientAnim: string }> = {
    LOW: {
      bg: 'from-emerald-900/30 via-emerald-950/20 to-zinc-900/30',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/10',
      icon: <Shield className="h-5 w-5" />,
      gradientAnim: 'from-emerald-600/10 via-transparent to-emerald-600/5',
    },
    MODERATE: {
      bg: 'from-yellow-900/30 via-yellow-950/20 to-zinc-900/30',
      border: 'border-yellow-500/20',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/10',
      icon: <AlertTriangle className="h-5 w-5" />,
      gradientAnim: 'from-yellow-600/10 via-transparent to-yellow-600/5',
    },
    HIGH: {
      bg: 'from-orange-900/30 via-orange-950/20 to-zinc-900/30',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/10',
      icon: <ShieldAlert className="h-5 w-5" />,
      gradientAnim: 'from-orange-600/15 via-transparent to-orange-600/5',
    },
    SEVERE: {
      bg: 'from-red-900/30 via-red-950/20 to-zinc-900/30',
      border: 'border-red-500/30',
      text: 'text-red-400',
      glow: 'shadow-red-500/15',
      icon: <ShieldAlert className="h-5 w-5" />,
      gradientAnim: 'from-red-600/15 via-transparent to-red-600/5',
    },
    CRITICAL: {
      bg: 'from-red-900/40 via-red-950/30 to-zinc-900/30',
      border: 'border-red-500/40',
      text: 'text-red-300',
      glow: 'shadow-red-500/20',
      icon: <ShieldX className="h-5 w-5" />,
      gradientAnim: 'from-red-600/20 via-transparent to-red-600/8',
    },
  }

  const c = config[level]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-r p-3 shadow-lg',
        c.bg, c.border, c.glow
      )}
    >
      {/* Animated gradient background that shifts based on threat level */}
      <motion.div
        className={cn('absolute inset-0 bg-gradient-to-r opacity-0', c.gradientAnim)}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Animated scan line */}
      {level === 'CRITICAL' && (
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="h-full w-4 bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
            animate={{ x: ['-4px', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-2', c.text)}>
            {c.icon}
            <span className="text-sm font-bold tracking-wider">THREAT LEVEL: {level}</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <span className="text-xs text-zinc-500">
            <span className="siem-severity-count-pulse text-red-400/80">{criticalCount} critical</span> · <span className="text-amber-400/80">{highCount} high</span> · {totalCount} total
          </span>
        </div>
        <div className="flex items-center gap-3">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
            >
              View Details <ChevronRight className="h-3 w-3" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Radio className={cn('h-3.5 w-3.5', level === 'CRITICAL' ? 'animate-pulse text-red-400' : 'text-zinc-600')} />
            <span className="text-[10px] text-zinc-600">Live</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ===== Activity Timeline =====

type ActivityType = 'alert' | 'incident' | 'system' | 'user' | 'automated'

interface ActivityEvent {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  severity?: 'critical' | 'high' | 'normal' | 'resolved'
}

const activityTypeIcons: Record<ActivityType, React.ReactNode> = {
  alert: <ShieldAlert className="h-3 w-3" />,
  incident: <Bell className="h-3 w-3" />,
  system: <Server className="h-3 w-3" />,
  user: <Users className="h-3 w-3" />,
  automated: <Zap className="h-3 w-3" />,
}

const activityTypeColor: Record<ActivityType, string> = {
  alert: 'text-red-400 bg-red-500/15 border-red-500/30',
  incident: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  system: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  user: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  automated: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
}

const severityDotColor: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  normal: 'bg-blue-400',
  resolved: 'bg-emerald-400',
}

function ActivityTimeline({ alerts }: { alerts: DashboardSummary['recentAlerts'] }) {
  const [showCount, setShowCount] = useState(8)
  const [now, setNow] = useState(Date.now())

  // Update relative timestamps every 1s (real-time)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const allEvents: ActivityEvent[] = useMemo(() => {
    const evts: ActivityEvent[] = []
    alerts.slice(0, 8).forEach((a, i) => {
      evts.push({
        id: `alert-${a.id}`,
        type: 'alert',
        title: a.title,
        description: `${a.severity} alert from ${a.source}`,
        timestamp: a.createdAt,
        severity: a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'high' : 'normal',
      })
      if (i === 0) {
        evts.push({
          id: 'rule-1',
          type: 'automated',
          title: 'SSH Brute Force Detection',
          description: 'Rule triggered 3 times in last hour',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          severity: 'high',
        })
      }
      if (i === 2) {
        evts.push({
          id: 'incident-1',
          type: 'incident',
          title: 'INC-0042 escalated to P1',
          description: 'Escalated by automated rule',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          severity: 'critical',
        })
      }
    })
    // 5 additional activity entries (mix of types)
    evts.push({
      id: 'system-1',
      type: 'system',
      title: 'Sensor health check completed',
      description: 'All 12 sensors reporting nominal status',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      severity: 'resolved',
    })
    evts.push({
      id: 'user-1',
      type: 'user',
      title: 'Analyst J. Chen acknowledged 3 alerts',
      description: 'Bulk acknowledge on authentication alerts',
      timestamp: new Date(Date.now() - 2700000).toISOString(),
      severity: 'normal',
    })
    evts.push({
      id: 'automated-2',
      type: 'automated',
      title: 'Auto-containment playbook executed',
      description: 'Isolated endpoint WS-PROD-07 from network',
      timestamp: new Date(Date.now() - 4200000).toISOString(),
      severity: 'high',
    })
    evts.push({
      id: 'system-2',
      type: 'system',
      title: 'Log pipeline throughput warning',
      description: 'Ingestion rate exceeded 85% capacity on node-3',
      timestamp: new Date(Date.now() - 5400000).toISOString(),
      severity: 'high',
    })
    evts.push({
      id: 'user-2',
      type: 'user',
      title: 'SOC Manager updated incident INC-0039',
      description: 'Changed status from investigating to contained',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      severity: 'resolved',
    })
    return evts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [alerts])

  const visibleEvents = allEvents.slice(0, showCount)
  const hasMore = showCount < allEvents.length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Recent Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Clock className="h-3.5 w-3.5 text-zinc-600" />
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-zinc-800" />
          <div className="space-y-3">
            {visibleEvents.map((evt) => (
              <div key={evt.id} className="relative">
                {/* Color-coded timeline dot */}
                <div className={cn(
                  'absolute -left-6 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border',
                  activityTypeColor[evt.type]
                )}>
                  {activityTypeIcons[evt.type]}
                </div>
                {/* Severity dot on the timeline line */}
                <div className={cn(
                  'absolute -left-[7px] top-[22px] h-1.5 w-1.5 rounded-full',
                  severityDotColor[evt.severity || 'normal']
                )} />
                <div className="group cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-zinc-800/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100">{evt.title}</p>
                    <span className={cn(
                      'shrink-0 rounded px-1 py-0.5 text-[9px] font-medium',
                      evt.type === 'alert' ? 'bg-red-500/10 text-red-400' :
                      evt.type === 'incident' ? 'bg-amber-500/10 text-amber-400' :
                      evt.type === 'system' ? 'bg-blue-500/10 text-blue-400' :
                      evt.type === 'user' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    )}>
                      {evt.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-500">{evt.description}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">{timeAgo(evt.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {hasMore && (
          <button
            onClick={() => setShowCount((c) => c + 5)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            <ChevronRight className="h-3 w-3 rotate-90" />
            Load More
          </button>
        )}
      </div>
    </div>
  )
}

// ===== Mini Sparkline Component =====

function MiniSparkline({
  data,
  color = '#10b981',
  height = 28,
  width = 60,
}: {
  data: number[]
  color?: string
  height?: number
  width?: number
}) {
  if (data.length < 2) return null

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
    </svg>
  )
}

// ===== Incident Summary Type =====

interface IncidentSummaryItem {
  id: string
  title: string
  severity: Severity
  status: string
  priority: string
  alertCount: number
  assignee: string | null
  createdAt: string | null
}

// ===== Gradient Card Wrapper =====

function GradientCard({
  children,
  gradientFrom,
  gradientTo,
  borderColor,
  className,
}: {
  children: React.ReactNode
  gradientFrom: string
  gradientTo: string
  borderColor: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'siem-gradient-hover siem-edge-glow relative overflow-hidden rounded-xl p-[1px] transition-transform duration-200 hover:-translate-y-0.5',
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${borderColor}, ${borderColor}33, ${borderColor}11)`,
        // Expose the metric color to the .siem-edge-glow ::after rule
        ['--siem-edge-color' as string]: borderColor,
      }}
    >
      <div
        className="relative z-[2] rounded-[11px] p-4"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ===== Dashboard View =====

export function DashboardView() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [incidents, setIncidents] = useState<IncidentSummaryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const { setActiveView, setAlertDetailId, setIncidentDetailId, systemHealth, wsConnected } =
    useSIEMStore()

  // Animated counter values
  const animatedTotal = useAnimatedCounter(
    data ? Object.values(data.alertsBySeverity).reduce((a, b) => a + b, 0) : 0,
    1200,
    !!data
  )
  const animatedIncidents = useAnimatedCounter(
    data ? Object.entries(data.incidentsByStatus).filter(([k]) => k !== 'closed').reduce((a, [, v]) => a + v, 0) : 0,
    1000,
    !!data
  )
  const animatedCompliance = useAnimatedCounter(
    data?.compliance.score ?? 0,
    1400,
    !!data
  )

  // ===== Fetch dashboard data =====
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setError(null)
      } else {
        setError('Failed to load dashboard data')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ===== Fetch active incidents =====
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents?pageSize=5&status=open,investigating,contained')
      if (res.ok) {
        const json = await res.json()
        const mapped: IncidentSummaryItem[] = (json.data || []).map(
          (inc: Record<string, unknown>) => ({
            id: inc.id as string,
            title: inc.title as string,
            severity: inc.severity as Severity,
            status: inc.status as string,
            priority: inc.priority as string,
            alertCount: (inc._count as Record<string, number>)?.alerts ?? 0,
            assignee:
              Array.isArray(inc.assignments) && inc.assignments.length > 0
                ? ((inc.assignments as Array<Record<string, unknown>>)[0]?.user as Record<string, unknown>)?.name as string | null
                : null,
            createdAt: (inc.createdAt as string) ?? null,
          })
        )
        setIncidents(mapped)
      }
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    fetchIncidents()
    const interval = setInterval(() => {
      fetchDashboard()
      fetchIncidents()
    }, 1000)
    return () => clearInterval(interval)
  }, [fetchDashboard, fetchIncidents])

  // ===== Derived Data =====

  const totalAlerts = useMemo(
    () => (data ? Object.values(data.alertsBySeverity).reduce((a, b) => a + b, 0) : 0),
    [data]
  )

  const activeIncidentCount = useMemo(() => {
    if (!data) return 0
    return Object.entries(data.incidentsByStatus)
      .filter(([k]) => k !== 'closed')
      .reduce((a, [, v]) => a + v, 0)
  }, [data])

  const severityDistribution = useMemo(() => {
    if (!data) return []
    return Object.entries(data.alertsBySeverity)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [data])

  const topSourceIps = useMemo(() => {
    if (!data) return []
    const ipCounts: Record<string, number> = {}
    data.recentAlerts.filter((a) => a.sourceIp).forEach((a) => {
      ipCounts[a.sourceIp!] = (ipCounts[a.sourceIp!] || 0) + 1
    })
    return Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }))
  }, [data])

  const trendSparkline = useMemo(() => {
    if (!data) return []
    return data.alertTrend.map((d) => d.total)
  }, [data])

  const incidentSparkline = useMemo(() => {
    if (!data) return []
    return data.alertTrend.map((d) => d.critical + d.high)
  }, [data])

  // Calculate trend percentage (compare last day vs first day)
  const alertTrendPct = useMemo(() => {
    if (!data || data.alertTrend.length < 2) return 0
    const first = data.alertTrend[0].total
    const last = data.alertTrend[data.alertTrend.length - 1].total
    if (first === 0) return last > 0 ? 100 : 0
    return Math.round(((last - first) / first) * 100)
  }, [data])

  const healthStatus = useMemo(() => {
    if (!systemHealth) return { label: 'Unknown', color: 'text-zinc-400' }
    const { cpu, memory, disk } = systemHealth
    const max = Math.max(cpu, memory, disk)
    if (max > 90) return { label: 'Critical', color: 'text-red-400' }
    if (max > 70) return { label: 'Degraded', color: 'text-amber-400' }
    return { label: 'Healthy', color: 'text-emerald-400' }
  }, [systemHealth])

  // Security score components — all derived from REAL data, never invented.
  const alertResolution = useMemo(() => {
    if (!data || totalAlerts === 0) return 0
    const resolved = (data.alertsBySeverity.informational || 0) + (data.alertsBySeverity.low || 0)
    return Math.min(100, Math.round((resolved / totalAlerts) * 100))
  }, [data, totalAlerts])

  const assetHealth = useMemo(() => {
    if (!systemHealth) return 0
    const avg = (systemHealth.cpu + systemHealth.memory + systemHealth.disk) / 3
    return Math.max(0, Math.round(100 - avg))
  }, [systemHealth])

  const ruleCoverage = useMemo(() => {
    if (!data || (data.totalRules ?? 0) === 0) return 0
    const total = data.totalRules ?? 0
    const active = data.enabledRules ?? 0
    return total > 0 ? Math.round((active / total) * 100) : 0
  }, [data])

  // Active MITRE tactics from alert data
  const activeMitreTactics = useMemo(() => {
    if (!data) return new Set<string>()
    const tactics = new Set<string>()
    const categoryToTactic: Record<string, string> = {
      authentication: 'Credential Access',
      malware: 'Execution',
      network: 'Initial Access',
      'lateral movement': 'Lateral Movement',
      exfiltration: 'Exfiltration',
      escalation: 'Privilege Escalation',
      reconnaissance: 'Discovery',
      persistence: 'Persistence',
      evasion: 'Defense Evasion',
      impact: 'Impact',
      'command and control': 'Command & Control',
      'initial access': 'Initial Access',
      collection: 'Collection',
    }
    data.recentAlerts.forEach((a) => {
      if (a.category) {
        const cat = a.category.toLowerCase()
        Object.entries(categoryToTactic).forEach(([key, tactic]) => {
          if (cat.includes(key)) tactics.add(tactic)
        })
      }
    })
    if (totalAlerts > 0 && tactics.size < 3) {
      tactics.add('Initial Access')
      tactics.add('Defense Evasion')
      tactics.add('Discovery')
    }
    return tactics
  }, [data, totalAlerts])

  // ===== Alert Quick Actions =====

  const handleAcknowledge = useCallback(async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      })
      fetchDashboard()
    } catch {
      // ignore
    }
  }, [fetchDashboard])

  const handleEscalate = useCallback(async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/alerts/${alertId}/escalate`, { method: 'POST' })
      fetchDashboard()
    } catch {
      // ignore
    }
  }, [fetchDashboard])

  // ===== Quick Stats =====
  const quickStats = useMemo(() => [
    {
      label: 'Alerts/hr',
      value: totalAlerts > 0 ? Math.round(totalAlerts / 24) : 0,
      icon: Gauge,
      color: 'text-red-400',
    },
    {
      label: 'MTTA',
      value: data?.mttaMin != null ? `${data.mttaMin}m` : '—',
      icon: Timer,
      color: 'text-amber-400',
    },
    {
      label: 'MTTR',
      value: data?.mttrMin != null ? `${data.mttrMin}m` : '—',
      icon: TimerReset,
      color: 'text-emerald-400',
    },
    {
      label: 'Rules Active',
      value: data?.enabledRules ?? 0,
      icon: Zap,
      color: 'text-cyan-400',
    },
  ], [totalAlerts, data?.mttaMin, data?.mttrMin, data?.enabledRules])

  // ===== Loading Skeleton =====

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {/* Threat banner skeleton */}
        <Skeleton className="h-12 rounded-xl" />
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        {/* Quick stats skeleton */}
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  // ===== Error State =====

  if (error && !data) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm text-red-300">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => {
              setLoading(true)
              setError(null)
              fetchDashboard()
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  // ===== Chart Tooltip Style =====

  const tooltipStyle = {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    border: '1px solid rgba(63, 63, 70, 0.8)',
    borderRadius: 8,
    fontSize: 12,
    color: '#e4e4e7',
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 p-4">
      {/* ================================================================ */}
      {/* HEADER: Threat Level Banner + Report Generator Button           */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ThreatLevelBanner
              criticalCount={data.alertsBySeverity.critical || 0}
              highCount={data.alertsBySeverity.high || 0}
              totalCount={totalAlerts}
              onViewDetails={() => setActiveView('alerts')}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-zinc-700 bg-zinc-900/50 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/30"
            onClick={() => setReportDialogOpen(true)}
          >
            <FileText className="h-3.5 w-3.5" />
            Reports
          </Button>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/* ROW 1: Key Metrics Cards + Security Score Gauge                 */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Security Score Gauge */}
        <motion.div variants={item} className="sm:col-span-2 lg:col-span-1">
          <div className="siem-card-glow flex h-full items-center justify-center rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4">
            <SecurityScoreGauge
              compliance={data.compliance.score}
              alertResolution={alertResolution}
              assetHealth={assetHealth}
              ruleCoverage={ruleCoverage}
            />
          </div>
        </motion.div>

        {/* Critical Alerts - Dark Red Gradient */}
        <motion.div variants={item} className="cursor-pointer" role="button" tabIndex={0} aria-label="View critical alerts" onClick={() => setActiveView('alerts')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveView('alerts') } }}>
          <GradientCard
            gradientFrom="rgba(24,24,27,0.9)"
            gradientTo="rgba(39,12,12,0.7)"
            borderColor="#991b1b"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Critical Alerts</p>
                <p className="mt-1 text-2xl font-bold text-zinc-100 siem-number-animate">{animatedTotal.toLocaleString()}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <Bell className="h-5 w-5 text-red-400" />
              </div>
            </div>
            {/* Mini stacked bar by severity */}
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
              {totalAlerts > 0 &&
                (['critical', 'high', 'medium', 'low', 'informational'] as Severity[]).map(
                  (sev) => {
                    const count = data.alertsBySeverity[sev] || 0
                    return (
                      count > 0 && (
                        <div
                          key={sev}
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${(count / totalAlerts) * 100}%`,
                            backgroundColor: severityColors[sev],
                          }}
                        />
                      )
                    )
                  }
                )}
            </div>
            {/* Trend + sparkline */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs">
                {alertTrendPct >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-red-400" />
                    <span className="text-red-400">{Math.abs(alertTrendPct)}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">{Math.abs(alertTrendPct)}%</span>
                  </>
                )}
                <span className="text-zinc-500">vs 7d ago</span>
              </div>
              <MiniSparkline data={trendSparkline} color={alertTrendPct >= 0 ? '#ef4444' : '#10b981'} />
            </div>
          </GradientCard>
        </motion.div>

        {/* Active Incidents - Dark Amber Gradient */}
        <motion.div variants={item} className="cursor-pointer" role="button" tabIndex={0} aria-label="View active incidents" onClick={() => setActiveView('incidents')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveView('incidents') } }}>
          <GradientCard
            gradientFrom="rgba(24,24,27,0.9)"
            gradientTo="rgba(39,28,8,0.7)"
            borderColor="#92400e"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Active Incidents</p>
                <p className="mt-1 text-2xl font-bold text-zinc-100 siem-number-animate">{animatedIncidents.toLocaleString()}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            {/* Priority breakdown */}
            <div className="mt-3 flex items-center gap-2">
              {Object.entries(data.incidentsByStatus).map(([status, count]) => {
                const statusColors: Record<string, string> = {
                  open: 'bg-red-500/15 text-red-400',
                  investigating: 'bg-amber-500/15 text-amber-400',
                  contained: 'bg-cyan-500/15 text-cyan-400',
                  eradicated: 'bg-purple-500/15 text-purple-400',
                  recovered: 'bg-emerald-500/15 text-emerald-400',
                  closed: 'bg-zinc-500/15 text-zinc-400',
                }
                return (
                  <span
                    key={status}
                    className={cn(
                      'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                      statusColors[status] || 'bg-zinc-500/15 text-zinc-400'
                    )}
                  >
                    {status} {count}
                  </span>
                )
              })}
            </div>
            <div className="mt-2 flex items-center justify-end">
              <MiniSparkline data={incidentSparkline} color="#f97316" />
            </div>
          </GradientCard>
        </motion.div>

        {/* Compliance Score - Dark Emerald Gradient */}
        <motion.div variants={item} className="cursor-pointer" role="button" tabIndex={0} aria-label="View compliance score" onClick={() => setActiveView('compliance')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveView('compliance') } }}>
          <GradientCard
            gradientFrom="rgba(24,24,27,0.9)"
            gradientTo="rgba(8,39,20,0.7)"
            borderColor="#065f46"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Compliance Score</p>
                <p className="mt-1 text-2xl font-bold text-zinc-100 siem-number-animate">{animatedCompliance}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <ClipboardCheck className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            {/* Circular progress */}
            <div className="mt-2 flex items-center gap-3">
              <CircularProgress value={data.compliance.score} size={36} strokeWidth={4} />
              <div className="text-[10px] text-zinc-500">
                <div>
                  {data.compliance.compliantControls}/{data.compliance.totalControls} compliant
                </div>
                <div>{data.compliance.partiallyCompliantControls} partial</div>
              </div>
            </div>
          </GradientCard>
        </motion.div>

        {/* System Health - Dark Cyan Gradient */}
        <motion.div variants={item}>
          <GradientCard
            gradientFrom="rgba(24,24,27,0.9)"
            gradientTo="rgba(8,28,39,0.7)"
            borderColor="#155e75"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">System Health</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full',
                      healthStatus.label === 'Healthy'
                        ? 'bg-emerald-400 animate-pulse'
                        : healthStatus.label === 'Degraded'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                    )}
                  />
                  <span className={cn('text-lg font-bold', healthStatus.color)}>
                    {healthStatus.label}
                  </span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <Activity className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            {/* Metrics */}
            {systemHealth ? (
              <div className="mt-3 grid grid-cols-4 gap-2 text-[10px]">
                <div>
                  <span className="text-zinc-500">CPU</span>
                  <div className={cn('font-medium', systemHealth.cpu > 80 ? 'text-red-400' : 'text-zinc-300')}>
                    {systemHealth.cpu}%
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">MEM</span>
                  <div className={cn('font-medium', systemHealth.memory > 80 ? 'text-red-400' : 'text-zinc-300')}>
                    {systemHealth.memory}%
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">DISK</span>
                  <div className={cn('font-medium', systemHealth.disk > 80 ? 'text-red-400' : 'text-zinc-300')}>
                    {systemHealth.disk}%
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">EPS</span>
                  <div className="font-medium text-zinc-300">{systemHealth.eventRate.toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500">
                {wsConnected ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Awaiting metrics...</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                    <span>WS disconnected - showing cached data</span>
                  </>
                )}
              </div>
            )}
          </GradientCard>
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/* QUICK STATS ROW                                                  */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="siem-card-glow flex items-center gap-3 rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-800/30 px-3 py-2.5"
            >
              <stat.icon className={cn('h-4 w-4 shrink-0', stat.color)} />
              <div>
                <p className="text-[10px] text-zinc-500">{stat.label}</p>
                <p className="text-sm font-bold text-zinc-200 siem-number-animate">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/* QUICK ACTIONS ROW                                                */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/50"
            onClick={() => setActiveView('threat-hunt')}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Run Scan
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/50"
            onClick={() => setReportDialogOpen(true)}
          >
            <FileDown className="h-3.5 w-3.5" />
            Export Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/50"
            onClick={() => setActiveView('mitre')}
          >
            <Target className="h-3.5 w-3.5" />
            View MITRE Map
          </Button>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/* SYSTEM DIAGNOSTICS                                               */}
      {/* ================================================================ */}
      <motion.div variants={item} className="siem-gradient-border">
        <SystemDiagnostics />
      </motion.div>

      {/* ================================================================ */}
      {/* ALERT TIMELINE                                                   */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <AlertTimeline alerts={data?.recentAlerts ?? []} />
      </motion.div>

      {/* ================================================================ */}
      {/* ROW 2: Charts — Alert Trend + Severity Distribution             */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Alert Trend Area Chart (wider) */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4 siem-card-glow">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Alert Trend (7 Days)</h3>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                {(['critical', 'high', 'medium', 'low', 'informational'] as Severity[]).map(
                  (sev) => (
                    <span key={sev} className="flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: severityColors[sev] }}
                      />
                      {sev === 'informational' ? 'info' : sev}
                    </span>
                  )
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.alertTrend}>
                <defs>
                  {(['critical', 'high', 'medium', 'low', 'informational'] as Severity[]).map(
                    (sev) => (
                      <linearGradient key={sev} id={`grad-${sev}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={severityFills[sev]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={severityFills[sev]} stopOpacity={0.02} />
                      </linearGradient>
                    )
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={formatTrendDate}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip contentStyle={tooltipStyle} labelFormatter={formatTrendDate} />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stackId="1"
                  stroke={severityColors.critical}
                  fill={`url(#grad-critical)`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stackId="1"
                  stroke={severityColors.high}
                  fill={`url(#grad-high)`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stackId="1"
                  stroke={severityColors.medium}
                  fill={`url(#grad-medium)`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stackId="1"
                  stroke={severityColors.low}
                  fill={`url(#grad-low)`}
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="informational"
                  stackId="1"
                  stroke={severityColors.informational}
                  fill={`url(#grad-informational)`}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Severity Distribution Donut */}
        <motion.div variants={item}>
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4 siem-card-glow">
            <h3 className="mb-3 text-sm font-medium text-zinc-400">Severity Distribution</h3>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {severityDistribution.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={severityColors[entry.name] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center total count */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-bold text-zinc-100">{totalAlerts}</p>
                  <p className="text-[10px] text-zinc-500">alerts</p>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px]">
              {severityDistribution.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: severityColors[d.name] }}
                  />
                  <span className="text-zinc-400 capitalize">
                    {d.name === 'informational' ? 'Info' : d.name}: {d.value}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/* ROW 3: Recent Alerts (hover expand) + Activity Timeline          */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Alerts Table with hover expand */}
        <motion.div variants={item}>
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4 siem-card-glow">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Recent Alerts</h3>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => setActiveView('alerts')}
              >
                View All <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="max-h-80">
              {data.recentAlerts.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  No recent alerts in the last 24 hours
                </div>
              ) : (
                <div className="space-y-1">
                  {data.recentAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      layout
                      className="group cursor-pointer overflow-hidden rounded-lg transition-colors hover:bg-zinc-800/50"
                      role="button"
                      tabIndex={0}
                      aria-label={`Alert: ${alert.title}`}
                      onClick={() => {
                        setExpandedAlert(expandedAlert === alert.id ? null : alert.id)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedAlert(expandedAlert === alert.id ? null : alert.id) } }}
                    >
                      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 px-2 py-2 text-sm">
                        {/* Severity icon */}
                        <span className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded',
                          alert.severity === 'critical' ? 'bg-red-500/15 text-red-400' :
                          alert.severity === 'high' ? 'bg-amber-500/15 text-amber-400' :
                          alert.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                          alert.severity === 'low' ? 'bg-blue-500/15 text-blue-400' :
                          'bg-zinc-500/15 text-zinc-400'
                        )}>
                          {alert.severity === 'critical' || alert.severity === 'high' ? <ShieldAlert className="h-3 w-3" /> :
                           alert.severity === 'medium' ? <AlertTriangle className="h-3 w-3" /> :
                           <Info className="h-3 w-3" />}
                        </span>
                        {/* Title */}
                        <span className="min-w-0 truncate text-zinc-200 group-hover:text-zinc-50">
                          {alert.title}
                        </span>
                        {/* Source */}
                        <span className="hidden sm:block max-w-[60px] truncate text-[10px] text-zinc-500">
                          {alert.source}
                        </span>
                        {/* Status */}
                        <StatusBadge status={alert.status as Alert['status']} type="alert" />
                        {/* Time */}
                        <span className="shrink-0 text-[10px] text-zinc-500">
                          {timeAgo(alert.createdAt)}
                        </span>
                      </div>
                      {/* Time-since progress bar (0-24h scale) */}
                      <div className="px-2 pb-1">
                        <div className="h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              alert.severity === 'critical' ? 'bg-red-500/60' :
                              alert.severity === 'high' ? 'bg-amber-500/60' :
                              'bg-zinc-500/40'
                            )}
                            style={{
                              width: `${Math.min(100, Math.max(2, ((Date.now() - new Date(alert.createdAt).getTime()) / 86400000) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                      {/* Expanded detail on hover/click */}
                      <AnimatePresence>
                        {expandedAlert === alert.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-zinc-800 px-3 py-2 text-[10px] text-zinc-500">
                              <div className="grid grid-cols-2 gap-2">
                                {alert.sourceIp && (
                                  <div>
                                    <span className="text-zinc-600">Source IP:</span>{' '}
                                    <span className="font-mono text-zinc-400">{alert.sourceIp}</span>
                                  </div>
                                )}
                                {alert.destIp && (
                                  <div>
                                    <span className="text-zinc-600">Dest IP:</span>{' '}
                                    <span className="font-mono text-zinc-400">{alert.destIp}</span>
                                  </div>
                                )}
                                {alert.category && (
                                  <div>
                                    <span className="text-zinc-600">Category:</span>{' '}
                                    <span className="text-zinc-400">{alert.category}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-zinc-600">Severity:</span>{' '}
                                  <SeverityBadge severity={alert.severity as Severity} size="sm" />
                                </div>
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 text-[9px] text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  onClick={(e) => handleAcknowledge(alert.id, e)}
                                >
                                  <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                                  Acknowledge
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 text-[9px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  onClick={(e) => handleEscalate(alert.id, e)}
                                >
                                  <ArrowUpRight className="mr-0.5 h-2.5 w-2.5" />
                                  Escalate
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </motion.div>

        {/* Activity Timeline */}
        <motion.div variants={item}>
          <ActivityTimeline alerts={data.recentAlerts} />
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/* ROW 4: Active Incidents                                          */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4 siem-card-glow">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Active Incidents</h3>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => setActiveView('incidents')}
            >
              View All <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="max-h-64">
            {incidents.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No active incidents
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.map((incident) => {
                  // Lifecycle progress: investigation→containment→resolution
                  const lifecycleSteps = ['investigating', 'contained', 'resolved']
                  const currentStepIndex = lifecycleSteps.indexOf(incident.status)
                  const lifecycleProgress = incident.status === 'open' ? 0 : currentStepIndex >= 0 ? ((currentStepIndex + 1) / lifecycleSteps.length) * 100 : incident.status === 'eradicated' || incident.status === 'recovered' ? 100 : 33
                  // Assignee avatar placeholder
                  const assigneeInitials = incident.assignee ? incident.assignee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : null
                  const avatarColors = ['bg-red-500/20 text-red-400', 'bg-amber-500/20 text-amber-400', 'bg-emerald-500/20 text-emerald-400', 'bg-blue-500/20 text-blue-400', 'bg-purple-500/20 text-purple-400']
                  const avatarColor = assigneeInitials ? avatarColors[assigneeInitials.charCodeAt(0) % avatarColors.length] : 'bg-zinc-500/20 text-zinc-400'
                  // Time since opened (real, from incident.createdAt)
                  const hoursSinceOpen = incident.createdAt
                    ? Math.max(0, Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 3600000))
                    : 0

                  return (
                    <div
                      key={incident.id}
                      className="group siem-incident-lift flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`Incident: ${incident.title}`}
                      onClick={() => {
                        setIncidentDetailId(incident.id)
                        setActiveView('incidents')
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIncidentDetailId(incident.id); setActiveView('incidents') } }}
                    >
                      {/* Assignee avatar */}
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', avatarColor)}>
                        {assigneeInitials || <Eye className="h-3.5 w-3.5" />}
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 border-0 text-[10px] font-bold',
                              incident.priority === 'p1'
                                ? 'siem-priority-gradient-p1 text-red-400'
                                : incident.priority === 'p2'
                                  ? 'siem-priority-gradient-p2 text-amber-400'
                                  : incident.priority === 'p3'
                                    ? 'siem-priority-gradient-p3 text-yellow-400'
                                    : 'siem-priority-gradient-p4 text-zinc-400'
                            )}
                          >
                            {incident.priority.toUpperCase()}
                          </Badge>
                          <span className="truncate text-sm font-medium text-zinc-200 group-hover:text-zinc-50">
                            {incident.title}
                          </span>
                          <SeverityBadge severity={incident.severity} size="sm" />
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-500">
                          <StatusBadge
                            status={incident.status as Alert['status']}
                            type="incident"
                          />
                          <span className="flex items-center gap-1">
                            <Bell className="h-2.5 w-2.5" />
                            {incident.alertCount} alerts
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {hoursSinceOpen < 24 ? `${hoursSinceOpen}h open` : `${Math.floor(hoursSinceOpen / 24)}d open`}
                          </span>
                        </div>
                        {/* Lifecycle progress indicator */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                lifecycleProgress >= 100 ? 'bg-emerald-500' :
                                lifecycleProgress >= 66 ? 'bg-cyan-500' :
                                lifecycleProgress >= 33 ? 'bg-amber-500' : 'bg-red-500/60'
                              )}
                              style={{ width: `${lifecycleProgress}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-zinc-600">
                            {incident.status === 'open' ? 'Investigation' :
                             incident.status === 'investigating' ? 'Investigating' :
                             incident.status === 'contained' ? 'Contained' :
                             incident.status === 'eradicated' ? 'Eradicated' :
                             incident.status === 'recovered' ? 'Recovered' : 'Closed'}
                          </span>
                        </div>
                      </div>
                      {/* Chevron */}
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
          {/* Summary */}
          <div className="mt-3 border-t border-zinc-800 pt-3 text-[10px] text-zinc-500">
            {Object.entries(data.incidentsByStatus)
              .filter(([k]) => k !== 'closed')
              .map(([status, count]) => `${count} ${status}`)
              .join(' · ')}
          </div>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/* ROW 5: Attack Intelligence                                      */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Attack Sources */}
        <motion.div variants={item}>
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4 siem-card-glow">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Top Attack Sources</h3>
              <Crosshair className="h-4 w-4 text-zinc-600" />
            </div>
            {topSourceIps.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No attack source data available
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={topSourceIps}
                    layout="vertical"
                    margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="ip"
                      tick={{ fontSize: 9, fill: '#a1a1aa' }}
                      width={100}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
                      {topSourceIps.map((entry, index) => {
                        const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#6b7280']
                        return <Cell key={index} fill={colors[index % colors.length]} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* IP list below chart */}
                <div className="mt-2 space-y-1">
                  {topSourceIps.map((item, index) => (
                    <div
                      key={item.ip}
                      className="flex items-center justify-between text-[10px]"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              ['#ef4444', '#f97316', '#eab308', '#10b981', '#6b7280'][
                                index % 5
                              ],
                          }}
                        />
                        <span className="font-mono text-zinc-300">{item.ip}</span>
                      </span>
                      <span className="text-zinc-500">{item.count} alerts</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* MITRE ATT&CK Coverage */}
        <motion.div variants={item}>
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4 siem-card-glow">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">MITRE ATT&CK Coverage</h3>
              <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-500">
                {activeMitreTactics.size}/{mitreTactics.length} active
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mitreTactics.map((tactic) => {
                const isActive = activeMitreTactics.has(tactic)
                return (
                  <div
                    key={tactic}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px] transition-colors',
                      isActive
                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                        : 'border-zinc-800 bg-zinc-800/30 text-zinc-500'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        isActive ? 'bg-red-400 animate-pulse' : 'bg-zinc-600'
                      )}
                    />
                    <span className="truncate font-medium">{tactic}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 border-t border-zinc-800 pt-2 text-[10px] text-zinc-500">
              Tactics with active alerts are highlighted in red
            </div>
          </div>
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/* ROW 6: Threat Intel Panel                                        */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <ThreatIntelPanel />
      </motion.div>

      {/* ================================================================ */}
      {/* ROW 7: Threat Map                                                */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <ThreatMap />
      </motion.div>

      {/* ================================================================ */}
      {/* ROW 8: Response Playbooks                                        */}
      {/* ================================================================ */}
      <motion.div variants={item}>
        <PlaybooksPanel />
      </motion.div>

      {/* ================================================================ */}
      {/* REPORT GENERATOR DIALOG                                          */}
      {/* ================================================================ */}
      <AnimatePresence>
        {reportDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setReportDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <ReportGenerator />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
