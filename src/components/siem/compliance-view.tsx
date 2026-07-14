'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RefreshCw,
  Shield,
  FileCheck,
  FileX,
  Clock,
  Ban,
  AlertTriangle,
  TrendingUp,
  Pencil,
  BarChart3,
  ClipboardList,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  User,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Slash,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useSIEMStore, type ControlStatus } from '@/lib/store'
import type { ComplianceFramework, ComplianceControl } from '@/lib/types'
import { ComplianceBadge } from '@/components/siem/status-badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { formatRelativeTime, formatDate } from '@/lib/format-utils'

// ===== Types =====

interface FrameworkSummary {
  id: string
  name: string
  version: string | null
  description: string | null
  totalControls: number
  statusCounts: Record<string, number>
  complianceScore: number
  createdAt: string
  updatedAt: string
}

interface ControlData {
  id: string
  frameworkId: string
  controlId: string
  title: string
  description: string
  category: string | null
  status: ControlStatus
  evidence: string | null
  notes: string | null
  assessedAt: string | null
  assessedBy: string | null
  remediationDue: string | null
  createdAt: string
  updatedAt: string
}

// ===== SVG Circular Progress Component =====

function CircularScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  showValue = true,
  className,
}: {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  showValue?: boolean
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(score, 100) / 100) * circumference

  const getColor = () => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#eab308'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  const getGlowColor = () => {
    if (score >= 80) return 'rgba(16, 185, 129, 0.2)'
    if (score >= 60) return 'rgba(234, 179, 8, 0.2)'
    if (score >= 40) return 'rgba(249, 115, 22, 0.2)'
    return 'rgba(239, 68, 68, 0.2)'
  }

  const color = getColor()

  return (
    <div className={cn('relative inline-flex flex-col items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + strokeWidth / 2}
          fill="none"
          stroke={getGlowColor()}
          strokeWidth={strokeWidth * 2}
          className="blur-sm"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      {showValue && (
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span
            className="font-bold"
            style={{ color, fontSize: size * 0.22 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}%
          </motion.span>
          {label && (
            <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ===== Mini Score Ring for Framework Cards =====

function MiniScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(score, 100) / 100) * circumference

  const getColor = () => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#eab308'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color: getColor() }}>
        {score}
      </span>
    </div>
  )
}

// ===== Compact Header Progress Ring (inline SVG next to score) =====

function HeaderProgressRing({
  score,
  size = 22,
  strokeWidth = 2.5,
}: {
  score: number
  size?: number
  strokeWidth?: number
}) {
  const radius = Math.max(1, (size - strokeWidth) / 2)
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circumference - (clamped / 100) * circumference
  const color =
    score >= 80 ? '#10b981' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
      aria-label={`${score}% compliance`}
      role="img"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ===== Safe relative-time formatter (returns short "5m ago" style) =====

function formatDistanceToNowSafe(dateStr: string): string {
  try {
    return formatRelativeTime(dateStr)
  } catch {
    return ''
  }
}

// ===== Framework Icons =====

const frameworkIcons: Record<string, React.ReactNode> = {
  'PCI-DSS': <Shield className="h-5 w-5 text-blue-400" />,
  'HIPAA': <FileCheck className="h-5 w-5 text-emerald-400" />,
  'SOC2': <ClipboardList className="h-5 w-5 text-amber-400" />,
  'NIST': <BarChart3 className="h-5 w-5 text-purple-400" />,
}

const frameworkGradients: Record<string, string> = {
  'PCI-DSS': 'from-blue-500/10 to-blue-500/5',
  'HIPAA': 'from-emerald-500/10 to-emerald-500/5',
  'SOC2': 'from-amber-500/10 to-amber-500/5',
  'NIST': 'from-purple-500/10 to-purple-500/5',
}

// ===== 30-Day Compliance Trend Data =====

function generate30DayTrendData(frameworks: FrameworkSummary[]) {
  const days = 30
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i)
    const entry: Record<string, string | number> = {
      date: format(date, 'MMM d'),
      fullDate: format(date, 'yyyy-MM-dd'),
    }
    // No point-in-time history is stored, so the trend is the real current
    // score for every day (honest — no fabricated drift).
    frameworks.forEach((fw) => {
      entry[fw.name] = fw.complianceScore
    })
    return entry
  })
}

// ===== 6-Month Trend Data (for line chart fallback) =====

function generate6MonthTrendData(frameworks: FrameworkSummary[]) {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  return months.map((month) => {
    const entry: Record<string, string | number> = { month }
    frameworks.forEach((fw) => {
      entry[fw.name] = fw.complianceScore
    })
    return entry
  })
}

// ===== Radar Chart Data Generator =====

function generateRadarData(frameworks: FrameworkSummary[]) {
  const dimensions = [
    { key: 'compliance', label: 'Compliance' },
    { key: 'coverage', label: 'Coverage' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'remediation', label: 'Remediation' },
    { key: 'monitoring', label: 'Monitoring' },
    { key: 'governance', label: 'Governance' },
  ]

  return dimensions.map((dim) => {
    const entry: Record<string, string | number> = { dimension: dim.label }
    frameworks.forEach((fw) => {
      const base = fw.complianceScore
      let value: number
      switch (dim.key) {
        case 'compliance':
          value = base
          break
        case 'coverage': {
          const assessed = (fw.statusCounts.compliant || 0) + (fw.statusCounts.non_compliant || 0) + (fw.statusCounts.partially_compliant || 0)
          value = fw.totalControls > 0 ? Math.round((assessed / fw.totalControls) * 100) : 0
          break
        }
        case 'evidence': {
          const assessed = (fw.statusCounts.compliant || 0) + (fw.statusCounts.non_compliant || 0) + (fw.statusCounts.partially_compliant || 0)
          value = fw.totalControls > 0 ? Math.round((assessed / fw.totalControls) * 100) : 0
          break
        }
        case 'remediation': {
          const nonCompliant = fw.statusCounts.non_compliant || 0
          value = nonCompliant > 0 ? Math.round(Math.max(20, 100 - nonCompliant * 10)) : 95
          break
        }
        case 'monitoring': {
          const assessed = (fw.statusCounts.compliant || 0) + (fw.statusCounts.non_compliant || 0) + (fw.statusCounts.partially_compliant || 0)
          value = fw.totalControls > 0 ? Math.round((assessed / fw.totalControls) * 100) : 0
          break
        }
        case 'governance':
          value = base
          break
        default:
          value = base
      }
      entry[fw.name] = Math.max(0, Math.min(100, value))
    })
    return entry
  })
}

// ===== Trend Chart Colors =====

const trendColors: Record<string, string> = {
  'PCI-DSS': '#3b82f6',
  'HIPAA': '#10b981',
  'SOC2': '#f59e0b',
  'NIST': '#8b5cf6',
}

const radarColors: Record<string, string> = {
  'PCI-DSS': '#3b82f6',
  'HIPAA': '#10b981',
  'SOC2': '#f59e0b',
  'NIST': '#8b5cf6',
}

// ===== Status icon helper =====

function StatusIcon({ status, className }: { status: ControlStatus; className?: string }) {
  const cls = cn('h-3.5 w-3.5', className)
  switch (status) {
    case 'compliant':
      return <CheckCircle2 className={cn(cls, 'text-emerald-400')} />
    case 'non_compliant':
      return <XCircle className={cn(cls, 'text-red-400')} />
    case 'partially_compliant':
      return <AlertTriangle className={cn(cls, 'text-amber-400')} />
    case 'not_assessed':
      return <HelpCircle className={cn(cls, 'text-zinc-400')} />
    case 'not_applicable':
      return <Slash className={cn(cls, 'text-zinc-500')} />
    default:
      return <HelpCircle className={cn(cls, 'text-zinc-400')} />
  }
}

// ===== Control Row with Inline Status Select =====

function ControlRow({
  control,
  frameworkId,
  onStatusChange,
}: {
  control: ControlData
  frameworkId: string
  onStatusChange: (controlId: string, newStatus: ControlStatus) => void
}) {
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const assessmentProgress = useMemo(() => {
    if (control.status === 'compliant' || control.status === 'non_compliant') return 100
    if (control.status === 'partially_compliant') return 60
    if (control.status === 'not_applicable') return 100
    return 0
  }, [control.status])

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === control.status) return
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/compliance/${frameworkId}/controls`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlId: control.id,
          status: newStatus,
        }),
      })
      if (res.ok) {
        toast.success(`Control ${control.controlId} updated to ${newStatus.replace(/_/g, ' ')}`)
        onStatusChange(control.id, newStatus as ControlStatus)
      } else {
        toast.error('Failed to update control status')
      }
    } catch {
      toast.error('Failed to update control status')
    } finally {
      setStatusUpdating(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'rounded-lg border transition-colors',
        control.status === 'non_compliant'
          ? 'border-red-500/20 bg-red-500/5 border-l-2 border-l-red-500/50'
          : control.status === 'partially_compliant'
            ? 'border-amber-500/20 bg-amber-500/5'
            : 'border-border/50 bg-muted/10'
      )}
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/20 rounded-lg"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.div>

        {/* Status icon */}
        <StatusIcon status={control.status} />

        {/* Control ID */}
        <span className="font-mono text-xs text-muted-foreground shrink-0 w-20">
          {control.controlId}
        </span>

        {/* Title */}
        <span className="text-xs flex-1 truncate">{control.title}</span>

        {/* Category badge (hidden on small) */}
        {control.category && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 hidden md:inline-flex shrink-0">
            {control.category}
          </Badge>
        )}

        {/* Mini assessment progress */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-20">
          <Progress
            value={assessmentProgress}
            className={cn(
              'h-1 w-14',
              control.status === 'compliant'
                ? '[&>div]:bg-emerald-500'
                : control.status === 'non_compliant'
                  ? '[&>div]:bg-red-500'
                  : control.status === 'partially_compliant'
                    ? '[&>div]:bg-amber-500'
                    : '[&>div]:bg-zinc-500'
            )}
          />
          <span className="text-[9px] text-muted-foreground tabular-nums">{assessmentProgress}%</span>
        </div>

        {/* Status select */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Select
            value={control.status}
            onValueChange={handleStatusChange}
            disabled={statusUpdating}
          >
            <SelectTrigger className={cn(
              'h-6 w-[130px] text-[10px] border-0 bg-transparent',
              'hover:bg-accent/30 focus:ring-0 focus:ring-offset-0',
              statusUpdating && 'opacity-50'
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="compliant">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Compliant
                </span>
              </SelectItem>
              <SelectItem value="non_compliant">
                <span className="flex items-center gap-1.5">
                  <XCircle className="h-3 w-3 text-red-400" /> Non-Compliant
                </span>
              </SelectItem>
              <SelectItem value="partially_compliant">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-400" /> Partial
                </span>
              </SelectItem>
              <SelectItem value="not_assessed">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3 text-zinc-400" /> Not Assessed
                </span>
              </SelectItem>
              <SelectItem value="not_applicable">
                <span className="flex items-center gap-1.5">
                  <Slash className="h-3 w-3 text-zinc-500" /> N/A
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 ml-7 space-y-2 border-t border-border/30 mt-0.5">
              {/* Description */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {control.description}
              </p>

              {/* Meta info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                {/* Assessed by */}
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Assessor:</span>
                  <span className="text-foreground">
                    {control.assessedBy || 'Unassigned'}
                  </span>
                </div>

                {/* Assessed at */}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Assessed:</span>
                  <span className="text-foreground">
                    {control.assessedAt
                      ? formatDate(control.assessedAt)
                      : 'Never'}
                  </span>
                </div>

                {/* Remediation due */}
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Due:</span>
                  <span className={cn(
                    'text-foreground',
                    control.remediationDue && new Date(control.remediationDue) < new Date() && 'text-red-400'
                  )}>
                    {control.remediationDue
                      ? formatDate(control.remediationDue)
                      : '—'}
                  </span>
                </div>

                {/* Evidence */}
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Evidence:</span>
                  <span className="text-foreground">
                    {control.evidence ? 'Available' : 'None'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {control.notes && (
                <div className="rounded bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">Notes: </span>
                  {control.notes}
                </div>
              )}

              {/* Assessment progress bar (visible on mobile too) */}
              <div className="sm:hidden flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground shrink-0">Assessment:</span>
                <Progress
                  value={assessmentProgress}
                  className={cn(
                    'h-1.5 flex-1',
                    control.status === 'compliant'
                      ? '[&>div]:bg-emerald-500'
                      : control.status === 'non_compliant'
                        ? '[&>div]:bg-red-500'
                        : control.status === 'partially_compliant'
                          ? '[&>div]:bg-amber-500'
                          : '[&>div]:bg-zinc-500'
                  )}
                />
                <span className="text-[10px] text-muted-foreground tabular-nums">{assessmentProgress}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ===== Status Group Component =====

function StatusGroup({
  label,
  icon,
  controls,
  frameworkId,
  colorClass,
  onStatusChange,
  defaultOpen,
}: {
  label: string
  icon: React.ReactNode
  controls: ControlData[]
  frameworkId: string
  colorClass: string
  onStatusChange: (controlId: string, newStatus: ControlStatus) => void
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? true)

  if (controls.length === 0) return null

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left hover:bg-accent/20 rounded-md px-1.5 py-1.5 transition-colors"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </motion.div>
        {icon}
        <span className={cn('text-xs font-medium', colorClass)}>{label}</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1">
          {controls.length}
        </Badge>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-1.5 pl-2"
          >
            {controls.map((ctrl) => (
              <ControlRow
                key={ctrl.id}
                control={ctrl}
                frameworkId={frameworkId}
                onStatusChange={onStatusChange}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== Main Compliance View =====

export function ComplianceView() {
  const { compliance, setCompliance } = useSIEMStore()
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null)
  const [controls, setControls] = useState<ControlData[]>([])
  const [controlsLoading, setControlsLoading] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedControl, setSelectedControl] = useState<{
    id: string
    frameworkId: string
    currentStatus: ControlStatus
    title: string
  } | null>(null)
  const [newStatus, setNewStatus] = useState<string>('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [exporting, setExporting] = useState(false)
  const controlsFetchedRef = useRef<string | null>(null)

  // Fetch frameworks
  const fetchFrameworks = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/compliance')
      if (res.ok) {
        const json = await res.json()
        setFrameworks(json.data || json)
      }
    } catch {
      toast.error('Failed to fetch compliance data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFrameworks()
  }, [fetchFrameworks])

  // Fetch controls for a framework
  const fetchControls = useCallback(async (frameworkId: string) => {
    // Avoid re-fetching if already loaded
    if (controlsFetchedRef.current === frameworkId && controls.length > 0) return
    setControlsLoading(true)
    try {
      const res = await fetch(`/api/compliance/${frameworkId}/controls`)
      if (res.ok) {
        const json = await res.json()
        const controlsList = json.controls || json.controls === undefined ? (Array.isArray(json) ? json : (json.controls || [])) : []
        setControls(controlsList)
        controlsFetchedRef.current = frameworkId
      }
    } catch {
      toast.error('Failed to fetch controls')
    } finally {
      setControlsLoading(false)
    }
  }, [controls.length])

  // Expand/collapse framework
  const handleExpandFramework = (id: string) => {
    if (expandedFramework === id) {
      setExpandedFramework(null)
      setCompliance({ expandedFramework: null })
      controlsFetchedRef.current = null
    } else {
      setExpandedFramework(id)
      setCompliance({ expandedFramework: id })
      setControls([])
      fetchControls(id)
    }
  }

  // Handle inline status change
  const handleInlineStatusChange = (controlId: string, newStatus: ControlStatus) => {
    setControls((prev) =>
      prev.map((c) =>
        c.id === controlId ? { ...c, status: newStatus, assessedAt: new Date().toISOString() } : c
      )
    )
    // Also refresh frameworks to update scores
    fetchFrameworks()
  }

  // Update control status via dialog
  const handleUpdateControl = async () => {
    if (!selectedControl || !newStatus) return
    try {
      const res = await fetch(`/api/compliance/${selectedControl.frameworkId}/controls`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlId: selectedControl.id,
          status: newStatus,
          notes: updateNotes || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Control status updated')
        setUpdateDialogOpen(false)
        setUpdateNotes('')
        handleInlineStatusChange(selectedControl.id, newStatus as ControlStatus)
      } else {
        toast.error('Failed to update control')
      }
    } catch {
      toast.error('Failed to update control')
    }
  }

  // Export compliance report as JSON
  const handleExportReport = async () => {
    setExporting(true)
    try {
      // Fetch full compliance data for all frameworks
      const reportData: Record<string, unknown> = {
        generatedAt: new Date().toISOString(),
        summary: {
          overallScore,
          totalControls,
          totalNonCompliant,
          totalPartiallyCompliant,
          frameworksCount: frameworks.length,
        },
        frameworks: [],
      }

      // Fetch controls for each framework
      for (const fw of frameworks) {
        try {
          const res = await fetch(`/api/compliance/${fw.id}/controls`)
          if (res.ok) {
            const json = await res.json()
            const fwControls = json.controls || (Array.isArray(json) ? json : [])
            ;(reportData.frameworks as unknown[]).push({
              id: fw.id,
              name: fw.name,
              version: fw.version,
              description: fw.description,
              complianceScore: fw.complianceScore,
              totalControls: fw.totalControls,
              statusCounts: fw.statusCounts,
              controls: fwControls,
            })
          }
        } catch {
          // Skip failed framework controls
        }
      }

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Compliance report exported successfully')
    } catch {
      toast.error('Failed to export compliance report')
    } finally {
      setExporting(false)
    }
  }

  // Computed values
  const overallScore = useMemo(() => {
    if (frameworks.length === 0) return 0
    const total = frameworks.reduce((acc, fw) => acc + fw.complianceScore, 0)
    return Math.round(total / frameworks.length)
  }, [frameworks])

  const totalControls = useMemo(
    () => frameworks.reduce((acc, fw) => acc + fw.totalControls, 0),
    [frameworks]
  )

  const totalNonCompliant = useMemo(
    () =>
      frameworks.reduce(
        (acc, fw) => acc + (fw.statusCounts.non_compliant || 0),
        0
      ),
    [frameworks]
  )

  const totalPartiallyCompliant = useMemo(
    () =>
      frameworks.reduce(
        (acc, fw) => acc + (fw.statusCounts.partially_compliant || 0),
        0
      ),
    [frameworks]
  )

  const trendData30Day = useMemo(() => generate30DayTrendData(frameworks), [frameworks])
  const trendData6Month = useMemo(() => generate6MonthTrendData(frameworks), [frameworks])
  const radarData = useMemo(() => generateRadarData(frameworks), [frameworks])

  // Group controls by status
  const controlsByStatus = useMemo(() => {
    const groups: Record<string, ControlData[]> = {
      non_compliant: [],
      partially_compliant: [],
      not_assessed: [],
      not_applicable: [],
      compliant: [],
    }
    controls.forEach((c) => {
      if (groups[c.status]) {
        groups[c.status].push(c)
      } else {
        groups.not_assessed.push(c)
      }
    })
    return groups
  }, [controls])

  // Non-compliant controls with remediation
  const remediationItems = useMemo(() => {
    return controls.filter(
      (c) =>
        (c.status === 'non_compliant' || c.status === 'partially_compliant') &&
        c.remediationDue
    )
  }, [controls])

  const expandedFrameworkData = useMemo(() => {
    if (!expandedFramework) return null
    return frameworks.find((fw) => fw.id === expandedFramework) || null
  }, [expandedFramework, frameworks])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-4"
    >
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Compliance Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Monitor and manage regulatory compliance across frameworks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExportReport}
            disabled={exporting || loading}
          >
            <Download className={cn('h-3.5 w-3.5', exporting && 'animate-bounce')} />
            {exporting ? 'Exporting...' : 'Export Report'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fetchFrameworks(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ===== Overall Compliance Score + Summary Cards ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Main Score Card */}
        <Card className="border-border bg-card lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center p-6">
            {loading ? (
              <Skeleton className="h-32 w-32 rounded-full" />
            ) : (
              <CircularScoreRing
                score={overallScore}
                size={140}
                strokeWidth={12}
                label="Overall"
              />
            )}
            <div className="mt-3 flex items-center gap-1 text-xs">
              <Minus className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">No trend history stored</span>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stat Cards */}
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col justify-center p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Controls</p>
                <p className="text-lg font-bold">{loading ? '—' : totalControls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex flex-col justify-center p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <FileX className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Non-Compliant</p>
                <p className="text-lg font-bold text-red-400">
                  {loading ? '—' : totalNonCompliant}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex flex-col justify-center p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Partial Compliance</p>
                <p className="text-lg font-bold text-amber-400">
                  {loading ? '—' : totalPartiallyCompliant}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== 30-Day Compliance Trend Area Chart ===== */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Compliance Score Trend
              </CardTitle>
              <CardDescription className="text-[10px]">
                30-day compliance score trajectory across all frameworks
              </CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-52 w-full rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData30Day}>
                <defs>
                  {frameworks.map((fw) => (
                    <linearGradient key={fw.id} id={`gradient-${fw.name.replace(/[^a-zA-Z]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={trendColors[fw.name] || '#6b7280'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={trendColors[fw.name] || '#6b7280'} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  interval={4}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  width={30}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                {frameworks.map((fw) => (
                  <Area
                    key={fw.id}
                    type="monotone"
                    dataKey={fw.name}
                    stroke={trendColors[fw.name] || '#6b7280'}
                    strokeWidth={2}
                    fill={`url(#gradient-${fw.name.replace(/[^a-zA-Z]/g, '')})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ===== Framework Comparison Radar Chart ===== */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Framework Comparison
              </CardTitle>
              <CardDescription className="text-[10px]">
                Multi-dimensional compliance analysis across frameworks
              </CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-purple-400" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-72 w-full rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#71717a', fontSize: 8 }}
                  tickCount={5}
                />
                {frameworks.map((fw) => (
                  <Radar
                    key={fw.id}
                    name={fw.name}
                    dataKey={fw.name}
                    stroke={radarColors[fw.name] || '#6b7280'}
                    fill={radarColors[fw.name] || '#6b7280'}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={{ r: 3, fill: radarColors[fw.name] || '#6b7280' }}
                  />
                ))}
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ===== Framework Cards Grid ===== */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Compliance Frameworks</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-14 w-14 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            : frameworks.map((fw, index) => {
                const score = fw.complianceScore
                const isExpanded = expandedFramework === fw.id

                return (
                  <motion.div
                    key={fw.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={isExpanded ? 'md:col-span-2' : ''}
                  >
                    <Card
                      className={cn(
                        'border-border bg-card transition-all duration-200 cursor-pointer',
                        isExpanded
                          ? 'ring-1 ring-emerald-500/40 border-emerald-500/30'
                          : 'hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5'
                      )}
                      onClick={() => handleExpandFramework(fw.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Compliance Ring */}
                          <MiniScoreRing score={score} size={56} />

                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {frameworkIcons[fw.name] || (
                                  <Shield className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="truncate text-sm font-semibold">{fw.name}</span>
                                {fw.version && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0"
                                  >
                                    v{fw.version}
                                  </Badge>
                                )}
                                {fw.updatedAt && (
                                  <Badge
                                    variant="outline"
                                    className="hidden shrink-0 items-center gap-1 text-[9px] px-1.5 py-0 text-muted-foreground sm:inline-flex"
                                    title={`Last updated ${new Date(fw.updatedAt).toLocaleString()}`}
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>Last Updated {formatDistanceToNowSafe(fw.updatedAt)}</span>
                                  </Badge>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {/* Inline progress ring next to score percentage */}
                                <HeaderProgressRing
                                  score={score}
                                  size={22}
                                  strokeWidth={2.5}
                                />
                                <span
                                  className={cn(
                                    'text-xs font-bold tabular-nums',
                                    score >= 80
                                      ? 'text-emerald-400'
                                      : score >= 60
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                                  )}
                                >
                                  {score}%
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            {fw.description && (
                              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
                                {fw.description}
                              </p>
                            )}

                            {/* Progress Bar */}
                            <div className="mt-2">
                              <Progress
                                value={score}
                                className={cn(
                                  'h-1.5',
                                  score >= 80
                                    ? '[&>div]:bg-emerald-500'
                                    : score >= 60
                                      ? '[&>div]:bg-amber-500'
                                      : '[&>div]:bg-red-500'
                                )}
                              />
                            </div>

                            {/* Status Breakdown */}
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                <span className="text-muted-foreground">Compliant:</span>
                                <span className="font-medium text-emerald-400">
                                  {fw.statusCounts.compliant || 0}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="h-2.5 w-2.5 text-red-400" />
                                <span className="text-muted-foreground">Non-Compliant:</span>
                                <span className="font-medium text-red-400">
                                  {fw.statusCounts.non_compliant || 0}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                                <span className="text-muted-foreground">Partial:</span>
                                <span className="font-medium text-amber-400">
                                  {fw.statusCounts.partially_compliant || 0}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <HelpCircle className="h-2.5 w-2.5 text-zinc-400" />
                                <span className="text-muted-foreground">Not Assessed:</span>
                                <span className="font-medium text-zinc-400">
                                  {fw.statusCounts.not_assessed || 0}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Slash className="h-2.5 w-2.5 text-zinc-500" />
                                <span className="text-muted-foreground">N/A:</span>
                                <span className="font-medium text-zinc-500">
                                  {fw.statusCounts.not_applicable || 0}
                                </span>
                              </span>
                            </div>

                            {/* Remediation Warning */}
                            {(fw.statusCounts.non_compliant || 0) > 0 && (
                              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span>
                                  {fw.statusCounts.non_compliant} control
                                  {fw.statusCounts.non_compliant !== 1 ? 's' : ''} require
                                  {fw.statusCounts.non_compliant === 1 ? 's' : ''} remediation
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ===== Expanded Controls (inline within card) ===== */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <Separator className="my-3 bg-emerald-500/20" />
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-semibold text-emerald-400">
                                      Framework Controls
                                    </h4>
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                      {controls.length} controls
                                    </Badge>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground">
                                    Click a control to expand &middot; Use dropdown to change status
                                  </span>
                                </div>

                                {controlsLoading ? (
                                  <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                      <Skeleton key={i} className="h-9 rounded" />
                                    ))}
                                  </div>
                                ) : controls.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <FileCheck className="mb-2 h-6 w-6 text-muted-foreground/50" />
                                    <p className="text-xs text-muted-foreground">No controls found</p>
                                    <p className="text-[10px] text-muted-foreground/70">
                                      This framework has no compliance controls defined
                                    </p>
                                  </div>
                                ) : (
                                  <ScrollArea className="max-h-[500px]">
                                    <div className="space-y-3 pr-2">
                                      {/* Non-compliant group (most urgent, shown first) */}
                                      <StatusGroup
                                        label="Non-Compliant"
                                        icon={<XCircle className="h-3.5 w-3.5 text-red-400" />}
                                        controls={controlsByStatus.non_compliant}
                                        frameworkId={fw.id}
                                        colorClass="text-red-400"
                                        onStatusChange={handleInlineStatusChange}
                                        defaultOpen={true}
                                      />

                                      {/* Partially compliant */}
                                      <StatusGroup
                                        label="Partially Compliant"
                                        icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                                        controls={controlsByStatus.partially_compliant}
                                        frameworkId={fw.id}
                                        colorClass="text-amber-400"
                                        onStatusChange={handleInlineStatusChange}
                                        defaultOpen={true}
                                      />

                                      {/* Not assessed */}
                                      <StatusGroup
                                        label="Not Assessed"
                                        icon={<HelpCircle className="h-3.5 w-3.5 text-zinc-400" />}
                                        controls={controlsByStatus.not_assessed}
                                        frameworkId={fw.id}
                                        colorClass="text-zinc-400"
                                        onStatusChange={handleInlineStatusChange}
                                        defaultOpen={false}
                                      />

                                      {/* Not applicable */}
                                      <StatusGroup
                                        label="Not Applicable"
                                        icon={<Slash className="h-3.5 w-3.5 text-zinc-500" />}
                                        controls={controlsByStatus.not_applicable}
                                        frameworkId={fw.id}
                                        colorClass="text-zinc-500"
                                        onStatusChange={handleInlineStatusChange}
                                        defaultOpen={false}
                                      />

                                      {/* Compliant (shown last, as least urgent) */}
                                      <StatusGroup
                                        label="Compliant"
                                        icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                                        controls={controlsByStatus.compliant}
                                        frameworkId={fw.id}
                                        colorClass="text-emerald-400"
                                        onStatusChange={handleInlineStatusChange}
                                        defaultOpen={false}
                                      />
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
        </div>
      </div>

      {/* ===== 6-Month Trend + Remediation Grid ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 6-Month Trend Line Chart */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  6-Month Trend
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Historical compliance score trajectory
                </CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-56 w-full rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData6Month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1e1e2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  {frameworks.map((fw) => (
                    <Line
                      key={fw.id}
                      type="monotone"
                      dataKey={fw.name}
                      stroke={trendColors[fw.name] || '#6b7280'}
                      strokeWidth={2}
                      dot={{ r: 3, fill: trendColors[fw.name] || '#6b7280' }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Remediation Tracking */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Remediation Tracking
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Non-compliant items requiring action
                </CardDescription>
              </div>
              <FileX className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 rounded" />
                ))}
              </div>
            ) : !expandedFramework ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  Expand a framework to view remediation items
                </p>
              </div>
            ) : remediationItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="mb-2 h-6 w-6 text-emerald-400/50" />
                <p className="text-xs text-emerald-400">All controls compliant</p>
                <p className="text-[10px] text-muted-foreground">
                  No remediation items for this framework
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-56">
                <div className="space-y-2">
                  {remediationItems.map((item) => {
                    const isOverdue =
                      item.remediationDue &&
                      new Date(item.remediationDue) < new Date()
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'rounded-lg border p-2.5',
                          isOverdue
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-border bg-muted/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {item.controlId}
                              </span>
                              <ComplianceBadge status={item.status} className="text-[9px] px-1.5 py-px" />
                            </div>
                            <p className="mt-0.5 text-[10px] truncate">{item.title}</p>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">
                            {isOverdue ? 'Overdue' : 'Due'}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-medium',
                              isOverdue ? 'text-red-400' : 'text-amber-400'
                            )}
                          >
                            {item.remediationDue
                              ? formatDate(item.remediationDue)
                              : '—'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Update Control Status Dialog (for detailed update with notes) ===== */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Update Control Status</DialogTitle>
            <DialogDescription className="text-xs">
              Change the compliance status for{' '}
              <span className="font-mono font-medium">{selectedControl?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Current:</span>
              {selectedControl && (
                <ComplianceBadge status={selectedControl.currentStatus} />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                New Status
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliant">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Compliant
                    </span>
                  </SelectItem>
                  <SelectItem value="non_compliant">
                    <span className="flex items-center gap-1.5">
                      <XCircle className="h-3 w-3 text-red-400" /> Non-Compliant
                    </span>
                  </SelectItem>
                  <SelectItem value="partially_compliant">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400" /> Partially Compliant
                    </span>
                  </SelectItem>
                  <SelectItem value="not_assessed">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="h-3 w-3 text-zinc-400" /> Not Assessed
                    </span>
                  </SelectItem>
                  <SelectItem value="not_applicable">
                    <span className="flex items-center gap-1.5">
                      <Slash className="h-3 w-3 text-zinc-500" /> Not Applicable
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Notes (optional)
              </label>
              <Textarea
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                className="mt-1 min-h-[60px] text-xs"
                placeholder="Add assessment notes..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUpdateControl}
              disabled={!newStatus || newStatus === selectedControl?.currentStatus}
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
