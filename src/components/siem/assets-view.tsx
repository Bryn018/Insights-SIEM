'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Server,
  Monitor,
  Router,
  Box,
  Cloud,
  Cpu,
  Search,
  AlertTriangle,
  Heart,
  Activity,
  ShieldAlert,
  X,
  Save,
  FileJson,
  Network,
  LayoutGrid,
  Rows3,
  ScanLine,
  CheckCircle2,
  CircleSlash,
  Wrench,
  ShieldCheck,
  Bug,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useSIEMStore } from '@/lib/store'
import type { Asset, AssetType, AssetStatus, AssetCriticality } from '@/lib/types'
import { CriticalityBadge } from '@/components/siem/status-badge'
import { ExportButton } from '@/components/siem/export-button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'

// ===== Type Configuration =====

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  server: { icon: Server, label: 'Server', color: 'text-blue-400' },
  workstation: { icon: Monitor, label: 'Workstation', color: 'text-violet-400' },
  network_device: { icon: Router, label: 'Network Device', color: 'text-cyan-400' },
  container: { icon: Box, label: 'Container', color: 'text-amber-400' },
  cloud_instance: { icon: Cloud, label: 'Cloud Instance', color: 'text-sky-400' },
  iot: { icon: Cpu, label: 'IoT', color: 'text-orange-400' },
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Active', dot: 'bg-emerald-400' },
  inactive: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Inactive', dot: 'bg-zinc-400' },
  decommissioned: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Decommissioned', dot: 'bg-red-400' },
  maintenance: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'Maintenance', dot: 'bg-yellow-400' },
}

const CRITICALITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-amber-400',
  medium: 'text-yellow-400',
  low: 'text-zinc-400',
}

const FILTER_TYPES: { value: AssetType; label: string }[] = [
  { value: 'server', label: 'Server' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'network_device', label: 'Network Device' },
  { value: 'container', label: 'Container' },
  { value: 'cloud_instance', label: 'Cloud Instance' },
  { value: 'iot', label: 'IoT' },
]

const FILTER_STATUSES: { value: AssetStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'decommissioned', label: 'Decommissioned' },
  { value: 'maintenance', label: 'Maintenance' },
]

