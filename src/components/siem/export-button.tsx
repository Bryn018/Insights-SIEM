'use client'

import { useState } from 'react'
import { Download, ChevronDown, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { exportData, type ExportFormat } from '@/lib/export-utils'
import { toast } from 'sonner'

interface ExportButtonProps {
  /** Filename without extension */
  filename: string
  /** Async function that returns the data to export */
  fetchData: () => Promise<Record<string, unknown>[]>
  /** Optional label */
  label?: string
  /** Optional variant for the trigger button */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** Optional size */
  size?: 'default' | 'sm' | 'icon'
  /** Optional disabled state */
  disabled?: boolean
}

/**
 * Reusable export button with CSV/JSON dropdown.
 * Fetches data on demand and triggers a browser download.
 */
export function ExportButton({
  filename,
  fetchData,
  label = 'Export',
  variant = 'outline',
  size = 'sm',
  disabled,
}: ExportButtonProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    if (loading) return
    setLoading(format)
    try {
      const data = await fetchData()
      if (!data.length) {
        toast.warning('No data to export', {
          description: 'There are no records matching the current filters.',
        })
        return
      }
      exportData({ filename, format, data })
      toast.success(`Exported ${data.length} records as ${format.toUpperCase()}`, {
        description: `${filename}-${format} downloaded successfully.`,
      })
    } catch {
      toast.error('Export failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || loading !== null}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          <span className="hidden sm:inline">{loading ? 'Exporting...' : label}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-zinc-500">
          Export format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          className="gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="size-4 text-emerald-400" />
          <span>CSV</span>
          <span className="ml-auto text-[10px] text-zinc-500">.csv</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('json')}
          className="gap-2 cursor-pointer"
        >
          <FileJson className="size-4 text-amber-400" />
          <span>JSON</span>
          <span className="ml-auto text-[10px] text-zinc-500">.json</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
