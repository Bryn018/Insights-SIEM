'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSIEMStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Footer() {
  const wsConnected = useSIEMStore((s) => s.wsConnected)
  const systemHealth = useSIEMStore((s) => s.systemHealth)
  const activeView = useSIEMStore((s) => s.activeView)
  const [currentTime, setCurrentTime] = useState('')

  // Derive rates from systemHealth without useEffect
  const eventRate = useMemo(() => systemHealth?.eventRate ?? 0, [systemHealth])
  const ingestionRate = useMemo(() => {
    if (!systemHealth?.eventRate) return '0 MB/s'
    const rate = (systemHealth.eventRate * 0.8).toFixed(1)
    return `${rate} MB/s`
  }, [systemHealth])

  // Update time every second (external system - clock)
  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <footer className="siem-footer-border relative shrink-0 overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute h-full w-32 animate-scan-line bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent"
        />
      </div>

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="relative flex h-9 items-center justify-between px-4 text-[10px]">
        {/* Left: Version + Time */}
        <div className="flex items-center gap-3">
          <span className="font-medium siem-brand-gradient">
            Insights SIEM
          </span>
          <span className="text-zinc-600">v1.0</span>
          <span className="h-3 w-px bg-zinc-800" />
          <span className="font-mono text-zinc-500">{currentTime}</span>
        </div>

        {/* Center: System Status + Metrics */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Active View */}
          <span className="font-mono text-emerald-400/70 text-[10px] uppercase tracking-wider">
            {activeView}
          </span>

          <span className="h-3 w-px bg-zinc-800" />

          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'size-1.5 rounded-full',
                wsConnected
                  ? 'bg-emerald-400 siem-connection-pulse'
                  : 'bg-red-500 animate-reconnect-spin'
              )}
            />
            <span className={cn(
              'font-medium',
              wsConnected ? 'text-emerald-400' : 'text-red-400'
            )}>
              {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <span className="h-3 w-px bg-zinc-800" />

          {/* Event Rate */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600">Events:</span>
            <span className="font-mono font-medium text-zinc-400">
              {eventRate > 0 ? `${eventRate.toLocaleString()}/s` : '—/s'}
            </span>
          </div>

          <span className="h-3 w-px bg-zinc-800" />

          {/* Ingestion Rate */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600">Ingestion:</span>
            <span className="font-mono font-medium text-zinc-400">
              {ingestionRate}
            </span>
          </div>
        </div>

        {/* Right: Copyright */}
        <span className="text-zinc-600">
          © {new Date().getFullYear()} Insights Security
        </span>
      </div>
    </footer>
  )
}