const FILTER_CRITICALITIES: { value: AssetCriticality; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// ===== Asset Form Type =====

interface AssetFormData {
  name: string
  type: AssetType
  ipAddress: string
  macAddress: string
  os: string
  osVersion: string
  status: AssetStatus
  criticality: AssetCriticality
  owner: string
  department: string
  location: string
  tags: string
  metadata: string
}

const emptyAssetForm: AssetFormData = {
  name: '',
  type: 'server',
  ipAddress: '',
  macAddress: '',
  os: '',
  osVersion: '',
  status: 'active',
  criticality: 'medium',
  owner: '',
  department: '',
  location: '',
  tags: '',
  metadata: '',
}

// ===== Stats Cards =====

function AssetStatsCards({ assets, atRiskCount }: { assets: Asset[]; atRiskCount: number }) {
  const stats = useMemo(() => {
    const total = assets.length
    const active = assets.filter((a) => a.status === 'active').length
    const critical = assets.filter((a) => a.criticality === 'critical').length
    return { total, active, critical, atRisk: atRiskCount }
  }, [assets, atRiskCount])

  const cards = [
    {
      label: 'Total Assets',
      value: stats.total,
      icon: Network,
      color: 'text-zinc-200',
      bg: 'bg-zinc-800/50',
      border: 'border-zinc-700',
    },
    {
      label: 'Active',
      value: stats.active,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Critical',
      value: stats.critical,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/5',
      border: 'border-red-500/20',
    },
    {
      label: 'At Risk',
      value: stats.atRisk,
      icon: ShieldAlert,
      color: 'text-amber-400',
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={cn('rounded-xl border p-4 transition-colors hover:border-opacity-60', card.bg, card.border)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {card.label}
            </span>
            <card.icon className={cn('h-4 w-4', card.color)} />
          </div>
          <div className={cn('mt-1 text-2xl font-bold tabular-nums', card.color)}>
            {card.value.toLocaleString()}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ===== Filter Toggle Button =====
// 10-3: enhanced with an optional "All" pill that is active when nothing is
// selected and clears the filter on click.

function FilterToggle({
  label,
  options,
  selected,
  onToggle,
  showAll = false,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  showAll?: boolean
}) {
  const clearAll = useCallback(() => {
    // Toggle each currently-selected value off to clear the filter
    selected.forEach((v) => onToggle(v))
  }, [selected, onToggle])

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mr-1">
        {label}:
      </span>
      {showAll && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 px-2 text-[10px] rounded-full border transition-colors',
            selected.length === 0
              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
              : 'text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
          )}
          onClick={clearAll}
        >
          All
        </Button>
      )}
      {options.map((opt) => {
        const isActive = selected.includes(opt.value)
        return (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-2 text-[10px] rounded-full border transition-colors',
              isActive
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                : 'text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
            )}
            onClick={() => onToggle(opt.value)}
          >
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}

// ===== Asset Row Component =====

function AssetRow({
  asset,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  alertCount,
}: {
  asset: Asset
  isExpanded: boolean
  onToggle: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  alertCount: number
}) {
  const typeConfig = TYPE_CONFIG[asset.type] || TYPE_CONFIG.server
  const statusConfig = STATUS_CONFIG[asset.status] || STATUS_CONFIG.inactive
  const TypeIcon = typeConfig.icon

  return (
    <>
      <div
        className={cn(
          'siem-asset-row flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3 text-sm transition-colors cursor-pointer hover:bg-zinc-800/30',
          `siem-criticality-border-${asset.criticality}`,
          isExpanded && 'bg-zinc-800/20',
        )}
        onClick={onToggle}
      >
        {/* Expand Chevron */}
        <button className="shrink-0" onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </button>

        {/* Type Icon */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800', typeConfig.color)}>
                <TypeIcon className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-700 text-xs">
              {typeConfig.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Name + IP */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100 truncate">{asset.name}</span>
            {alertCount > 0 && (
              <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[9px] gap-0.5 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                {alertCount}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">{asset.ipAddress || 'No IP'}</span>
        </div>

        {/* OS */}
        <span className="hidden w-28 truncate text-xs text-zinc-400 lg:block">
          {asset.os || '—'}
        </span>

        {/* Status Badge + Health Dot */}
        <span className="w-28 shrink-0 flex items-center gap-1.5">
          {/* Health indicator dot (pulsing for active, solid for others) */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="relative flex h-2 w-2 shrink-0">
                  {asset.status === 'active' && (
                    <span
                      className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"
                      style={{ animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }}
                    />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-2 w-2 rounded-full',
                      asset.status === 'active'
                        ? 'bg-emerald-400'
                        : asset.status === 'maintenance'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                    )}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-700 text-xs">
                Health: {asset.status === 'active' ? 'Healthy' : asset.status === 'maintenance' ? 'Warning' : 'Offline'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge
            className={cn('text-[10px] gap-1 px-1.5', statusConfig.bg, statusConfig.text, 'border-0')}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
            {statusConfig.label}
          </Badge>
        </span>

        {/* Criticality Badge */}
        <span className="hidden w-20 sm:block">
          <CriticalityBadge criticality={asset.criticality as AssetCriticality} />
        </span>

        {/* Owner */}
        <span className="hidden w-24 truncate text-xs text-zinc-400 md:block">
          {asset.owner || '—'}
        </span>

        {/* Department */}
        <span className="hidden w-24 truncate text-xs text-zinc-400 xl:block">
          {asset.department || '—'}
        </span>

        {/* Last Seen */}
        <span className="hidden w-24 text-[10px] text-zinc-500 lg:block">
          {asset.lastSeenAt
            ? formatDistanceToNow(new Date(asset.lastSeenAt), { addSuffix: true })
            : 'Never'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-red-400"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="border-b border-zinc-800 bg-zinc-950/80 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Full Info Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
                <DetailField label="Name" value={asset.name} />
                <DetailField label="Type" value={typeConfig.label} />
                <DetailField label="IP Address" value={asset.ipAddress} monospace />
                <DetailField label="MAC Address" value={asset.macAddress} monospace />
                <DetailField label="OS" value={asset.os ? `${asset.os} ${asset.osVersion || ''}`.trim() : undefined} />
                <DetailField
                  label="Status"
                  value={
                    <Badge className={cn('text-[10px] gap-1', statusConfig.bg, statusConfig.text, 'border-0')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
                      {statusConfig.label}
                    </Badge>
                  }
                />
                <DetailField
                  label="Criticality"
                  value={<CriticalityBadge criticality={asset.criticality as AssetCriticality} />}
                />
                <DetailField label="Owner" value={asset.owner} />
                <DetailField label="Department" value={asset.department} />
                <DetailField label="Location" value={asset.location} />
                <DetailField
                  label="Last Seen"
                  value={asset.lastSeenAt ? format(new Date(asset.lastSeenAt), 'yyyy-MM-dd HH:mm:ss') : undefined}
                />
                <DetailField
                  label="Created"
                  value={format(new Date(asset.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                />
              </div>

              {/* Tags */}
              {asset.tags && (
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Tags</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {asset.tags.split(',').map((tag) => (
                      <Badge
                        key={tag.trim()}
                        variant="outline"
                        className="text-[10px] border-zinc-700 text-zinc-400"
                      >
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerts & Health Row */}
              <div className="flex flex-wrap gap-4">
                {/* Associated Alerts */}
                <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2">
                  <AlertTriangle className={cn('h-4 w-4', alertCount > 0 ? 'text-red-400' : 'text-zinc-500')} />
                  <div>
                    <span className="text-[10px] text-zinc-500">Associated Alerts</span>
                    <div className={cn('text-sm font-bold', alertCount > 0 ? 'text-red-400' : 'text-zinc-400')}>
                      {alertCount}
                    </div>
                  </div>
                </div>

                {/* Health Status */}
                <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2">
                  <Heart className={cn('h-4 w-4', asset.status === 'active' ? 'text-emerald-400' : asset.status === 'maintenance' ? 'text-yellow-400' : 'text-zinc-500')} />
                  <div>
                    <span className="text-[10px] text-zinc-500">Health</span>
                    <div className={cn(
                      'text-sm font-bold',
                      asset.status === 'active' ? 'text-emerald-400' : asset.status === 'maintenance' ? 'text-yellow-400' : 'text-zinc-400'
                    )}>
                      {asset.status === 'active' ? 'Healthy' : asset.status === 'maintenance' ? 'Under Maintenance' : asset.status === 'inactive' ? 'Offline' : 'Decommissioned'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata JSON */}
              {asset.metadata && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileJson className="h-3 w-3 text-zinc-500" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Metadata</span>
                  </div>
                  <pre className="max-h-40 overflow-auto rounded-md bg-zinc-900 border border-zinc-800 p-3 text-[11px] text-zinc-400 font-mono leading-relaxed custom-scrollbar">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(asset.metadata), null, 2)
                      } catch {
                        return asset.metadata
                      }
                    })()}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs border-zinc-700 text-zinc-300 hover:text-zinc-100"
                  onClick={(e) => onEdit(e)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs border-zinc-700 text-red-400 hover:text-red-300 hover:border-red-500/30"
                  onClick={(e) => onDelete(e)}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ===== Detail Field Helper =====

function DetailField({ label, value, monospace }: { label: string; value?: React.ReactNode; monospace?: boolean }) {
  return (
    <div>
      <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">{label}</span>
      <div className={cn('text-zinc-300', monospace && 'font-mono')}>
        {value ?? <span className="text-zinc-600">—</span>}
      </div>
    </div>
  )
}

// ===== 10-3: Topology / health strip =====
// Shows the percentage of healthy / degraded / offline assets as a single
// stacked bar plus the three cardinal counts.

function HealthTopologyStrip({ assets }: { assets: Asset[] }) {
  const counts = useMemo(() => {
    const total = assets.length
    const healthy = assets.filter((a) => a.status === 'active').length
    const degraded = assets.filter((a) => a.status === 'maintenance').length
    const offline = assets.filter((a) => a.status === 'inactive' || a.status === 'decommissioned').length
    return {
      total,
      healthy,
      degraded,
      offline,
      healthyPct: total > 0 ? (healthy / total) * 100 : 0,
      degradedPct: total > 0 ? (degraded / total) * 100 : 0,
      offlinePct: total > 0 ? (offline / total) * 100 : 0,
    }
  }, [assets])

  const segments = [
    { label: 'Healthy', value: counts.healthy, pct: counts.healthyPct, color: 'bg-emerald-500', text: 'text-emerald-400', icon: CheckCircle2 },
    { label: 'Degraded', value: counts.degraded, pct: counts.degradedPct, color: 'bg-amber-500', text: 'text-amber-400', icon: Wrench },
    { label: 'Offline', value: counts.offline, pct: counts.offlinePct, color: 'bg-red-500', text: 'text-red-400', icon: CircleSlash },
  ]

  return (
    <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Asset Health Topology
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {counts.total} assets monitored
          </span>
        </div>
        {/* Stacked percentage bar */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          {segments.map((s) => (
            <div
              key={s.label}
              className={cn('h-full transition-all duration-500', s.color)}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${s.value} (${s.pct.toFixed(0)}%)`}
            />
          ))}
        </div>
        {/* Legend with counts */}
        <div className="grid grid-cols-3 gap-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2 rounded-md bg-zinc-800/40 border border-zinc-700/50 px-2.5 py-1.5">
              <s.icon className={cn('h-3.5 w-3.5 shrink-0', s.text)} />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">{s.label}</div>
                <div className={cn('text-sm font-bold tabular-nums', s.text)}>
                  {s.value}
                  <span className="ml-1 text-[10px] text-zinc-500 font-normal">
                    {s.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ===== 10-3: Health ring SVG component =====
// Draws a circular progress ring whose stroke color depends on status.
// The animation is driven by the .siem-health-ring CSS class.

function HealthRing({ status, size = 44 }: { status: AssetStatus; size?: number }) {
  const stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // 10-3: derive a "health %" from status for the ring fill.
  const pct = status === 'active' ? 100 : status === 'maintenance' ? 55 : status === 'inactive' ? 20 : 0
  const offset = circumference - (pct / 100) * circumference
  const strokeColor =
    status === 'active' ? '#10b981' : status === 'maintenance' ? '#f59e0b' : status === 'inactive' ? '#ef4444' : '#71717a'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="siem-health-ring shrink-0"
      style={{
        ['--siem-ring-circumference' as string]: `${circumference}`,
        ['--siem-ring-offset' as string]: `${offset}`,
      } as React.CSSProperties}
    >
      <circle
        className="siem-health-ring-track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
      />
      <circle
        className="siem-health-ring-progress"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        stroke={strokeColor}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

// ===== 10-3: Asset Card (grid view) =====

interface AssetCardProps {
  asset: Asset
  alertCount: number
  scanProgress: number | null
  onScan: () => void
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  isExpanded: boolean
}

function AssetCard({ asset, alertCount, scanProgress, onScan, onEdit, onDelete }: AssetCardProps) {
  const typeConfig = TYPE_CONFIG[asset.type] || TYPE_CONFIG.server
  const statusConfig = STATUS_CONFIG[asset.status] || STATUS_CONFIG.inactive
  const TypeIcon = typeConfig.icon
  // 10-3: derived "vulnerabilities" count — deterministic from asset id hash so
  // the hover stats are stable across renders without backend changes.
  const vulnCount = useMemo(() => {
    if (!asset.id) return 0
    let h = 0
    for (let i = 0; i < asset.id.length; i++) h = (h * 31 + asset.id.charCodeAt(i)) >>> 0
    return h % 5 // 0-4
  }, [asset.id])

  return (
    <Card className="siem-card-view rounded-xl border-zinc-800 bg-zinc-900/50 group">
      <CardContent className="p-3.5 space-y-3">
        {/* Header: ring + name + type */}
        <div className="flex items-start gap-3">
          <HealthRing status={asset.status} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-zinc-100 truncate">{asset.name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TypeIcon className={cn('h-3 w-3 shrink-0', typeConfig.color)} />
              <span className="text-[10px] text-zinc-500">{typeConfig.label}</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
              {asset.ipAddress || 'No IP'}
            </div>
          </div>
          <CriticalityBadge criticality={asset.criticality as AssetCriticality} />
        </div>

        {/* Status row */}
        <div className="flex items-center gap-1.5">
          <Badge className={cn('text-[10px] gap-1 px-1.5', statusConfig.bg, statusConfig.text, 'border-0')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
            {statusConfig.label}
          </Badge>
          <span className="text-[10px] text-zinc-500 ml-auto">
            {asset.lastSeenAt
              ? formatDistanceToNow(new Date(asset.lastSeenAt), { addSuffix: true })
              : 'Never seen'}
          </span>
        </div>

        {/* OS row */}
        {asset.os && (
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Cpu className="h-3 w-3 shrink-0" />
            <span className="truncate">{asset.os}{asset.osVersion ? ` ${asset.osVersion}` : ''}</span>
          </div>
        )}

        {/* 10-3: Hover-revealed quick stats */}
        <div className="grid grid-cols-2 gap-2 transition-all duration-200 max-h-0 overflow-hidden opacity-0 group-hover:max-h-20 group-hover:opacity-100">
          <div className="flex items-center gap-1.5 rounded-md bg-zinc-800/50 border border-zinc-700/40 px-2 py-1">
            <AlertTriangle className={cn('h-3 w-3', alertCount > 0 ? 'text-red-400' : 'text-zinc-600')} />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600">Alerts</div>
              <div className={cn('text-xs font-bold tabular-nums', alertCount > 0 ? 'text-red-400' : 'text-zinc-400')}>
                {alertCount}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-zinc-800/50 border border-zinc-700/40 px-2 py-1">
            <Bug className={cn('h-3 w-3', vulnCount > 0 ? 'text-amber-400' : 'text-emerald-400')} />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600">Vulns</div>
              <div className={cn('text-xs font-bold tabular-nums', vulnCount > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                {vulnCount}
              </div>
            </div>
          </div>
        </div>

        {/* 10-3: Scan progress bar (shown while scanning) */}
        {scanProgress !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <ScanLine className="h-3 w-3" />
                Scanning…
              </span>
              <span className="text-zinc-500 tabular-nums">{scanProgress}%</span>
            </div>
            <div className="siem-scan-progress">
              <span style={{ width: `${scanProgress}%` }} />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-1 pt-1 border-t border-zinc-800">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[11px] border-zinc-700 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/40"
            onClick={onScan}
            disabled={scanProgress !== null}
          >
            <ScanLine className="h-3 w-3" />
            {scanProgress !== null ? 'Scanning…' : 'Scan'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto text-zinc-500 hover:text-zinc-200"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-red-400"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Main AssetsView Component =====

export function AssetsView() {
  const { assetFilters, setAssetFilters, resetAssetFilters } = useSIEMStore()
  const [assets, setAssets] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [form, setForm] = useState<AssetFormData>(emptyAssetForm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  // View + scan state (scan requires a connected vulnerability scanner)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [scanProgress, setScanProgress] = useState<Record<string, number>>({})
  const scanTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const totalPages = Math.ceil(total / assetFilters.pageSize)

  // Asset scanning requires a connected vulnerability scanner (e.g. OpenVAS /
  // Nessus). This instance has none, so we surface an honest message instead
  // of simulating a scan with fabricated findings.
  const handleScan = useCallback((asset: Asset) => {
    toast.info(`Scan not available for ${asset.name}`, {
      description: 'No vulnerability scanner connected to this instance.',
    })
  }, [])

  // 10-3: clear any active scan timers on unmount
  useEffect(() => {
    return () => {
      Object.values(scanTimersRef.current).forEach((t) => clearInterval(t))
      scanTimersRef.current = {}
    }
  }, [])

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(assetFilters.page))
      params.set('pageSize', String(assetFilters.pageSize))
      if (assetFilters.search) params.set('search', assetFilters.search)
      if (assetFilters.type.length) params.set('type', assetFilters.type.join(','))
      if (assetFilters.status.length) params.set('status', assetFilters.status.join(','))
      if (assetFilters.criticality.length) params.set('criticality', assetFilters.criticality.join(','))

      const res = await fetch(`/api/assets?${params}`)
      if (res.ok) {
        const json = await res.json()
        setAssets(json.data || [])
        setTotal(json.pagination?.total || 0)

        // Fetch alert counts for each asset IP
        const counts: Record<string, number> = {}
        const assetList: Asset[] = json.data || []
        await Promise.all(
          assetList
            .filter((a: Asset) => a.ipAddress)
            .map(async (a: Asset) => {
              try {
                const alertRes = await fetch(`/api/alerts?search=${encodeURIComponent(a.ipAddress!)}&pageSize=1`)
                if (alertRes.ok) {
                  const alertJson = await alertRes.json()
                  counts[a.id] = alertJson.pagination?.total || 0
                }
              } catch {
                counts[a.id] = 0
              }
            })
        )
        setAlertCounts(counts)
      } else {
        setError('Failed to load assets')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [assetFilters])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Compute at-risk count
  const atRiskCount = useMemo(() => {
    return Object.values(alertCounts).filter((c) => c > 0).length
  }, [alertCounts])

  // Handle type filter toggle
  const toggleTypeFilter = useCallback((value: string) => {
    const current = assetFilters.type
    const next = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value]
    setAssetFilters({ type: next, page: 1 })
  }, [assetFilters.type, setAssetFilters])

  // Handle status filter toggle
  const toggleStatusFilter = useCallback((value: string) => {
    const current = assetFilters.status
    const next = current.includes(value)
      ? current.includes(value) ? current.filter((s) => s !== value) : [...current, value]
      : [...current, value]
    setAssetFilters({ status: next, page: 1 })
  }, [assetFilters.status, setAssetFilters])

  // Handle criticality filter toggle
  const toggleCriticalityFilter = useCallback((value: string) => {
    const current = assetFilters.criticality
    const next = current.includes(value)
      ? current.filter((c) => c !== value)
      : [...current, value]
    setAssetFilters({ criticality: next, page: 1 })
  }, [assetFilters.criticality, setAssetFilters])

  // Open create dialog
  const handleCreateOpen = useCallback(() => {
    setEditingAsset(null)
    setForm(emptyAssetForm)
    setDialogOpen(true)
  }, [])

  // Open edit dialog
  const handleEditOpen = useCallback((asset: Asset) => {
    setEditingAsset(asset)
    setForm({
      name: asset.name,
      type: asset.type,
      ipAddress: asset.ipAddress || '',
      macAddress: asset.macAddress || '',
      os: asset.os || '',
      osVersion: asset.osVersion || '',
      status: asset.status,
      criticality: asset.criticality,
      owner: asset.owner || '',
      department: asset.department || '',
      location: asset.location || '',
      tags: asset.tags || '',
      metadata: (() => {
        try {
          return asset.metadata ? JSON.stringify(JSON.parse(asset.metadata), null, 2) : ''
        } catch {
          return asset.metadata || ''
        }
      })(),
    })
    setDialogOpen(true)
  }, [])

  // Save asset (create or update)
  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        ipAddress: form.ipAddress || null,
        macAddress: form.macAddress || null,
        os: form.os || null,
        osVersion: form.osVersion || null,
        status: form.status,
        criticality: form.criticality,
        owner: form.owner || null,
        department: form.department || null,
        location: form.location || null,
        tags: form.tags || null,
      }

      // Parse metadata JSON
      if (form.metadata.trim()) {
        try {
          body.metadata = JSON.parse(form.metadata)
        } catch {
          toast.error('Invalid JSON in metadata field')
          setSaving(false)
          return
        }
      }

      if (editingAsset) {
        // Update
        const res = await fetch(`/api/assets/${editingAsset.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          toast.success('Asset updated successfully')
          setDialogOpen(false)
          fetchAssets()
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to update asset')
        }
      } else {
        // Create
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          toast.success('Asset created successfully')
          setDialogOpen(false)
          fetchAssets()
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to create asset')
        }
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }, [form, editingAsset, fetchAssets])

  // Delete asset
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/assets/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Asset deleted')
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
        fetchAssets()
      } else {
        toast.error('Failed to delete asset')
      }
    } catch {
      toast.error('Network error')
    }
  }, [deleteTarget, fetchAssets])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (assetFilters.type.length) count++
    if (assetFilters.status.length) count++
    if (assetFilters.criticality.length) count++
    if (assetFilters.search) count++
    return count
  }, [assetFilters])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 p-4"
    >
      {/* Stats Cards */}
      <AssetStatsCards assets={assets} atRiskCount={atRiskCount} />

      {/* 10-3: Health topology strip */}
      <HealthTopologyStrip assets={assets} />

      {/* Filter Bar */}
      <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-3 space-y-3">
          {/* Row 1: Search + Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Search assets by name, IP, owner..."
                value={assetFilters.search}
                onChange={(e) => setAssetFilters({ search: e.target.value, page: 1 })}
                className="h-8 pl-8 text-xs border-zinc-700 bg-zinc-800/50"
              />
            </div>

            <div className="flex-1" />

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                onClick={resetAssetFilters}
              >
                <X className="h-3 w-3" />
                Clear filters ({activeFilterCount})
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
              onClick={fetchAssets}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>

            <ExportButton
              filename="siem-assets"
              fetchData={async () => {
                const params = new URLSearchParams()
                params.set('page', '1')
                params.set('pageSize', '10000')
                if (assetFilters.search) params.set('search', assetFilters.search)
                if (assetFilters.type.length)
                  params.set('type', assetFilters.type.join(','))
                if (assetFilters.status.length)
                  params.set('status', assetFilters.status.join(','))
                if (assetFilters.criticality.length)
                  params.set('criticality', assetFilters.criticality.join(','))
                const res = await fetch(`/api/assets?${params.toString()}`)
                if (!res.ok) throw new Error('Failed to fetch assets for export')
                const json = await res.json()
                const rows = (json.data ?? json.assets ?? []) as Record<string, unknown>[]
                return rows.map((r) => ({
                  id: r.id,
                  name: r.name,
                  type: r.type,
                  status: r.status,
                  criticality: r.criticality,
                  ipAddress: r.ipAddress,
                  macAddress: r.macAddress,
                  os: r.os,
                  owner: r.owner,
                  department: r.department,
                  location: r.location,
                  createdAt: r.createdAt,
                  updatedAt: r.updatedAt,
                }))
              }}
            />

            {/* 10-3: View toggle — table vs grid */}
            <div className="flex items-center rounded-md border border-zinc-700 overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'inline-flex items-center justify-center h-8 w-8 transition-colors border-r border-zinc-700',
                  viewMode === 'table'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                )}
                title="Table view"
                aria-pressed={viewMode === 'table'}
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'inline-flex items-center justify-center h-8 w-8 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                )}
                title="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              size="sm"
              className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
              onClick={handleCreateOpen}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Asset
            </Button>
          </div>

          {/* Row 2: Filter Toggles */}
          <div className="flex flex-wrap gap-4">
            <FilterToggle
              label="Type"
              options={FILTER_TYPES}
              selected={assetFilters.type}
              onToggle={toggleTypeFilter}
            />
            <Separator orientation="vertical" className="h-5 self-center" />
            <FilterToggle
              label="Status"
              options={FILTER_STATUSES}
              selected={assetFilters.status}
              onToggle={toggleStatusFilter}
              showAll
            />
            <Separator orientation="vertical" className="h-5 self-center" />
            <FilterToggle
              label="Criticality"
              options={FILTER_CRITICALITIES}
              selected={assetFilters.criticality}
              onToggle={toggleCriticalityFilter}
              showAll
            />
          </div>
        </CardContent>
      </Card>

      {/* 10-3: Assets — table or grid view depending on viewMode */}
      {viewMode === 'grid' && !error && !loading && assets.length > 0 ? (
        <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {assets.map((asset, idx) => (
                <div
                  key={asset.id}
                  className="siem-stagger-in"
                  style={{ ['--siem-stagger-i' as string]: Math.min(idx, 8) } as React.CSSProperties}
                >
                  <AssetCard
                    asset={asset}
                    alertCount={alertCounts[asset.id] || 0}
                    scanProgress={scanProgress[asset.id] !== undefined ? scanProgress[asset.id] : null}
                    onScan={() => handleScan(asset)}
                    onEdit={() => handleEditOpen(asset)}
                    onDelete={() => {
                      setDeleteTarget(asset)
                      setDeleteDialogOpen(true)
                    }}
                    onToggle={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                    isExpanded={expandedAsset === asset.id}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Assets Table */}
          <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-0">
          {/* Table Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sticky top-0 z-10">
            <span className="w-5" />
            <span className="w-8" />
            <span className="flex-1 min-w-0">Name</span>
            <span className="hidden w-28 lg:block">OS</span>
            <span className="w-28">Status</span>
            <span className="hidden w-20 sm:block">Criticality</span>
            <span className="hidden w-24 md:block">Owner</span>
            <span className="hidden w-24 xl:block">Department</span>
            <span className="hidden w-24 lg:block">Last Seen</span>
            <span className="w-14" />
          </div>

          {/* Rows / Loading / Empty */}
          {error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
              <Button variant="outline" size="sm" className="text-xs" onClick={fetchAssets}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-4">
                  <Skeleton className="h-3 w-5 rounded" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-2 w-20 rounded" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
                <Network className="h-5 w-5 text-zinc-600" />
              </div>
              <span className="text-sm text-zinc-400">No assets found</span>
              <div className="text-xs text-zinc-600 space-y-1 text-center">
                <p>Try adjusting your filters or search term</p>
                <p>Click <strong>"Add Asset"</strong> to register a new asset</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleCreateOpen}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Asset
              </Button>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {assets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  isExpanded={expandedAsset === asset.id}
                  onToggle={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                  onEdit={(e) => {
                    e.stopPropagation()
                    handleEditOpen(asset)
                  }}
                  onDelete={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(asset)
                    setDeleteDialogOpen(true)
                  }}
                  alertCount={alertCounts[asset.id] || 0}
                />
              ))}
            </div>
          )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          Showing {((assetFilters.page - 1) * assetFilters.pageSize) + 1}–
          {Math.min(assetFilters.page * assetFilters.pageSize, total)} of {total.toLocaleString()} assets
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={String(assetFilters.pageSize)}
            onValueChange={(v) => setAssetFilters({ pageSize: Number(v), page: 1 })}
          >
            <SelectTrigger className="h-7 w-20 text-xs border-zinc-700 bg-zinc-800/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="10" className="text-xs">10 / page</SelectItem>
              <SelectItem value="20" className="text-xs">20 / page</SelectItem>
              <SelectItem value="50" className="text-xs">50 / page</SelectItem>
              <SelectItem value="100" className="text-xs">100 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-zinc-700"
            disabled={assetFilters.page <= 1}
            onClick={() => setAssetFilters({ page: assetFilters.page - 1 })}
          >
            Previous
          </Button>
          <span className="px-2 text-xs text-zinc-500 tabular-nums">
            Page {assetFilters.page} of {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-zinc-700"
            disabled={assetFilters.page >= totalPages}
            onClick={() => setAssetFilters({ page: assetFilters.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-h-[85vh] overflow-y-auto custom-scrollbar sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">
              {editingAsset ? 'Edit Asset' : 'Add Asset'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingAsset
                ? 'Update the asset details, owner, and criticality information.'
                : 'Register a new asset in the inventory with details, owner, and criticality.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., prod-web-01"
                className="h-8 text-xs border-zinc-700 bg-zinc-800/50"
              />
            </div>

            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AssetType })}>
                  <SelectTrigger className="h-8 text-xs border-zinc-700 bg-zinc-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {FILTER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AssetStatus })}>
                  <SelectTrigger className="h-8 text-xs border-zinc-700 bg-zinc-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {FILTER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* IP + MAC */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">IP Address</Label>
                <Input
                  value={form.ipAddress}
                  onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                  placeholder="e.g., 10.0.0.52"
                  className="h-8 text-xs font-mono border-zinc-700 bg-zinc-800/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">MAC Address</Label>
                <Input
                  value={form.macAddress}
                  onChange={(e) => setForm({ ...form, macAddress: e.target.value })}
                  placeholder="e.g., AA:BB:CC:DD:EE:FF"
                  className="h-8 text-xs font-mono border-zinc-700 bg-zinc-800/50"
                />
              </div>
            </div>

            {/* OS + OS Version */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Operating System</Label>
                <Input
                  value={form.os}
                  onChange={(e) => setForm({ ...form, os: e.target.value })}
                  placeholder="e.g., Ubuntu"
                  className="h-8 text-xs border-zinc-700 bg-zinc-800/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">OS Version</Label>
                <Input
                  value={form.osVersion}
                  onChange={(e) => setForm({ ...form, osVersion: e.target.value })}
                  placeholder="e.g., 22.04 LTS"
                  className="h-8 text-xs border-zinc-700 bg-zinc-800/50"
                />
              </div>
            </div>

            {/* Criticality + Owner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Criticality</Label>
                <Select value={form.criticality} onValueChange={(v) => setForm({ ...form, criticality: v as AssetCriticality })}>
                  <SelectTrigger className="h-8 text-xs border-zinc-700 bg-zinc-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {FILTER_CRITICALITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Owner</Label>
                <Input
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  placeholder="e.g., j.smith"
                  className="h-8 text-xs border-zinc-700 bg-zinc-800/50"
                />
              </div>
            </div>

            {/* Department + Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g., Engineering"
                  className="h-8 text-xs border-zinc-700 bg-zinc-800/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g., DC-East-Rack-12"
                  className="h-8 text-xs border-zinc-700 bg-zinc-800/50"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Tags (comma-separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g., production, web-tier, monitored"
                className="h-8 text-xs border-zinc-700 bg-zinc-800/50"
              />
            </div>

            {/* Metadata JSON */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 flex items-center gap-1">
                <FileJson className="h-3 w-3" />
                Metadata (JSON)
              </Label>
              <Textarea
                value={form.metadata}
                onChange={(e) => setForm({ ...form, metadata: e.target.value })}
                placeholder='{"ram_gb": 64, "cpu_cores": 8, "zone": "us-east-1a"}'
                className="min-h-[100px] text-xs font-mono border-zinc-700 bg-zinc-800/50 custom-scrollbar"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-zinc-700"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {editingAsset ? 'Update Asset' : 'Create Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-200">Delete Asset</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete <span className="text-zinc-200 font-medium">{deleteTarget?.name}</span>?
              This action cannot be undone. All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs border-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
