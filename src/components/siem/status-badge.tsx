'use client'

import { cn } from '@/lib/utils'
import type {
  Severity,
  AlertStatus,
  IncidentStatus,
  IncidentPriority,
  AssetCriticality,
  ControlStatus,
} from '@/lib/types'

// ===== Severity Badge =====

const severityConfig: Record<Severity, { dot: string; text: string; label: string; glow?: string; pulse?: string }> = {
  critical: { dot: 'bg-red-500', text: 'text-red-500', label: 'Critical', glow: 'siem-badge-glow-critical', pulse: 'siem-critical-badge-pulse' },
  high: { dot: 'bg-amber-500', text: 'text-amber-500', label: 'High', glow: 'siem-badge-glow-high' },
  medium: { dot: 'bg-yellow-500', text: 'text-yellow-500', label: 'Medium', glow: 'siem-badge-glow-medium' },
  low: { dot: 'bg-emerald-500', text: 'text-emerald-500', label: 'Low', glow: 'siem-badge-glow-low' },
  informational: { dot: 'bg-zinc-400', text: 'text-zinc-400', label: 'Info' },
}

interface SeverityBadgeProps {
  severity: Severity
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

export function SeverityBadge({
  severity,
  size = 'md',
  showDot = true,
  className,
}: SeverityBadgeProps) {
  const config = severityConfig[severity] || severityConfig.informational

  const sizeClasses = {
    sm: 'text-[10px] gap-1',
    md: 'text-xs gap-1.5',
    lg: 'text-sm gap-2',
  }

  const dotSizeClasses = {
    sm: 'size-1.5',
    md: 'size-2',
    lg: 'size-2.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md px-1.5 py-0.5',
        sizeClasses[size],
        config.text,
        config.glow,
        config.pulse,
        className
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', dotSizeClasses[size], config.dot)} />
      )}
      {config.label}
    </span>
  )
}

// ===== Alert Status Badge =====

const alertStatusConfig: Record<AlertStatus, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'New' },
  acknowledged: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Acknowledged' },
  investigating: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Investigating' },
  resolved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Resolved' },
  suppressed: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Suppressed' },
  escalated: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Escalated' },
}

interface StatusBadgeProps {
  status: AlertStatus | IncidentStatus
  type?: 'alert' | 'incident'
  className?: string
}

export function StatusBadge({ status, type = 'alert', className }: StatusBadgeProps) {
  const incidentStatusConfig: Record<IncidentStatus, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Open' },
    investigating: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Investigating' },
    contained: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Contained' },
    eradicated: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Eradicated' },
    recovered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Recovered' },
    closed: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Closed' },
  }

  const config =
    type === 'incident'
      ? incidentStatusConfig[status as IncidentStatus]
      : alertStatusConfig[status as AlertStatus]

  if (!config) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-500/15 text-zinc-400',
          className
        )}
      >
        {String(status)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  )
}

// ===== Priority Badge =====

const priorityConfig: Record<IncidentPriority, { bg: string; text: string; label: string; gradient?: string }> = {
  p1: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'P1 - Critical', gradient: 'siem-priority-gradient-p1' },
  p2: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'P2 - High', gradient: 'siem-priority-gradient-p2' },
  p3: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'P3 - Medium', gradient: 'siem-priority-gradient-p3' },
  p4: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'P4 - Low', gradient: 'siem-priority-gradient-p4' },
}

interface PriorityBadgeProps {
  priority: IncidentPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  if (!config) {
    return (
      <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-500/15 text-zinc-400', className)}>
        {String(priority)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border border-transparent',
        config.bg,
        config.text,
        config.gradient,
        className
      )}
    >
      {config.label}
    </span>
  )
}

// ===== Criticality Badge =====

const criticalityConfig: Record<AssetCriticality, { dot: string; text: string; label: string }> = {
  critical: { dot: 'bg-red-500', text: 'text-red-400', label: 'Critical' },
  high: { dot: 'bg-amber-500', text: 'text-amber-400', label: 'High' },
  medium: { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Medium' },
  low: { dot: 'bg-zinc-400', text: 'text-zinc-400', label: 'Low' },
}

interface CriticalityBadgeProps {
  criticality: AssetCriticality
  className?: string
}

export function CriticalityBadge({ criticality, className }: CriticalityBadgeProps) {
  const config = criticalityConfig[criticality]
  if (!config) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400', className)}>
        {String(criticality)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        config.text,
        className
      )}
    >
      <span className={cn('size-2 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

// ===== Compliance Badge =====

const complianceConfig: Record<ControlStatus, { bg: string; text: string; label: string }> = {
  compliant: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Compliant' },
  non_compliant: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Non-Compliant' },
  partially_compliant: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Partial' },
  not_assessed: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Not Assessed' },
  not_applicable: { bg: 'bg-zinc-800/50', text: 'text-zinc-500', label: 'N/A' },
}

interface ComplianceBadgeProps {
  status: ControlStatus
  className?: string
}

export function ComplianceBadge({ status, className }: ComplianceBadgeProps) {
  const config = complianceConfig[status]
  if (!config) {
    return (
      <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-500/15 text-zinc-400', className)}>
        {String(status)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  )
}
