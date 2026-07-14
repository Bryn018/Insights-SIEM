'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSIEMStore } from '@/lib/store'
import { toast } from 'sonner'
import type {
  WsAlert,
  WsAlertUpdate,
  WsIncident,
  WsIncidentUpdate,
  WsLogEvent,
  SystemHealth,
  WsRuleTriggered,
} from '@/lib/types'

// Socket type - dynamically imported to avoid bundling socket.io-client in SSR
type SocketType = {
  connected: boolean
  on: (event: string, callback: (...args: unknown[]) => void) => void
  emit: (event: string, ...args: unknown[]) => void
  disconnect: () => void
}

/**
 * SIEM WebSocket hook — connects to the SIEM WS service on port 3003,
 * subscribes to rooms based on the active view, and processes real-time
 * events (alerts, incidents, system health, log streams).
 *
 * Uses dynamic import for socket.io-client to avoid SSR bundling issues.
 */
export function useSIEMWebSocket() {
  const socketRef = useRef<SocketType | null>(null)

  // Store selectors — pull only what we need
  const activeView = useSIEMStore((s) => s.activeView)
  const setWsConnected = useSIEMStore((s) => s.setWsConnected)
  const addRealtimeAlert = useSIEMStore((s) => s.addRealtimeAlert)
  const setSystemHealth = useSIEMStore((s) => s.setSystemHealth)
  const addNotification = useSIEMStore((s) => s.addNotification)
  const addLogEvent = useSIEMStore((s) => s.addLogEvent)
  const logExplorerLiveMode = useSIEMStore((s) => s.logExplorer.liveMode)
  const liveMode = useSIEMStore((s) => s.liveMode)

  // Keep refs to avoid stale closures in socket event handlers
  const logExplorerLiveModeRef = useRef(logExplorerLiveMode)
  const liveModeRef = useRef(liveMode)
  useEffect(() => { logExplorerLiveModeRef.current = logExplorerLiveMode }, [logExplorerLiveMode])
  useEffect(() => { liveModeRef.current = liveMode }, [liveMode])

  // ─── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    // Dynamic import to avoid bundling socket.io-client during SSR
    import('socket.io-client').then(({ io }) => {
      if (socketRef.current?.connected) return // Already connected

      const socket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      })

      // ── Connection lifecycle ────────────────────────────────────────────

      socket.on('connect', () => {
        console.debug('[SIEM WS] Connected')
        setWsConnected(true)
      })

      socket.on('disconnect', (reason: unknown) => {
        console.debug('[SIEM WS] Disconnected:', reason)
        setWsConnected(false)
      })

      // Throttle connection-error logging — socket.io fires this on every
      // reconnection attempt which floods the console. Only log the first
      // error and then silently retry in the background.
      let connectErrorLogged = false
      socket.on('connect_error', (err: unknown) => {
        setWsConnected(false)
        if (!connectErrorLogged) {
          const msg = (err as Error).message
          // "timeout" and "xhr poll error" are expected when the WS service
          // is restarting or unavailable — log once at debug level.
          if (msg === 'timeout' || msg.includes('xhr poll')) {
            console.debug('[SIEM WS] Service unavailable, retrying in background...')
          } else {
            console.debug('[SIEM WS] Connection error:', msg)
          }
          connectErrorLogged = true
          // Reset after 30s so a genuine new error can be logged
          setTimeout(() => { connectErrorLogged = false }, 30000)
        }
      })

      // ── alert:new ────────────────────────────────────────────────────────

      socket.on('alert:new', (alert: WsAlert) => {
        addRealtimeAlert(alert)
        addNotification({
          title: alert.title,
          message: `${alert.severity.toUpperCase()}: ${alert.description?.slice(0, 120) || alert.title}`,
          type: 'alert',
        })

        // Show toast for critical / high severity
        if (alert.severity === 'critical') {
          toast.error(`🚨 ${alert.title}`, {
            description: alert.description?.slice(0, 100),
            duration: 8000,
          })
        } else if (alert.severity === 'high') {
          toast.warning(`⚠️ ${alert.title}`, {
            description: alert.description?.slice(0, 100),
            duration: 6000,
          })
        } else {
          toast.info(alert.title, {
            description: alert.description?.slice(0, 80),
            duration: 4000,
          })
        }
      })

      // ── alert:update ─────────────────────────────────────────────────────

      socket.on('alert:update', (data: WsAlertUpdate) => {
        toast.info(`Alert ${data.id.slice(0, 8)}… → ${data.status}`, {
          duration: 3000,
        })
      })

      // ── incident:new ─────────────────────────────────────────────────────

      socket.on('incident:new', (data: WsIncident) => {
        addNotification({
          title: 'New Incident Created',
          message:
            data.title ||
            'A new security incident has been created',
          type: 'incident',
        })

        toast.warning(`📋 New Incident: ${data.title || 'Untitled'}`, {
          description: `Severity: ${data.severity} | Status: ${data.status}`,
          duration: 6000,
        })
      })

      // ── incident:update ──────────────────────────────────────────────────

      socket.on('incident:update', (data: WsIncidentUpdate) => {
        toast.info(`Incident ${data.id?.slice(0, 8)}… → ${data.status}`, {
          duration: 3000,
        })
      })

      // ── rule:triggered ───────────────────────────────────────────────────

      socket.on('rule:triggered', (data: WsRuleTriggered) => {
        addNotification({
          title: `Rule Triggered: ${data.ruleName}`,
          message: data.description || `Detection rule triggered for alert ${data.alertId}`,
          type: 'system',
        })
      })

      // ── system:health ────────────────────────────────────────────────────

      socket.on('system:health', (health: SystemHealth) => {
        setSystemHealth(health)
      })

      // ── log:stream ───────────────────────────────────────────────────────

      socket.on('log:stream', (event: WsLogEvent) => {
        if (logExplorerLiveModeRef.current || liveModeRef.current) {
          addLogEvent(event)
        }
      })

      socketRef.current = socket as unknown as SocketType
    }).catch(() => {
      setWsConnected(false)
    })
  }, [
    setWsConnected,
    addRealtimeAlert,
    setSystemHealth,
    addNotification,
    addLogEvent,
  ])

  // ─── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  // ─── Connect on mount, disconnect on unmount ─────────────────────────────

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // ─── Subscribe to rooms based on active view ─────────────────────────────

  useEffect(() => {
    const socket = socketRef.current
    if (!socket?.connected) return

    // Unsubscribe from all known rooms first
    const allRooms = ['alerts', 'incidents', 'dashboard', 'logs']
    allRooms.forEach((room) => socket.emit('unsubscribe', room))

    // Subscribe to rooms relevant for the current view
    const roomMap: Record<string, string[]> = {
      dashboard: ['dashboard', 'alerts', 'incidents'],
      alerts: ['alerts'],
      incidents: ['incidents', 'alerts'],
      logs: ['logs'],
      'threat-hunt': ['alerts', 'logs'],
      rules: ['alerts'],
      assets: [],
      compliance: [],
      settings: [],
    }

    const rooms = roomMap[activeView] || ['dashboard']
    rooms.forEach((room) => socket.emit('subscribe', room))
  }, [activeView])

  // ─── Toggle live mode for log stream subscription ────────────────────────

  useEffect(() => {
    const socket = socketRef.current
    if (!socket?.connected) return

    if (logExplorerLiveMode || liveMode) {
      socket.emit('subscribe', 'logs')
    } else if (activeView !== 'logs') {
      socket.emit('unsubscribe', 'logs')
    }
  }, [logExplorerLiveMode, liveMode, activeView])

  return {
    socket: socketRef.current,
    connected: useSIEMStore.getState().wsConnected,
    disconnect,
    reconnect: connect,
  }
}
