'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Crosshair,
  Eye,
  FileText,
  FlaskConical,
  Lock,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  User,
  Users,
  X,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  SeverityBadge,
  StatusBadge,
  PriorityBadge,
} from '@/components/siem/status-badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useSIEMStore } from '@/lib/store'
import type {
  Incident,
  IncidentTimeline,
  IncidentAlertLink,
  IncidentAssignment,
  Comment,
} from '@/lib/types'

interface IncidentDetailDrawerProps {
  incidentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

/**
 * Dedicated Incident Detail Drawer.
 *
 * A focused, full-height side panel that shows everything about a single
 * incident: description, timeline, linked alerts, assignees, comments,
 * and quick actions for status changes (Open → Investigate → Contain → Recover → Close).
 */
export function IncidentDetailDrawer({
  incidentId,
  open,
  onOpenChange,
  onRefresh,
}: IncidentDetailDrawerProps) {
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { setAlertDetailId, setActiveView } = useSIEMStore()

  // ─── Fetch incident detail ────────────────────────────────────────────
  const fetchIncident = useCallback(async () => {
    if (!incidentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/incidents/${incidentId}`)
      if (!res.ok) throw new Error('Failed to fetch incident')
      const data = await res.json()
      setIncident(data)
      if (data.comments) setComments(data.comments)
    } catch {
      toast.error('Failed to load incident details')
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    if (open && incidentId) {
      fetchIncident()
    }
  }, [open, incidentId, fetchIncident])

  // ─── Status change actions ────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!incidentId) return
      setActionLoading(status)
      try {
        const res = await fetch(`/api/incidents/${incidentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error(`Failed to change status to ${status}`)
        toast.success(`Incident status changed to ${status}`)
        await fetchIncident()
        onRefresh?.()
      } catch {
        toast.error(`Failed to change incident status to ${status}`)
      } finally {
        setActionLoading(null)
      }
    },
    [incidentId, fetchIncident, onRefresh]
  )

  // ─── Comment submit ──────────────────────────────────────────────────
  const handleSubmitComment = useCallback(async () => {
    if (!incidentId || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText.trim() }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      const data = await res.json()
      // Refresh to get the new comment with user info
      await fetchIncident()
      setCommentText('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }, [incidentId, commentText, fetchIncident])

  // ─── Open linked alert ───────────────────────────────────────────────
  const handleOpenAlert = useCallback(
    (alertId: string) => {
      // Navigate to alerts view and open the alert detail drawer
      setActiveView('alerts')
      // Small delay to let the alerts view mount before setting the detail id
      setTimeout(() => {
        setAlertDetailId(alertId)
      }, 100)
    },
    [setActiveView, setAlertDetailId]
  )

  // ─── Reset state on close ────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setCommentText('')
      setActionLoading(null)
    }
  }, [open])

  // ─── Workflow steps ──────────────────────────────────────────────────
  const WORKFLOW_STEPS = [
    { key: 'open', label: 'Open', icon: <Siren className="h-3 w-3" /> },
    { key: 'investigating', label: 'Investigate', icon: <Eye className="h-3 w-3" /> },
    { key: 'contained', label: 'Contain', icon: <Lock className="h-3 w-3" /> },
    { key: 'recovered', label: 'Recover', icon: <RotateCcw className="h-3 w-3" /> },
    { key: 'closed', label: 'Close', icon: <Check className="h-3 w-3" /> },
  ]

  const currentStepIndex = incident
    ? WORKFLOW_STEPS.findIndex((s) => s.key === incident.status)
    : -1

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-zinc-950 border-zinc-800 p-0 flex flex-col"
      >
        {/* Always render an accessible title */}
        <SheetTitle className="sr-only">
          {incident?.title || 'Incident details'}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Detailed view of a security incident including description, timeline,
          linked alerts, assignments, comments, and response actions.
        </SheetDescription>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        ) : incident ? (
          <>
            {/* Header */}
            <SheetHeader className="p-5 border-b border-zinc-800 space-y-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <PriorityIcon priority={incident.priority} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-zinc-100 leading-tight">
                      {incident.title}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                      ID: {incident.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={incident.priority} />
                <SeverityBadge severity={incident.severity} size="sm" />
                <StatusBadge status={incident.status} type="incident" />
                {incident.category && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {incident.category}
                  </Badge>
                )}
                {incident.attackVector && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 border-orange-500/30 text-orange-400"
                  >
                    <Crosshair className="h-2.5 w-2.5 mr-1" />
                    {incident.attackVector}
                  </Badge>
                )}
              </div>

              {/* Quick action bar - workflow status buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {WORKFLOW_STEPS.map((step, i) => {
                  const isActive = step.key === incident.status
                  const isPast =
                    currentStepIndex >= 0 && i < currentStepIndex
                  const isDisabled =
                    actionLoading !== null ||
                    (step.key === 'closed' &&
                      incident.status !== 'recovered')

                  return (
                    <ActionButton
                      key={step.key}
                      icon={step.icon}
                      label={step.label}
                      loading={actionLoading === step.key}
                      disabled={isDisabled && !isActive}
                      onClick={() => handleStatusChange(step.key)}
                      variant={isActive ? 'success' : isPast ? 'past' : 'default'}
                    />
                  )
                })}
              </div>
            </SheetHeader>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* Description */}
                {incident.description && (
                  <Section
                    icon={<FileText className="h-4 w-4" />}
                    title="Description"
                  >
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {incident.description}
                    </p>
                  </Section>
                )}

                {/* Impact & Resolution */}
                {(incident.impact || incident.resolution) && (
                  <Section
                    icon={<AlertTriangle className="h-4 w-4" />}
                    title="Impact & Resolution"
                  >
                    <div className="grid grid-cols-1 gap-3">
                      {incident.impact && (
                        <DetailItem label="Impact" value={incident.impact} />
                      )}
                      {incident.resolution && (
                        <DetailItem
                          label="Resolution"
                          value={incident.resolution}
                        />
                      )}
                    </div>
                  </Section>
                )}

                {/* Timeline */}
                <Section
                  icon={<Clock className="h-4 w-4" />}
                  title={`Timeline (${(incident.timeline || []).length})`}
                >
                  {(incident.timeline || []).length === 0 ? (
                    <p className="text-xs text-zinc-500">No timeline events.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(incident.timeline || [])
                        .sort(
                          (a: IncidentTimeline, b: IncidentTimeline) =>
                            new Date(b.eventDate).getTime() -
                            new Date(a.eventDate).getTime()
                        )
                        .map((event: IncidentTimeline) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-2.5 py-1.5"
                          >
                            <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500/60 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-zinc-300">
                                {event.event}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {formatDistanceToNow(
                                  new Date(event.eventDate),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Section>

                {/* Linked Alerts */}
                <Section
                  icon={<ShieldAlert className="h-4 w-4" />}
                  title={`Linked Alerts (${(incident.alerts || []).length})`}
                >
                  {(incident.alerts || []).length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No alerts linked to this incident.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {(incident.alerts || []).map(
                        (link: IncidentAlertLink) => (
                          <button
                            key={link.id}
                            onClick={() => {
                              if (link.alertId) handleOpenAlert(link.alertId)
                            }}
                            className="w-full flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 hover:bg-zinc-800/60 transition-colors text-left group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {link.alert ? (
                                <>
                                  <SeverityBadge
                                    severity={link.alert.severity}
                                    size="sm"
                                  />
                                  <span className="text-xs text-zinc-300 truncate">
                                    {link.alert.title}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-zinc-400 font-mono">
                                  {link.alertId}
                                </span>
                              )}
                            </div>
                            <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </Section>

                {/* Assignees */}
                <Section
                  icon={<Users className="h-4 w-4" />}
                  title={`Assignees (${(incident.assignments || []).length})`}
                >
                  {(incident.assignments || []).length === 0 ? (
                    <p className="text-xs text-zinc-500">No assignees yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(incident.assignments || []).map(
                        (assignment: IncidentAssignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-medium text-zinc-200">
                                {assignment.user?.name
                                  ?.charAt(0)
                                  .toUpperCase() || 'U'}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-zinc-300">
                                  {assignment.user?.name || 'Unknown'}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1.5"
                                >
                                  {assignment.role}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {formatDistanceToNow(
                                new Date(assignment.assignedAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </Section>

                {/* Metadata */}
                <Section
                  icon={<BookOpen className="h-4 w-4" />}
                  title="Details"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem
                      label="Created"
                      value={format(
                        new Date(incident.createdAt),
                        'MMM d, yyyy HH:mm'
                      )}
                    />
                    <DetailItem
                      label="Updated"
                      value={format(
                        new Date(incident.updatedAt),
                        'MMM d, yyyy HH:mm'
                      )}
                    />
                    {incident.dueAt && (
                      <DetailItem
                        label="Due"
                        value={format(
                          new Date(incident.dueAt),
                          'MMM d, yyyy HH:mm'
                        )}
                      />
                    )}
                    {incident.closedAt && (
                      <DetailItem
                        label="Closed"
                        value={format(
                          new Date(incident.closedAt),
                          'MMM d, yyyy HH:mm'
                        )}
                      />
                    )}
                  </div>
                </Section>

                {/* Comments */}
                <Section
                  icon={<MessageSquare className="h-4 w-4" />}
                  title={`Comments (${comments.length})`}
                >
                  {comments.length > 0 ? (
                    <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                      {comments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2.5"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-300">
                                {c.user?.name?.charAt(0).toUpperCase() || 'A'}
                              </div>
                              <span className="text-xs font-medium text-zinc-300">
                                {c.user?.name || 'Analyst'}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {c.createdAt
                                ? formatDistanceToNow(new Date(c.createdAt), {
                                    addSuffix: true,
                                  })
                                : ''}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 pl-6.5">
                            {c.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 mb-3">No comments yet.</p>
                  )}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-20 text-xs bg-zinc-900/50 border-zinc-800 resize-none"
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          commentText.trim()
                        ) {
                          e.preventDefault()
                          handleSubmitComment()
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || submittingComment}
                    >
                      {submittingComment ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Add Comment
                    </Button>
                  </div>
                </Section>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-zinc-500">
            No incident selected.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Helper Sub-components ────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-emerald-400">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          'text-sm text-zinc-200',
          mono && 'font-mono text-xs'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  loading,
  disabled,
  variant = 'default',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'default' | 'warning' | 'success' | 'ghost' | 'past'
}) {
  const variantClass = {
    default:
      'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
    warning:
      'bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border-amber-500/30',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
    ghost:
      'bg-transparent hover:bg-zinc-800/50 text-zinc-400 border-zinc-700',
    past: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30',
  }[variant]

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'h-7 gap-1.5 text-[11px] font-medium border transition-all',
        variantClass,
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {loading ? (
        <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      ) : (
        icon
      )}
      {label}
    </Button>
  )
}

function PriorityIcon({ priority }: { priority: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    p1: {
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
    },
    p2: {
      icon: <ShieldAlert className="h-5 w-5" />,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    p3: {
      icon: <Shield className="h-5 w-5" />,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    },
    p4: {
      icon: <ShieldCheck className="h-5 w-5" />,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
  }
  const c = config[priority] || config.p4
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border shrink-0',
        c.color
      )}
    >
      {c.icon}
    </div>
  )
}
