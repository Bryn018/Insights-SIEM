'use client'

import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowUp,
  Check,
  Plus,
  MoreHorizontal,
  RefreshCw,
  Filter,
  Clock,
  MessageSquare,
  Send,
  Code,
  Tag,
  AlertTriangle,
  Shield,
  FileText,
  Layers,
  Bell,
  Pause,
  Play,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useSIEMStore,
  type Severity,
  type AlertStatus,
  type AlertFilters,
} from '@/lib/store'
import type { Alert, PaginatedResponse, Comment } from '@/lib/types'
import { SeverityBadge, StatusBadge } from '@/components/siem/status-badge'
import { ExportButton } from '@/components/siem/export-button'
import { AlertDetailDrawer } from '@/components/siem/alert-detail-drawer'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ===== Constants =====

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-amber-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-emerald-500' },
  { value: 'informational', label: 'Info', color: 'bg-zinc-400' },
]

const STATUS_OPTIONS: { value: AlertStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'suppressed', label: 'Suppressed' },
  { value: 'escalated', label: 'Escalated' },
]

const CATEGORY_OPTIONS = [
  { value: 'Brute Force', label: 'Brute Force' },
  { value: 'Malware', label: 'Malware' },
  { value: 'Policy Violation', label: 'Policy Violation' },
  { value: 'Anomaly', label: 'Anomaly' },
  { value: 'Compliance', label: 'Compliance' },
  { value: 'Other', label: 'Other' },
]

const SOURCE_OPTIONS = [
  { value: 'Suricata', label: 'Suricata' },
  { value: 'Prometheus', label: 'Prometheus' },
  { value: 'OpenSearch', label: 'OpenSearch' },
  { value: 'Custom', label: 'Custom' },
]

const DATE_RANGE_OPTIONS = [
  { value: '1h', label: '1h', hours: 1 },
  { value: '6h', label: '6h', hours: 6 },
  { value: '24h', label: '24h', hours: 24 },
  { value: '7d', label: '7d', hours: 168 },
  { value: '30d', label: '30d', hours: 720 },
]

// ===== Create Alert Form =====

interface CreateAlertForm {
  title: string
  description: string
  severity: Severity
  category: string
  source: string
  sourceIp: string
  destIp: string
  protocol: string
}

const emptyForm: CreateAlertForm = {
  title: '',
  description: '',
  severity: 'medium',
  category: 'Other',
  source: 'Custom',
  sourceIp: '',
  destIp: '',
  protocol: '',
}

// ===== Severity Color Map for Filter Buttons =====

const severityButtonColors: Record<Severity, { active: string; dot: string }> = {
  critical: { active: 'bg-red-500/20 text-red-400 border-red-500/50', dot: 'bg-red-500' },
  high: { active: 'bg-amber-500/20 text-amber-400 border-amber-500/50', dot: 'bg-amber-500' },
  medium: { active: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', dot: 'bg-yellow-500' },
  low: { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', dot: 'bg-emerald-500' },
  informational: { active: 'bg-zinc-400/20 text-zinc-400 border-zinc-400/50', dot: 'bg-zinc-400' },
}

// ===== 10-3: Severity tint class lookup =====
const severityTintClass: Record<Severity, string> = {
  critical: 'siem-severity-tint-critical',
  high: 'siem-severity-tint-high',
  medium: 'siem-severity-tint-medium',
  low: 'siem-severity-tint-low',
  informational: '',
}

// ===== 10-3: Group-by options for the header dropdown =====
const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'severity', label: 'Severity' },
  { value: 'source', label: 'Source' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
] as const

// ===== 10-3: Snooze durations (ms + human label) =====
const SNOOZE_DURATIONS = [
  { value: 15 * 60 * 1000, label: '15 minutes' },
  { value: 60 * 60 * 1000, label: '1 hour' },
  { value: 4 * 60 * 60 * 1000, label: '4 hours' },
  { value: 24 * 60 * 60 * 1000, label: '24 hours' },
]

// ===== 10-3: CountUp helper — animates from previous value to new value =====
function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return
    const duration = 600
    const startTs = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTs) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      fromRef.current = value
    }
  }, [value])

  return <span className={className}>{display.toLocaleString()}</span>
}

// ===== Main Component =====

