'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  ShieldAlert,
  Crosshair,
  Radar,
  Server,
  Search,
  Zap,
  Target,
  FileBarChart,
  Wifi,
  Briefcase,
} from 'lucide-react'
import { useSIEMStore, type ViewType } from '@/lib/store'
import type { SearchResults } from '@/lib/types'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { SeverityBadge } from '@/components/siem/status-badge'

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const setActiveView = useSIEMStore((s) => s.setActiveView)
  const setAlertDetailId = useSIEMStore((s) => s.setAlertDetailId)
  const setIncidentDetailId = useSIEMStore((s) => s.setIncidentDetailId)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)

  // Global keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch {
        setSearchError(true)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = useCallback(
    (type: string, id: string) => {
      const viewMap: Record<string, ViewType> = {
        alert: 'alerts',
        incident: 'incidents',
        rule: 'rules',
        asset: 'assets',
      }

      const view = viewMap[type]
      if (view) {
        setActiveView(view)
        if (type === 'alert') setAlertDetailId(id)
        if (type === 'incident') setIncidentDetailId(id)
      }

      onOpenChange(false)
      setQuery('')
    },
    [setActiveView, setAlertDetailId, setIncidentDetailId, onOpenChange]
  )

  const hasAlerts = results?.results?.alerts && results.results.alerts.length > 0
  const hasIncidents = results?.results?.incidents && results.results.incidents.length > 0
  const hasRules = results?.results?.rules && results.results.rules.length > 0
  const hasAssets = results?.results?.assets && results.results.assets.length > 0
  const hasAnyResults = hasAlerts || hasIncidents || hasRules || hasAssets

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search SIEM"
      description="Search alerts, incidents, rules, and assets..."
    >
      <CommandInput
        placeholder="Search alerts, incidents, rules..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length >= 2 && !loading && searchError && !hasAnyResults && (
          <CommandEmpty>Search temporarily unavailable</CommandEmpty>
        )}
        {query.trim().length >= 2 && !loading && !searchError && !hasAnyResults && (
          <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
        )}
        {loading && (
          <CommandEmpty>
            <span className="flex items-center gap-2">
              <Search className="size-3.5 animate-pulse" />
              Searching...
            </span>
          </CommandEmpty>
        )}

        {results && hasAlerts && (
          <CommandGroup heading="Alerts">
            {results.results.alerts.slice(0, 5).map((alert) => (
              <CommandItem
                key={`alert-${alert.id}`}
                value={`alert-${alert.title}-${alert.id}`}
                onSelect={() => handleSelect('alert', alert.id)}
                className="flex items-center gap-2"
              >
                <Bell className="size-4 text-amber-500" />
                <span className="flex-1 truncate text-sm">{alert.title}</span>
                <SeverityBadge severity={alert.severity as 'critical' | 'high' | 'medium' | 'low' | 'informational'} size="sm" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results && hasIncidents && (
          <>
            {hasAlerts && <CommandSeparator />}
            <CommandGroup heading="Incidents">
              {results.results.incidents.slice(0, 5).map((incident) => (
                <CommandItem
                  key={`incident-${incident.id}`}
                  value={`incident-${incident.title}-${incident.id}`}
                  onSelect={() => handleSelect('incident', incident.id)}
                  className="flex items-center gap-2"
                >
                  <ShieldAlert className="size-4 text-red-500" />
                  <span className="flex-1 truncate text-sm">{incident.title}</span>
                  <SeverityBadge severity={incident.severity as 'critical' | 'high' | 'medium' | 'low' | 'informational'} size="sm" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results && hasRules && (
          <>
            {(hasAlerts || hasIncidents) && <CommandSeparator />}
            <CommandGroup heading="Detection Rules">
              {results.results.rules.slice(0, 5).map((rule) => (
                <CommandItem
                  key={`rule-${rule.id}`}
                  value={`rule-${rule.name}-${rule.id}`}
                  onSelect={() => handleSelect('rule', rule.id)}
                  className="flex items-center gap-2"
                >
                  <Radar className="size-4 text-blue-400" />
                  <span className="flex-1 truncate text-sm">{rule.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results && hasAssets && (
          <>
            {(hasAlerts || hasIncidents || hasRules) && <CommandSeparator />}
            <CommandGroup heading="Assets">
              {results.results.assets.slice(0, 5).map((asset) => (
                <CommandItem
                  key={`asset-${asset.id}`}
                  value={`asset-${asset.name}-${asset.id}`}
                  onSelect={() => handleSelect('asset', asset.id)}
                  className="flex items-center gap-2"
                >
                  <Server className="size-4 text-zinc-400" />
                  <span className="flex-1 truncate text-sm">{asset.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Default state: show quick navigation */}
        {query.trim().length < 2 && (
          <CommandGroup heading="Quick Navigation">
            <CommandItem onSelect={() => { setActiveView('dashboard'); onOpenChange(false) }}>
              <Search className="size-4" />
              Go to Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('alerts'); onOpenChange(false) }}>
              <Bell className="size-4" />
              Go to Alerts
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('incidents'); onOpenChange(false) }}>
              <ShieldAlert className="size-4" />
              Go to Incidents
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('logs'); onOpenChange(false) }}>
              <Search className="size-4" />
              Go to Log Explorer
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('threat-hunt'); onOpenChange(false) }}>
              <Crosshair className="size-4" />
              Go to Threat Hunt
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('network'); onOpenChange(false) }}>
              <Wifi className="size-4" />
              Go to Network Traffic
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('mitre'); onOpenChange(false) }}>
              <Target className="size-4" />
              Go to MITRE ATT&CK
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('rules'); onOpenChange(false) }}>
              <Radar className="size-4" />
              Go to Detection Rules
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('assets'); onOpenChange(false) }}>
              <Server className="size-4" />
              Go to Assets
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('soar'); onOpenChange(false) }}>
              <Zap className="size-4" />
              Go to SOAR
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('reports'); onOpenChange(false) }}>
              <FileBarChart className="size-4" />
              Go to Reports &amp; Exports
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView('cases'); onOpenChange(false) }}>
              <Briefcase className="size-4" />
              Go to Case Management
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
