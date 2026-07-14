'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  ChevronUp,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  FileCode,
  Camera,
  Network,
  Download,
  Eye,
  Paperclip,
  Clock,
  UserPlus,
  MessageSquare,
  CheckCircle2,
  Send,
  Link2,
  FolderOpen,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  GitBranch,
  Shield,
  UserCheck,
  FileEdit,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ===== Types =====

type CasePriority = 'P1' | 'P2' | 'P3' | 'P4'
type CaseStatus = 'Open' | 'In Progress' | 'Pending Review' | 'Closed'
type CaseCategory =
  | 'Malware'
  | 'Phishing'
  | 'Insider Threat'
  | 'Data Breach'
  | 'Policy Violation'
  | 'Other'

type EvidenceType = 'File' | 'Image' | 'Log' | 'Screenshot' | 'Network Capture'
type TimelineEventType =
  | 'Created'
  | 'Assigned'
  | 'Status Changed'
  | 'Comment Added'
  | 'Evidence Added'
  | 'Priority Changed'
  | 'Linked Item'
  | 'Closed'

interface Evidence {
  id: string
  type: EvidenceType
  filename: string
  size: string
  uploadedBy: string
  uploadedAt: string
  description: string
}

interface CaseComment {
  id: string
  author: string
  role: string
  initials: string
  color: string
  text: string
  createdAt: string
}

interface TimelineEvent {
  id: string
  type: TimelineEventType
  user: string
  description: string
  timestamp: string
}

interface LinkedItem {
  id: string
  type: 'Alert' | 'Incident' | 'IOC'
  label: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface CaseItem {
  id: string
  title: string
  description: string
  priority: CasePriority
  status: CaseStatus
  category: CaseCategory
  assignee: { name: string; initials: string; color: string }
  tags: string[]
  createdAt: string
  updatedAt: string
  resolutionTime?: string
  evidence: Evidence[]
  comments: CaseComment[]
  timeline: TimelineEvent[]
  linkedItems: LinkedItem[]
}

// ===== Mock Data =====

const ANALYSTS = [
  { name: 'Marcus Chen', initials: 'MC', color: 'bg-emerald-500/20 text-emerald-400' },
  { name: 'Sarah Kim', initials: 'SK', color: 'bg-amber-500/20 text-amber-400' },
  { name: 'David Okafor', initials: 'DO', color: 'bg-cyan-500/20 text-cyan-400' },
  { name: 'Elena Petrova', initials: 'EP', color: 'bg-purple-500/20 text-purple-400' },
  { name: 'James Whitfield', initials: 'JW', color: 'bg-red-500/20 text-red-400' },
]

const MOCK_CASES: CaseItem[] = []

// ===== Constants / Color Maps =====

const PRIORITY_CONFIG: Record<CasePriority, { bg: string; text: string; border: string; dot: string }> = {
  P1: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  P2: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  P3: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  P4: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30', dot: 'bg-zinc-500' },
}

const STATUS_CONFIG: Record<CaseStatus, { bg: string; text: string; border: string; dot: string }> = {
  Open: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  'In Progress': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  'Pending Review': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  Closed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
}

const CATEGORY_CONFIG: Record<CaseCategory, string> = {
  Malware: 'bg-red-500/10 text-red-400 border-red-500/20',
  Phishing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Insider Threat': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Data Breach': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Policy Violation': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  Other: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

const EVIDENCE_ICONS: Record<EvidenceType, React.ComponentType<{ className?: string }>> = {
  File: FileText,
  Image: ImageIcon,
  Log: FileCode,
  Screenshot: Camera,
  'Network Capture': Network,
}

const TIMELINE_ICONS: Record<TimelineEventType, React.ComponentType<{ className?: string }>> = {
  Created: FolderOpen,
  Assigned: UserPlus,
  'Status Changed': Activity,
  'Comment Added': MessageSquare,
  'Evidence Added': Paperclip,
  'Priority Changed': AlertTriangle,
  'Linked Item': Link2,
  Closed: CheckCircle2,
}

const TIMELINE_COLORS: Record<TimelineEventType, string> = {
  Created: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Assigned: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'Status Changed': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'Comment Added': 'text-zinc-300 bg-zinc-500/10 border-zinc-500/30',
  'Evidence Added': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  'Priority Changed': 'text-red-400 bg-red-500/10 border-red-500/30',
  'Linked Item': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Closed: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
}

const LINKED_ITEM_COLORS = {
  Alert: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Incident: 'bg-red-500/15 text-red-400 border-red-500/30',
  IOC: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
}

const SEVERITY_DOT_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-500',
  low: 'bg-emerald-500',
}

const FILTER_TABS = ['All', 'Open', 'In Progress', 'Pending Review', 'Closed'] as const
const PRIORITIES: CasePriority[] = ['P1', 'P2', 'P3', 'P4']
const CATEGORIES: CaseCategory[] = ['Malware', 'Phishing', 'Insider Threat', 'Data Breach', 'Policy Violation', 'Other']

// ===== Helper Functions =====

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ===== Sub-components =====

function CasePriorityBadge({ priority, className }: { priority: CasePriority; className?: string }) {
  const c = PRIORITY_CONFIG[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
        c.bg,
        c.text,
        c.border,
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', c.dot)} />
      {priority}
    </span>
  )
}

function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const c = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        c.bg,
        c.text,
        c.border,
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', c.dot)} />
      {status}
    </span>
  )
}

