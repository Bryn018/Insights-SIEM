'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronUp,
  ChevronDown,
  Clock,
  Code,
  Crosshair,
  FileText,
  Flag,
  Link2,
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  Tag,
  User,
  Zap,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { SeverityBadge, StatusBadge } from '@/components/siem/status-badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Alert, Comment } from '@/lib/types'

interface AlertDetailDrawerProps {
  alertId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

/**
 * Dedicated Alert Detail Drawer.
 *
 * A focused, full-height side panel that shows everything about a single
 * alert: description, MITRE ATT&CK, raw log, timeline of occurrences,
 * comments, and quick actions (acknowledge, escalate, suppress, assign,
 * link to incident). Replaces the inline-expanded row for a richer UX.
 */
export function AlertDetailDrawer({
  alertId,
  open,
  onOpenChange,
  onRefresh,
}: AlertDetailDrawerProps) {
  const [alert, setAlert] = useState<Alert | null>(null)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [rawLogOpen, setRawLogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [linkIncidentOpen, setLinkIncidentOpen] = useState(false)
  const [incidentId, setIncidentId] = useState('')

  // ─── Fetch alert detail ────────────────────────────────────────────────
  const fetchAlert = useCallback(async () => {
    if (!alertId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/alerts/${alertId}`)
      if (!res.ok) throw new Error('Failed to fetch alert')
      const data = await res.json()
      setAlert(data)
      // Comments may be embedded in the response or fetched separately
      if (data.comments) setComments(data.comments)
    } catch {
      toast.error('Failed to load alert details')
    } finally {
      setLoading(false)
    }
  }, [alertId])

  useEffect(() => {
    if (open && alertId) {
      fetchAlert()
    }
  }, [open, alertId, fetchAlert])

  // ─── Actions ───────────────────────────────────────────────────────────
  const runAction = useCallback(
    async (
      action: 'acknowledge' | 'escalate' | 'suppress' | 'assign' | 'resolve',
      body?: Record<string, unknown>
    ) => {
      if (!alertId) return
      setActionLoading(action)
      try {
        let endpoint = `/api/alerts/${alertId}`
        let method = 'PATCH'
        let payload: Record<string, unknown> = {}

        if (action === 'acknowledge') {
          payload = { status: 'acknowledged' }
        } else if (action === 'resolve') {
          payload = { status: 'resolved' }
        } else if (action === 'escalate') {
          endpoint += '/escalate'
          method = 'POST'
          payload = body || { reason: 'Manual escalation via detail drawer' }
        } else if (action === 'suppress') {
          endpoint += '/suppress'
          method = 'POST'
          payload = body || { reason: 'Manual suppression via detail drawer' }
        } else if (action === 'assign') {
          endpoint += '/assign'
          method = 'POST'
          payload = body || { userId: 'default-admin', action: 'assigned' }
        }

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Failed to ${action} alert`)
        const pastTense: Record<string, string> = {
          acknowledge: 'acknowledged',
          escalate: 'escalated',
          suppress: 'suppressed',
          assign: 'assigned',
          resolve: 'resolved',
          investigate: 'investigated',
        }
        toast.success(`Alert ${pastTense[action] || `${action}d`} successfully`)
        await fetchAlert()
        onRefresh?.()
      } catch {
        toast.error(`Failed to ${action} alert`)
      } finally {
        setActionLoading(null)
      }
    },
    [alertId, fetchAlert, onRefresh]
  )

  // ─── Comment submit ────────────────────────────────────────────────────
  const handleSubmitComment = useCallback(async () => {
    if (!alertId || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText.trim() }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      const newComment = await res.json()
      setComments((prev) => [newComment, ...prev])
      setCommentText('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }, [alertId, commentText])

  // ─── Link to incident ──────────────────────────────────────────────────
  const handleLinkIncident = useCallback(async () => {
    if (!alertId || !incidentId.trim()) return
    setActionLoading('link')
    try {
      const res = await fetch(`/api/incidents/${incidentId.trim()}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      })
      if (!res.ok) throw new Error('Failed to link alert to incident')
      toast.success('Alert linked to incident')
      setLinkIncidentOpen(false)
      setIncidentId('')
    } catch {
      toast.error('Failed to link alert to incident')
    } finally {
      setActionLoading(null)
    }
  }, [alertId, incidentId])

  // ─── Reset state on close ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setRawLogOpen(false)
      setCommentText('')
      setLinkIncidentOpen(false)
      setIncidentId('')
    }
  }, [open])

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-zinc-950 border-zinc-800 p-0 flex flex-col"
        >
          {/* Always render an accessible title */}
          <SheetTitle className="sr-only">
            {alert?.title || 'Alert details'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Detailed view of a security alert including description, MITRE
            ATT&CK mapping, raw log, comments, and response actions.
          </SheetDescription>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            </div>
          ) : alert ? (
            <>
              {/* Header */}
              <SheetHeader className="p-5 border-b border-zinc-800 space-y-3 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <SeverityIcon severity={alert.severity} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-zinc-100 leading-tight">
                        {alert.title}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                        ID: {alert.id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={alert.severity} size="sm" />
                  <StatusBadge status={alert.status} type="alert" />
                  {alert.category && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {alert.category}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] h-5">
                    {alert.source}
                  </Badge>
                </div>

                {/* Quick action bar */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <ActionButton
                    icon={<Check className="h-3 w-3" />}
                    label="Acknowledge"
                    loading={actionLoading === 'acknowledge'}
                    disabled={alert.status !== 'new'}
                    onClick={() => runAction('acknowledge')}
                    variant="default"
                  />
                  <ActionButton
                    icon={<ShieldAlert className="h-3 w-3" />}
                    label="Escalate"
                    loading={actionLoading === 'escalate'}
                    disabled={alert.status === 'escalated'}
                    onClick={() => runAction('escalate')}
                    variant="warning"
                  />
                  <ActionButton
                    icon={<Zap className="h-3 w-3" />}
                    label="Suppress"
                    loading={actionLoading === 'suppress'}
                    disabled={alert.status === 'suppressed'}
                    onClick={() => runAction('suppress')}
                    variant="ghost"
                  />
                  <ActionButton
                    icon={<User className="h-3 w-3" />}
                    label="Assign"
                    loading={actionLoading === 'assign'}
                    onClick={() => runAction('assign')}
                    variant="ghost"
                  />
                  <ActionButton
                    icon={<Check className="h-3 w-3" />}
                    label="Resolve"
                    loading={actionLoading === 'resolve'}
                    disabled={alert.status === 'resolved'}
                    onClick={() => runAction('resolve')}
                    variant="success"
                  />
                  <ActionButton
                    icon={<Link2 className="h-3 w-3" />}
                    label="Link"
                    onClick={() => setLinkIncidentOpen(true)}
                    variant="ghost"
                  />
                </div>
              </SheetHeader>

              {/* Scrollable content */}
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-5">
                  {/* Description */}
                  {alert.description && (
                    <Section icon={<FileText className="h-4 w-4" />} title="Description">
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {alert.description}
                      </p>
                    </Section>
                  )}

                  {/* MITRE ATT&CK */}
                  {(alert.mitreTactic || alert.mitreTechnique) && (
                    <Section icon={<Crosshair className="h-4 w-4" />} title="MITRE ATT&CK">
                      <div className="flex flex-wrap gap-2">
                        {alert.mitreTactic && (
                          <div className="flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1">
                            <Flag className="h-3 w-3 text-orange-400" />
                            <span className="text-xs font-medium text-orange-400">
                              {alert.mitreTactic}
                            </span>
                          </div>
                        )}
                        {alert.mitreTechnique && (
                          <div className="flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1">
                            <Crosshair className="h-3 w-3 text-purple-400" />
                            <span className="text-xs font-medium text-purple-400">
                              {alert.mitreTechnique}
                            </span>
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Network Context */}
                  <Section icon={<ArrowRight className="h-4 w-4" />} title="Network Context">
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem label="Source IP" value={alert.sourceIp || '—'} mono />
                      <DetailItem label="Destination IP" value={alert.destIp || '—'} mono />
                      <DetailItem label="Hostname" value={alert.hostname || '—'} mono />
                      <DetailItem
                        label="First Seen"
                        value={
                          alert.firstSeenAt
                            ? format(new Date(alert.firstSeenAt), 'MMM d, yyyy HH:mm:ss')
                            : '—'
                        }
                      />
                      <DetailItem
                        label="Last Seen"
                        value={
                          alert.lastSeenAt
                            ? format(new Date(alert.lastSeenAt), 'MMM d, yyyy HH:mm:ss')
                            : '—'
                        }
                      />
                      <DetailItem
                        label="Occurrences"
                        value={String(alert.occurrenceCount ?? 1)}
                        mono
                      />
                    </div>
                  </Section>

                  {/* Tags */}
                  {alert.tags && (
                    <Section icon={<Tag className="h-4 w-4" />} title="Tags">
                      <div className="flex flex-wrap gap-1.5">
                        {parseTags(alert.tags).map((tag, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] h-5 bg-zinc-800/50"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Raw Log */}
                  {alert.rawLog && (
                    <Section icon={<Code className="h-4 w-4" />} title="Raw Log">
                      <button
                        className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
                        onClick={() => setRawLogOpen((v) => !v)}
                      >
                        {rawLogOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        {rawLogOpen ? 'Hide' : 'Show'} raw log
                      </button>
                      {rawLogOpen && (
                        <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-900/80 border border-zinc-800 rounded-md p-3 overflow-x-auto max-h-64 overflow-y-auto">
                          {formatRawLog(alert.rawLog)}
                        </pre>
                      )}
                    </Section>
                  )}

                  {/* Comments */}
                  <Section
                    icon={<MessageSquare className="h-4 w-4" />}
                    title={`Comments (${comments.length})`}
                  >
                    {comments.length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2.5"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-zinc-300">
                                {c.user?.name || 'Analyst'}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {c.createdAt
                                  ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })
                                  : ''}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">{c.content}</p>
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
              No alert selected.
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Link to Incident Dialog */}
      <AlertDialog
        open={linkIncidentOpen}
        onOpenChange={setLinkIncidentOpen}
      >
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Link Alert to Incident
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Enter the incident ID to link this alert to. The alert will appear
              in the incident&apos;s linked alerts list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="incident-id" className="text-xs text-zinc-400">
              Incident ID
            </Label>
            <Input
              id="incident-id"
              placeholder="cmrf..."
              value={incidentId}
              onChange={(e) => setIncidentId(e.target.value)}
              className="mt-1.5 font-mono text-sm bg-zinc-900/50 border-zinc-800"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLinkIncident}
              disabled={!incidentId.trim() || actionLoading === 'link'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading === 'link' ? 'Linking...' : 'Link Alert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  variant?: 'default' | 'warning' | 'success' | 'ghost'
}) {
  const variantClass = {
    default: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
    warning: 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border-amber-500/30',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
    ghost: 'bg-transparent hover:bg-zinc-800/50 text-zinc-400 border-zinc-700',
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

function SeverityIcon({ severity }: { severity: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    critical: {
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
    },
    high: {
      icon: <ShieldAlert className="h-5 w-5" />,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    medium: {
      icon: <Shield className="h-5 w-5" />,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    },
    low: {
      icon: <Shield className="h-5 w-5" />,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    informational: {
      icon: <Clock className="h-5 w-5" />,
      color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
    },
  }
  const c = config[severity] || config.informational
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

// ─── Utilities ────────────────────────────────────────────────────────────

function parseTags(tags: string): string[] {
  if (!tags) return []
  try {
    const parsed = JSON.parse(tags)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Fall through to split
  }
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function formatRawLog(rawLog: string): string {
  try {
    return JSON.stringify(JSON.parse(rawLog), null, 2)
  } catch {
    return rawLog
  }
}