export function AlertsView() {
  const {
    alertFilters,
    setAlertFilters,
    setAlertFilter,
    resetAlertFilters,
    toggleAlertSelection,
    selectAllAlerts,
    clearAlertSelection,
    expandedAlert,
    setExpandedAlert,
    liveMode,
    toggleLiveMode,
  } = useSIEMStore()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detailData, setDetailData] = useState<Alert | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateAlertForm>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [dateRange, setDateRange] = useState<string>('24h')
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [rawLogExpanded, setRawLogExpanded] = useState<Record<string, boolean>>({})
  const [drawerAlertId, setDrawerAlertId] = useState<string | null>(null)
  // 10-3 polish: group-by selector, snoozed alert tracking, prev-total for count-up flash
  const [groupBy, setGroupBy] = useState<'none' | 'severity' | 'source' | 'category' | 'status'>('none')
  const [snoozedAlerts, setSnoozedAlerts] = useState<Record<string, number>>({})
  const [prevTotal, setPrevTotal] = useState(0)
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set())
  // Refs that don't drive render directly — keep fetchAlerts deps minimal
  const totalRef = useRef(0)
  const alertsRef = useRef<Alert[]>([])

  const totalPages = Math.ceil(total / alertFilters.pageSize)

  // ===== Compute active filter count =====
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (alertFilters.severity.length > 0) count++
    if (alertFilters.status.length > 0) count++
    if (alertFilters.category.length > 0) count++
    if (alertFilters.source.length > 0) count++
    if (alertFilters.search) count++
    if (dateRange !== '24h') count++
    return count
  }, [alertFilters, dateRange])

  // ===== Data Fetching =====
  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(alertFilters.page))
      params.set('pageSize', String(alertFilters.pageSize))
      params.set('sortBy', alertFilters.sortBy)
      params.set('sortOrder', alertFilters.sortOrder)
      if (alertFilters.severity.length)
        params.set('severity', alertFilters.severity.join(','))
      if (alertFilters.status.length)
        params.set('status', alertFilters.status.join(','))
      if (alertFilters.category.length)
        params.set('category', alertFilters.category.join(','))
      if (alertFilters.source.length)
        params.set('source', alertFilters.source.join(','))
      if (alertFilters.search) params.set('search', alertFilters.search)
      if (alertFilters.dateFrom)
        params.set('dateFrom', alertFilters.dateFrom)
      if (alertFilters.dateTo) params.set('dateTo', alertFilters.dateTo)

      const res = await fetch(`/api/alerts?${params}`)
      if (res.ok) {
        const json: PaginatedResponse<Alert> = await res.json()
        const newAlertsList: Alert[] = json.data || []
        // 10-3: detect newly-inserted alerts vs the previous render so we can
        // apply siem-new-pulse only to genuinely new rows.
        const prevAlerts = alertsRef.current
        if (prevAlerts.length > 0 && newAlertsList.length > 0) {
          const prevIds = new Set(prevAlerts.map((a) => a.id))
          const fresh = newAlertsList.filter((a) => !prevIds.has(a.id)).map((a) => a.id)
          if (fresh.length > 0) {
            setNewAlertIds(new Set(fresh))
            // Clear the pulse markers after the animation finishes (~1.8s)
            window.setTimeout(() => setNewAlertIds(new Set()), 2000)
          }
        }
        alertsRef.current = newAlertsList
        setAlerts(newAlertsList)
        // 10-3: trigger count-up flash when total grows
        const fetchedTotal = json.pagination?.total || 0
        if (fetchedTotal !== totalRef.current) {
          setPrevTotal(totalRef.current)
          totalRef.current = fetchedTotal
        }
        setTotal(fetchedTotal)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [
    alertFilters.page,
    alertFilters.pageSize,
    alertFilters.sortBy,
    alertFilters.sortOrder,
    alertFilters.severity,
    alertFilters.status,
    alertFilters.category,
    alertFilters.source,
    alertFilters.search,
    alertFilters.dateFrom,
    alertFilters.dateTo,
  ])

  useEffect(() => {
    fetchAlerts()
    // Real-time: poll for new captures every 1s when viewing the first page
    // with no active search/filter, so live traffic appears within ~1s.
    if (
      alertFilters.page === 1 &&
      !alertFilters.search &&
      alertFilters.severity.length === 0 &&
      alertFilters.status.length === 0
    ) {
      const id = window.setInterval(() => fetchAlerts(), 1000)
      return () => window.clearInterval(id)
    }
  }, [fetchAlerts, alertFilters.page, alertFilters.search, alertFilters.severity, alertFilters.status])

  // ===== Fetch Alert Detail =====
  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/alerts/${id}`)
      if (res.ok) {
        const json = await res.json()
        setDetailData(json)
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // ===== Handlers =====
  const handleExpand = useCallback(
    (id: string) => {
      if (expandedAlert === id) {
        setExpandedAlert(null)
      } else {
        setExpandedAlert(id)
        fetchDetail(id)
      }
    },
    [expandedAlert, setExpandedAlert, fetchDetail]
  )

  const handleStatusChange = useCallback(
    async (alertId: string, status: string) => {
      try {
        const res = await fetch(`/api/alerts/${alertId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (res.ok) {
          toast.success(`Alert status updated to ${status}`)
          fetchAlerts()
          if (expandedAlert === alertId) fetchDetail(alertId)
        }
      } catch {
        toast.error('Failed to update alert status')
      }
    },
    [fetchAlerts, fetchDetail, expandedAlert]
  )

  const handleBulkAction = useCallback(
    async (action: 'acknowledge' | 'escalate' | 'suppress' | 'create_incident') => {
      const ids = alertFilters.selectedIds
      if (ids.length === 0) return

      let successCount = 0
      for (const id of ids) {
        try {
          if (action === 'acknowledge') {
            const res = await fetch(`/api/alerts/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'acknowledged' }),
            })
            if (res.ok) successCount++
          } else if (action === 'escalate') {
            const res = await fetch(`/api/alerts/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'escalated' }),
            })
            if (res.ok) successCount++
          } else if (action === 'suppress') {
            const res = await fetch(`/api/alerts/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'suppressed' }),
            })
            if (res.ok) successCount++
          } else if (action === 'create_incident') {
            // Open create incident dialog from store
            useSIEMStore.getState().setCreateIncidentOpen(true)
            return
          }
        } catch {
          // ignore individual failures
        }
      }
      if (action !== 'create_incident') {
        toast.success(`${successCount} alerts ${action}d`)
        clearAlertSelection()
        fetchAlerts()
      }
    },
    [alertFilters.selectedIds, clearAlertSelection, fetchAlerts]
  )

  const toggleSeverityFilter = useCallback(
    (sev: Severity) => {
      const current = alertFilters.severity
      setAlertFilters({
        severity: current.includes(sev)
          ? current.filter((s) => s !== sev)
          : [...current, sev],
        page: 1,
      })
    },
    [alertFilters.severity, setAlertFilters]
  )

  const toggleStatusFilter = useCallback(
    (status: AlertStatus) => {
      const current = alertFilters.status
      setAlertFilters({
        status: current.includes(status)
          ? current.filter((s) => s !== status)
          : [...current, status],
        page: 1,
      })
    },
    [alertFilters.status, setAlertFilters]
  )

  const toggleCategoryFilter = useCallback(
    (category: string) => {
      const current = alertFilters.category
      setAlertFilters({
        category: current.includes(category)
          ? current.filter((c) => c !== category)
          : [...current, category],
        page: 1,
      })
    },
    [alertFilters.category, setAlertFilters]
  )

  const toggleSourceFilter = useCallback(
    (source: string) => {
      const current = alertFilters.source
      setAlertFilters({
        source: current.includes(source)
          ? current.filter((s) => s !== source)
          : [...current, source],
        page: 1,
      })
    },
    [alertFilters.source, setAlertFilters]
  )

  const handleDateRange = useCallback(
    (range: string) => {
      setDateRange(range)
      const option = DATE_RANGE_OPTIONS.find((o) => o.value === range)
      if (option) {
        const now = new Date()
        const from = new Date(now.getTime() - option.hours * 60 * 60 * 1000)
        setAlertFilters({
          dateFrom: from.toISOString(),
          dateTo: now.toISOString(),
          page: 1,
        })
      }
    },
    [setAlertFilters]
  )

  const handleCreateAlert = useCallback(async () => {
    if (!createForm.title || !createForm.description || !createForm.source) {
      toast.error('Please fill in all required fields')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          severity: createForm.severity,
          category: createForm.category,
          source: createForm.source,
          sourceIp: createForm.sourceIp || undefined,
          destIp: createForm.destIp || undefined,
          protocol: createForm.protocol || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Alert created successfully')
        setCreateDialogOpen(false)
        setCreateForm(emptyForm)
        fetchAlerts()
      } else {
        toast.error('Failed to create alert')
      }
    } catch {
      toast.error('Failed to create alert')
    } finally {
      setCreating(false)
    }
  }, [createForm, fetchAlerts])

  const handleAddComment = useCallback(
    async (alertId: string) => {
      const text = commentText[alertId]?.trim()
      if (!text) return

      try {
        const res = await fetch(`/api/alerts/${alertId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: text }),
        })
        if (res.ok) {
          toast.success('Comment added')
          setCommentText((prev) => ({ ...prev, [alertId]: '' }))
          fetchDetail(alertId)
        }
      } catch {
        toast.error('Failed to add comment')
      }
    },
    [commentText, fetchDetail]
  )

  // 10-3: Snooze handler — marks the alert as snoozed in local state with a
  // resume timestamp. The PATCH is best-effort (suppressed status); the
  // local timestamp drives the snooze badge countdown shown on the row.
  const handleSnooze = useCallback(
    async (alertId: string, durationMs: number) => {
      const resumeAt = Date.now() + durationMs
      setSnoozedAlerts((prev) => ({ ...prev, [alertId]: resumeAt }))
      const durationLabel =
        SNOOZE_DURATIONS.find((d) => d.value === durationMs)?.label || `${durationMs}ms`
      try {
        await fetch(`/api/alerts/${alertId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'suppressed' }),
        })
      } catch {
        // ignore — local snooze state still applies
      }
      toast.success(`Alert snoozed for ${durationLabel}`)
    },
    []
  )

  const handleUnsnooze = useCallback((alertId: string) => {
    setSnoozedAlerts((prev) => {
      const next = { ...prev }
      delete next[alertId]
      return next
    })
  }, [])

  // 10-3: Compute grouped alerts when groupBy !== 'none'.
  // Returns an array of { key, label, items } in stable display order.
  const groupedAlerts = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', items: alerts }]
    }
    const buckets = new Map<string, Alert[]>()
    for (const a of alerts) {
      const key = String(
        groupBy === 'severity'
          ? a.severity
          : groupBy === 'source'
            ? a.source
            : groupBy === 'category'
              ? a.category || 'Uncategorized'
              : a.status
      )
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(a)
    }
    // Stable ordering: severity (critical→low), else alphabetical
    const severityOrder = ['critical', 'high', 'medium', 'low', 'informational']
    const keys = Array.from(buckets.keys()).sort((x, y) => {
      if (groupBy === 'severity') {
        return severityOrder.indexOf(x) - severityOrder.indexOf(y)
      }
      return x.localeCompare(y)
    })
    return keys.map((k) => ({ key: k, label: k, items: buckets.get(k)! }))
  }, [alerts, groupBy])

  // Select all on current page
  const allSelected =
    alerts.length > 0 && alerts.every((a) => alertFilters.selectedIds.includes(a.id))
  const someSelected =
    alerts.some((a) => alertFilters.selectedIds.includes(a.id)) && !allSelected

  // ===== Render =====
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4 p-4 md:p-6"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Alerts</h2>
          {/* 10-3: Live indicator + total count-up */}
          <button
            onClick={toggleLiveMode}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
              liveMode
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:text-zinc-300'
            )}
            aria-pressed={liveMode}
            title={liveMode ? 'Live mode is on — click to pause' : 'Live mode is paused — click to resume'}
          >
            <span className={liveMode ? 'siem-live-dot' : 'siem-paused-dot'} aria-hidden />
            {liveMode ? (
              <span className="inline-flex items-center gap-1">
                <Play className="h-2.5 w-2.5" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Pause className="h-2.5 w-2.5" />
                Paused
              </span>
            )}
          </button>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md bg-zinc-800/60 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300 tabular-nums',
              total !== prevTotal && prevTotal !== 0 && 'siem-count-up-flash'
            )}
          >
            <CountUp value={total} />
            <span className="text-zinc-500">total</span>
          </span>
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] h-5 gap-1"
            >
              <Filter className="h-2.5 w-2.5" />
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="siem-alerts"
            fetchData={async () => {
              // Reuse the same query params as the current view, but request
              // a large page size to get all matching rows in one shot.
              const params = new URLSearchParams()
              params.set('page', '1')
              params.set('pageSize', '10000')
              params.set('sortBy', alertFilters.sortBy)
              params.set('sortOrder', alertFilters.sortOrder)
              if (alertFilters.severity.length)
                params.set('severity', alertFilters.severity.join(','))
              if (alertFilters.status.length)
                params.set('status', alertFilters.status.join(','))
              if (alertFilters.category.length)
                params.set('category', alertFilters.category.join(','))
              if (alertFilters.source.length)
                params.set('source', alertFilters.source.join(','))
              if (alertFilters.search) params.set('search', alertFilters.search)
              const res = await fetch(`/api/alerts?${params.toString()}`)
              if (!res.ok) throw new Error('Failed to fetch alerts for export')
              const json = await res.json()
              const rows = (json.data ?? json.alerts ?? []) as Record<string, unknown>[]
              return rows.map((r) => ({
                id: r.id,
                title: r.title,
                severity: r.severity,
                status: r.status,
                category: r.category,
                source: r.source,
                sourceIp: r.sourceIp,
                destIp: r.destIp,
                hostname: r.hostname,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
              }))
            }}
          />
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white siem-btn-glow"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Alert
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Multi-Select Buttons */}
            {SEVERITY_OPTIONS.map((opt) => {
              const isSelected = alertFilters.severity.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleSeverityFilter(opt.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all siem-filter-glow',
                    isSelected
                      ? severityButtonColors[opt.value].active
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  )}
                  style={isSelected ? { '--siem-filter-glow-color': opt.color === 'bg-red-500' ? 'rgba(239, 68, 68, 0.2)' : opt.color === 'bg-amber-500' ? 'rgba(249, 115, 22, 0.2)' : opt.color === 'bg-yellow-500' ? 'rgba(234, 179, 8, 0.2)' : opt.color === 'bg-emerald-500' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(113, 113, 122, 0.2)' } as React.CSSProperties : undefined}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      isSelected ? opt.color : 'bg-current opacity-30'
                    )}
                  />
                  {opt.label}
                </button>
              )
            })}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Status Dropdown with Checkboxes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Status
                  {alertFilters.status.length > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 rounded-full p-0 text-[9px] flex items-center justify-center">
                      {alertFilters.status.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 bg-popover border-border p-2">
                <div className="space-y-0.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                        alertFilters.status.includes(opt.value) && 'bg-accent/50'
                      )}
                    >
                      <Checkbox
                        checked={alertFilters.status.includes(opt.value)}
                        onCheckedChange={() => toggleStatusFilter(opt.value)}
                      />
                      <StatusBadge status={opt.value} type="alert" />
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Category Dropdown with Checkboxes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                >
                  <FileText className="h-3 w-3" />
                  Category
                  {alertFilters.category.length > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 rounded-full p-0 text-[9px] flex items-center justify-center">
                      {alertFilters.category.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 bg-popover border-border p-2">
                <div className="space-y-0.5">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                        alertFilters.category.includes(opt.value) && 'bg-accent/50'
                      )}
                    >
                      <Checkbox
                        checked={alertFilters.category.includes(opt.value)}
                        onCheckedChange={() => toggleCategoryFilter(opt.value)}
                      />
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Source Dropdown with Checkboxes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Source
                  {alertFilters.source.length > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 rounded-full p-0 text-[9px] flex items-center justify-center">
                      {alertFilters.source.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 bg-popover border-border p-2">
                <div className="space-y-0.5">
                  {SOURCE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                        alertFilters.source.includes(opt.value) && 'bg-accent/50'
                      )}
                    >
                      <Checkbox
                        checked={alertFilters.source.includes(opt.value)}
                        onCheckedChange={() => toggleSourceFilter(opt.value)}
                      />
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1 max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={alertFilters.search}
                onChange={(e) =>
                  setAlertFilters({ search: e.target.value, page: 1 })
                }
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Date Range Button Group */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              {DATE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleDateRange(opt.value)}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-medium transition-colors border-r border-border last:border-r-0',
                    dateRange === opt.value
                      ? 'bg-emerald-600 text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 10-3: Group By dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 text-xs',
                    groupBy !== 'none' && 'border-emerald-500/40 text-emerald-400'
                  )}
                >
                  <Layers className="h-3 w-3" />
                  Group
                  {groupBy !== 'none' && (
                    <Badge className="ml-0.5 h-4 min-w-4 rounded-full p-0 text-[9px] flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                      {GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {GROUP_BY_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setGroupBy(opt.value)}
                    className={cn(
                      'gap-2 text-xs',
                      groupBy === opt.value && 'bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    {groupBy === opt.value && <Check className="h-3 w-3" />}
                    {groupBy !== opt.value && <span className="w-3" />}
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchAlerts}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
              />
            </Button>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                onClick={() => {
                  resetAlertFilters()
                  setDateRange('24h')
                }}
              >
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {alertFilters.selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="siem-bulk-bar"
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="flex items-center gap-2 p-2">
                <span className="text-sm font-medium text-emerald-400">
                  {alertFilters.selectedIds.length} alert
                  {alertFilters.selectedIds.length !== 1 ? 's' : ''} selected
                </span>
                <Separator orientation="vertical" className="h-5" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => handleBulkAction('acknowledge')}
                >
                  <Check className="h-3.5 w-3.5" />
                  Acknowledge
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-orange-400"
                  onClick={() => handleBulkAction('escalate')}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Escalate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => handleBulkAction('suppress')}
                >
                  <X className="h-3.5 w-3.5" />
                  Suppress
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-emerald-400"
                  onClick={() => handleBulkAction('create_incident')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Incident
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearAlertSelection}
                >
                  Clear Selection
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected
                      }
                    }}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllAlerts(alerts.map((a) => a.id))
                      else clearAlertSelection()
                    }}
                  />
                </TableHead>
                <TableHead className="w-8" />
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead className="hidden md:table-cell w-28">
                  Category
                </TableHead>
                <TableHead className="hidden md:table-cell w-24">
                  Source
                </TableHead>
                <TableHead className="hidden lg:table-cell w-44">
                  Source → Dest
                </TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="hidden sm:table-cell w-28">
                  Last Seen
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-2 w-2 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full max-w-[180px]" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-48 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Shield className="h-12 w-12 text-zinc-700" />
                      <h3 className="text-zinc-500 font-medium">No alerts found</h3>
                      <p className="text-zinc-600 text-sm">Try adjusting your filters or clearing the current search criteria.</p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1"
                          onClick={() => {
                            resetAlertFilters()
                            setDateRange('24h')
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groupedAlerts.map((group, gIdx) => (
                  <Fragment key={group.key}>
                    {/* 10-3: Group header row when grouping is active */}
                    {groupBy !== 'none' && (
                      <TableRow className="hover:bg-transparent bg-zinc-900/60">
                        <TableCell colSpan={9} className="py-1.5 px-4">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {group.label}
                            <span className="text-zinc-500 normal-case font-normal">
                              ({group.items.length})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {group.items.map((alert, idx) => {
                      const flatIdx = gIdx * 100 + idx
                      return (
                        <AlertRowComponent
                          key={alert.id}
                          alert={alert}
                          isSelected={alertFilters.selectedIds.includes(alert.id)}
                          isExpanded={expandedAlert === alert.id}
                          isOdd={idx % 2 === 1}
                          staggerIndex={Math.min(flatIdx, 8)}
                          isNew={newAlertIds.has(alert.id)}
                          snoozedUntil={snoozedAlerts[alert.id]}
                          detailData={
                            expandedAlert === alert.id ? detailData : null
                          }
                          detailLoading={detailLoading}
                          onToggleSelect={() => toggleAlertSelection(alert.id)}
                          onExpand={() => handleExpand(alert.id)}
                          onOpenDrawer={() => setDrawerAlertId(alert.id)}
                          onStatusChange={(status) =>
                            handleStatusChange(alert.id, status)
                          }
                          onSnooze={(durationMs) => handleSnooze(alert.id, durationMs)}
                          onUnsnooze={() => handleUnsnooze(alert.id)}
                          commentText={commentText[alert.id] || ''}
                          onCommentTextChange={(text) =>
                            setCommentText((prev) => ({
                              ...prev,
                              [alert.id]: text,
                            }))
                          }
                          onAddComment={() => handleAddComment(alert.id)}
                          rawLogExpanded={rawLogExpanded[alert.id] || false}
                          onToggleRawLog={() =>
                            setRawLogExpanded((prev) => ({
                              ...prev,
                              [alert.id]: !prev[alert.id],
                            }))
                          }
                          onFetchDetail={() => fetchDetail(alert.id)}
                          onRefresh={fetchAlerts}
                        />
                      )
                    })}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            Showing{' '}
            <span className="font-medium text-zinc-300 tabular-nums">
              {total === 0
                ? '0'
                : `${(alertFilters.page - 1) * alertFilters.pageSize + 1}–${Math.min(alertFilters.page * alertFilters.pageSize, total)}`}
            </span>{' '}
            of <span className="font-medium text-zinc-300 tabular-nums">{total}</span> alerts
          </span>
          <Select
            value={String(alertFilters.pageSize)}
            onValueChange={(v) => setAlertFilters({ pageSize: Number(v), page: 1 })}
          >
            <SelectTrigger className="h-7 w-[70px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((s) => (
                <SelectItem key={s} value={String(s)} className="text-xs">
                  {s}/page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Page</span>
            <Input
              type="number"
              min={1}
              max={Math.max(totalPages, 1)}
              value={alertFilters.page}
              onChange={(e) => {
                const p = Math.max(1, Math.min(Number(e.target.value) || 1, totalPages || 1))
                setAlertFilters({ page: p })
              }}
              className="h-7 w-14 text-xs text-center"
            />
            <span className="text-muted-foreground">of {Math.max(totalPages, 1)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={alertFilters.page <= 1}
            onClick={() => setAlertFilters({ page: alertFilters.page - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={alertFilters.page >= totalPages}
            onClick={() => setAlertFilters({ page: alertFilters.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create Alert Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Alert</DialogTitle>
            <DialogDescription>
              Manually create a new security alert.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="alert-title">Title *</Label>
              <Input
                id="alert-title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Alert title"
                className="text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alert-desc">Description *</Label>
              <Input
                id="alert-desc"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe the alert"
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select
                  value={createForm.severity}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, severity: v as Severity }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={createForm.category}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Source *</Label>
                <Select
                  value={createForm.source}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, source: v }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Protocol</Label>
                <Input
                  value={createForm.protocol}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, protocol: e.target.value }))
                  }
                  placeholder="e.g. TCP, UDP"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Source IP</Label>
                <Input
                  value={createForm.sourceIp}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, sourceIp: e.target.value }))
                  }
                  placeholder="e.g. 10.0.0.1"
                  className="text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label>Destination IP</Label>
                <Input
                  value={createForm.destIp}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, destIp: e.target.value }))
                  }
                  placeholder="e.g. 192.168.1.1"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={handleCreateAlert}
              disabled={creating}
            >
              {creating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Create Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Detail Drawer */}
      <AlertDetailDrawer
        alertId={drawerAlertId}
        open={drawerAlertId !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerAlertId(null)
        }}
        onRefresh={fetchAlerts}
      />
    </motion.div>
  )
}

// ===== Alert Row Component (extracted for efficiency) =====

interface AlertRowProps {
  alert: Alert
  isSelected: boolean
  isExpanded: boolean
  isOdd: boolean
  // 10-3 polish props
  staggerIndex: number
  isNew: boolean
  snoozedUntil?: number
  detailData: Alert | null
  detailLoading: boolean
  onToggleSelect: () => void
  onExpand: () => void
  onOpenDrawer: () => void
  onStatusChange: (status: string) => void
  onSnooze: (durationMs: number) => void
  onUnsnooze: () => void
  commentText: string
  onCommentTextChange: (text: string) => void
  onAddComment: () => void
  rawLogExpanded: boolean
  onToggleRawLog: () => void
  onFetchDetail: () => void
  onRefresh: () => void
}

const severityDotColor: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-500',
  low: 'bg-emerald-500',
  informational: 'bg-zinc-400',
}

function AlertRowComponent({
  alert,
  isSelected,
  isExpanded,
  isOdd,
  staggerIndex,
  isNew,
  snoozedUntil,
  detailData,
  detailLoading,
  onToggleSelect,
  onExpand,
  onOpenDrawer,
  onStatusChange,
  onSnooze,
  onUnsnooze,
  commentText,
  onCommentTextChange,
  onAddComment,
  rawLogExpanded,
  onToggleRawLog,
  onFetchDetail,
  onRefresh,
}: AlertRowProps) {
  const handleAction = useCallback(
    async (action: string) => {
      if (action === 'acknowledge') {
        onStatusChange('acknowledged')
      } else if (action === 'escalate') {
        try {
          const res = await fetch(`/api/alerts/${alert.id}/escalate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Manual escalation' }),
          })
          if (res.ok) {
            toast.success('Alert escalated')
            onRefresh()
            onFetchDetail()
          }
        } catch {
          toast.error('Failed to escalate alert')
        }
      } else if (action === 'suppress') {
        try {
          const res = await fetch(`/api/alerts/${alert.id}/suppress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Manual suppression' }),
          })
          if (res.ok) {
            toast.success('Alert suppressed')
            onRefresh()
            onFetchDetail()
          }
        } catch {
          toast.error('Failed to suppress alert')
        }
      } else if (action === 'assign') {
        try {
          const res = await fetch(`/api/alerts/${alert.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'default-admin', action: 'assigned' }),
          })
          if (res.ok) {
            toast.success('Alert assigned')
            onRefresh()
            onFetchDetail()
          }
        } catch {
          toast.error('Failed to assign alert')
        }
      } else if (action === 'link_incident') {
        useSIEMStore.getState().setCreateIncidentOpen(true)
      } else if (action === 'view_details') {
        onOpenDrawer()
      }
    },
    [alert.id, onStatusChange, onRefresh, onFetchDetail, onExpand, onOpenDrawer]
  )

  const tags = useMemo(() => {
    if (!alert.tags) return []
    try {
      return JSON.parse(alert.tags)
    } catch {
      return alert.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    }
  }, [alert.tags])

  // 10-3: snooze countdown string for the row badge
  const snoozeLabel = useMemo(() => {
    if (!snoozedUntil) return null
    const remaining = snoozedUntil - Date.now()
    if (remaining <= 0) return null
    const mins = Math.round(remaining / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const remMin = mins % 60
    return remMin === 0 ? `${hrs}h` : `${hrs}h ${remMin}m`
  }, [snoozedUntil])

  return (
    <>
      {/* Main Row */}
      <TableRow
        key={alert.id}
        className={cn(
          'cursor-pointer transition-colors siem-severity-border-' + alert.severity,
          // 10-3: staggered fade-in on mount + severity background tint
          'siem-stagger-in',
          severityTintClass[alert.severity as Severity] || '',
          // 10-3: one-shot pulse for newly-arrived alerts
          isNew && 'siem-new-pulse',
          isSelected && 'bg-emerald-500/5',
          isExpanded && 'bg-accent/20',
          isOdd && !isSelected && !isExpanded && 'bg-muted/20',
          isSelected && isOdd && 'bg-emerald-500/5'
        )}
        style={{ '--siem-stagger-i': staggerIndex } as React.CSSProperties}
        onClick={onExpand}
      >
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        </TableCell>
        <TableCell>
          <span
            className={cn(
              'h-2 w-2 rounded-full inline-block',
              severityDotColor[alert.severity] || 'bg-zinc-400',
              alert.severity === 'critical' && 'siem-critical-dot'
            )}
          />
        </TableCell>
        <TableCell>
          {/* 10-3: hover-expand description preview — fades in a small popover
              below the title on row hover. We use a group/relative wrapper. */}
          <div className="group relative">
            <span className="font-medium text-sm truncate block max-w-[300px]">
              {alert.title}
            </span>
            {alert.description && (
              <div
                className="siem-hover-preview pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-w-md rounded-md border border-zinc-700 bg-zinc-900/95 p-2 text-[11px] leading-relaxed text-zinc-400 shadow-xl group-hover:block opacity-0 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0"
              >
                <span className="line-clamp-3">{alert.description}</span>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <span className="text-xs text-zinc-400">
            {alert.category || '—'}
          </span>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Badge variant="outline" className="text-[10px] h-5">
            {alert.source}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <span>{alert.sourceIp || '—'}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span>{alert.destIp || '—'}</span>
          </span>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={alert.status} type="alert" />
            {/* 10-3: snooze countdown badge */}
            {snoozeLabel && (
              <Badge
                className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[9px] gap-1 px-1.5"
                title={`Snoozed — resumes in ${snoozeLabel}`}
              >
                <Bell className="h-2.5 w-2.5" />
                {snoozeLabel}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(alert.lastSeenAt), {
              addSuffix: true,
            })}
          </span>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            {/* 10-3: Snooze dropdown — Bell icon, opens a small menu with the
                4 standard durations. If already snoozed, the trigger becomes
                an "unsnooze" affordance. */}
            {snoozedUntil ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-violet-300 hover:text-violet-200"
                onClick={onUnsnooze}
                title="Cancel snooze"
              >
                <Bell className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-500 hover:text-violet-300"
                    title="Snooze alert"
                  >
                    <Bell className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Snooze for
                  </div>
                  <DropdownMenuSeparator />
                  {SNOOZE_DURATIONS.map((d) => (
                    <DropdownMenuItem
                      key={d.value}
                      onClick={() => onSnooze(d.value)}
                      className="gap-2 text-xs"
                    >
                      <Clock className="h-3 w-3" />
                      {d.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleAction('acknowledge')}>
                  <Check className="h-3.5 w-3.5" />
                  Acknowledge
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('escalate')}>
                  <ArrowUp className="h-3.5 w-3.5" />
                  Escalate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('suppress')}>
                  <X className="h-3.5 w-3.5" />
                  Suppress
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAction('assign')}>
                  Assign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('link_incident')}>
                  Link to Incident
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAction('view_details')}>
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Detail Row */}
      <AnimatePresence>
        {isExpanded && (
          <TableRow key={`${alert.id}-detail`} className="hover:bg-transparent">
            <TableCell colSpan={9} className="p-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="border-b border-border bg-muted/10 px-6 py-4">
                  {detailLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-20" />
                    </div>
                  ) : detailData ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      {/* Left: Description & Details */}
                      <div className="lg:col-span-2 space-y-4">
                        {/* Description */}
                        <div>
                          <h4 className="text-sm font-semibold mb-1">
                            Description
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {detailData.description}
                          </p>
                        </div>

                        {/* MITRE ATT&CK */}
                        {(detailData.mitreTactic || detailData.mitreTechnique) && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              MITRE ATT&CK
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {detailData.mitreTactic && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-6 bg-orange-500/10 text-orange-400 border-orange-500/30"
                                >
                                  {detailData.mitreTactic}
                                </Badge>
                              )}
                              {detailData.mitreTechnique && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-6 bg-purple-500/10 text-purple-400 border-purple-500/30"
                                >
                                  {detailData.mitreTechnique}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Raw Log */}
                        {detailData.rawLog && (
                          <div>
                            <button
                              className="flex items-center gap-1.5 text-sm font-semibold mb-2 hover:text-foreground transition-colors"
                              onClick={onToggleRawLog}
                            >
                              <Code className="h-3.5 w-3.5" />
                              Raw Log
                              {rawLogExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <AnimatePresence>
                              {rawLogExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <ScrollArea className="max-h-64">
                                    <pre className="rounded-md bg-background border border-border p-3 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all overflow-x-auto">
                                      {detailData.rawLog}
                                    </pre>
                                  </ScrollArea>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Tags */}
                        {tags.length > 0 && (
                          <div>
                            <h4 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                              <Tag className="h-3.5 w-3.5" />
                              Tags
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[10px] h-5"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Comments Section */}
                        <div>
                          <h4 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Comments
                            {(detailData.comments?.length || 0) > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] h-4 px-1.5"
                              >
                                {detailData.comments?.length || 0}
                              </Badge>
                            )}
                          </h4>

                          {(detailData.comments?.length || 0) > 0 && (
                            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                              {detailData.comments?.map((comment: Comment) => (
                                <div
                                  key={comment.id}
                                  className="rounded-md bg-background border border-border p-2.5"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium">
                                      {comment.user?.name || 'Unknown'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDistanceToNow(
                                        new Date(comment.createdAt),
                                        { addSuffix: true }
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {comment.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Input
                              value={commentText}
                              onChange={(e) => onCommentTextChange(e.target.value)}
                              placeholder="Add a comment..."
                              className="h-8 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') onAddComment()
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 gap-1"
                              onClick={onAddComment}
                              disabled={!commentText.trim()}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Metadata */}
                      <div className="space-y-4">
                        <div className="rounded-md bg-background border border-border p-3 space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Alert Details
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Occurrences
                              </span>
                              <span className="font-medium">
                                {detailData.occurrenceCount}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                First Seen
                              </span>
                              <span className="font-medium">
                                {formatDistanceToNow(
                                  new Date(detailData.firstSeenAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Last Seen
                              </span>
                              <span className="font-medium">
                                {formatDistanceToNow(
                                  new Date(detailData.lastSeenAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Severity
                              </span>
                              <SeverityBadge severity={detailData.severity} size="sm" />
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Status
                              </span>
                              <StatusBadge status={detailData.status} type="alert" />
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Source
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5"
                              >
                                {detailData.source}
                              </Badge>
                            </div>
                            {detailData.protocol && (
                              <>
                                <Separator />
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Protocol
                                  </span>
                                  <span className="font-medium">
                                    {detailData.protocol}
                                  </span>
                                </div>
                              </>
                            )}
                            {detailData.sourceIp && (
                              <>
                                <Separator />
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Source IP
                                  </span>
                                  <span className="font-mono text-[11px]">
                                    {detailData.sourceIp}
                                  </span>
                                </div>
                              </>
                            )}
                            {detailData.destIp && (
                              <>
                                <Separator />
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Dest IP
                                  </span>
                                  <span className="font-mono text-[11px]">
                                    {detailData.destIp}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Linked Incidents */}
                        {(detailData.incidents?.length || 0) > 0 && (
                          <div className="rounded-md bg-background border border-border p-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Linked Incidents
                            </h4>
                            <div className="space-y-1.5">
                              {detailData.incidents?.map((inc) => (
                                <div
                                  key={inc.id}
                                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors"
                                  onClick={() => useSIEMStore.getState().setActiveView('incidents')}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      useSIEMStore.getState().setActiveView('incidents')
                                    }
                                  }}
                                >
                                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate text-primary underline decoration-primary/30 hover:decoration-primary">
                                    {inc.incidentId}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      Failed to load alert details
                    </div>
                  )}
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  )
}
