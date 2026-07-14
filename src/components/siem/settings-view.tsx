'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Users,
  Plug,
  FileText,
  ScrollText,
  Bell,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Mail,
  MessageSquare,
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
  Pencil,
  UserPlus,
  Eye,
  Clock,
  Zap,
  Globe,
  Database,
  HardDrive,
  Download,
  Cloud,
  Server,
  Flame,
  Bug,
  Lock,
  Unlock,
  ChevronDown,
  ArrowUpDown,
  Timer,
  CircleDot,
  History as HistoryIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { useSIEMStore } from '@/lib/store'
import type { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'

// ===== Types =====

interface SettingsData {
  [key: string]: string
}

interface UserData {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  status: 'Active' | 'Inactive' | 'Locked'
  lastLoginAt: string | null
  createdAt: string
  department?: string
  loginHistory?: { time: string; ip: string; success: boolean }[]
  assignedPlaybooks?: string[]
  recentActions?: string[]
}

type AuditActionType = 'Create' | 'Update' | 'Delete' | 'Login' | 'Export'

interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  action: AuditActionType
  resource: string
  details: string
  ipAddress: string
}

type DataSourceStatus = 'Connected' | 'Disconnected' | 'Error'
type DataSourceType = 'SIEM' | 'EDR' | 'Firewall' | 'Cloud' | 'Threat Intel' | 'Log Collector'

interface DataSource {
  id: string
  name: string
  type: DataSourceType
  status: DataSourceStatus
  lastSync: string
  eventsPerDay: number
  icon: React.ReactNode
  iconColor: string
}

// ===== Role Badge Config =====

const roleConfig: Record<UserRole, { label: string; className: string; avatarBg: string; icon: React.ReactNode }> = {
  admin: {
    label: 'Admin',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    avatarBg: 'bg-red-500/20 text-red-300',
    icon: <Shield className="h-3 w-3" />,
  },
  analyst: {
    label: 'Analyst',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    avatarBg: 'bg-emerald-500/20 text-emerald-300',
    icon: <Eye className="h-3 w-3" />,
  },
  responder: {
    label: 'Analyst',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    avatarBg: 'bg-amber-500/20 text-amber-300',
    icon: <Zap className="h-3 w-3" />,
  },
  viewer: {
    label: 'Viewer',
    className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    avatarBg: 'bg-zinc-500/20 text-zinc-300',
    icon: <FileText className="h-3 w-3" />,
  },
}

// ===== Audit Action Color Config =====

