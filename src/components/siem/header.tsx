'use client'

import { useMemo, useState, useCallback, useEffect, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  Radio,
  Keyboard,
} from 'lucide-react'
import { useSIEMStore, type ViewType } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from '@/components/siem/notification-panel'
import { SearchCommand } from '@/components/siem/search-command'
import { ShortcutsHelp } from '@/components/siem/shortcuts-help'
import { cn } from '@/lib/utils'

const viewLabels: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  alerts: 'Alerts',
  incidents: 'Incidents',
  logs: 'Log Explorer',
  'threat-hunt': 'Threat Hunt',
  rules: 'Detection Rules',
  assets: 'Assets',
  compliance: 'Compliance',
  reports: 'Reports & Exports',
  settings: 'Settings',
  soar: 'SOAR',
  mitre: 'MITRE ATT&CK',
  network: 'Network Traffic',
  cases: 'Case Management',
}

interface HeaderProps {
  onMobileMenuToggle?: () => void
}

export function Header({ onMobileMenuToggle }: HeaderProps = {}) {
  const activeView = useSIEMStore((s) => s.activeView)
  const wsConnected = useSIEMStore((s) => s.wsConnected)
  const liveMode = useSIEMStore((s) => s.liveMode)
  const toggleLiveMode = useSIEMStore((s) => s.toggleLiveMode)
  const notifications = useSIEMStore((s) => s.notifications)
  const { theme, setTheme } = useTheme()

  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // useSyncExternalStore avoids the "setState in effect" lint error while
  // still giving us a client-only mounted flag for hydration safety.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // Listen for the global shortcut event so the ? key works even when
  // the header is the active component.
  useEffect(() => {
    const handler = () => setShortcutsOpen(true)
    window.addEventListener('siem:show-shortcuts', handler)
    return () => window.removeEventListener('siem:show-shortcuts', handler)
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const handleSearchOpen = useCallback(() => setSearchOpen(true), [])
  const handleSearchClose = useCallback(() => setSearchOpen(false), [])

  return (
    <>
      <header className="siem-header-border relative flex h-14 shrink-0 items-center gap-3 bg-zinc-900/80 backdrop-blur-sm px-4 dark:bg-zinc-900/80">
        {/* Left: Mobile menu + Breadcrumb */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          onClick={onMobileMenuToggle}
          aria-label="Toggle sidebar"
        >
          <Menu className="size-5" />
        </Button>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-zinc-400 text-sm font-medium">
                SIEM
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-zinc-600" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-zinc-100 text-sm font-medium">
                {viewLabels[activeView]}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Environment Badge */}
        <span className="hidden sm:inline-flex items-center rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 tracking-wider">
          {process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}
        </span>

        {/* Center: Search trigger */}
        <div className="flex-1 flex justify-center">
          <Button
            variant="outline"
            className="siem-search-focus hidden sm:flex w-full max-w-md h-8 items-center gap-2 bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-200"
            onClick={handleSearchOpen}
          >
            <Search className="size-4" />
            <span className="text-sm flex-1 text-left">
              Search alerts, incidents, rules...
            </span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-500 sm:flex">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            onClick={handleSearchOpen}
            aria-label="Search"
          >
            <Search className="size-5" />
          </Button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          {/* Live mode indicator */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLiveMode}
            className={cn(
              'gap-1.5 h-8 text-xs font-medium transition-all duration-200',
              liveMode
                ? 'siem-live-active text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
            aria-label={liveMode ? 'Disable live mode' : 'Enable live mode'}
          >
            <span className="relative flex size-2">
              {liveMode && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  'relative inline-flex size-2 rounded-full',
                  liveMode ? 'bg-emerald-400' : 'bg-zinc-600'
                )}
              />
            </span>
            <span className="hidden lg:inline">LIVE</span>
          </Button>

          {/* WebSocket connection indicator */}
          <div className="flex items-center gap-1.5 px-1.5" title={wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}>
            <span
              className={cn(
                'size-2 rounded-full',
                wsConnected ? 'bg-emerald-400' : 'bg-red-500'
              )}
            />
            <span className="hidden lg:inline text-[11px] text-zinc-500">
              {wsConnected ? 'WS' : 'OFF'}
            </span>
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-zinc-700/50 mx-1" />

          {/* Notification bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            onClick={() => setNotifOpen(true)}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Toggle theme'}
          >
            {mounted && theme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>

          {/* Keyboard shortcuts help */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            onClick={() => setShortcutsOpen(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="size-4" />
          </Button>

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0 hover:bg-zinc-800/50"
                aria-label="User menu"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-emerald-900/40 text-emerald-400 text-xs font-semibold">
                    AD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-muted-foreground">admin@insights.io</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => useSIEMStore.getState().setActiveView('settings')}>
                <Settings className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <LogOut className="mr-2 size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Notification Panel */}
      <NotificationPanel open={notifOpen} onOpenChange={setNotifOpen} />

      {/* Search Command Palette */}
      <SearchCommand open={searchOpen} onOpenChange={handleSearchClose} />

      {/* Keyboard Shortcuts Help */}
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  )
}
