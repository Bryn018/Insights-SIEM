'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Play,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Timer,
  ChevronDown,
  Copy,
  Pencil,
  History,
  Bell,
  GitBranch,
  Filter,
  UserCheck,
  PauseCircle,
  Cpu,
  Calendar,
  Search,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useSIEMStore } from '@/lib/store'
import type {
  SoarPlaybook,
  SoarStep,
  SoarStepType,
  SoarTriggerType,
  SoarPlaybookStatus,
} from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/format-utils'

// ===== Types =====

interface ExecutionRecord {
  id: string
  playbookId: string
  playbookName: string
  timestamp: string
  status: 'success' | 'failure' | 'running' | 'triggered'
  durationSec: number
  triggeredBy: string
  triggeredByType: 'manual' | 'scheduled' | 'alert'
}

// ===== Step Type Visual Config =====

const STEP_TYPE_CONFIG: Record<
  SoarStepType,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string; label: string }
> = {
  trigger: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Trigger' },
  condition: { icon: GitBranch, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Condition' },
  action: { icon: Cpu, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', label: 'Action' },
  notification: { icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Notification' },
  wait: { icon: PauseCircle, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', label: 'Wait' },
  approval: { icon: UserCheck, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Approval' },
}

const TRIGGER_CONFIG: Record<SoarTriggerType, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  manual: { icon: Play, label: 'Manual', color: 'text-zinc-300 bg-zinc-700/40 border-zinc-600/50' },
  scheduled: { icon: Calendar, label: 'Scheduled', color: 'text-sky-300 bg-sky-500/10 border-sky-500/30' },
  'alert-based': { icon: Bell, label: 'Alert-Based', color: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
}

const STATUS_CONFIG: Record<SoarPlaybookStatus, { label: string; color: string; dot: string }> = {
  active: { label: 'Active', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  draft: { label: 'Draft', color: 'text-amber-400', dot: 'bg-amber-400' },
  disabled: { label: 'Disabled', color: 'text-zinc-500', dot: 'bg-zinc-600' },
}

// ===== Mock Data =====

const ISO_OFFSET = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

function makeStep(
  id: string,
  name: string,
  type: SoarStepType,
  action: string,
  config: Record<string, unknown> = {}
): SoarStep {
  return { id, name, type, action, config }
}

const INITIAL_PLAYBOOKS: SoarPlaybook[] = [
  {
    id: 'pb-phishing',
    name: 'Phishing Email Response',
    description: 'Automated response workflow for reported phishing emails. Triages the report, extracts IOCs, cross-references threat intel, and contains the threat.',
    trigger: 'alert-based',
    status: 'active',
    lastRun: ISO_OFFSET(42),
    runCount: 312,
    successCount: 298,
    failureCount: 14,
    avgDuration: 87,
    steps: [
      makeStep('s1', 'Triage Email', 'trigger', 'Parse email headers and assess risk score'),
      makeStep('s2', 'Extract IOCs', 'action', 'Pull URLs, attachments, sender domains, and hashes'),
      makeStep('s3', 'Check Threat Intel', 'condition', 'Query VirusTotal and internal IOC DB for known indicators'),
      makeStep('s4', 'Block Sender', 'action', 'Add sender domain to email gateway blocklist'),
      makeStep('s5', 'Quarantine Email', 'action', 'Move message to quarantine mailbox across all recipients'),
      makeStep('s6', 'Notify User', 'notification', 'Send awareness email to original reporter'),
      makeStep('s7', 'Create Incident', 'action', 'Open P3 incident in ITSM with linked IOCs'),
      makeStep('s8', 'Escalate', 'approval', 'If risk score > 80, escalate to SOC Tier 2 lead'),
    ],
  },
  {
    id: 'pb-bruteforce',
    name: 'Brute Force Lockout',
    description: 'Detects and responds to authentication brute-force attacks by enforcing lockouts, blocking source IPs, and alerting administrators.',
    trigger: 'alert-based',
    status: 'active',
    lastRun: ISO_OFFSET(15),
    runCount: 1042,
    successCount: 1031,
    failureCount: 11,
    avgDuration: 23,
    steps: [
      makeStep('s1', 'Detect Threshold', 'trigger', 'Trigger when 10+ failed auths from one IP in 60s'),
      makeStep('s2', 'Verify Source', 'condition', 'Geo-locate source IP and check threat reputation'),
      makeStep('s3', 'Disable Account', 'action', 'Lock targeted user account in Active Directory'),
      makeStep('s4', 'Block IP', 'action', 'Push block rule to perimeter firewall (24h TTL)'),
      makeStep('s5', 'Notify Admin', 'notification', 'Page on-call SOC admin via PagerDuty'),
    ],
  },
  {
    id: 'pb-malware',
    name: 'Malware Containment',
    description: 'End-to-end malware containment playbook: isolate the host, preserve forensic evidence, and update detection rules across the fleet.',
    trigger: 'alert-based',
    status: 'active',
    lastRun: ISO_OFFSET(180),
    runCount: 87,
    successCount: 79,
    failureCount: 8,
    avgDuration: 312,
    steps: [
      makeStep('s1', 'Isolate Host', 'action', 'Network-isolate endpoint via EDR agent'),
      makeStep('s2', 'Capture Memory', 'action', 'Trigger volatile memory capture for forensics'),
      makeStep('s3', 'Scan Endpoints', 'action', 'Sweep fleet for indicators of compromise'),
      makeStep('s4', 'Block Hashes', 'action', 'Add malicious file hashes to EDR blocklist'),
      makeStep('s5', 'Update Rules', 'action', 'Push YARA + Suricata rules to detection engines'),
      makeStep('s6', 'Create Ticket', 'action', 'Open Jira ticket for IR follow-up'),
      makeStep('s7', 'Notify SOC', 'notification', 'Broadcast containment summary to SOC channel'),
    ],
  },
  {
    id: 'pb-onboarding',
    name: 'User Onboarding Security',
    description: 'Scheduled daily playbook that validates identity for new hires, assigns least-privilege roles, and schedules security awareness training.',
    trigger: 'scheduled',
    status: 'active',
    lastRun: ISO_OFFSET(720),
    runCount: 156,
    successCount: 154,
    failureCount: 2,
    avgDuration: 41,
    steps: [
      makeStep('s1', 'Verify Identity', 'condition', 'Confirm HR record and manager approval exist'),
      makeStep('s2', 'Assign Role', 'action', 'Map department to least-privilege role template'),
      makeStep('s3', 'Set Permissions', 'action', 'Provision SSO groups and application access'),
      makeStep('s4', 'Schedule Training', 'action', 'Enroll user in security awareness platform'),
    ],
  },
  {
    id: 'pb-exfil',
    name: 'Data Exfiltration Response',
    description: 'Investigates potential data exfiltration events, preserves evidence, blocks egress channels, and escalates to legal and executive stakeholders.',
    trigger: 'alert-based',
    status: 'draft',
    lastRun: ISO_OFFSET(2880),
    runCount: 19,
    successCount: 14,
    failureCount: 5,
    avgDuration: 540,
    steps: [
      makeStep('s1', 'Confirm Detection', 'condition', 'Validate DLP alert against baseline traffic patterns'),
      makeStep('s2', 'Identify Data', 'action', 'Classify exfiltrated content (PII, IP, financial)'),
      makeStep('s3', 'Block Channel', 'action', 'Temporarily disable egress protocol or destination'),
      makeStep('s4', 'Preserve Evidence', 'action', 'Snapshot session logs and packet captures'),
      makeStep('s5', 'Notify Legal', 'notification', 'Send incident brief to legal counsel'),
      makeStep('s6', 'Escalate', 'approval', 'CISO approval required before executive notification'),
    ],
  },
  {
    id: 'pb-vulnscan',
    name: 'Scheduled Vulnerability Scan',
    description: 'Weekly vulnerability scan orchestration: triggers the scanner, parses results, and auto-creates remediation tickets for critical findings.',
    trigger: 'scheduled',
    status: 'disabled',
    lastRun: ISO_OFFSET(10080),
    runCount: 52,
    successCount: 50,
    failureCount: 2,
    avgDuration: 1820,
    steps: [
      makeStep('s1', 'Trigger Scan', 'trigger', 'Invoke Nessus scan against asset group'),
      makeStep('s2', 'Parse Results', 'action', 'Normalize findings and de-duplicate against prior scans'),
      makeStep('s3', 'Create Tickets', 'action', 'Auto-create Jira tickets for Critical/High CVEs'),
    ],
  },
]


// ===== Helpers =====

function successRate(pb: SoarPlaybook): number {
  if (pb.runCount === 0) return 0
  return Math.round((pb.successCount / pb.runCount) * 100)
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never'
  try {
    return formatRelativeTime(iso)
  } catch {
    return '—'
  }
}

// ===== Stat Card =====

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sublabel?: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}) {
  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100 tabular-nums">{value}</p>
            {sublabel && <p className="mt-0.5 text-[11px] text-zinc-500">{sublabel}</p>}
          </div>
          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg border', accent)}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Mini Step Flow (used on playbook card) =====

function MiniStepFlow({ steps, isActive = false }: { steps: SoarStep[]; isActive?: boolean }) {
  const max = 8
  const visible = steps.slice(0, max)
  const overflow = steps.length - visible.length

  return (
    <div className="flex items-center gap-0.5 overflow-hidden">
      {visible.map((step, i) => {
        const cfg = STEP_TYPE_CONFIG[step.type]
        const Icon = cfg.icon
        return (
          <div key={step.id} className="flex items-center gap-0.5 shrink-0">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-md border transition-transform',
                cfg.bg, cfg.border,
                isActive && 'hover:scale-110'
              )}
              title={`${i + 1}. ${step.name} (${cfg.label})`}
            >
              <Icon className={cn('size-3', cfg.color)} />
            </div>
            {i < visible.length - 1 && (
              <span className="siem-step-connector" aria-hidden="true" />
            )}
          </div>
        )
      })}
      {overflow > 0 && (
        <span className="ml-1 text-[10px] font-medium text-zinc-500">+{overflow}</span>
      )}
    </div>
  )
}

// ===== Playbook Card =====

function PlaybookCard({
  playbook,
  onClick,
  onRun,
  index,
}: {
  playbook: SoarPlaybook
  onClick: () => void
  onRun: () => void
  index: number
}) {
  const triggerCfg = TRIGGER_CONFIG[playbook.trigger]
  const statusCfg = STATUS_CONFIG[playbook.status]
  const rate = successRate(playbook)
  const TriggerIcon = triggerCfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -2 }}
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className={cn(
          'group relative cursor-pointer bg-zinc-900/60 border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 overflow-hidden',
          playbook.status === 'active' && 'siem-pulse-glow'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  {playbook.status === 'active' && (
                    <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60', statusCfg.dot)} style={{ animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }} />
                  )}
                  <span className={cn('relative inline-flex size-2 rounded-full', statusCfg.dot)} />
                </span>
                <CardTitle className="text-sm font-semibold text-zinc-100 truncate">
                  {playbook.name}
                </CardTitle>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-500 leading-relaxed">
                {playbook.description}
              </p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn('gap-1 border text-[10px] font-medium', triggerCfg.color)}>
              <TriggerIcon className="size-3" />
              {triggerCfg.label}
            </Badge>
            <Badge variant="outline" className={cn('border text-[10px] font-medium',
              playbook.status === 'active' ? 'border-emerald-500/30 text-emerald-400' :
              playbook.status === 'draft' ? 'border-amber-500/30 text-amber-400' :
              'border-zinc-700 text-zinc-500'
            )}>
              {statusCfg.label}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400 font-medium">
              {playbook.steps.length} steps
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600">Runs</p>
              <p className="text-sm font-semibold text-zinc-200 tabular-nums">{playbook.runCount.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600">Success</p>
              <p className={cn(
                'text-sm font-semibold tabular-nums',
                rate >= 95 ? 'text-emerald-400' : rate >= 80 ? 'text-amber-400' : 'text-rose-400'
              )}>
                {rate}%
              </p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600">Avg</p>
              <p className="text-sm font-semibold text-zinc-200 tabular-nums">{formatDuration(playbook.avgDuration)}</p>
            </div>
          </div>

          {/* Success rate progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-600">Success Rate</span>
              <span className={cn(
                'text-[9px] font-mono tabular-nums',
                rate >= 95 ? 'text-emerald-400' : rate >= 80 ? 'text-amber-400' : 'text-rose-400'
              )}>
                {playbook.successCount}/{playbook.runCount}
              </span>
            </div>
            <div
              className="siem-rate-bar"
              role="progressbar"
              aria-valuenow={rate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Playbook success rate"
            >
              <span
                style={{
                  width: `${rate}%`,
                  backgroundImage: rate >= 95
                    ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.5), rgba(16, 185, 129, 1))'
                    : rate >= 80
                    ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.5), rgba(245, 158, 11, 1))'
                    : 'linear-gradient(90deg, rgba(239, 68, 68, 0.5), rgba(239, 68, 68, 1))',
                  boxShadow: rate >= 95
                    ? '0 0 8px rgba(16, 185, 129, 0.4)'
                    : rate >= 80
                    ? '0 0 8px rgba(245, 158, 11, 0.4)'
                    : '0 0 8px rgba(239, 68, 68, 0.4)',
                }}
              />
            </div>
          </div>

          {/* Mini step flow */}
          <div className="mb-3">
            <p className="mb-1.5 text-[9px] uppercase tracking-wider text-zinc-600">Workflow</p>
            <MiniStepFlow steps={playbook.steps} isActive={playbook.status === 'active'} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Clock className="size-3" />
              <span>Last run: {formatRelative(playbook.lastRun)}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onRun()
              }}
              disabled={playbook.status === 'disabled'}
              className={cn(
                'h-7 px-2 text-[11px] gap-1',
                playbook.status === 'disabled'
                  ? 'text-zinc-600'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20'
              )}
            >
              <Play className="size-3" />
              Run
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ===== Vertical Stepper (used in detail dialog) =====

function VerticalStepper({ steps }: { steps: SoarStep[] }) {
  return (
    <ol className="relative space-y-1">
      {steps.map((step, i) => {
        const cfg = STEP_TYPE_CONFIG[step.type]
        const Icon = cfg.icon
        const isLast = i === steps.length - 1
        return (
          <li key={step.id} className="relative flex gap-3">
            {/* Connector line */}
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 bottom-0 w-px bg-zinc-700/60"
                aria-hidden="true"
              />
            )}
            {/* Step icon */}
            <div className={cn('relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border', cfg.bg, cfg.border)}>
              <Icon className={cn('size-4', cfg.color)} />
            </div>
            {/* Step body */}
            <div className="flex-1 pb-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-zinc-600">#{i + 1}</span>
                <span className="text-sm font-medium text-zinc-100">{step.name}</span>
                <Badge variant="outline" className={cn('border text-[9px] font-medium', cfg.border, cfg.color)}>
                  {cfg.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{step.action}</p>
              {Object.keys(step.config).length > 0 && (
                <div className="mt-1.5 rounded-md border border-zinc-800 bg-zinc-950/50 px-2 py-1">
                  <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-0.5">Config</p>
                  <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(step.config)}
                  </pre>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ===== Playbook Detail Dialog =====

function PlaybookDetailDialog({
  playbook,
  open,
  onOpenChange,
  onRun,
  onDuplicate,
}: {
  playbook: SoarPlaybook | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onRun: (pb: SoarPlaybook) => void
  onDuplicate: (pb: SoarPlaybook) => void
}) {
  if (!playbook) return null
  const triggerCfg = TRIGGER_CONFIG[playbook.trigger]
  const statusCfg = STATUS_CONFIG[playbook.status]
  const rate = successRate(playbook)
  const TriggerIcon = triggerCfg.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <Zap className="size-4 text-emerald-400" />
                </div>
                <DialogTitle className="text-lg font-semibold text-zinc-100">
                  {playbook.name}
                </DialogTitle>
                <Badge variant="outline" className={cn('gap-1 border text-[10px] font-medium', triggerCfg.color)}>
                  <TriggerIcon className="size-3" />
                  {triggerCfg.label}
                </Badge>
                <Badge variant="outline" className={cn('border text-[10px] font-medium',
                  playbook.status === 'active' ? 'border-emerald-500/30 text-emerald-400' :
                  playbook.status === 'draft' ? 'border-amber-500/30 text-amber-400' :
                  'border-zinc-700 text-zinc-500'
                )}>
                  <span className={cn('size-1.5 rounded-full', statusCfg.dot)} />
                  {statusCfg.label}
                </Badge>
              </div>
              <DialogDescription className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {playbook.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Execution Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              <Clock className="size-3" /> Last Run
            </div>
            <p className="mt-1 text-sm font-medium text-zinc-200">{formatRelative(playbook.lastRun)}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              <Timer className="size-3" /> Avg Duration
            </div>
            <p className="mt-1 text-sm font-medium text-zinc-200">{formatDuration(playbook.avgDuration)}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              <CheckCircle2 className="size-3" /> Success Rate
            </div>
            <p className={cn(
              'mt-1 text-sm font-medium tabular-nums',
              rate >= 95 ? 'text-emerald-400' : rate >= 80 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {rate}% ({playbook.successCount}/{playbook.runCount})
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              <XCircle className="size-3" /> Failures
            </div>
            <p className="mt-1 text-sm font-medium text-rose-400 tabular-nums">{playbook.failureCount}</p>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Steps */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Workflow Steps ({playbook.steps.length})
          </h3>
          <ScrollArea className="max-h-[40vh] pr-2">
            <VerticalStepper steps={playbook.steps} />
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 border-t border-zinc-800 pt-4 relative z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(playbook)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Copy className="size-4" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Edit mode is not available in this demo')}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            size="sm"
            onClick={() => onRun(playbook)}
            disabled={playbook.status === 'disabled'}
            className={cn(
              'gap-1.5 font-medium relative z-20',
              playbook.status === 'disabled'
                ? 'bg-zinc-800 text-zinc-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            )}
          >
            <Zap className="size-4" />
            Run Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== Create Playbook Dialog =====

const STEP_TYPE_OPTIONS: SoarStepType[] = ['trigger', 'condition', 'action', 'notification', 'wait', 'approval']

function CreatePlaybookDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (pb: SoarPlaybook) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState<SoarTriggerType>('manual')
  const [stepRows, setStepRows] = useState<Array<{ id: string; name: string; type: SoarStepType; action: string }>>([
    { id: `step-${Date.now()}-0`, name: '', type: 'trigger', action: '' },
  ])

  const reset = () => {
    setName('')
    setDescription('')
    setTrigger('manual')
    setStepRows([{ id: `step-${Date.now()}-0`, name: '', type: 'trigger', action: '' }])
  }

  const handleClose = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const handleAddStep = () => {
    setStepRows((r) => [...r, { id: `step-${Date.now()}-${r.length}`, name: '', type: 'action', action: '' }])
  }

  const handleRemoveStep = (idx: number) => {
    setStepRows((r) => r.filter((_, i) => i !== idx))
  }

  const handleStepChange = (idx: number, field: 'name' | 'type' | 'action', value: string) => {
    setStepRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Playbook name is required')
      return
    }
    const validSteps = stepRows.filter((s) => s.name.trim() || s.action.trim())
    if (validSteps.length === 0) {
      toast.error('At least one step is required')
      return
    }
    const pb: SoarPlaybook = {
      id: `pb-${Date.now().toString(36)}`,
      name: name.trim(),
      description: description.trim() || 'No description provided.',
      trigger,
      status: 'draft',
      lastRun: null,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      avgDuration: 0,
      steps: validSteps.map((s, i) => ({
        id: `s-${i + 1}-${Date.now().toString(36)}`,
        name: s.name.trim() || `Step ${i + 1}`,
        type: s.type,
        action: s.action.trim() || 'No action specified',
        config: {},
      })),
    }
    onCreate(pb)
    handleClose(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Plus className="size-5 text-emerald-400" />
            Create New Playbook
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Define a new automation playbook. New playbooks are created in <span className="text-amber-400 font-medium">Draft</span> status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pb-name" className="text-xs text-zinc-300">Name</Label>
            <Input
              id="pb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Insider Threat Response"
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pb-desc" className="text-xs text-zinc-300">Description</Label>
            <Textarea
              id="pb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this playbook does..."
              rows={2}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300">Trigger Type</Label>
            <Select value={trigger} onValueChange={(v) => setTrigger(v as SoarTriggerType)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="alert-based">Alert-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-zinc-800" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-300">Initial Steps</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddStep}
                className="h-7 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
              >
                <Plus className="size-3.5" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {stepRows.map((row, idx) => {
                const cfg = STEP_TYPE_CONFIG[row.type]
                const Icon = cfg.icon
                return (
                  <div key={row.id} className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[10px] text-zinc-600">#{idx + 1}</span>
                      <Select
                        value={row.type}
                        onValueChange={(v) => handleStepChange(idx, 'type', v)}
                      >
                        <SelectTrigger className="h-7 w-36 bg-zinc-900 border-zinc-700 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Icon className={cn('size-3', cfg.color)} />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {STEP_TYPE_OPTIONS.map((t) => {
                            const c = STEP_TYPE_CONFIG[t]
                            const I = c.icon
                            return (
                              <SelectItem key={t} value={t}>
                                <div className="flex items-center gap-1.5">
                                  <I className={cn('size-3', c.color)} />
                                  {c.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <div className="flex-1" />
                      {stepRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-zinc-500 hover:text-rose-400 hover:bg-rose-900/20"
                          onClick={() => handleRemoveStep(idx)}
                          aria-label="Remove step"
                        >
                          <XCircle className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={row.name}
                      onChange={(e) => handleStepChange(idx, 'name', e.target.value)}
                      placeholder="Step name (e.g., Block IP)"
                      className="mb-1.5 h-8 bg-zinc-950 border-zinc-800 text-xs"
                    />
                    <Input
                      value={row.action}
                      onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                      placeholder="Action description"
                      className="h-8 bg-zinc-950 border-zinc-800 text-xs"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 border-t border-zinc-800 pt-4">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Plus className="size-4" />
            Create Playbook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== Execution History Panel =====

function ExecutionHistoryPanel({ executions }: { executions: ExecutionRecord[] }) {
  const [open, setOpen] = useState(true)

  const statusIcon = (status: ExecutionRecord['status']) => {
    if (status === 'success') return <CheckCircle2 className="size-3.5 text-emerald-400" />
    if (status === 'failure') return <XCircle className="size-3.5 text-rose-400" />
    if (status === 'triggered') return <Clock className="size-3.5 text-zinc-400" />
    return <Loader2 className="size-3.5 animate-spin text-amber-400" />
  }

  const statusColor = (status: ExecutionRecord['status']) =>
    status === 'success' ? 'text-emerald-400' :
    status === 'failure' ? 'text-rose-400' :
    status === 'triggered' ? 'text-zinc-400' : 'text-amber-400'

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 hover:bg-zinc-800/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Execution History
                </CardTitle>
                <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">
                  {executions.length} recent
                </Badge>
              </div>
              <ChevronDown className={cn('size-4 text-zinc-500 transition-transform', open && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="max-h-80 overflow-y-auto pr-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Playbook</th>
                    <th className="py-2 pr-3 font-medium">Timestamp</th>
                    <th className="py-2 pr-3 font-medium">Duration</th>
                    <th className="py-2 font-medium">Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[11px] text-zinc-500">
                        No executions yet — this instance has no automation backend connected.
                      </td>
                    </tr>
                  ) : (
                  executions.map((ex) => (
                    <tr
                      key={ex.id}
                      className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(ex.status)}
                          <span className={cn(
                            'text-[10px] font-medium uppercase',
                            statusColor(ex.status)
                          )}>
                            {ex.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-zinc-200 truncate max-w-44">{ex.playbookName}</td>
                      <td className="py-2 pr-3 text-zinc-400 whitespace-nowrap">{formatRelative(ex.timestamp)}</td>
                      <td className="py-2 pr-3 text-zinc-300 tabular-nums whitespace-nowrap">{formatDuration(ex.durationSec)}</td>
                      <td className="py-2 text-zinc-400 truncate max-w-56">
                        <Badge variant="outline" className="mr-1.5 border-zinc-700 text-[9px] text-zinc-500">
                          {ex.triggeredByType}
                        </Badge>
                        {ex.triggeredBy}
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ===== Main View =====

export function SoarView() {
  const soar = useSIEMStore((s) => s.soar)
  const setSoar = useSIEMStore((s) => s.setSoar)

  const [selected, setSelected] = useState<SoarPlaybook | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SoarPlaybookStatus | 'all'>('all')
  const [triggerFilter, setTriggerFilter] = useState<SoarTriggerType | 'all'>('all')
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())

  // Track pending simulation timeouts so they can be cleaned up on unmount
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // Seed playbooks on first mount if store is empty
  useEffect(() => {
    if (soar.length === 0) {
      setSoar(INITIAL_PLAYBOOKS)
    }
  }, [soar.length, setSoar])

  // Filtered playbooks
  const filtered = useMemo(() => {
    return soar.filter((pb) => {
      if (statusFilter !== 'all' && pb.status !== statusFilter) return false
      if (triggerFilter !== 'all' && pb.trigger !== triggerFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !pb.name.toLowerCase().includes(q) &&
          !pb.description.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [soar, search, statusFilter, triggerFilter])

  // Stats
  const stats = useMemo(() => {
    const active = soar.filter((p) => p.status === 'active').length
    const runsToday = executions.filter((e) => {
      const d = new Date(e.timestamp)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length
    const totalRuns = soar.reduce((acc, p) => acc + p.runCount, 0)
    const totalSuccess = soar.reduce((acc, p) => acc + p.successCount, 0)
    const avgRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0
    const playbooksWithRuns = soar.filter((p) => p.avgDuration > 0)
    const avgDur = playbooksWithRuns.length > 0
      ? Math.round(playbooksWithRuns.reduce((a, p) => a + p.avgDuration, 0) / playbooksWithRuns.length)
      : 0
    return { active, runsToday, avgRate, avgDur }
  }, [soar, executions])

  const openDetail = useCallback((pb: SoarPlaybook) => {
    setSelected(pb)
    setDetailOpen(true)
  }, [])

  const runPlaybook = useCallback((pb: SoarPlaybook) => {
    if (pb.status === 'disabled') {
      toast.error(`Playbook "${pb.name}" is disabled`)
      return
    }
    // No automation/orchestration backend is connected in this instance, so we
    // record that the run was *requested* honestly rather than faking a result.
    setRunningIds((s) => new Set(s).add(pb.id))
    toast.info(`Run requested: ${pb.name}`, {
      description: 'No automation backend connected — execution not performed.',
    })

    const newExec: ExecutionRecord = {
      id: `ex-${Date.now().toString(36)}`,
      playbookId: pb.id,
      playbookName: pb.name,
      timestamp: new Date().toISOString(),
      status: 'triggered',
      durationSec: 0,
      triggeredBy: 'analyst@insights.io',
      triggeredByType: 'manual',
    }
    setExecutions((prev) => [newExec, ...prev].slice(0, 50))

    setRunningIds((s) => {
      const next = new Set(s)
      next.delete(pb.id)
      return next
    })
  }, [])

  const duplicatePlaybook = useCallback((pb: SoarPlaybook) => {
    const copy: SoarPlaybook = {
      ...pb,
      id: `pb-${Date.now().toString(36)}`,
      name: `${pb.name} (Copy)`,
      status: 'draft',
      lastRun: null,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      avgDuration: 0,
      steps: pb.steps.map((s, i) => ({ ...s, id: `s-${i + 1}-${Date.now().toString(36)}` })),
    }
    setSoar((prev) => [copy, ...prev])
    toast.success(`Duplicated playbook: ${pb.name}`, {
      description: 'A draft copy has been added to the library.',
    })
    setDetailOpen(false)
  }, [setSoar])

  const createPlaybook = useCallback((pb: SoarPlaybook) => {
    setSoar((prev) => [pb, ...prev])
    toast.success(`Created playbook: ${pb.name}`, {
      description: 'Saved as Draft — activate it from the card menu to enable runs.',
    })
    setCreateOpen(false)
  }, [setSoar])

  const toggleStatus = useCallback((pb: SoarPlaybook) => {
    const next: SoarPlaybookStatus = pb.status === 'active' ? 'disabled' : 'active'
    setSoar((prev) => prev.map((p) => (p.id === pb.id ? { ...p, status: next } : p)))
    toast.info(`Playbook "${pb.name}" is now ${next}`)
  }, [setSoar])

  // Clean up pending simulation timeouts on unmount
  useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach((t) => clearTimeout(t))
      pendingTimersRef.current.clear()
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Zap className="size-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">SOAR Playbooks</h1>
              <p className="text-xs text-zinc-500">
                Security Orchestration, Automation, and Response — automate detection & response workflows
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Refreshing playbook metrics...')}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Activity className="size-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Plus className="size-4" />
            New Playbook
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Total Active"
          value={stats.active.toString()}
          sublabel={`${soar.length} total playbooks`}
          icon={Zap}
          accent="bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        />
        <StatCard
          label="Runs Today"
          value={stats.runsToday.toString()}
          sublabel="Across all playbooks"
          icon={Activity}
          accent="bg-sky-500/10 border-sky-500/30 text-sky-400"
        />
        <StatCard
          label="Avg Success Rate"
          value={`${stats.avgRate}%`}
          sublabel="Lifetime across playbooks"
          icon={CheckCircle2}
          accent="bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(stats.avgDur)}
          sublabel="Per playbook execution"
          icon={Timer}
          accent="bg-purple-500/10 border-purple-500/30 text-purple-400"
        />
      </motion.div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search playbooks..."
            className="h-8 pl-8 bg-zinc-900 border-zinc-700 text-zinc-200 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SoarPlaybookStatus | 'all')}>
          <SelectTrigger className="h-8 w-32 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={triggerFilter} onValueChange={(v) => setTriggerFilter(v as SoarTriggerType | 'all')}>
          <SelectTrigger className="h-8 w-36 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Triggers</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="alert-based">Alert-Based</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Filter className="size-3" />
          <span>Showing {filtered.length} of {soar.length}</span>
        </div>
      </div>

      {/* Playbook Grid */}
      {filtered.length === 0 ? (
        <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-800/60">
              <Zap className="size-5 text-zinc-600" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-300">No playbooks found</p>
            <p className="mt-1 text-xs text-zinc-500">Try adjusting your filters or create a new playbook.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 border-emerald-600/40 text-emerald-400 hover:bg-emerald-900/20"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Create Playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pb, idx) => (
            <div key={pb.id} className="relative">
              <PlaybookCard
                playbook={pb}
                onClick={() => openDetail(pb)}
                onRun={() => runPlaybook(pb)}
                index={idx}
              />
              {runningIds.has(pb.id) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-950/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-5 animate-spin text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-medium">Running...</span>
                  </div>
                </div>
              )}
              {/* Quick toggle */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 size-6 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleStatus(pb)
                }}
                title={pb.status === 'active' ? 'Disable' : 'Activate'}
                aria-label={pb.status === 'active' ? 'Disable playbook' : 'Activate playbook'}
              >
                {pb.status === 'active' ? (
                  <PauseCircle className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Execution History */}
      <ExecutionHistoryPanel executions={executions} />

      {/* Dialogs */}
      <PlaybookDetailDialog
        playbook={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRun={runPlaybook}
        onDuplicate={duplicatePlaybook}
      />
      <CreatePlaybookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createPlaybook}
      />
    </div>
  )
}