const auditActionConfig: Record<AuditActionType, { className: string }> = {
  Create: { className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Update: { className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  Delete: { className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  Login: { className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  Export: { className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
}

// ===== Data Source Type Config =====

const dsTypeConfig: Record<DataSourceType, { badgeClass: string }> = {
  SIEM: { badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  EDR: { badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  Firewall: { badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  Cloud: { badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  'Threat Intel': { badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  'Log Collector': { badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
}

// ===== Mock Users (8-10) =====

const mockUsers: UserData[] = [
  {
    id: 'usr-1', name: 'Marcus Chen', email: 'mchen@siem.local', role: 'admin', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 1800000).toISOString(), createdAt: '2024-01-15T10:00:00Z',
    department: 'Security Operations',
    loginHistory: [
      { time: new Date(Date.now() - 1800000).toISOString(), ip: '10.0.1.42', success: true },
      { time: new Date(Date.now() - 86400000).toISOString(), ip: '10.0.1.42', success: true },
      { time: new Date(Date.now() - 172800000).toISOString(), ip: '10.0.1.42', success: false },
    ],
    assignedPlaybooks: ['Phishing Response', 'Malware Containment', 'Privilege Escalation'],
    recentActions: ['Updated detection rule R-1024', 'Escalated incident INC-0042', 'Exported compliance report'],
  },
  {
    id: 'usr-2', name: 'Sarah Kim', email: 'skim@siem.local', role: 'analyst', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 7200000).toISOString(), createdAt: '2024-02-20T14:30:00Z',
    department: 'Threat Intelligence',
    loginHistory: [
      { time: new Date(Date.now() - 7200000).toISOString(), ip: '10.0.2.18', success: true },
      { time: new Date(Date.now() - 43200000).toISOString(), ip: '10.0.2.18', success: true },
    ],
    assignedPlaybooks: ['Phishing Response', 'Data Exfiltration Investigation'],
    recentActions: ['Acknowledged alert ALT-1587', 'Updated threat indicator IOCs', 'Closed incident INC-0039'],
  },
  {
    id: 'usr-3', name: 'David Okafor', email: 'dokafor@siem.local', role: 'analyst', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(), createdAt: '2024-03-10T09:15:00Z',
    department: 'Security Operations',
    loginHistory: [
      { time: new Date(Date.now() - 3600000).toISOString(), ip: '10.0.1.55', success: true },
    ],
    assignedPlaybooks: ['Brute Force Response', 'Malware Containment'],
    recentActions: ['Created new detection rule', 'Assigned to INC-0045', 'Updated asset inventory'],
  },
  {
    id: 'usr-4', name: 'Elena Petrova', email: 'epetrova@siem.local', role: 'responder', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 28800000).toISOString(), createdAt: '2024-04-05T16:45:00Z',
    department: 'Incident Response',
    loginHistory: [
      { time: new Date(Date.now() - 28800000).toISOString(), ip: '10.0.3.12', success: true },
      { time: new Date(Date.now() - 86400000).toISOString(), ip: '10.0.3.12', success: true },
    ],
    assignedPlaybooks: ['Ransomware Response', 'Data Breach Notification'],
    recentActions: ['Contained incident INC-0041', 'Added forensic notes', 'Updated containment playbook'],
  },
  {
    id: 'usr-5', name: 'James Whitfield', email: 'jwhitfield@siem.local', role: 'viewer', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 86400000).toISOString(), createdAt: '2024-05-12T11:20:00Z',
    department: 'Executive',
    loginHistory: [
      { time: new Date(Date.now() - 86400000).toISOString(), ip: '10.0.4.5', success: true },
    ],
    assignedPlaybooks: [],
    recentActions: ['Viewed compliance dashboard', 'Exported monthly report'],
  },
  {
    id: 'usr-6', name: 'Priya Sharma', email: 'psharma@siem.local', role: 'analyst', isActive: false, status: 'Inactive',
    lastLoginAt: new Date(Date.now() - 604800000).toISOString(), createdAt: '2024-02-01T08:00:00Z',
    department: 'Threat Intelligence',
    loginHistory: [
      { time: new Date(Date.now() - 604800000).toISOString(), ip: '10.0.2.22', success: true },
    ],
    assignedPlaybooks: ['Phishing Response'],
    recentActions: ['Last active 7 days ago'],
  },
  {
    id: 'usr-7', name: 'Alex Morrison', email: 'amorrison@siem.local', role: 'admin', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 600000).toISOString(), createdAt: '2024-01-10T07:30:00Z',
    department: 'IT Security',
    loginHistory: [
      { time: new Date(Date.now() - 600000).toISOString(), ip: '10.0.1.10', success: true },
      { time: new Date(Date.now() - 43200000).toISOString(), ip: '10.0.1.10', success: true },
      { time: new Date(Date.now() - 86400000).toISOString(), ip: '10.0.1.10', success: true },
    ],
    assignedPlaybooks: ['System Configuration', 'Access Review', 'Backup Verification'],
    recentActions: ['Modified system settings', 'Added new integration', 'Reviewed audit logs'],
  },
  {
    id: 'usr-8', name: 'Tom Nguyen', email: 'tnguyen@siem.local', role: 'viewer', isActive: false, status: 'Locked',
    lastLoginAt: new Date(Date.now() - 2592000000).toISOString(), createdAt: '2024-06-15T13:00:00Z',
    department: 'Compliance',
    loginHistory: [
      { time: new Date(Date.now() - 2592000000).toISOString(), ip: '10.0.4.15', success: false },
      { time: new Date(Date.now() - 2592000000 + 60000).toISOString(), ip: '10.0.4.15', success: false },
      { time: new Date(Date.now() - 2592000000 + 120000).toISOString(), ip: '10.0.4.15', success: false },
    ],
    assignedPlaybooks: [],
    recentActions: ['Account locked after 3 failed login attempts'],
  },
  {
    id: 'usr-9', name: 'Maria Santos', email: 'msantos@siem.local', role: 'responder', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 14400000).toISOString(), createdAt: '2024-03-22T10:45:00Z',
    department: 'Incident Response',
    loginHistory: [
      { time: new Date(Date.now() - 14400000).toISOString(), ip: '10.0.3.8', success: true },
    ],
    assignedPlaybooks: ['DDoS Mitigation', 'Insider Threat Response'],
    recentActions: ['Resolved incident INC-0038', 'Updated response playbook', 'Escalated to management'],
  },
  {
    id: 'usr-10', name: 'Robert Zhang', email: 'rzhang@siem.local', role: 'analyst', isActive: true, status: 'Active',
    lastLoginAt: new Date(Date.now() - 5400000).toISOString(), createdAt: '2024-07-01T09:00:00Z',
    department: 'Security Operations',
    loginHistory: [
      { time: new Date(Date.now() - 5400000).toISOString(), ip: '10.0.1.60', success: true },
    ],
    assignedPlaybooks: ['Lateral Movement Detection', 'Phishing Response'],
    recentActions: ['Created custom correlation rule', 'Updated asset criticality', 'Reviewed false positives'],
  },
]

// ===== Mock Audit Logs (15-20) =====

const mockAuditLogs: AuditLogEntry[] = [
  { id: 'al-1', timestamp: new Date(Date.now() - 300000).toISOString(), user: 'Marcus Chen', action: 'Update', resource: 'Detection Rule R-1024', details: 'Modified threshold from 5 to 10 events', ipAddress: '10.0.1.42' },
  { id: 'al-2', timestamp: new Date(Date.now() - 900000).toISOString(), user: 'Sarah Kim', action: 'Create', resource: 'Threat Indicator IOC-5521', details: 'Added new malicious IP indicator', ipAddress: '10.0.2.18' },
  { id: 'al-3', timestamp: new Date(Date.now() - 1800000).toISOString(), user: 'Alex Morrison', action: 'Login', resource: 'System Console', details: 'Successful authentication via SSO', ipAddress: '10.0.1.10' },
  { id: 'al-4', timestamp: new Date(Date.now() - 2700000).toISOString(), user: 'David Okafor', action: 'Create', resource: 'Detection Rule R-1028', details: 'Created new brute force detection rule', ipAddress: '10.0.1.55' },
  { id: 'al-5', timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'Elena Petrova', action: 'Update', resource: 'Incident INC-0041', details: 'Changed status from Investigating to Contained', ipAddress: '10.0.3.12' },
  { id: 'al-6', timestamp: new Date(Date.now() - 5400000).toISOString(), user: 'James Whitfield', action: 'Export', resource: 'Compliance Report Q4', details: 'Exported SOC 2 Type II compliance report', ipAddress: '10.0.4.5' },
  { id: 'al-7', timestamp: new Date(Date.now() - 7200000).toISOString(), user: 'Robert Zhang', action: 'Create', resource: 'Correlation Rule CR-205', details: 'Created lateral movement correlation rule', ipAddress: '10.0.1.60' },
  { id: 'al-8', timestamp: new Date(Date.now() - 10800000).toISOString(), user: 'Marcus Chen', action: 'Delete', resource: 'Suppression Rule SR-44', details: 'Removed expired suppression rule', ipAddress: '10.0.1.42' },
  { id: 'al-9', timestamp: new Date(Date.now() - 14400000).toISOString(), user: 'Maria Santos', action: 'Update', resource: 'Incident INC-0038', details: 'Changed status from Contained to Resolved', ipAddress: '10.0.3.8' },
  { id: 'al-10', timestamp: new Date(Date.now() - 18000000).toISOString(), user: 'Sarah Kim', action: 'Update', resource: 'Alert ALT-1587', details: 'Acknowledged and assigned to David Okafor', ipAddress: '10.0.2.18' },
  { id: 'al-11', timestamp: new Date(Date.now() - 21600000).toISOString(), user: 'Alex Morrison', action: 'Create', resource: 'Integration CrowdStrike', details: 'Added CrowdStrike EDR integration', ipAddress: '10.0.1.10' },
  { id: 'al-12', timestamp: new Date(Date.now() - 25200000).toISOString(), user: 'Tom Nguyen', action: 'Login', resource: 'System Console', details: 'Failed authentication attempt (3rd)', ipAddress: '10.0.4.15' },
  { id: 'al-13', timestamp: new Date(Date.now() - 28800000).toISOString(), user: 'Elena Petrova', action: 'Update', resource: 'Playbook PB-Ransomware', details: 'Updated containment steps for ransomware playbook', ipAddress: '10.0.3.12' },
  { id: 'al-14', timestamp: new Date(Date.now() - 36000000).toISOString(), user: 'David Okafor', action: 'Export', resource: 'Alert Report Weekly', details: 'Exported weekly alert summary to CSV', ipAddress: '10.0.1.55' },
  { id: 'al-15', timestamp: new Date(Date.now() - 43200000).toISOString(), user: 'Marcus Chen', action: 'Update', resource: 'System Setting retention', details: 'Changed alert retention from 60 to 90 days', ipAddress: '10.0.1.42' },
  { id: 'al-16', timestamp: new Date(Date.now() - 50400000).toISOString(), user: 'Alex Morrison', action: 'Delete', resource: 'Integration Old-SIEM', details: 'Removed deprecated SIEM integration', ipAddress: '10.0.1.10' },
  { id: 'al-17', timestamp: new Date(Date.now() - 57600000).toISOString(), user: 'Robert Zhang', action: 'Create', resource: 'Asset AST-WEB-014', details: 'Added new web server asset to inventory', ipAddress: '10.0.1.60' },
  { id: 'al-18', timestamp: new Date(Date.now() - 64800000).toISOString(), user: 'James Whitfield', action: 'Login', resource: 'System Console', details: 'Successful authentication via SSO', ipAddress: '10.0.4.5' },
  { id: 'al-19', timestamp: new Date(Date.now() - 86400000).toISOString(), user: 'Sarah Kim', action: 'Update', resource: 'Compliance Control CC-7.1', details: 'Updated evidence for access control requirement', ipAddress: '10.0.2.18' },
  { id: 'al-20', timestamp: new Date(Date.now() - 100800000).toISOString(), user: 'Maria Santos', action: 'Export', resource: 'Incident Timeline INC-0038', details: 'Exported incident timeline for post-mortem', ipAddress: '10.0.3.8' },
]

// ===== Mock Data Sources (6-8) =====

const mockDataSources: DataSource[] = [
  { id: 'ds-1', name: 'OpenSearch Cluster', type: 'SIEM', status: 'Connected', lastSync: new Date(Date.now() - 60000).toISOString(), eventsPerDay: 2450000, icon: <Search className="h-5 w-5" />, iconColor: 'text-blue-400' },
  { id: 'ds-2', name: 'Suricata IDS', type: 'Firewall', status: 'Connected', lastSync: new Date(Date.now() - 120000).toISOString(), eventsPerDay: 185000, icon: <Flame className="h-5 w-5" />, iconColor: 'text-orange-400' },
  { id: 'ds-3', name: 'CrowdStrike Falcon', type: 'EDR', status: 'Connected', lastSync: new Date(Date.now() - 300000).toISOString(), eventsPerDay: 520000, icon: <Shield className="h-5 w-5" />, iconColor: 'text-red-400' },
  { id: 'ds-4', name: 'AWS CloudTrail', type: 'Cloud', status: 'Connected', lastSync: new Date(Date.now() - 180000).toISOString(), eventsPerDay: 890000, icon: <Cloud className="h-5 w-5" />, iconColor: 'text-cyan-400' },
  { id: 'ds-5', name: 'Azure Sentinel', type: 'Cloud', status: 'Error', lastSync: new Date(Date.now() - 7200000).toISOString(), eventsPerDay: 0, icon: <Cloud className="h-5 w-5" />, iconColor: 'text-blue-400' },
  { id: 'ds-6', name: 'MISP Threat Intel', type: 'Threat Intel', status: 'Connected', lastSync: new Date(Date.now() - 3600000).toISOString(), eventsPerDay: 12500, icon: <Bug className="h-5 w-5" />, iconColor: 'text-purple-400' },
  { id: 'ds-7', name: 'VirusTotal', type: 'Threat Intel', status: 'Connected', lastSync: new Date(Date.now() - 600000).toISOString(), eventsPerDay: 3200, icon: <Globe className="h-5 w-5" />, iconColor: 'text-emerald-400' },
  { id: 'ds-8', name: 'Fluent Bit', type: 'Log Collector', status: 'Disconnected', lastSync: new Date(Date.now() - 86400000).toISOString(), eventsPerDay: 0, icon: <Server className="h-5 w-5" />, iconColor: 'text-amber-400' },
]

// ===== Helper: Parse JSON setting value =====

function parseSettingValue(value: string | null | undefined, fallback: string = ''): string {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
      return String((parsed as { value: unknown }).value)
    }
    return String(parsed)
  } catch {
    return value
  }
}

// ===== Helper: Format Events/Day =====

function formatEventsPerDay(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
  return count.toString()
}

// ===== Retention & Legal Hold Panel =====
function RetentionPanel() {
  const { data: session } = useSession()
  const currentRole = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'
  const [policy, setPolicy] = useState<{
    alertRetentionDays: number
    incidentRetentionDays: number
    legalHold: boolean
  } | null>(null)
  const [alertDays, setAlertDays] = useState(90)
  const [incidentDays, setIncidentDays] = useState(365)
  const [legalHold, setLegalHold] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const isAdmin = currentRole === 'admin'

  const load = async () => {
    try {
      const res = await fetch('/api/retention')
      if (res.ok) {
        const d = await res.json()
        setPolicy(d)
        setAlertDays(d.alertRetentionDays)
        setIncidentDays(d.incidentRetentionDays)
        setLegalHold(d.legalHold)
      }
    } catch {
      /* ignore */
    }
  }

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/retention', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertRetentionDays: alertDays,
          incidentRetentionDays: incidentDays,
          legalHold,
        }),
      })
      if (res.ok) {
        setMsg('Retention policy saved.')
        load()
      } else {
        setMsg(res.status === 403 ? 'Admin privileges required.' : 'Failed to save.')
      }
    } catch {
      setMsg('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-muted-foreground" />
          Data Retention &amp; Legal Hold
        </CardTitle>
        <CardDescription className="text-[10px]">
          Automated purge of captured alerts/incidents after the retention window. Legal Hold suspends all deletion (GDPR/HIPAA/PCI preservation).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Alert retention (days)</Label>
              <Input
                type="number"
                min={0}
                value={alertDays}
                disabled={!isAdmin}
                onChange={(e) => setAlertDays(parseInt(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Incident retention (days)</Label>
              <Input
                type="number"
                min={0}
                value={incidentDays}
                disabled={!isAdmin}
                onChange={(e) => setIncidentDays(parseInt(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <div className="text-xs font-medium">Legal Hold</div>
              <div className="text-[10px] text-muted-foreground">
                When active, no data is purged — for investigations, litigation, or compliance holds.
              </div>
            </div>
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => setLegalHold((v) => !v)}
              className={cn(
                'relative h-5 w-9 rounded-full transition-colors',
                legalHold ? 'bg-emerald-600' : 'bg-zinc-600',
                !isAdmin && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                  legalHold ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          {!isAdmin && (
            <p className="text-[10px] text-amber-400/80">Only administrators can modify retention settings.</p>
          )}
          {msg && <p className="text-[10px] text-muted-foreground">{msg}</p>}

          {isAdmin && (
            <Button onClick={save} disabled={saving} className="h-9 text-xs">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save retention policy'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Main Settings View =====

export function SettingsView() {
  const { settings, setSettings } = useSIEMStore()

  // Data states
  const [settingsData, setSettingsData] = useState<SettingsData>({})
  const [users, setUsers] = useState<UserData[]>(mockUsers)
  const [auditLogs] = useState<AuditLogEntry[]>(mockAuditLogs)
  const [dataSources, setDataSources] = useState<DataSource[]>(mockDataSources)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [loading] = useState(false)

  // User management states
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all')
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all')
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [userDetailOpen, setUserDetailOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

  // New user form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'viewer' as UserRole,
    message: '',
  })

  // Audit log states
  const [auditSearch, setAuditSearch] = useState('')
  const [auditDateRange, setAuditDateRange] = useState<string>('7d')
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all')

  // Data source states
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null)
  const [addSourceOpen, setAddSourceOpen] = useState(false)

  // ===== Get setting helper =====
  const getSetting = (key: string, fallback: string = ''): string =>
    parseSettingValue(settingsData[key], fallback)

  const setSetting = (key: string, value: string) =>
    setSettingsData((prev) => ({ ...prev, [key]: JSON.stringify({ value }) }))

  // ===== Filtered Users =====
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !userSearch ||
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, userSearch, userRoleFilter, userStatusFilter])

  // ===== Filtered Audit Logs =====
  const filteredAuditLogs = useMemo(() => {
    const now = Date.now()
    let dateCutoff = 0
    if (auditDateRange === '24h') dateCutoff = now - 86400000
    else if (auditDateRange === '7d') dateCutoff = now - 604800000
    else if (auditDateRange === '30d') dateCutoff = now - 2592000000

    return auditLogs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime()
      const matchesDate = dateCutoff === 0 || logTime >= dateCutoff
      const matchesSearch = !auditSearch ||
        log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.resource.toLowerCase().includes(auditSearch.toLowerCase())
      const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter
      return matchesDate && matchesSearch && matchesAction
    })
  }, [auditLogs, auditSearch, auditDateRange, auditActionFilter])

  // ===== Handlers =====

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const entries = Object.entries(settingsData).map(([key, value]) => ({ key, value }))
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: entries }),
      })
      if (res.ok) {
        toast.success('Settings saved successfully')
        setLastSavedAt(new Date())
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 900)
      } else {
        toast.error('Failed to save settings')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleAddUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    const user: UserData = {
      id: `usr-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: true,
      status: 'Active',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      department: 'New Hire',
      loginHistory: [],
      assignedPlaybooks: [],
      recentActions: ['Account created'],
    }
    setUsers((prev) => [...prev, user])
    toast.success(`Invitation sent to ${newUser.name}`)
    setAddUserOpen(false)
    setNewUser({ name: '', email: '', role: 'viewer', message: '' })
  }

  const handleUserClick = (user: UserData) => {
    setSelectedUser(user)
    setUserDetailOpen(true)
  }

  const handleTestDataSource = async (dsId: string) => {
    setTestingSourceId(dsId)
    const ds = dataSources.find((d) => d.id === dsId)
    if (!ds) { setTestingSourceId(null); return }
    // A real test would probe the configured endpoint. These demo sources
    // have no live backend in this deployment, so report the honest state
    // instead of fabricating a success/failure result.
    await new Promise((resolve) => setTimeout(resolve, 800))
    toast.error(`${ds.name}: no live backend configured — cannot verify connection`)
    setTestingSourceId(null)
  }

  const handleExportAuditLog = () => {
    toast.success('Audit log exported successfully', {
      description: `${filteredAuditLogs.length} entries exported as CSV`,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 p-4"
    >
      {/* ===== Header ===== */}
      <div>
        <h2 className="text-lg font-bold tracking-tight">Settings</h2>
        <p className="text-xs text-muted-foreground">
          Configure system settings, integrations, users, and notifications
        </p>
      </div>

      {/* ===== Tabs ===== */}
      <Tabs
        value={settings.activeTab}
        onValueChange={(v) => setSettings({ activeTab: v })}
      >
        <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto">
          <TabsTrigger value="general" className={cn('text-xs gap-1.5 shrink-0', settings.activeTab === 'general' && 'siem-tab-active')}>
            <SettingsIcon className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="users" className={cn('text-xs gap-1.5 shrink-0', settings.activeTab === 'users' && 'siem-tab-active')}>
            <Users className="h-3.5 w-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="datasources" className={cn('text-xs gap-1.5 shrink-0', settings.activeTab === 'datasources' && 'siem-tab-active')}>
            <Database className="h-3.5 w-3.5" />
            Data Sources
          </TabsTrigger>
          <TabsTrigger value="audit" className={cn('text-xs gap-1.5 shrink-0', settings.activeTab === 'audit' && 'siem-tab-active')}>
            <ScrollText className="h-3.5 w-3.5" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="integrations" className={cn('text-xs gap-1.5 shrink-0', settings.activeTab === 'integrations' && 'siem-tab-active')}>
            <Plug className="h-3.5 w-3.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className={cn('text-xs gap-1.5 shrink-0', settings.activeTab === 'notifications' && 'siem-tab-active')}>
            <Bell className="h-3.5 w-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="retention" className={cn('text-xs gap-1.5 shrink-0', settings.activeTab === 'retention' && 'siem-tab-active')}>
            <HistoryIcon className="h-3.5 w-3.5" />
            Retention
          </TabsTrigger>
        </TabsList>

        {/* ============================== */}
        {/* ===== General Tab ===== */}
        {/* ============================== */}
        <TabsContent value="general" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                General Settings
              </CardTitle>
              <CardDescription className="text-[10px]">
                System configuration and data retention policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* System Info Section */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    System Information
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">System Name</Label>
                      <Input
                        value={getSetting('general.systemName', 'Insights SIEM')}
                        onChange={(e) => setSetting('general.systemName', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="Insights SIEM"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Timezone</Label>
                      <Select
                        value={getSetting('general.timezone', 'UTC')}
                        onValueChange={(v) => setSetting('general.timezone', v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="US/Eastern">US/Eastern (EST)</SelectItem>
                          <SelectItem value="US/Pacific">US/Pacific (PST)</SelectItem>
                          <SelectItem value="US/Central">US/Central (CST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                          <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Data Retention Section */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Database className="h-3 w-3" />
                    Data Retention
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Alert Retention (days)</Label>
                      <Input
                        type="number"
                        value={getSetting('alerts.retentionDays', '90')}
                        onChange={(e) => setSetting('alerts.retentionDays', e.target.value)}
                        className="h-9 text-sm"
                        min={1}
                        max={3650}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Alerts older than this will be automatically purged
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Incident Retention (days)</Label>
                      <Input
                        type="number"
                        value={getSetting('incidents.retentionDays', '365')}
                        onChange={(e) => setSetting('incidents.retentionDays', e.target.value)}
                        className="h-9 text-sm"
                        min={1}
                        max={3650}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Incidents older than this will be archived
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Log Retention (days)</Label>
                      <Input
                        type="number"
                        value={getSetting('logs.retentionDays', '30')}
                        onChange={(e) => setSetting('logs.retentionDays', e.target.value)}
                        className="h-9 text-sm"
                        min={1}
                        max={365}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Audit Log Retention (days)</Label>
                      <Input
                        type="number"
                        value={getSetting('audit.retentionDays', '730')}
                        onChange={(e) => setSetting('audit.retentionDays', e.target.value)}
                        className="h-9 text-sm"
                        min={30}
                        max={3650}
                      />
                    </div>
                  </div>
                </div>

                {/* Alert Settings Section */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <HardDrive className="h-3 w-3" />
                    Alert Configuration
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Default Severity Threshold</Label>
                      <Select
                        value={getSetting('alerts.defaultSeverity', 'medium')}
                        onValueChange={(v) => setSetting('alerts.defaultSeverity', v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical only</SelectItem>
                          <SelectItem value="high">High and above</SelectItem>
                          <SelectItem value="medium">Medium and above</SelectItem>
                          <SelectItem value="low">Low and above</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dashboard Refresh Interval (sec)</Label>
                      <Input
                        type="number"
                        value={getSetting('dashboard.refreshInterval', '1')}
                        onChange={(e) => setSetting('dashboard.refreshInterval', e.target.value)}
                        className="h-9 text-sm"
                        min={1}
                        max={300}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3 border-t border-border pt-4 flex-wrap">
                  <Button
                    size="sm"
                    className={cn(
                      'gap-1.5 bg-emerald-600 hover:bg-emerald-700',
                      savedFlash && 'siem-save-success'
                    )}
                    onClick={handleSaveSettings}
                    disabled={saving}
                  >
                    {savedFlash ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saving ? 'Saving...' : savedFlash ? 'Saved' : 'Save Settings'}
                  </Button>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    {lastSavedAt ? (
                      <>
                        <Clock className="h-3 w-3" />
                        Last saved: {format(lastSavedAt, 'yyyy-MM-dd HH:mm:ss')}
                      </>
                    ) : (
                      'Changes will take effect immediately'
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== */}
        {/* ===== User Management Tab ===== */}
        {/* ============================== */}
        <TabsContent value="users" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    User Management
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    {users.length} users &middot; {users.filter((u) => u.status === 'Active').length} active &middot; {users.filter((u) => u.status === 'Locked').length} locked
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAddUserOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-7 pl-7 text-[10px]"
                  />
                </div>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="h-7 w-28 text-[10px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="responder">Responder</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                  <SelectTrigger className="h-7 w-28 text-[10px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
                {(userSearch || userRoleFilter !== 'all' || userStatusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => { setUserSearch(''); setUserRoleFilter('all'); setUserStatusFilter('all') }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* User Table */}
              <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-medium">User</TableHead>
                      <TableHead className="text-[10px] font-medium">Role</TableHead>
                      <TableHead className="text-[10px] font-medium hidden sm:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] font-medium hidden md:table-cell">
                        Last Active
                      </TableHead>
                      <TableHead className="text-[10px] font-medium text-right w-20">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                          No users match the current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const roleConf = roleConfig[user.role]
                        return (
                          <TableRow
                            key={user.id}
                            className="hover:bg-accent/30 cursor-pointer"
                            onClick={() => handleUserClick(user)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback
                                    className={cn(
                                      'text-[10px] font-semibold',
                                      roleConf.avatarBg
                                    )}
                                  >
                                    {user.name.split(' ').map((n) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-xs font-medium">{user.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn('text-[9px] gap-0.5 border', roleConf.className)}
                              >
                                {roleConf.icon}
                                {roleConf.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px] border gap-1',
                                  user.status === 'Active'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : user.status === 'Locked'
                                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                                )}
                              >
                                <span className={cn(
                                  'inline-block h-1.5 w-1.5 rounded-full',
                                  user.status === 'Active' ? 'bg-emerald-400' : user.status === 'Locked' ? 'bg-red-400' : 'bg-zinc-400'
                                )} />
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-[10px] text-muted-foreground">
                              {user.lastLoginAt
                                ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                                : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                                  onClick={() => handleUserClick(user)}
                                >
                                  <Eye className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary bar */}
              <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Admins: {users.filter(u => u.role === 'admin').length} &middot; Analysts: {users.filter(u => u.role === 'analyst').length} &middot; Responders: {users.filter(u => u.role === 'responder').length} &middot; Viewers: {users.filter(u => u.role === 'viewer').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== */}
        {/* ===== Data Sources Tab ===== */}
        {/* ============================== */}
        <TabsContent value="datasources" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    Data Sources
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    {dataSources.length} sources &middot; {dataSources.filter(d => d.status === 'Connected').length} connected &middot; {formatEventsPerDay(dataSources.reduce((acc, d) => acc + d.eventsPerDay, 0))} events/day total
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAddSourceOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Source
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {dataSources.map((ds) => {
                  const typeConf = dsTypeConfig[ds.type]
                  return (
                    <motion.div
                      key={ds.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: dataSources.indexOf(ds) * 0.03 }}
                      className={cn(
                        'rounded-lg border p-4 transition-colors',
                        ds.status === 'Connected'
                          ? 'border-border bg-muted/20 hover:bg-muted/30'
                          : ds.status === 'Error'
                            ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                            : 'border-border/50 bg-muted/10 opacity-70'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Status dot */}
                          <div className="relative">
                            <div className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50',
                              ds.iconColor
                            )}>
                              {ds.icon}
                            </div>
                            <span className={cn(
                              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                              ds.status === 'Connected' ? 'bg-emerald-400' : ds.status === 'Error' ? 'bg-red-400' : 'bg-zinc-400'
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{ds.name}</span>
                              <Badge
                                variant="outline"
                                className={cn('text-[9px] border', typeConf.badgeClass)}
                              >
                                {ds.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px] border gap-1',
                                  ds.status === 'Connected'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : ds.status === 'Error'
                                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                                )}
                              >
                                <span className={cn(
                                  'inline-block h-1.5 w-1.5 rounded-full',
                                  ds.status === 'Connected' ? 'bg-emerald-400' : ds.status === 'Error' ? 'bg-red-400' : 'bg-zinc-400'
                                )} />
                                {ds.status}
                              </Badge>
                              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                Last sync: {formatDistanceToNow(new Date(ds.lastSync), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-xs font-semibold">{formatEventsPerDay(ds.eventsPerDay)}</div>
                            <div className="text-[9px] text-muted-foreground">events/day</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[10px]"
                            onClick={() => handleTestDataSource(ds.id)}
                            disabled={testingSourceId === ds.id}
                          >
                            {testingSourceId === ds.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Wifi className="h-3 w-3" />
                            )}
                            Test
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== */}
        {/* ===== Audit Log Tab ===== */}
        {/* ============================== */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Audit Log
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    {filteredAuditLogs.length} entries &middot; {auditLogs.length} total
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[10px]"
                  onClick={handleExportAuditLog}
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by user or resource..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="h-7 pl-7 text-[10px]"
                  />
                </div>
                <Select value={auditDateRange} onValueChange={setAuditDateRange}>
                  <SelectTrigger className="h-7 w-28 text-[10px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7d</SelectItem>
                    <SelectItem value="30d">Last 30d</SelectItem>
                  </SelectContent>
                </Select>

                {/* Action type filter buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={auditActionFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 text-[9px] px-2',
                      auditActionFilter === 'all' && 'bg-emerald-600 hover:bg-emerald-700'
                    )}
                    onClick={() => setAuditActionFilter('all')}
                  >
                    All
                  </Button>
                  {(['Create', 'Update', 'Delete', 'Login', 'Export'] as AuditActionType[]).map((action) => {
                    const conf = auditActionConfig[action]
                    return (
                      <Button
                        key={action}
                        variant={auditActionFilter === action ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'h-7 text-[9px] px-2',
                          auditActionFilter === action && 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                        onClick={() => setAuditActionFilter(action === auditActionFilter ? 'all' : action)}
                      >
                        {action}
                      </Button>
                    )
                  })}
                </div>

                {(auditSearch || auditDateRange !== '7d' || auditActionFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => { setAuditSearch(''); setAuditDateRange('7d'); setAuditActionFilter('all') }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Audit Log Table */}
              <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-medium w-28">Timestamp</TableHead>
                      <TableHead className="text-[10px] font-medium w-24">User</TableHead>
                      <TableHead className="text-[10px] font-medium w-20">Action</TableHead>
                      <TableHead className="text-[10px] font-medium">Resource</TableHead>
                      <TableHead className="text-[10px] font-medium hidden lg:table-cell">Details</TableHead>
                      <TableHead className="text-[10px] font-medium hidden md:table-cell w-24">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                          No audit log entries match the current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAuditLogs.map((log) => {
                        const actionConf = auditActionConfig[log.action]
                        return (
                          <TableRow key={log.id} className="hover:bg-accent/30">
                            <TableCell className="text-[10px] text-muted-foreground font-mono">
                              {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                            </TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">
                              {log.user}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn('text-[9px] border', actionConf.className)}
                              >
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[10px] font-medium">
                              {log.resource}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-[10px] text-muted-foreground max-w-48 truncate">
                              {log.details}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-[10px] text-muted-foreground font-mono">
                              {log.ipAddress}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary bar */}
              <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Showing {filteredAuditLogs.length} of {auditLogs.length} entries
                </span>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><CircleDot className="h-2 w-2 text-emerald-400" /> Create: {auditLogs.filter(l => l.action === 'Create').length}</span>
                  <span className="flex items-center gap-1"><CircleDot className="h-2 w-2 text-blue-400" /> Update: {auditLogs.filter(l => l.action === 'Update').length}</span>
                  <span className="flex items-center gap-1"><CircleDot className="h-2 w-2 text-red-400" /> Delete: {auditLogs.filter(l => l.action === 'Delete').length}</span>
                  <span className="flex items-center gap-1"><CircleDot className="h-2 w-2 text-cyan-400" /> Login: {auditLogs.filter(l => l.action === 'Login').length}</span>
                  <span className="flex items-center gap-1"><CircleDot className="h-2 w-2 text-amber-400" /> Export: {auditLogs.filter(l => l.action === 'Export').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== */}
        {/* ===== Integrations Tab ===== */}
        {/* ============================== */}
        <TabsContent value="integrations" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plug className="h-4 w-4 text-muted-foreground" />
                Integrations
              </CardTitle>
              <CardDescription className="text-[10px]">
                Manage external service connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Plug className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  Integrations are now managed via Data Sources
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Switch to the Data Sources tab to manage connections
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 text-xs"
                  onClick={() => setSettings({ activeTab: 'datasources' })}
                >
                  <Database className="h-3 w-3" />
                  Go to Data Sources
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== */}
        {/* ===== Notifications Tab ===== */}
        {/* ============================== */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-[10px]">
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 'alert_critical', title: 'Critical Alert Notifications', desc: 'Receive immediate notifications for critical severity alerts', icon: <AlertTriangle className="h-4 w-4 text-red-400" />, enabled: true },
                  { id: 'alert_high', title: 'High Alert Notifications', desc: 'Receive notifications for high severity alerts', icon: <AlertTriangle className="h-4 w-4 text-amber-400" />, enabled: true },
                  { id: 'incident_assigned', title: 'Incident Assignment', desc: 'Notify when you are assigned to an incident', icon: <Users className="h-4 w-4 text-blue-400" />, enabled: true },
                  { id: 'incident_status', title: 'Incident Status Changes', desc: 'Notify when incident status changes', icon: <Activity className="h-4 w-4 text-emerald-400" />, enabled: false },
                  { id: 'compliance_drift', title: 'Compliance Drift Alerts', desc: 'Alert when compliance score drops below threshold', icon: <Shield className="h-4 w-4 text-purple-400" />, enabled: true },
                  { id: 'system_health', title: 'System Health Warnings', desc: 'Notify about system health issues and outages', icon: <Activity className="h-4 w-4 text-orange-400" />, enabled: true },
                  { id: 'rule_triggered', title: 'Detection Rule Triggers', desc: 'Notify when a detection rule is triggered', icon: <Zap className="h-4 w-4 text-yellow-400" />, enabled: false },
                  { id: 'email_digest', title: 'Daily Email Digest', desc: 'Receive a daily summary email of important events', icon: <Mail className="h-4 w-4 text-cyan-400" />, enabled: false },
                ].map((pref) => (
                  <div
                    key={pref.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                        {pref.icon}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{pref.title}</div>
                        <div className="text-[10px] text-muted-foreground">{pref.desc}</div>
                      </div>
                    </div>
                    <Switch
                      defaultChecked={pref.enabled}
                      onCheckedChange={() => toast.success('Notification preference updated')}
                    />
                  </div>
                ))}

                {/* Global Severity Threshold */}
                <div className="border-t border-border pt-4">
                  <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Severity Threshold
                  </h4>
                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-xs font-medium">Minimum Notification Severity</div>
                        <div className="text-[10px] text-muted-foreground">
                          Only receive notifications for alerts at or above this severity
                        </div>
                      </div>
                    </div>
                    <Select defaultValue="high">
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical only</SelectItem>
                        <SelectItem value="high">High and above</SelectItem>
                        <SelectItem value="medium">Medium and above</SelectItem>
                        <SelectItem value="low">All alerts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== */}
        {/* ===== Retention & Legal Hold Tab ===== */}
        {/* ============================== */}
        <TabsContent value="retention" className="mt-4">
          <RetentionPanel />
        </TabsContent>
      </Tabs>

      {/* ===== Invite User Dialog ===== */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-400" />
              Invite User
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send an invitation to a new team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="h-9 text-sm"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="h-9 text-sm"
                placeholder="john@siem.local"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser({ ...newUser, role: v as UserRole })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-red-400" />
                      Admin — Full system access
                    </span>
                  </SelectItem>
                  <SelectItem value="analyst">
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3 w-3 text-emerald-400" />
                      Analyst — Alert investigation
                    </span>
                  </SelectItem>
                  <SelectItem value="responder">
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-amber-400" />
                      Responder — Incident response
                    </span>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3 text-zinc-400" />
                      Viewer — Read-only access
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Invitation Message (optional)</Label>
              <Textarea
                value={newUser.message}
                onChange={(e) => setNewUser({ ...newUser, message: e.target.value })}
                className="min-h-[60px] text-xs"
                placeholder="Welcome to the SOC team! You'll be working on threat analysis..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddUserOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleAddUser}
              disabled={!newUser.name.trim() || !newUser.email.trim()}
            >
              <Mail className="h-3.5 w-3.5" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== User Detail Dialog ===== */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-3">
              {selectedUser && (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn('text-[10px] font-semibold', roleConfig[selectedUser.role].avatarBg)}>
                      {selectedUser.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {selectedUser.name}
                  <Badge
                    variant="outline"
                    className={cn('text-[9px] gap-0.5 border', roleConfig[selectedUser.role].className)}
                  >
                    {roleConfig[selectedUser.role].icon}
                    {roleConfig[selectedUser.role].label}
                  </Badge>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedUser?.email} &middot; {selectedUser?.department}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Status & Info Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/20 p-3 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Status</div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] border gap-1 mt-1',
                      selectedUser.status === 'Active'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : selectedUser.status === 'Locked'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                    )}
                  >
                    {selectedUser.status}
                  </Badge>
                </div>
                <div className="rounded-lg bg-muted/20 p-3 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Last Active</div>
                  <div className="text-xs mt-1">
                    {selectedUser.lastLoginAt
                      ? formatDistanceToNow(new Date(selectedUser.lastLoginAt), { addSuffix: true })
                      : 'Never'}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 p-3 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Joined</div>
                  <div className="text-xs mt-1">
                    {format(new Date(selectedUser.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Login History */}
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Recent Login History
                </h4>
                <div className="space-y-1 max-h-24 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {(selectedUser.loginHistory?.length ?? 0) > 0 ? (
                    selectedUser.loginHistory?.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-muted/10">
                        <span className="flex items-center gap-1.5">
                          {entry.success ? (
                            <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-2.5 w-2.5 text-red-400" />
                          )}
                          <span className="font-mono">{entry.ip}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.time), { addSuffix: true })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No login history</span>
                  )}
                </div>
              </div>

              {/* Assigned Playbooks */}
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Assigned Playbooks
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedUser.assignedPlaybooks?.length ?? 0) > 0 ? (
                    selectedUser.assignedPlaybooks?.map((pb) => (
                      <Badge key={pb} variant="outline" className="text-[9px] border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {pb}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No playbooks assigned</span>
                  )}
                </div>
              </div>

              {/* Recent Actions */}
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Recent Actions
                </h4>
                <div className="space-y-1">
                  {selectedUser.recentActions?.map((action, i) => (
                    <div key={i} className="text-[10px] py-1 px-2 rounded bg-muted/10 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" />
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setUserDetailOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={() => {
                if (selectedUser) {
                  if (selectedUser.status === 'Locked') {
                    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: 'Active' as const, isActive: true } : u))
                    toast.success(`Account unlocked for ${selectedUser.name}`)
                    setSelectedUser({ ...selectedUser, status: 'Active', isActive: true })
                  } else if (selectedUser.status === 'Active') {
                    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: 'Inactive' as const, isActive: false } : u))
                    toast.success(`Account deactivated for ${selectedUser.name}`)
                    setSelectedUser({ ...selectedUser, status: 'Inactive', isActive: false })
                  } else {
                    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: 'Active' as const, isActive: true } : u))
                    toast.success(`Account reactivated for ${selectedUser.name}`)
                    setSelectedUser({ ...selectedUser, status: 'Active', isActive: true })
                  }
                }
              }}
            >
              {selectedUser?.status === 'Locked' ? (
                <><Unlock className="h-3.5 w-3.5" /> Unlock Account</>
              ) : selectedUser?.status === 'Active' ? (
                <><Lock className="h-3.5 w-3.5" /> Deactivate</>
              ) : (
                <><Unlock className="h-3.5 w-3.5" /> Reactivate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Data Source Dialog ===== */}
      <Dialog open={addSourceOpen} onOpenChange={setAddSourceOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              Add Data Source
            </DialogTitle>
            <DialogDescription className="text-xs">
              Connect a new data source to the SIEM platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Source Name *</Label>
              <Input className="h-9 text-sm" placeholder="My OpenSearch Cluster" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select defaultValue="SIEM">
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dsTypeConfig).map(([key]) => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Connection URL *</Label>
              <Input className="h-9 text-sm font-mono" placeholder="https://opensearch:9200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">API Key</Label>
              <Input className="h-9 text-sm font-mono" type="password" placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddSourceOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={() => {
                setAddSourceOpen(false)
                toast.success('Data source added — testing connection...')
              }}
            >
              <Plug className="h-3.5 w-3.5" />
              Add & Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
