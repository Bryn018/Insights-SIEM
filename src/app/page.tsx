'use client'

import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { SessionProvider } from 'next-auth/react'
import { useSIEMStore } from '@/lib/store'
import { useSIEMWebSocket } from '@/hooks/use-siem-ws'
import { useCaptureWs } from '@/hooks/use-capture-ws'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { Toaster } from 'sonner'
import type { ViewType } from '@/lib/types'

// All components are lazy-loaded to minimize initial bundle
const Sidebar = lazy(() => import('@/components/siem/sidebar').then(m => ({ default: m.Sidebar })))
const Header = lazy(() => import('@/components/siem/header').then(m => ({ default: m.Header })))
const Footer = lazy(() => import('@/components/siem/footer').then(m => ({ default: m.Footer })))

// View loader - only loads the requested view on demand
function loadView(view: ViewType): Promise<{ default: React.ComponentType }> {
  switch (view) {
    case 'dashboard':
      return import('@/components/siem/dashboard-view').then(m => ({ default: m.DashboardView }))
    case 'alerts':
      return import('@/components/siem/alerts-view').then(m => ({ default: m.AlertsView }))
    case 'incidents':
      return import('@/components/siem/incidents-view').then(m => ({ default: m.IncidentsView }))
    case 'logs':
      return import('@/components/siem/logs-view').then(m => ({ default: m.LogsView }))
    case 'threat-hunt':
      return import('@/components/siem/threat-hunt-view').then(m => ({ default: m.ThreatHuntView }))
    case 'rules':
      return import('@/components/siem/detection-rules-view').then(m => ({ default: m.DetectionRulesView }))
    case 'assets':
      return import('@/components/siem/assets-view').then(m => ({ default: m.AssetsView }))
    case 'compliance':
      return import('@/components/siem/compliance-view').then(m => ({ default: m.ComplianceView }))
    case 'reports':
      return import('@/components/siem/reports-view').then(m => ({ default: m.ReportsView }))
    case 'settings':
      return import('@/components/siem/settings-view').then(m => ({ default: m.SettingsView }))
    case 'soar':
      return import('@/components/siem/soar-view').then(m => ({ default: m.SoarView }))
    case 'mitre':
      return import('@/components/siem/mitre-view').then(m => ({ default: m.MitreView }))
    case 'network':
      return import('@/components/siem/network-view').then(m => ({ default: m.NetworkView }))
    case 'cases':
      return import('@/components/siem/cases-view').then(m => ({ default: m.CasesView }))
    default:
      return import('@/components/siem/dashboard-view').then(m => ({ default: m.DashboardView }))
  }
}

function ShellFallback() {
  return (
    <div className="flex h-14 items-center px-4 bg-zinc-900/80 border-b border-zinc-800">
      <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="flex-1" />
      <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
    </div>
  )
}

function ViewFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <span className="text-sm text-zinc-400">Loading view...</span>
      </div>
    </div>
  )
}

// Cache loaded view components
const viewCache: Partial<Record<ViewType, React.ComponentType>> = {}

export default function Home() {
  const { activeView } = useSIEMStore()
  const [ViewComponent, setViewComponent] = useState<React.ComponentType | null>(null)
  const [currentView, setCurrentView] = useState<ViewType | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only render on client side to avoid SSR memory issues
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMobileMenuToggle = useCallback(() => setMobileMenuOpen(prev => !prev), [])
  const handleMobileMenuClose = useCallback(() => setMobileMenuOpen(false), [])

  // Load the active view component
  useEffect(() => {
    if (!mounted) return

    if (viewCache[activeView]) {
      setViewComponent(viewCache[activeView] ?? null)
      setCurrentView(activeView)
      return
    }

    loadView(activeView).then(mod => {
      viewCache[activeView] = mod.default
      setViewComponent(() => mod.default)
      setCurrentView(activeView)
    }).catch(err => {
      console.error('Failed to load view:', activeView, err)
      // If chunk load fails (server may have OOM'd), retry after a delay
      if (err?.name === 'ChunkLoadError') {
        setTimeout(() => {
          // Try reloading the page to get a fresh server connection
          window.location.reload()
        }, 3000)
      }
    })
  }, [activeView, mounted])

  useSIEMWebSocket()
  useCaptureWs()
  useKeyboardShortcuts()

  // Auto-seed DISABLED: tool runs on real captured data only.
  // To restore demo data, set AUTO_SEED=true and re-enable the call below.
  const AUTO_SEED = false
  useEffect(() => {
    if (!mounted || !AUTO_SEED) return
    const seedData = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const data = await res.json()
          if (!data.alertsBySeverity || Object.values(data.alertsBySeverity).every((v: unknown) => v === 0)) {
            await fetch('/api/seed', { method: 'POST' })
          }
        }
      } catch {
        // ignore
      }
    }
    seedData()
  }, [mounted])

  // SSR placeholder - minimal HTML that doesn't require any heavy modules
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span className="text-lg font-medium text-emerald-400">Insights SIEM</span>
          <span className="text-sm text-zinc-500">Initializing security operations...</span>
        </div>
      </div>
    )
  }

  return (
    <SessionProvider>
      <div className="flex h-screen bg-zinc-950 text-zinc-100">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Suspense fallback={<ShellFallback />}>
            <Sidebar />
          </Suspense>
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={handleMobileMenuClose}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative left-0 top-0 h-full" style={{ width: '280px' }}>
              <Suspense fallback={<ShellFallback />}>
                <Sidebar onNavigate={handleMobileMenuClose} />
              </Suspense>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<ShellFallback />}>
            <Header onMobileMenuToggle={handleMobileMenuToggle} />
          </Suspense>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {ViewComponent && currentView === activeView ? (
              <ViewComponent />
            ) : (
              <ViewFallback />
            )}
          </main>

          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#f4f4f5',
            },
          }}
        />
      </div>
    </SessionProvider>
  )
}
