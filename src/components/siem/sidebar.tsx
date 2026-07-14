'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  LayoutDashboard,
  Bell,
  ShieldAlert,
  FileSearch,
  Crosshair,
  Radar,
  Server,
  ClipboardCheck,
  Zap,
  Target,
  FileBarChart,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Wifi,
  Briefcase,
} from 'lucide-react'
import { useSIEMStore, type ViewType } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface NavItem {
  id: ViewType
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  section?: string // section header label
}

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const activeView = useSIEMStore((s) => s.activeView)
  const setActiveView = useSIEMStore((s) => s.setActiveView)
  const sidebarCollapsed = useSIEMStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useSIEMStore((s) => s.toggleSidebar)
  const notifications = useSIEMStore((s) => s.notifications)

  const handleNavigate = (view: ViewType) => {
    setActiveView(view)
    onNavigate?.()
  }

  const unreadAlerts = useMemo(() => {
    return notifications.filter((n) => n.type === 'alert' && !n.read).length
  }, [notifications])

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlerts > 99 ? 99 : unreadAlerts || undefined },
    { id: 'incidents', label: 'Incidents', icon: ShieldAlert },
    { id: 'logs', label: 'Log Explorer', icon: FileSearch, section: 'ANALYSIS' },
    { id: 'threat-hunt', label: 'Threat Hunt', icon: Crosshair },
    { id: 'network', label: 'Network Traffic', icon: Wifi },
    { id: 'mitre', label: 'MITRE ATT&CK', icon: Target },
    { id: 'rules', label: 'Detection Rules', icon: Radar },
    { id: 'assets', label: 'Assets', icon: Server, section: 'MANAGEMENT' },
    { id: 'compliance', label: 'Compliance', icon: ClipboardCheck },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'cases', label: 'Cases', icon: Briefcase },
    { id: 'soar', label: 'SOAR', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex h-full flex-col border-r bg-gradient-to-b from-zinc-900 to-zinc-950 dark:from-zinc-900 dark:to-zinc-950"
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <Shield className="size-6 shrink-0 text-emerald-400" />
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap">
              Insights SIEM
            </span>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1 py-px">
              SOC
            </span>
          </motion.div>
        )}
      </div>

      <Separator className="bg-zinc-700/50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2" role="navigation" aria-label="Main navigation">
          {navItems.map((item, idx) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            const button = (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  'siem-nav-item w-full justify-start gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200',
                  'h-9',
                  isActive
                    ? 'siem-nav-item-active bg-emerald-900/30 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
                {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className={cn('ml-auto h-5 min-w-5 px-1.5 text-[10px] font-bold siem-notif-badge-pulse')}
                  >
                    {item.badge}
                  </Badge>
                )}
                {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white siem-notif-badge-pulse">
                    {item.badge}
                  </span>
                )}
              </Button>
            )

            const sectionHeader = item.section && !sidebarCollapsed ? (
              <div key={`section-${item.section}`} className="mt-3 mb-1 px-2">
                <span className="text-[9px] font-bold tracking-[0.15em] text-zinc-600 uppercase">
                  {item.section}
                </span>
              </div>
            ) : item.section && sidebarCollapsed ? (
              <div key={`section-${item.section}`} className="my-1.5 mx-auto w-4 border-t border-zinc-700/50" />
            ) : null

            if (sidebarCollapsed) {
              return (
                <span key={item.id}>
                  {sectionHeader}
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-1.5 text-destructive">({item.badge})</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </span>
              )
            }

            return (
              <span key={item.id}>
                {sectionHeader}
                {button}
              </span>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-zinc-700/50" />

      {/* Collapse Toggle */}
      <div className="p-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={cn(
                'w-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
                sidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-2'
              )}
            >
              {sidebarCollapsed ? (
                <ChevronsRight className="size-4" />
              ) : (
                <>
                  <ChevronsLeft className="size-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.aside>
  )
}
