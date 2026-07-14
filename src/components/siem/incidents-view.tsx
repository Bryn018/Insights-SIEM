'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Plus,
  MoreHorizontal,
  RefreshCw,
  Filter,
  Clock,
  MessageSquare,
  Send,
  ChevronRight,
  UserPlus,
  Link2,
  Unlink,
  Pencil,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Calendar,
  User,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  type IncidentStatus,
  type IncidentPriority,
} from '@/lib/store'
import type {
  Incident,
  IncidentTimeline,
  Comment,
  IncidentAlertLink,
  IncidentAssignment,
  PaginatedResponse,
  AlertSummary,
} from '@/lib/types'
import { SeverityBadge, StatusBadge, PriorityBadge } from '@/components/siem/status-badge'
import { ExportButton } from '@/components/siem/export-button'
import { IncidentDetailDrawer } from '@/components/siem/incident-detail-drawer'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Eye } from 'lucide-react'

// ===== Constants =====

const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'contained', label: 'Contained' },
  { value: 'eradicated', label: 'Eradicated' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'closed', label: 'Closed' },
]

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-amber-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-emerald-500' },
]

const PRIORITY_OPTIONS: { value: IncidentPriority; label: string; activeClass: string }[] = [
  { value: 'p1', label: 'P1', activeClass: 'bg-red-500/20 text-red-400 border-red-500/50' },
  { value: 'p2', label: 'P2', activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
  { value: 'p3', label: 'P3', activeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  { value: 'p4', label: 'P4', activeClass: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
]

const CATEGORY_OPTIONS = [
  'Brute Force', 'Malware', 'Data Exfiltration', 'Lateral Movement',
  'Policy Violation', 'Anomaly', 'Compliance', 'Other',
]

const INCIDENT_WORKFLOW: IncidentStatus[] = [
  'open', 'investigating', 'contained', 'eradicated', 'recovered', 'closed',
]

const severityButtonColors: Record<Severity, { active: string; dot: string }> = {
  critical: { active: 'bg-red-500/20 text-red-400 border-red-500/50', dot: 'bg-red-500' },
  high: { active: 'bg-amber-500/20 text-amber-400 border-amber-500/50', dot: 'bg-amber-500' },
  medium: { active: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', dot: 'bg-yellow-500' },
  low: { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', dot: 'bg-emerald-500' },
  informational: { active: 'bg-zinc-400/20 text-zinc-400 border-zinc-400/50', dot: 'bg-zinc-400' },
}

const statusButtonColors: Record<IncidentStatus, { active: string }> = {
  open: { active: 'bg-red-500/20 text-red-400 border-red-500/50' },
  investigating: { active: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
  contained: { active: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  eradicated: { active: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  recovered: { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
  closed: { active: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
}

// ===== Create Incident Form =====

interface CreateIncidentForm {
  title: string
  description: string
  severity: Severity
  priority: IncidentPriority
  category: string
  dueAt: string
}

const emptyCreateForm: CreateIncidentForm = {
  title: '',
  description: '',
  severity: 'medium',
  priority: 'p3',
  category: 'Other',
  dueAt: '',
}

// ===== Main Component =====

export function IncidentsView() {
  const {
    incidentFilters,
    setIncidentFilters,
    resetIncidentFilters,
    incidentDetailId,
    setIncidentDetailId,
  } = useSIEMStore()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Detail panel state
  const [detailData, setDetailData] = useState<Incident | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateIncidentForm>(emptyCreateForm)
  const [creating, setCreating] = useState(false)

  // Detail interactions
  const [commentText, setCommentText] = useState('')
  const [timelineEventText, setTimelineEventText] = useState('')
  const [timelineEventDate, setTimelineEventDate] = useState('')
  const [editDescription, setEditDescription] = useState(false)
  const [descriptionText, setDescriptionText] = useState('')
  const [linkAlertSearch, setLinkAlertSearch] = useState('')
  const [linkAlertOpen, setLinkAlertOpen] = useState(false)
  const [alertSearchResults, setAlertSearchResults] = useState<AlertSummary[]>([])
  const [alertSearchLoading, setAlertSearchLoading] = useState(false)
  const [addingTimeline, setAddingTimeline] = useState(false)
  const [addingComment, setAddingComment] = useState(false)
  const [drawerIncidentId, setDrawerIncidentId] = useState<string | null>(null)

  const totalPages = Math.ceil(total / incidentFilters.pageSize)

  // ===== Active filter count =====
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (incidentFilters.severity.length > 0) count++
    if (incidentFilters.status.length > 0) count++
    if (incidentFilters.priority.length > 0) count++
    if (incidentFilters.search) count++
    return count
  }, [incidentFilters])

  // ===== Data Fetching =====
  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(incidentFilters.page))
      params.set('pageSize', String(incidentFilters.pageSize))
      params.set('sortBy', incidentFilters.sortBy)
      params.set('sortOrder', incidentFilters.sortOrder)
      if (incidentFilters.severity.length)
        params.set('severity', incidentFilters.severity.join(','))
      if (incidentFilters.status.length)
        params.set('status', incidentFilters.status.join(','))
      if (incidentFilters.priority.length)
        params.set('priority', incidentFilters.priority.join(','))
      if (incidentFilters.category.length)
        params.set('category', incidentFilters.category.join(','))
      if (incidentFilters.search)
        params.set('search', incidentFilters.search)

      const res = await fetch(`/api/incidents?${params}`)
      if (res.ok) {
        const json: PaginatedResponse<Incident> = await res.json()
        setIncidents(json.data || [])
        setTotal(json.pagination?.total || 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [
    incidentFilters.page,
    incidentFilters.pageSize,
    incidentFilters.sortBy,
    incidentFilters.sortOrder,
    incidentFilters.severity,
    incidentFilters.status,
    incidentFilters.priority,
    incidentFilters.category,
    incidentFilters.search,
  ])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  // ===== Fetch Incident Detail =====
  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/incidents/${id}`)
      if (res.ok) {
        const json = await res.json()
        setDetailData(json)
        setDescriptionText(json.description || '')
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Open detail panel when incidentDetailId changes
  useEffect(() => {
    if (incidentDetailId) {
      fetchDetail(incidentDetailId)
    }
  }, [incidentDetailId, fetchDetail])

  // ===== Handlers =====
  const handleRowClick = useCallback(
    (id: string) => {
      setIncidentDetailId(id)
    },
    [setIncidentDetailId]
  )

  const handleStatusChange = useCallback(
    async (incidentId: string, status: IncidentStatus) => {
      try {
        const res = await fetch(`/api/incidents/${incidentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (res.ok) {
          toast.success(`Incident status updated to ${status}`)
          fetchIncidents()
          if (incidentDetailId === incidentId) fetchDetail(incidentId)
        }
      } catch {
        toast.error('Failed to update incident status')
      }
    },
    [fetchIncidents, fetchDetail, incidentDetailId]
  )

  const toggleSeverityFilter = useCallback(
    (sev: Severity) => {
      const current = incidentFilters.severity
      setIncidentFilters({
        severity: current.includes(sev)
          ? current.filter((s) => s !== sev)
          : [...current, sev],
        page: 1,
      })
    },
    [incidentFilters.severity, setIncidentFilters]
  )

  const toggleStatusFilter = useCallback(
    (status: IncidentStatus) => {
      const current = incidentFilters.status
      setIncidentFilters({
        status: current.includes(status)
          ? current.filter((s) => s !== status)
          : [...current, status],
        page: 1,
      })
    },
    [incidentFilters.status, setIncidentFilters]
  )

  const togglePriorityFilter = useCallback(
    (priority: IncidentPriority) => {
      const current = incidentFilters.priority
      setIncidentFilters({
        priority: current.includes(priority)
          ? current.filter((p) => p !== priority)
          : [...current, priority],
        page: 1,
      })
    },
    [incidentFilters.priority, setIncidentFilters]
  )

  const handleCreateIncident = useCallback(async () => {
    if (!createForm.title || !createForm.description) {
      toast.error('Please fill in title and description')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          severity: createForm.severity,
          priority: createForm.priority,
          category: createForm.category,
          dueAt: createForm.dueAt || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Incident created successfully')
        setCreateDialogOpen(false)
        setCreateForm(emptyCreateForm)
        fetchIncidents()
      } else {
        toast.error('Failed to create incident')
      }
    } catch {
      toast.error('Failed to create incident')
    } finally {
      setCreating(false)
    }
  }, [createForm, fetchIncidents])

  const handleUpdateDescription = useCallback(async () => {
    if (!incidentDetailId || !descriptionText.trim()) return
    try {
      const res = await fetch(`/api/incidents/${incidentDetailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descriptionText }),
      })
      if (res.ok) {
        toast.success('Description updated')
        setEditDescription(false)
        fetchDetail(incidentDetailId)
      }
    } catch {
      toast.error('Failed to update description')
    }
  }, [incidentDetailId, descriptionText, fetchDetail])

  const handleAddTimelineEvent = useCallback(async () => {
    if (!incidentDetailId || !timelineEventText.trim()) return
    setAddingTimeline(true)
    try {
      const res = await fetch(`/api/incidents/${incidentDetailId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: timelineEventText,
          eventDate: timelineEventDate || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Timeline event added')
        setTimelineEventText('')
        setTimelineEventDate('')
        fetchDetail(incidentDetailId)
      }
    } catch {
      toast.error('Failed to add timeline event')
    } finally {
      setAddingTimeline(false)
    }
  }, [incidentDetailId, timelineEventText, timelineEventDate, fetchDetail])

  const handleAddComment = useCallback(async () => {
    if (!incidentDetailId || !commentText.trim()) return
    setAddingComment(true)
    try {
      const res = await fetch(`/api/incidents/${incidentDetailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText }),
      })
      if (res.ok) {
        toast.success('Comment added')
        setCommentText('')
        fetchDetail(incidentDetailId)
      }
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setAddingComment(false)
    }
  }, [incidentDetailId, commentText, fetchDetail])

  const handleLinkAlert = useCallback(async (alertId: string) => {
    if (!incidentDetailId) return
    try {
      const res = await fetch(`/api/incidents/${incidentDetailId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      })
      if (res.ok) {
        toast.success('Alert linked to incident')
        fetchDetail(incidentDetailId)
        fetchIncidents()
      } else if (res.status === 409) {
        toast.warning('Alert is already linked to this incident')
      } else {
        toast.error('Failed to link alert')
      }
    } catch {
      toast.error('Failed to link alert')
    }
  }, [incidentDetailId, fetchDetail, fetchIncidents])

  const handleUnlinkAlert = useCallback(async (alertId: string) => {
    if (!incidentDetailId) return
    try {
      const res = await fetch(`/api/incidents/${incidentDetailId}/alerts?alertId=${alertId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Alert unlinked from incident')
        fetchDetail(incidentDetailId)
        fetchIncidents()
      }
    } catch {
      toast.error('Failed to unlink alert')
    }
  }, [incidentDetailId, fetchDetail, fetchIncidents])

  const handleSearchAlerts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setAlertSearchResults([])
      return
    }
    setAlertSearchLoading(true)
    try {
      const res = await fetch(`/api/alerts?search=${encodeURIComponent(query)}&pageSize=10`)
      if (res.ok) {
        const json = await res.json()
        setAlertSearchResults(json.data || [])
      }
    } catch {
      // ignore
    } finally {
      setAlertSearchLoading(false)
    }
  }, [])

  // Debounced alert search
  useEffect(() => {
    if (!linkAlertOpen) return
    const timer = setTimeout(() => {
      handleSearchAlerts(linkAlertSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [linkAlertSearch, linkAlertOpen, handleSearchAlerts])

  // ===== Workflow step index =====
  const getWorkflowStepIndex = (status: IncidentStatus) =>
    INCIDENT_WORKFLOW.indexOf(status)

  const linkedAlertIds = useMemo(
    () => new Set((detailData?.alerts || []).map((a) => a.alertId)),
    [detailData?.alerts]
  )

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
          <h2 className="text-lg font-semibold">Incidents</h2>
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
            filename="siem-incidents"
            fetchData={async () => {
              const params = new URLSearchParams()
              params.set('page', '1')
              params.set('pageSize', '10000')
              params.set('sortBy', incidentFilters.sortBy)
              params.set('sortOrder', incidentFilters.sortOrder)
              if (incidentFilters.severity.length)
                params.set('severity', incidentFilters.severity.join(','))
              if (incidentFilters.status.length)
                params.set('status', incidentFilters.status.join(','))
              if (incidentFilters.priority.length)
                params.set('priority', incidentFilters.priority.join(','))
              if (incidentFilters.search)
                params.set('search', incidentFilters.search)
              const res = await fetch(`/api/incidents?${params.toString()}`)
              if (!res.ok) throw new Error('Failed to fetch incidents for export')
              const json = await res.json()
              const rows = (json.data ?? json.incidents ?? []) as Record<string, unknown>[]
              return rows.map((r) => ({
                id: r.id,
                title: r.title,
                severity: r.severity,
                status: r.status,
                priority: r.priority,
                category: r.category,
                assignee: r.assignee,
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
            Create Incident
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Buttons */}
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = incidentFilters.status.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleStatusFilter(opt.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all siem-filter-glow',
                    isSelected
                      ? statusButtonColors[opt.value].active
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Severity Filter Buttons */}
            {SEVERITY_OPTIONS.map((opt) => {
              const isSelected = incidentFilters.severity.includes(opt.value)
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

            {/* Priority Filter Buttons */}
            {PRIORITY_OPTIONS.map((opt) => {
              const isSelected = incidentFilters.priority.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => togglePriorityFilter(opt.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all siem-filter-glow',
                    isSelected
                      ? opt.activeClass
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1 max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={incidentFilters.search}
                onChange={(e) =>
                  setIncidentFilters({ search: e.target.value, page: 1 })
                }
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchIncidents}
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
                onClick={resetIncidentFilters}
              >
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead className="w-24">Severity</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="hidden md:table-cell w-20">
                  Alerts
                </TableHead>
                <TableHead className="hidden lg:table-cell w-32">
                  Assignees
                </TableHead>
                <TableHead className="hidden sm:table-cell w-28">
                  Created
                </TableHead>
                <TableHead className="hidden md:table-cell w-28">
                  Updated
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full max-w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))
              ) : incidents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-48 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <ShieldAlert className="h-12 w-12 text-zinc-700" />
                      <h3 className="text-zinc-500 font-medium">No incidents found</h3>
                      <p className="text-zinc-600 text-sm">Try adjusting your filters or create a new incident.</p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1"
                          onClick={resetIncidentFilters}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((incident, idx) => {
                  const assignees = incident.assignments || []
                  const alertCount = (incident as { _count?: { alerts: number } })._count?.alerts
                    ?? (incident.alerts?.length || 0)

                  return (
                    <TableRow
                      key={incident.id}
                      className={cn(
                        'cursor-pointer transition-colors siem-incident-lift',
                        idx % 2 === 1 && 'bg-muted/20',
                        incidentDetailId === incident.id && 'bg-emerald-500/5 border-l-2 border-l-emerald-500',
                        'hover:bg-muted/40',
                        // Priority-colored left border for at-a-glance triage
                        incident.priority === 'p1' && 'siem-priority-border-p1',
                        incident.priority === 'p2' && 'siem-priority-border-p2',
                        incident.priority === 'p3' && 'siem-priority-border-p3',
                        incident.priority === 'p4' && 'siem-priority-border-p4'
                      )}
                      onClick={() => handleRowClick(incident.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={incident.priority} />
                          {/* Pulse indicator for active incidents (open / investigating) */}
                          {(incident.status === 'open' || incident.status === 'investigating') && (
                            <span
                              className={cn(
                                'inline-block h-1.5 w-1.5 rounded-full animate-status-dot-pulse',
                                incident.status === 'open' ? 'bg-red-500' : 'bg-amber-500'
                              )}
                              aria-label={`Status: ${incident.status}`}
                              title={`Status: ${incident.status}`}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-foreground">
                          {incident.title}
                        </span>
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={incident.severity} size="sm" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={incident.status} type="incident" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {alertCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {assignees.length > 0 ? (
                          <div className="flex items-center -space-x-1">
                            {assignees.slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 border-2 border-zinc-900 text-[9px] font-medium text-zinc-200"
                                title={`${a.user.name} (${a.role})`}
                              >
                                {a.user.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {assignees.length > 3 && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border-2 border-zinc-900 text-[9px] text-zinc-400">
                                +{assignees.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(incident.updatedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDrawerIncidentId(incident.id) }}>
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(incident.id) }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(incident.id) }}>
                              <ArrowRight className="h-3.5 w-3.5 mr-2" />
                              Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(incident.id) }}>
                              <UserPlus className="h-3.5 w-3.5 mr-2" />
                              Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(incident.id) }}>
                              <Link2 className="h-3.5 w-3.5 mr-2" />
                              Add Alert
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(incident.id, 'closed')
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                              Close Incident
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
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
                : `${(incidentFilters.page - 1) * incidentFilters.pageSize + 1}–${Math.min(incidentFilters.page * incidentFilters.pageSize, total)}`}
            </span>{' '}
            of <span className="font-medium text-zinc-300 tabular-nums">{total}</span> incidents
          </span>
          <Select
            value={String(incidentFilters.pageSize)}
            onValueChange={(v) => setIncidentFilters({ pageSize: Number(v), page: 1 })}
          >
            <SelectTrigger className="h-7 w-[70px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((s) => (
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
              value={incidentFilters.page}
              onChange={(e) => {
                const p = Math.max(1, Math.min(Number(e.target.value) || 1, totalPages || 1))
                setIncidentFilters({ page: p })
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
            disabled={incidentFilters.page <= 1}
            onClick={() => setIncidentFilters({ page: incidentFilters.page - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={incidentFilters.page >= totalPages}
            onClick={() => setIncidentFilters({ page: incidentFilters.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Incident Detail Sheet */}
      <Sheet
        open={!!incidentDetailId}
        onOpenChange={(open) => {
          if (!open) setIncidentDetailId(null)
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-2xl bg-zinc-950 border-zinc-800 p-0">
          {/* Always render a SheetTitle for accessibility, even during loading
              or when detailData is missing. Radix requires an accessible title
              on SheetContent for screen readers. */}
          <SheetTitle className="sr-only">
            {detailData?.title || 'Incident details'}
          </SheetTitle>
          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailData ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="p-4 border-b border-zinc-800 space-y-3">
                <SheetTitle className="text-base font-semibold text-zinc-100">
                  {detailData.title}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={detailData.priority} />
                  <SeverityBadge severity={detailData.severity} size="sm" />
                  <StatusBadge status={detailData.status} type="incident" />
                  {detailData.category && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {detailData.category}
                    </Badge>
                  )}
                </div>

                {/* Status Workflow Steps */}
                <div className="flex items-center gap-0.5 pt-1 overflow-x-auto">
                  {INCIDENT_WORKFLOW.map((step, i) => {
                    const currentIndex = getWorkflowStepIndex(detailData.status)
                    const isActive = step === detailData.status
                    const isPast = i < currentIndex
                    const isFuture = i > currentIndex

                    return (
                      <div key={step} className="flex items-center">
                        <button
                          onClick={() => {
                            if (step !== detailData.status) {
                              handleStatusChange(detailData.id, step)
                            }
                          }}
                          disabled={isFuture && step === 'closed' && detailData.status !== 'recovered'}
                          className={cn(
                            'px-2.5 py-1 text-[10px] font-medium rounded transition-all whitespace-nowrap',
                            isActive && 'bg-emerald-600 text-white',
                            isPast && 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
                            isFuture && 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300',
                          )}
                        >
                          {step.charAt(0).toUpperCase() + step.slice(1)}
                        </button>
                        {i < INCIDENT_WORKFLOW.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-zinc-600 mx-0.5 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </SheetHeader>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Description */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-zinc-300">Description</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground"
                        onClick={() => {
                          setEditDescription(!editDescription)
                          setDescriptionText(detailData.description || '')
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        {editDescription ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                    {editDescription ? (
                      <div className="space-y-2">
                        <Textarea
                          value={descriptionText}
                          onChange={(e) => setDescriptionText(e.target.value)}
                          className="min-h-[80px] text-sm bg-zinc-900 border-zinc-800"
                          rows={3}
                        />
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7"
                          onClick={handleUpdateDescription}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {detailData.description || 'No description provided.'}
                      </p>
                    )}
                  </section>

                  <Separator className="bg-zinc-800" />

                  {/* Linked Alerts */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-zinc-300">
                        Linked Alerts ({detailData.alerts?.length || 0})
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => setLinkAlertOpen(true)}
                      >
                        <Link2 className="h-3 w-3" />
                        Link Alert
                      </Button>
                    </div>
                    {(detailData.alerts || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        No alerts linked to this incident
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {(detailData.alerts || []).map((link: IncidentAlertLink) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SeverityBadge
                                severity={link.alert?.severity || 'low'}
                                size="sm"
                              />
                              <span className="text-xs text-zinc-300 truncate">
                                {link.alert?.title || link.alertId}
                              </span>
                              {link.alert?.status && (
                                <StatusBadge status={link.alert.status} type="alert" />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-zinc-500 hover:text-red-400"
                              onClick={() => handleUnlinkAlert(link.alertId)}
                            >
                              <Unlink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Link Alert Search Dialog (inline) */}
                    <AnimatePresence>
                      {linkAlertOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 border border-zinc-800 rounded-md bg-zinc-900/50 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-zinc-300">Search alerts to link</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => {
                                setLinkAlertOpen(false)
                                setLinkAlertSearch('')
                                setAlertSearchResults([])
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search alerts by title..."
                              value={linkAlertSearch}
                              onChange={(e) => setLinkAlertSearch(e.target.value)}
                              className="h-7 pl-7 text-xs"
                            />
                          </div>
                          {alertSearchLoading ? (
                            <div className="flex justify-center py-2">
                              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                          ) : alertSearchResults.length > 0 ? (
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {alertSearchResults
                                .filter((a) => !linkedAlertIds.has(a.id))
                                .map((alert) => (
                                  <button
                                    key={alert.id}
                                    onClick={() => {
                                      handleLinkAlert(alert.id)
                                      setLinkAlertSearch('')
                                      setAlertSearchResults([])
                                    }}
                                    className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-zinc-800 transition text-left"
                                  >
                                    <SeverityBadge severity={alert.severity} size="sm" />
                                    <span className="truncate text-zinc-300">{alert.title}</span>
                                  </button>
                                ))}
                              {alertSearchResults.every((a) => linkedAlertIds.has(a.id)) && (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  All matching alerts are already linked
                                </p>
                              )}
                            </div>
                          ) : linkAlertSearch && !alertSearchLoading ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No alerts found
                            </p>
                          ) : null}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  <Separator className="bg-zinc-800" />

                  {/* Timeline */}
                  <section>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">
                      Timeline
                    </h4>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto mb-3">
                      {(detailData.timeline || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          No timeline events
                        </p>
                      ) : (
                        (detailData.timeline || []).map((event: IncidentTimeline) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-2.5 py-1.5"
                          >
                            <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500/60 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-zinc-300">{event.event}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(event.eventDate), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Add Timeline Event Form */}
                    <div className="space-y-2 border border-zinc-800 rounded-md bg-zinc-900/50 p-2.5">
                      <Input
                        placeholder="Add timeline event..."
                        value={timelineEventText}
                        onChange={(e) => setTimelineEventText(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="datetime-local"
                            value={timelineEventDate}
                            onChange={(e) => setTimelineEventDate(e.target.value)}
                            className="h-7 text-xs pl-7"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          disabled={!timelineEventText.trim() || addingTimeline}
                          onClick={handleAddTimelineEvent}
                        >
                          {addingTimeline ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          Add
                        </Button>
                      </div>
                    </div>
                  </section>

                  <Separator className="bg-zinc-800" />

                  {/* Comments */}
                  <section>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">
                      Comments ({(detailData.comments || []).length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                      {(detailData.comments || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          No comments yet
                        </p>
                      ) : (
                        (detailData.comments || []).map((comment: Comment) => (
                          <div
                            key={comment.id}
                            className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2.5"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-300">
                                {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <span className="text-xs font-medium text-zinc-300">
                                {comment.user?.name || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                              {comment.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Add Comment */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && commentText.trim()) {
                            handleAddComment()
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        disabled={!commentText.trim() || addingComment}
                        onClick={handleAddComment}
                      >
                        {addingComment ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </section>

                  <Separator className="bg-zinc-800" />

                  {/* Assignments */}
                  <section>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">
                      Assignments ({(detailData.assignments || []).length})
                    </h4>
                    {(detailData.assignments || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        No assignees yet
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {(detailData.assignments || []).map((assignment: IncidentAssignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-medium text-zinc-200">
                                {assignment.user?.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <span className="text-xs text-zinc-300">{assignment.user?.name || 'Unknown'}</span>
                                <Badge
                                  variant="outline"
                                  className="ml-1.5 text-[9px] h-4 px-1.5"
                                >
                                  {assignment.role}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(assignment.assignedAt), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Metadata */}
                  <Separator className="bg-zinc-800" />
                  <section>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Details</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {detailData.attackVector && (
                        <>
                          <span className="text-muted-foreground">Attack Vector</span>
                          <span className="text-zinc-300">{detailData.attackVector}</span>
                        </>
                      )}
                      {detailData.impact && (
                        <>
                          <span className="text-muted-foreground">Impact</span>
                          <span className="text-zinc-300">{detailData.impact}</span>
                        </>
                      )}
                      {detailData.resolution && (
                        <>
                          <span className="text-muted-foreground">Resolution</span>
                          <span className="text-zinc-300">{detailData.resolution}</span>
                        </>
                      )}
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-zinc-300">
                        {format(new Date(detailData.createdAt), 'MMM d, yyyy HH:mm')}
                      </span>
                      <span className="text-muted-foreground">Updated</span>
                      <span className="text-zinc-300">
                        {format(new Date(detailData.updatedAt), 'MMM d, yyyy HH:mm')}
                      </span>
                      {detailData.dueAt && (
                        <>
                          <span className="text-muted-foreground">Due</span>
                          <span className="text-zinc-300">
                            {format(new Date(detailData.dueAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        </>
                      )}
                      {detailData.closedAt && (
                        <>
                          <span className="text-muted-foreground">Closed</span>
                          <span className="text-zinc-300">
                            {format(new Date(detailData.closedAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Select an incident to view details
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Incident Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Incident</DialogTitle>
            <DialogDescription>
              Create a new security incident for tracking and response.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="inc-title">Title *</Label>
              <Input
                id="inc-title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Incident title"
                className="text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inc-desc">Description *</Label>
              <Textarea
                id="inc-desc"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe the incident"
                className="text-sm min-h-[80px]"
                rows={3}
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
                <Label>Priority</Label>
                <Select
                  value={createForm.priority}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, priority: v as IncidentPriority }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} - {opt.value === 'p1' ? 'Critical' : opt.value === 'p2' ? 'High' : opt.value === 'p3' ? 'Medium' : 'Low'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={createForm.dueAt}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, dueAt: e.target.value }))
                  }
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
              onClick={handleCreateIncident}
              disabled={creating}
            >
              {creating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Create Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incident Detail Drawer */}
      <IncidentDetailDrawer
        incidentId={drawerIncidentId}
        open={drawerIncidentId !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerIncidentId(null)
        }}
        onRefresh={fetchIncidents}
      />
    </motion.div>
  )
}
