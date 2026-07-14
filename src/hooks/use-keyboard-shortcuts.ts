'use client'

import { useEffect } from 'react'
import { useSIEMStore } from '@/lib/store'
import type { ViewType } from '@/lib/types'

/**
 * Global keyboard shortcuts for the SIEM application.
 *
 * Shortcuts:
 *  - g then d   -> Go to Dashboard
 *  - g then a   -> Go to Alerts
 *  - g then i   -> Go to Incidents
 *  - g then l   -> Go to Log Explorer
 *  - g then r   -> Go to Detection Rules
 *  - g then s   -> Go to Assets
 *  - g then c   -> Go to Case Management
 *  - g then v   -> Go to Compliance
 *  - g then p   -> Go to Reports (p for rePort)
 *  - g then e   -> Go to Settings (e for sEttings to avoid clash with Assets)
 *  - g then h   -> Go to Threat Hunt
 *  - g then o   -> Go to SOAR (o for sOar)
 *  - g then x   -> Go to MITRE ATT&CK (x for matriX)
 *  - 1..0       -> Direct nav to the first 10 views (in viewOrder)
 *  - Ctrl/Cmd+K -> Open search (handled by the search trigger button, but we
 *                  also dispatch a click on it here for keyboard users)
 *  - Ctrl/Cmd+B -> Toggle sidebar collapse
 *  - t          -> Toggle theme (uses next-themes via the store)
 *  - ?           -> Show shortcuts help (dispatches a custom event)
 *  - Esc        -> Close any open dialog/panel (handled by components)
 */
export function useKeyboardShortcuts() {
  const setActiveView = useSIEMStore((s) => s.setActiveView)
  const toggleSidebar = useSIEMStore((s) => s.toggleSidebar)
  const toggleLiveMode = useSIEMStore((s) => s.toggleLiveMode)

  useEffect(() => {
    let lastKey = ''
    let lastKeyTime = 0

    const viewOrder: ViewType[] = [
      'dashboard',
      'alerts',
      'incidents',
      'logs',
      'threat-hunt',
      'network',
      'rules',
      'assets',
      'compliance',
      'settings',
      'soar',
      'mitre',
      'reports',
      'cases',
    ]

    const gMap: Record<string, ViewType> = {
      d: 'dashboard',
      a: 'alerts',
      i: 'incidents',
      l: 'logs',
      h: 'threat-hunt',
      n: 'network',
      r: 'rules',
      s: 'assets',
      c: 'cases',
      v: 'compliance',
      p: 'reports',
      e: 'settings',
      o: 'soar',
      x: 'mitre',
    }

    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      const now = Date.now()
      const key = e.key.toLowerCase()

      // Cmd/Ctrl+B -> toggle sidebar
      if ((e.metaKey || e.ctrlKey) && key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // 1..0 -> direct view nav (10 views)
      if (/^[0-9]$/.test(key)) {
        e.preventDefault()
        const idx = key === '0' ? 9 : parseInt(key, 10) - 1
        if (idx >= 0 && idx < viewOrder.length) {
          setActiveView(viewOrder[idx])
        }
        return
      }

      // 'g' prefix two-key combos
      if (key === 'g' && now - lastKeyTime > 1500) {
        lastKey = 'g'
        lastKeyTime = now
        return
      }

      if (lastKey === 'g' && now - lastKeyTime < 1500) {
        const view = gMap[key]
        if (view) {
          e.preventDefault()
          setActiveView(view)
        }
        lastKey = ''
        lastKeyTime = 0
        return
      }

      // 'L' (capital, no modifier) toggles live mode
      // Use 'm' for live mode to avoid clash with 'g l' for logs
      if (key === 'm') {
        e.preventDefault()
        toggleLiveMode()
        return
      }

      // '?' -> show shortcuts help
      if (key === '?') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('siem:show-shortcuts'))
        return
      }

      lastKey = ''
      lastKeyTime = 0
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveView, toggleSidebar, toggleLiveMode])
}
