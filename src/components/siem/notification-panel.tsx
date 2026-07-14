'use client'

import { useMemo } from 'react'
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
  BellOff,
} from 'lucide-react'
import { useSIEMStore } from '@/lib/store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function getNotificationIcon(type: string) {
  switch (type) {
    case 'alert':
      return <AlertTriangle className="size-4 text-amber-500" />
    case 'incident':
      return <ShieldAlert className="size-4 text-red-500" />
    case 'system':
      return <Info className="size-4 text-blue-400" />
    case 'compliance':
      return <CheckCheck className="size-4 text-emerald-500" />
    default:
      return <Bell className="size-4 text-zinc-400" />
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

interface NotificationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const notifications = useSIEMStore((s) => s.notifications)
  const markNotificationRead = useSIEMStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useSIEMStore((s) => s.markAllNotificationsRead)
  const clearAllNotifications = useSIEMStore((s) => s.clearAllNotifications)

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const handleClearAll = () => {
    clearAllNotifications()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-zinc-900 border-zinc-800 p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-zinc-100 text-base">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </SheetTitle>
              <SheetDescription className="text-zinc-500 text-xs mt-0.5">
                Real-time alerts and system updates
              </SheetDescription>
            </div>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 gap-1"
                onClick={markAllNotificationsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-900/20 gap-1"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
              >
                <Trash2 className="size-3.5" />
                Clear all
              </Button>
            </div>
          )}
        </SheetHeader>

        <Separator className="bg-zinc-800" />

        <ScrollArea className="h-[calc(100vh-10rem)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <BellOff className="size-10 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500 font-medium">No notifications</p>
              <p className="text-xs text-zinc-600 mt-1">
                You&apos;re all caught up — check back later.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification, idx) => (
                <div key={notification.id}>
                  <button
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                      'hover:bg-zinc-800/50',
                      !notification.read && 'bg-zinc-800/30'
                    )}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-sm leading-tight',
                          notification.read ? 'text-zinc-400' : 'text-zinc-100 font-medium'
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                  {idx < notifications.length - 1 && (
                    <Separator className="bg-zinc-800/50" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
