'use client'

import { useEffect, useRef } from 'react'
import { useSIEMStore } from '@/lib/store'

/**
 * Live capture WebSocket — connects to the SIEM realtime relay (ws://host:3003)
 * and surfaces new DB alerts as toasts the instant they land. The alerts list
 * itself refreshes via the 2s poll in alerts-view; this adds the instant
 * toast/notification push for a true real-time feel.
 */
export function useCaptureWs() {
  const socketRef = useRef<WebSocket | null>(null)
  const addNotification = useSIEMStore((s) => s.addNotification)
  const addRealtimeAlert = useSIEMStore((s) => s.addRealtimeAlert)

  useEffect(() => {
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      if (stopped) return
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${proto}://${window.location.hostname}:3003/`
      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch {
        retry = setTimeout(connect, 5000)
        return
      }
      socketRef.current = ws

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg?.type === 'alert:new' && msg.alert) {
            const a = msg.alert
            addRealtimeAlert({
              id: a.id,
              title: a.title,
              severity: a.severity,
              source: a.source,
              sourceIp: a.sourceIp,
              destIp: a.destIp,
              timestamp: a.createdAt || new Date().toISOString(),
              category: a.category || 'network',
              description: a.description || a.title,
            })
            // Only toast live capture-agent traffic (skip seed noise)
            if (a.source === 'capture-agent') {
              addNotification({
                title: a.title,
                message: `${a.severity?.toUpperCase() || 'INFO'}: ${a.description || a.title}`,
                type: 'alert',
              })
            }
          }
        } catch {
          // ignore malformed frames
        }
      }

      ws.onclose = () => {
        if (!stopped) retry = setTimeout(connect, 5000)
      }
      ws.onerror = () => {
        try { ws.close() } catch { /* noop */ }
      }
    }

    connect()
    return () => {
      stopped = true
      if (retry) clearTimeout(retry)
      socketRef.current?.close()
    }
  }, [addNotification, addRealtimeAlert])
}
