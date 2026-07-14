'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Link,
  Hash,
  Shield,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronDown,
  MapPin,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ===== Types =====

type IOCType = 'ip' | 'domain' | 'hash'
type ThreatLevelType = 'critical' | 'high' | 'medium' | 'low'

interface IOC {
  id: string
  type: IOCType
  value: string
  threatLevel: ThreatLevelType
  source: string
  firstSeen: string
  lastSeen: string
  category: string
}

interface ThreatCategory {
  name: string
  value: number
  color: string
}

interface GeoEntry {
  country: string
  flag: string
  attacks: number
}

interface FeedHealth {
  name: string
  status: 'healthy' | 'degraded' | 'offline'
  lastUpdate: string
  iocCount: number
}

// ===== Mock Data =====

const mockIOCs: IOC[] = [
  { id: '1', type: 'ip', value: '185.220.101.34', threatLevel: 'critical', source: 'AlienVault OTX', firstSeen: '2026-03-01T08:00:00Z', lastSeen: '2026-03-04T14:30:00Z', category: 'C2 Communication' },
  { id: '2', type: 'domain', value: 'malware-c2.evilcorp.net', threatLevel: 'critical', source: 'VirusTotal', firstSeen: '2026-03-02T12:00:00Z', lastSeen: '2026-03-04T16:45:00Z', category: 'C2' },
  { id: '3', type: 'hash', value: 'a3f8b2c9d1e4f6a7b8c9d0e1f2a3b4c5', threatLevel: 'high', source: 'MISP', firstSeen: '2026-03-01T09:00:00Z', lastSeen: '2026-03-04T10:00:00Z', category: 'Malware' },
  { id: '4', type: 'ip', value: '91.234.99.42', threatLevel: 'high', source: 'AbuseIPDB', firstSeen: '2026-03-02T06:00:00Z', lastSeen: '2026-03-04T09:15:00Z', category: 'Brute Force' },
  { id: '5', type: 'domain', value: 'phish-login.secure-bank-update.com', threatLevel: 'high', source: 'PhishTank', firstSeen: '2026-03-03T11:00:00Z', lastSeen: '2026-03-04T12:00:00Z', category: 'Phishing' },
  { id: '6', type: 'hash', value: 'e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2', threatLevel: 'medium', source: 'AlienVault OTX', firstSeen: '2026-03-01T10:00:00Z', lastSeen: '2026-03-03T18:00:00Z', category: 'Ransomware' },
  { id: '7', type: 'ip', value: '45.155.205.99', threatLevel: 'medium', source: 'AbuseIPDB', firstSeen: '2026-03-02T14:00:00Z', lastSeen: '2026-03-04T07:30:00Z', category: 'Scanner' },
  { id: '8', type: 'domain', value: 'update.service-checker.xyz', threatLevel: 'medium', source: 'VirusTotal', firstSeen: '2026-03-03T08:00:00Z', lastSeen: '2026-03-04T11:00:00Z', category: 'APT' },
  { id: '9', type: 'hash', value: 'b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4', threatLevel: 'low', source: 'MISP', firstSeen: '2026-02-28T16:00:00Z', lastSeen: '2026-03-02T09:00:00Z', category: 'PUP' },
  { id: '10', type: 'ip', value: '103.224.182.210', threatLevel: 'low', source: 'AlienVault OTX', firstSeen: '2026-03-01T05:00:00Z', lastSeen: '2026-03-03T22:00:00Z', category: 'Spam' },
  { id: '11', type: 'domain', value: 'cdn.static-assets.cloud', threatLevel: 'medium', source: 'ThreatFox', firstSeen: '2026-03-02T19:00:00Z', lastSeen: '2026-03-04T06:00:00Z', category: 'C2' },
  { id: '12', type: 'hash', value: 'c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6', threatLevel: 'critical', source: 'VirusTotal', firstSeen: '2026-03-03T03:00:00Z', lastSeen: '2026-03-04T15:00:00Z', category: 'Ransomware' },
  { id: '13', type: 'ip', value: '194.165.16.78', threatLevel: 'high', source: 'AbuseIPDB', firstSeen: '2026-03-03T12:00:00Z', lastSeen: '2026-03-04T13:45:00Z', category: 'Exploit' },
  { id: '14', type: 'domain', value: 'mail.secure-doc-view.com', threatLevel: 'high', source: 'PhishTank', firstSeen: '2026-03-03T07:00:00Z', lastSeen: '2026-03-04T08:30:00Z', category: 'Phishing' },
  { id: '15', type: 'ip', value: '62.204.41.155', threatLevel: 'medium', source: 'AlienVault OTX', firstSeen: '2026-03-02T11:00:00Z', lastSeen: '2026-03-04T05:00:00Z', category: 'Scanner' },
]

