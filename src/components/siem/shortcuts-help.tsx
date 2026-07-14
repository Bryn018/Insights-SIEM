'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface ShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Shortcut {
  keys: string[]
  description: string
  group: string
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['1', '-', '0'], description: 'Jump to the Nth sidebar view', group: 'Navigation' },
  { keys: ['g', 'then', 'd'], description: 'Go to Dashboard', group: 'Navigation' },
  { keys: ['g', 'then', 'a'], description: 'Go to Alerts', group: 'Navigation' },
  { keys: ['g', 'then', 'i'], description: 'Go to Incidents', group: 'Navigation' },
  { keys: ['g', 'then', 'l'], description: 'Go to Log Explorer', group: 'Navigation' },
  { keys: ['g', 'then', 'h'], description: 'Go to Threat Hunt', group: 'Navigation' },
  { keys: ['g', 'then', 'n'], description: 'Go to Network Traffic', group: 'Navigation' },
  { keys: ['g', 'then', 'r'], description: 'Go to Detection Rules', group: 'Navigation' },
  { keys: ['g', 'then', 's'], description: 'Go to Assets', group: 'Navigation' },
  { keys: ['g', 'then', 'c'], description: 'Go to Case Management', group: 'Navigation' },
  { keys: ['g', 'then', 'v'], description: 'Go to Compliance', group: 'Navigation' },
  { keys: ['g', 'then', 'p'], description: 'Go to Reports', group: 'Navigation' },
  { keys: ['g', 'then', 'e'], description: 'Go to Settings', group: 'Navigation' },
  { keys: ['g', 'then', 'o'], description: 'Go to SOAR', group: 'Navigation' },
  { keys: ['g', 'then', 'x'], description: 'Go to MITRE ATT&CK', group: 'Navigation' },

  // Search & panels
  { keys: ['⌘/Ctrl', '+', 'K'], description: 'Open search / command palette', group: 'Search & Panels' },
  { keys: ['⌘/Ctrl', '+', 'B'], description: 'Toggle sidebar collapse', group: 'Search & Panels' },
  { keys: ['?'], description: 'Show this shortcuts help', group: 'Search & Panels' },
  { keys: ['Esc'], description: 'Close any open dialog or panel', group: 'Search & Panels' },

  // Real-time
  { keys: ['m'], description: 'Toggle live mode (real-time event stream)', group: 'Real-time' },
]

const groups = Array.from(new Set(shortcuts.map((s) => s.group)))

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Speed up your workflow with these keyboard shortcuts. Press{' '}
            <kbd className="inline-flex h-5 items-center rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] text-zinc-300">?</kbd>{' '}
            anytime to bring up this help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {groups.map((group) => (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                {group}
              </h3>
              <div className="space-y-1.5">
                {shortcuts
                  .filter((s) => s.group === group)
                  .map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-zinc-800/40 transition-colors"
                    >
                      <span className="text-sm text-zinc-300">{s.description}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, j) => (
                          <span key={j} className="flex items-center gap-1">
                            {k === '-' || k === 'then' || k === '+' ? (
                              <span className="text-xs text-zinc-500">{k}</span>
                            ) : (
                              <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[11px] font-medium text-zinc-200 shadow-sm">
                                {k}
                              </kbd>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">
            Tip: shortcuts are disabled while typing in input fields.
          </p>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
            {shortcuts.length} shortcuts
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