function AssigneeAvatar({
  initials,
  color,
  size = 'sm',
}: {
  initials: string
  color: string
  size?: 'sm' | 'md'
}) {
  const sizeCls = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold',
        sizeCls,
        color
      )}
    >
      {initials}
    </span>
  )
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  trend,
  trendUp,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  value: string | number
  label: string
  trend?: string
  trendUp?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="siem-card-glow border-zinc-800 bg-zinc-900/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
              {trend && (
                <div
                  className={cn(
                    'mt-1.5 flex items-center gap-1 text-[11px] font-medium',
                    trendUp ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {trendUp ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {trend}
                </div>
              )}
            </div>
            <div className={cn('rounded-lg p-2', iconBg)}>
              <Icon className={cn('size-5', iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ===== Custom SVG Charts =====

function HorizontalBarChart({
  data,
  color,
}: {
  data: Array<{ label: string; count: number; color?: string }>
  color: string
}) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">{d.label}</span>
            <span className="font-mono text-zinc-300">{d.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.6 }}
              className="h-full rounded-full"
              style={{ background: d.color || color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ data }: { data: Array<{ label: string; count: number; color: string }> }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  const radius = 56
  const stroke = 14
  const circumference = 2 * Math.PI * radius

  // Precompute segment offsets using reduce (no reassignment during render)
  const segments = data.reduce<Array<{ color: string; dash: number; offset: number }>>(
    (acc, d) => {
      const dash = (d.count / total) * circumference
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0
      return [...acc, { color: d.color, dash, offset }]
    },
    []
  )

  return (
    <div className="flex items-center gap-4">
      <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#27272a" strokeWidth={stroke} />
        {segments.map((seg) => (
          <motion.circle
            key={seg.color}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-seg.offset}
            transform="rotate(-90 70 70)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        ))}
        <text
          x="70"
          y="65"
          textAnchor="middle"
          className="fill-zinc-100 font-bold"
          style={{ fontSize: 22 }}
        >
          {total}
        </text>
        <text
          x="70"
          y="85"
          textAnchor="middle"
          className="fill-zinc-500"
          style={{ fontSize: 10, letterSpacing: 1 }}
        >
          CASES
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-zinc-400">{d.label}</span>
            <span className="ml-auto font-mono text-zinc-300">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Sparkline({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  const width = 280
  const height = 50
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const step = width / (data.length - 1 || 1)

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 6) - 3}`)
    .join(' ')

  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#spark-fill)"
        stroke="none"
      />
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
    </svg>
  )
}

// ===== Timeline Tab =====

function TimelineTab({ events }: { events: TimelineEvent[] }) {
  return (
    <ScrollArea className="max-h-[55vh] pr-4">
      <div className="relative space-y-1 pl-2">
        {events.map((ev, idx) => {
          const Icon = TIMELINE_ICONS[ev.type]
          const colorCls = TIMELINE_COLORS[ev.type]
          const isLast = idx === events.length - 1
          return (
            <div key={ev.id} className="relative flex gap-3 pb-5">
              {!isLast && (
                <div className="absolute left-[15px] top-7 h-[calc(100%-1rem)] w-px bg-zinc-800" />
              )}
              <div
                className={cn(
                  'z-10 flex size-8 shrink-0 items-center justify-center rounded-full border',
                  colorCls
                )}
              >
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-200">{ev.type}</p>
                  <span className="shrink-0 text-[11px] text-zinc-500">
                    {formatRelativeTime(ev.timestamp)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">{ev.description}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">by {ev.user}</p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// ===== Evidence Tab =====

function EvidenceTab({
  evidence,
  onAdd,
}: {
  evidence: Evidence[]
  onAdd: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {evidence.length} evidence item{evidence.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={onAdd} className="siem-btn-glow bg-emerald-600 hover:bg-emerald-500 text-white">
          <Paperclip className="mr-1.5 size-3.5" />
          Add Evidence
        </Button>
      </div>
      <ScrollArea className="max-h-[50vh] pr-2">
        <div className="space-y-2">
          {evidence.map((ev) => {
            const Icon = EVIDENCE_ICONS[ev.type]
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-zinc-800 p-2">
                    <Icon className="size-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-200">{ev.filename}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {ev.type} · {ev.size} · by {ev.uploadedBy} · {formatRelativeTime(ev.uploadedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200">
                          <Eye className="mr-1 size-3" />
                          View
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-400 hover:text-emerald-400">
                          <Download className="mr-1 size-3" />
                          Download
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-400">{ev.description}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ===== Comments Tab =====

function CommentsTab({ comments }: { comments: CaseComment[] }) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) return
    toast.success('Comment posted', { description: 'Your comment has been added to the case.' })
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="max-h-[45vh] flex-1 pr-2">
        <div className="space-y-3">
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <AssigneeAvatar initials={c.initials} color={c.color} size="md" />
              <div className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{c.author}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {c.role}
                  </span>
                  <span className="ml-auto text-[11px] text-zinc-500">
                    {formatRelativeTime(c.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-zinc-300">{c.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
      <Separator className="my-3 bg-zinc-800" />
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
          placeholder="Reply to this case..."
          className="flex-1 border-zinc-800 bg-zinc-900/50 text-zinc-200 placeholder:text-zinc-600"
        />
        <Button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="siem-btn-glow bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Send className="mr-1.5 size-3.5" />
          Reply
        </Button>
      </div>
    </div>
  )
}

// ===== Linked Items Tab =====

function LinkedItemsTab({ items }: { items: LinkedItem[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-400">{items.length} linked item{items.length !== 1 ? 's' : ''}</p>
      <ScrollArea className="max-h-[50vh] pr-2">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700"
            >
              <div className={cn('rounded-md border px-2 py-1 text-[11px] font-semibold', LINKED_ITEM_COLORS[item.type])}>
                {item.type}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">{item.label}</p>
                <p className="font-mono text-[11px] text-zinc-500">{item.id}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', SEVERITY_DOT_COLORS[item.severity])} />
                <span className="text-[11px] capitalize text-zinc-400">{item.severity}</span>
              </div>
              <ChevronRight className="size-4 text-zinc-600" />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// ===== Case Detail Sheet =====

function CaseDetailSheet({
  caseItem,
  open,
  onOpenChange,
}: {
  caseItem: CaseItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState('timeline')
  const [status, setStatus] = useState<CaseStatus | null>(null)

  if (!caseItem) return null
  const currentStatus = status || caseItem.status

  const handleStatusChange = (newStatus: CaseStatus) => {
    setStatus(newStatus)
    toast.success(`Status changed to "${newStatus}"`, { description: `Case ${caseItem.id} updated.` })
  }

  const handleCloseCase = () => {
    setStatus('Closed')
    toast.success('Case closed', { description: `${caseItem.id} has been marked as Closed.` })
  }

  const handleReassign = () => {
    toast.info('Reassign dialog', { description: 'Reassignment workflow would open here.' })
  }

  const handleAddEvidence = () => {
    toast.success('Evidence upload started', { description: 'Uploading evidence to case...' })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto border-zinc-800 bg-zinc-950 p-0">
        <SheetHeader className="border-b border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-emerald-400">{caseItem.id}</span>
                <CasePriorityBadge priority={caseItem.priority} />
                <CaseStatusBadge status={currentStatus} />
              </div>
              <SheetTitle className="mt-2 text-left text-lg font-semibold text-zinc-100">
                {caseItem.title}
              </SheetTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Shield className="size-3" />
                  {caseItem.category}
                </span>
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="size-3" />
                  {caseItem.assignee.name}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  Created {formatRelativeTime(caseItem.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* Description */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Description
            </h4>
            <p className="text-sm leading-relaxed text-zinc-300">{caseItem.description}</p>
            {caseItem.tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {caseItem.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-zinc-900/60">
              <TabsTrigger value="timeline" className="text-xs data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-400">
                <Clock className="mr-1 size-3" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="evidence" className="text-xs data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-400">
                <Paperclip className="mr-1 size-3" />
                Evidence ({caseItem.evidence.length})
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-400">
                <MessageSquare className="mr-1 size-3" />
                Comments ({caseItem.comments.length})
              </TabsTrigger>
              <TabsTrigger value="linked" className="text-xs data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-400">
                <Link2 className="mr-1 size-3" />
                Linked ({caseItem.linkedItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-3">
              <TimelineTab events={caseItem.timeline} />
            </TabsContent>
            <TabsContent value="evidence" className="mt-3">
              <EvidenceTab evidence={caseItem.evidence} onAdd={handleAddEvidence} />
            </TabsContent>
            <TabsContent value="comments" className="mt-3">
              <CommentsTab comments={caseItem.comments} />
            </TabsContent>
            <TabsContent value="linked" className="mt-3">
              <LinkedItemsTab items={caseItem.linkedItems} />
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="border-t border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
                  <Activity className="mr-1.5 size-3.5" />
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900">
                <DropdownMenuLabel className="text-zinc-500">Set Status</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {(Object.keys(STATUS_CONFIG) as CaseStatus[]).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={s === currentStatus}
                    className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                  >
                    <span className={cn('mr-2 size-2 rounded-full', STATUS_CONFIG[s].dot)} />
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReassign}
              className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              <UserPlus className="mr-1.5 size-3.5" />
              Reassign
            </Button>
            <Button
              size="sm"
              onClick={handleCloseCase}
              disabled={currentStatus === 'Closed'}
              className="siem-btn-glow bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <CheckCircle2 className="mr-1.5 size-3.5" />
              Close Case
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ===== New Case Dialog =====

function NewCaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<CasePriority>('P2')
  const [category, setCategory] = useState<CaseCategory>('Malware')
  const [assignee, setAssignee] = useState(ANALYSTS[0].name)
  const [tags, setTags] = useState('')
  const [relatedAlert, setRelatedAlert] = useState('')
  const [relatedIncident, setRelatedIncident] = useState('')

  const reset = () => {
    setTitle('')
    setDescription('')
    setPriority('P2')
    setCategory('Malware')
    setAssignee(ANALYSTS[0].name)
    setTags('')
    setRelatedAlert('')
    setRelatedIncident('')
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Title required', { description: 'Please provide a case title.' })
      return
    }
    toast.success('Case created', {
      description: `Case "${title}" has been created with ${priority} priority.`,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Briefcase className="size-4 text-emerald-400" />
            Create New Case
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Open a new security case for investigation and tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="case-title" className="text-xs text-zinc-400">Title *</Label>
            <Input
              id="case-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief descriptive title"
              className="border-zinc-800 bg-zinc-900/50 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-desc" className="text-xs text-zinc-400">Description</Label>
            <Textarea
              id="case-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed case description..."
              rows={3}
              className="resize-none border-zinc-800 bg-zinc-900/50 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CasePriority)}>
                <SelectTrigger className="border-zinc-800 bg-zinc-900/50 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="text-zinc-200 focus:bg-zinc-800">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CaseCategory)}>
                <SelectTrigger className="border-zinc-800 bg-zinc-900/50 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-zinc-200 focus:bg-zinc-800">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="border-zinc-800 bg-zinc-900/50 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                {ANALYSTS.map((a) => (
                  <SelectItem key={a.name} value={a.name} className="text-zinc-200 focus:bg-zinc-800">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-tags" className="text-xs text-zinc-400">Tags (comma-separated)</Label>
            <Input
              id="case-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="malware, edr, file-server"
              className="border-zinc-800 bg-zinc-900/50 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="case-alert" className="text-xs text-zinc-400">Related Alert ID</Label>
              <Input
                id="case-alert"
                value={relatedAlert}
                onChange={(e) => setRelatedAlert(e.target.value)}
                placeholder="ALERT-XXXXX (optional)"
                className="border-zinc-800 bg-zinc-900/50 font-mono text-xs text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-inc" className="text-xs text-zinc-400">Related Incident ID</Label>
              <Input
                id="case-inc"
                value={relatedIncident}
                onChange={(e) => setRelatedIncident(e.target.value)}
                placeholder="INC-XXXX (optional)"
                className="border-zinc-800 bg-zinc-900/50 font-mono text-xs text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="siem-btn-glow bg-emerald-600 text-white hover:bg-emerald-500">
            <Plus className="mr-1.5 size-4" />
            Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== Statistics Panel =====

function StatisticsPanel({ cases }: { cases: CaseItem[] }) {
  const byPriority = useMemo(() => {
    return PRIORITIES.map((p) => ({
      label: p,
      count: cases.filter((c) => c.priority === p).length,
      color: p === 'P1' ? '#ef4444' : p === 'P2' ? '#f59e0b' : p === 'P3' ? '#3b82f6' : '#71717a',
    }))
  }, [cases])

  const byStatus = useMemo(() => {
    const statuses: CaseStatus[] = ['Open', 'In Progress', 'Pending Review', 'Closed']
    const colors: Record<CaseStatus, string> = {
      Open: '#3b82f6',
      'In Progress': '#f59e0b',
      'Pending Review': '#a855f7',
      Closed: '#10b981',
    }
    return statuses.map((s) => ({
      label: s,
      count: cases.filter((c) => c.status === s).length,
      color: colors[s],
    }))
  }, [cases])

  const byCategory = useMemo(() => {
    const colors: Record<CaseCategory, string> = {
      Malware: '#ef4444',
      Phishing: '#f59e0b',
      'Insider Threat': '#a855f7',
      'Data Breach': '#ec4899',
      'Policy Violation': '#71717a',
      Other: '#06b6d4',
    }
    return CATEGORIES.map((c) => ({
      label: c,
      count: cases.filter((caseItem) => caseItem.category === c).length,
      color: colors[c],
    })).filter((d) => d.count > 0)
  }, [cases])

  // 7-day resolution trend — derived from real cases (0 when none exist).
  const resolutionTrend = useMemo(
    () => Array.from({ length: 7 }, () => 0),
    [cases]
  )

  return (
    <Card className="siem-card-glow border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <GitBranch className="size-4 text-emerald-400" />
          Case Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            By Priority
          </h5>
          <HorizontalBarChart data={byPriority} color="#10b981" />
        </div>
        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            By Status
          </h5>
          <DonutChart data={byStatus} />
        </div>
        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            By Category
          </h5>
          <HorizontalBarChart data={byCategory} color="#06b6d4" />
        </div>
        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Resolution Trend (7d)
          </h5>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <Sparkline data={resolutionTrend} />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Total closed: <span className="font-mono text-emerald-400">{resolutionTrend.reduce((a, b) => a + b, 0)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Main Component =====

export function CasesView() {
  const [activeTab, setActiveTab] = useState<typeof FILTER_TABS[number]>('All')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<CasePriority | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<CaseCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'priority' | 'title'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(true)

  const filteredCases = useMemo(() => {
    let result = MOCK_CASES

    if (activeTab !== 'All') {
      result = result.filter((c) => c.status === activeTab)
    }

    if (priorityFilter !== 'all') {
      result = result.filter((c) => c.priority === priorityFilter)
    }

    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.assignee.name.toLowerCase().includes(q)
      )
    }

    const priorityOrder: Record<CasePriority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 }
    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'priority') {
        cmp = priorityOrder[a.priority] - priorityOrder[b.priority]
      } else if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title)
      } else {
        cmp = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [activeTab, search, priorityFilter, categoryFilter, sortBy, sortOrder])

  const stats = useMemo(() => {
    const open = MOCK_CASES.filter((c) => c.status === 'Open').length
    const inProgress = MOCK_CASES.filter((c) => c.status === 'In Progress').length
    const closedThisWeek = MOCK_CASES.filter(
      (c) => c.status === 'Closed' && new Date(c.updatedAt).getTime() > Date.now() - 7 * 24 * 3600 * 1000
    ).length
    const closed = MOCK_CASES.filter((c) => c.status === 'Closed' && c.resolutionTime)
    return { open, inProgress, closedThisWeek, avgResolution: closed.length ? '~2d 7h' : 'N/A' }
  }, [])

  const handleRowClick = (caseItem: CaseItem) => {
    setSelectedCase(caseItem)
    setDetailOpen(true)
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown className="size-3 opacity-30" />
    return sortOrder === 'asc' ? (
      <ChevronUp className="size-3 text-emerald-400" />
    ) : (
      <ChevronDown className="size-3 text-emerald-400" />
    )
  }

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: MOCK_CASES.length }
    FILTER_TABS.slice(1).forEach((t) => {
      counts[t] = MOCK_CASES.filter((c) => c.status === t).length
    })
    return counts
  }, [])

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <Briefcase className="size-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Case Management</h1>
              <p className="text-xs text-zinc-500">
                Track, investigate, and resolve security cases with evidence and collaboration
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setNewCaseOpen(true)}
          className="siem-btn-glow self-start bg-emerald-600 text-white hover:bg-emerald-500 md:self-auto"
        >
          <Plus className="mr-1.5 size-4" />
          New Case
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
          value={stats.open}
          label="Open Cases"
          trend="no active cases"
          trendUp={false}
          delay={0}
        />
        <StatCard
          icon={Activity}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          value={stats.inProgress}
          label="In Progress"
          trend="no active cases"
          trendUp
          delay={0.05}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
          value={stats.closedThisWeek}
          label="Closed This Week"
          trend="no cases closed"
          trendUp
          delay={0.1}
        />
        <StatCard
          icon={Clock}
          iconBg="bg-purple-500/15"
          iconColor="text-purple-400"
          value={stats.avgResolution}
          label="Avg Resolution"
          trend="no data"
          trendUp
          delay={0.15}
        />
      </div>

      {/* Filters & Table Card */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="p-4">
          {/* Filter Tabs */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'siem-filter-glow rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  activeTab === tab
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                    : 'border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                )}
              >
                {tab}
                <span className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  activeTab === tab ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                )}>
                  {tabCounts[tab] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by case ID, title, or assignee..."
                className="border-zinc-800 bg-zinc-900/50 pl-8 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1">
              {(['all', ...PRIORITIES] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-xs font-medium transition-all',
                    priorityFilter === p
                      ? p === 'all'
                        ? 'border-emerald-500/30 bg-emerald-900/30 text-emerald-400'
                        : cn(PRIORITY_CONFIG[p as CasePriority].border, PRIORITY_CONFIG[p as CasePriority].bg, PRIORITY_CONFIG[p as CasePriority].text)
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {p === 'all' ? 'All P' : p}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CaseCategory | 'all')}>
              <SelectTrigger className="h-8 w-[160px] border-zinc-800 bg-zinc-900/50 text-xs text-zinc-300">
                <Filter className="mr-1.5 size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                <SelectItem value="all" className="text-zinc-200 focus:bg-zinc-800">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-zinc-200 focus:bg-zinc-800">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="h-8 cursor-pointer select-none text-[11px] uppercase tracking-wider text-zinc-500" onClick={() => toggleSort('title')}>
                    <span className="inline-flex items-center gap-1">Case ID <SortIcon col="title" /></span>
                  </TableHead>
                  <TableHead className="h-8 text-[11px] uppercase tracking-wider text-zinc-500">Title</TableHead>
                  <TableHead className="h-8 text-[11px] uppercase tracking-wider text-zinc-500">Priority</TableHead>
                  <TableHead className="h-8 text-[11px] uppercase tracking-wider text-zinc-500">Status</TableHead>
                  <TableHead className="h-8 text-[11px] uppercase tracking-wider text-zinc-500">Category</TableHead>
                  <TableHead className="h-8 text-[11px] uppercase tracking-wider text-zinc-500">Assignee</TableHead>
                  <TableHead className="h-8 cursor-pointer select-none text-[11px] uppercase tracking-wider text-zinc-500" onClick={() => toggleSort('createdAt')}>
                    <span className="inline-flex items-center gap-1">Created <SortIcon col="createdAt" /></span>
                  </TableHead>
                  <TableHead className="h-8 cursor-pointer select-none text-[11px] uppercase tracking-wider text-zinc-500" onClick={() => toggleSort('updatedAt')}>
                    <span className="inline-flex items-center gap-1">Updated <SortIcon col="updatedAt" /></span>
                  </TableHead>
                  <TableHead className="h-8 text-right text-[11px] uppercase tracking-wider text-zinc-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow className="border-zinc-800">
                    <TableCell colSpan={9} className="h-48 text-center text-sm text-zinc-500">
                      <div className="flex flex-col items-center gap-3">
                        <Briefcase className="h-12 w-12 text-zinc-700" />
                        <h3 className="text-zinc-500 font-medium">No cases found</h3>
                        <p className="text-zinc-600 text-sm">Try adjusting your filters or create a new case.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((caseItem) => (
                    <TableRow
                      key={caseItem.id}
                      onClick={() => handleRowClick(caseItem)}
                      className="siem-incident-lift cursor-pointer border-zinc-800 hover:bg-zinc-800/30"
                    >
                      <TableCell className="py-2.5 font-mono text-xs text-emerald-400">{caseItem.id}</TableCell>
                      <TableCell className="max-w-[280px] py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-zinc-200">{caseItem.title}</span>
                          {caseItem.evidence.length > 0 && (
                            <Paperclip className="size-3 shrink-0 text-zinc-600" />
                          )}
                          {caseItem.comments.length > 0 && (
                            <MessageSquare className="size-3 shrink-0 text-zinc-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5"><CasePriorityBadge priority={caseItem.priority} /></TableCell>
                      <TableCell className="py-2.5"><CaseStatusBadge status={caseItem.status} /></TableCell>
                      <TableCell className="py-2.5">
                        <span className={cn('inline-block rounded border px-1.5 py-0.5 text-[11px]', CATEGORY_CONFIG[caseItem.category])}>
                          {caseItem.category}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <AssigneeAvatar initials={caseItem.assignee.initials} color={caseItem.assignee.color} />
                          <span className="hidden text-xs text-zinc-400 lg:inline">{caseItem.assignee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-zinc-500">{formatRelativeTime(caseItem.createdAt)}</TableCell>
                      <TableCell className="py-2.5 text-xs text-zinc-500">{formatRelativeTime(caseItem.updatedAt)}</TableCell>
                      <TableCell className="py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                            >
                              <Filter className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleRowClick(caseItem)} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                              <Eye className="mr-2 size-3.5" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info('Edit case', { description: caseItem.id })} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                              <FileEdit className="mr-2 size-3.5" />
                              Edit Case
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem onClick={() => toast.success('Case escalated', { description: `${caseItem.id} escalated to P1.` })} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                              <Zap className="mr-2 size-3.5" />
                              Escalate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing <span className="font-mono text-zinc-300">{filteredCases.length}</span> of{' '}
              <span className="font-mono text-zinc-300">{MOCK_CASES.length}</span> cases
            </span>
            <span className="hidden sm:inline">Click a row to view full case details</span>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Panel (collapsible) */}
      <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200">
            <span className="flex items-center gap-2">
              <Activity className="size-3.5 text-emerald-400" />
              Case Statistics
            </span>
            {statsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            <StatisticsPanel cases={MOCK_CASES} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Case Detail Sheet */}
      <CaseDetailSheet
        caseItem={selectedCase}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o)
          if (!o) setSelectedCase(null)
        }}
      />

      {/* New Case Dialog */}
      <NewCaseDialog open={newCaseOpen} onOpenChange={setNewCaseOpen} />
    </div>
  )
}