const threatCategories: ThreatCategory[] = [
  { name: 'Malware', value: 32, color: '#ef4444' },
  { name: 'Phishing', value: 24, color: '#f97316' },
  { name: 'C2', value: 18, color: '#8b5cf6' },
  { name: 'Ransomware', value: 14, color: '#ec4899' },
  { name: 'APT', value: 8, color: '#eab308' },
  { name: 'Other', value: 4, color: '#6b7280' },
]

const geoData: GeoEntry[] = [
  { country: 'Russia', flag: '🇷🇺', attacks: 847 },
  { country: 'China', flag: '🇨🇳', attacks: 623 },
  { country: 'United States', flag: '🇺🇸', attacks: 412 },
  { country: 'North Korea', flag: '🇰🇵', attacks: 289 },
  { country: 'Iran', flag: '🇮🇷', attacks: 176 },
]

const feedHealthData: FeedHealth[] = [
  { name: 'AlienVault OTX', status: 'healthy', lastUpdate: '2m ago', iocCount: 4521 },
  { name: 'VirusTotal', status: 'healthy', lastUpdate: '5m ago', iocCount: 8932 },
  { name: 'AbuseIPDB', status: 'healthy', lastUpdate: '1m ago', iocCount: 2340 },
  { name: 'MISP', status: 'degraded', lastUpdate: '18m ago', iocCount: 1205 },
  { name: 'PhishTank', status: 'healthy', lastUpdate: '8m ago', iocCount: 678 },
  { name: 'ThreatFox', status: 'offline', lastUpdate: '2h ago', iocCount: 310 },
]

// ===== Helpers =====

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ===== IOC Type Icon =====

function IOCTypeIcon({ type }: { type: IOCType }) {
  const config = {
    ip: { icon: Globe, color: 'text-red-400', bg: 'bg-red-500/15' },
    domain: { icon: Link, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    hash: { icon: Hash, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  }
  const c = config[type]
  return (
    <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded', c.bg)}>
      <c.icon className={cn('h-3 w-3', c.color)} />
    </div>
  )
}

// ===== Threat Level Badge =====

function ThreatLevelBadge({ level }: { level: ThreatLevelType }) {
  const config = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  }
  return (
    <Badge variant="outline" className={cn('border text-[9px] font-medium', config[level])}>
      {level.toUpperCase()}
    </Badge>
  )
}

// ===== Feed Status Icon =====

function FeedStatusIcon({ status }: { status: FeedHealth['status'] }) {
  if (status === 'healthy') return <Wifi className="h-3 w-3 text-emerald-400" />
  if (status === 'degraded') return <AlertTriangle className="h-3 w-3 text-amber-400" />
  return <WifiOff className="h-3 w-3 text-red-400" />
}

// ===== Main Component =====

export function ThreatIntelPanel() {
  const [filterType, setFilterType] = useState<IOCType | 'all'>('all')
  const [showAllIOCs, setShowAllIOCs] = useState(false)

  const filteredIOCs = useMemo(() => {
    let filtered = filterType === 'all' ? mockIOCs : mockIOCs.filter((i) => i.type === filterType)
    return showAllIOCs ? filtered : filtered.slice(0, 8)
  }, [filterType, showAllIOCs])

  const tooltipStyle = {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    border: '1px solid rgba(63, 63, 70, 0.8)',
    borderRadius: 8,
    fontSize: 12,
    color: '#e4e4e7',
  }

  return (
    <div className="space-y-4">
      {/* ================================================================ */}
      {/* IOC Feed                                                         */}
      {/* ================================================================ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-zinc-400">Latest IOCs</h3>
            <Badge variant="outline" className="border-zinc-700 text-[9px] text-zinc-500">
              {mockIOCs.length} indicators
            </Badge>
          </div>
          {/* Type filter */}
          <div className="flex gap-1">
            {(['all', 'ip', 'domain', 'hash'] as const).map((t) => (
              <button
                key={t}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                  filterType === t
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400'
                )}
                onClick={() => { setFilterType(t); setShowAllIOCs(false) }}
              >
                {t === 'all' ? 'All' : t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="max-h-72">
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 px-2 pb-2 text-[9px] font-medium uppercase tracking-wider text-zinc-600">
              <span className="w-6" />
              <span>Value</span>
              <span className="hidden sm:block w-16 text-center">Category</span>
              <span className="w-16 text-center">Level</span>
              <span className="w-12 text-right">Last Seen</span>
            </div>
            {filteredIOCs.map((ioc) => (
              <div
                key={ioc.id}
                className="group grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-800/50"
              >
                <IOCTypeIcon type={ioc.type} />
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-zinc-300 group-hover:text-zinc-100">
                    {ioc.value}
                  </p>
                  <p className="truncate text-[9px] text-zinc-600">{ioc.source}</p>
                </div>
                <span className="hidden sm:block max-w-[64px] truncate text-center text-[9px] text-zinc-500">
                  {ioc.category}
                </span>
                <ThreatLevelBadge level={ioc.threatLevel} />
                <span className="shrink-0 text-right text-[9px] text-zinc-600">
                  {timeAgo(ioc.lastSeen)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        {!showAllIOCs && filteredIOCs.length >= 8 && (
          <button
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
            onClick={() => setShowAllIOCs(true)}
          >
            Show All <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ================================================================ */}
      {/* Bottom Row: Categories + Geo + Feed Health                       */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Threat Categories Pie */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-400">Threat Categories</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={threatCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {threatCategories.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-2 text-[9px]">
            {threatCategories.map((c) => (
              <span key={c.name} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-zinc-400">{c.name} {c.value}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Geo Distribution */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Geo Distribution</h3>
          <div className="space-y-2">
            {geoData.map((geo, i) => {
              const maxAttacks = geoData[0].attacks
              const pct = (geo.attacks / maxAttacks) * 100
              return (
                <div key={geo.country}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm">{geo.flag}</span>
                      <span className="text-zinc-300">{geo.country}</span>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {geo.attacks.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor:
                          i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#eab308' : i === 3 ? '#8b5cf6' : '#6b7280',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[9px] text-zinc-600">
            <MapPin className="h-3 w-3" />
            Top 5 source countries
          </div>
        </div>

        {/* Feed Health */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Feed Health</h3>
          <div className="space-y-2">
            {feedHealthData.map((feed) => (
              <div
                key={feed.name}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 px-2.5 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FeedStatusIcon status={feed.status} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-300">{feed.name}</p>
                    <p className="text-[9px] text-zinc-600">Updated {feed.lastUpdate}</p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-mono text-zinc-500">
                  {feed.iocCount.toLocaleString()} IOCs
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[9px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="h-2.5 w-2.5" /> Healthy
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5" /> Degraded
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <WifiOff className="h-2.5 w-2.5" /> Offline
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
