'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Calendar,
  Filter,
  Eye,
  Trash2,
  FileDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ===== Types =====

type ReportFormat = 'pdf' | 'html' | 'csv'

type ReportType =
  | 'daily-summary'
  | 'weekly-threat'
  | 'compliance-audit'
  | 'incident-postmortem'
  | 'executive-brief'

type ReportSection =
  | 'executive-summary'
  | 'alert-analysis'
  | 'incident-summary'
  | 'compliance-status'
  | 'threat-intelligence'
  | 'recommendations'

interface GeneratedReport {
  id: string
  title: string
  type: ReportType
  createdAt: string
  format: ReportFormat
  size: string
  sections: ReportSection[]
  data?: unknown // real report payload from /api/reports
}

// ===== Constants =====

const REPORT_TYPES: Record<ReportType, { label: string; icon: string }> = {
  'daily-summary': { label: 'Daily Security Summary', icon: '📋' },
  'weekly-threat': { label: 'Weekly Threat Report', icon: '🛡️' },
  'compliance-audit': { label: 'Compliance Audit Report', icon: '✅' },
  'incident-postmortem': { label: 'Incident Post-Mortem', icon: '🔍' },
  'executive-brief': { label: 'Executive Security Brief', icon: '📊' },
}

const SECTION_OPTIONS: Record<ReportSection, { label: string; description: string }> = {
  'executive-summary': { label: 'Executive Summary', description: 'High-level overview of security posture' },
  'alert-analysis': { label: 'Alert Analysis', description: 'Detailed breakdown of alerts by severity, source, and category' },
  'incident-summary': { label: 'Incident Summary', description: 'Active and resolved incidents with timeline' },
  'compliance-status': { label: 'Compliance Status', description: 'Framework compliance scores and control status' },
  'threat-intelligence': { label: 'Threat Intelligence', description: 'IOC feeds, geographic threats, and attack patterns' },
  'recommendations': { label: 'Recommendations', description: 'Actionable security improvement suggestions' },
}

const DATE_RANGES = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
]

const FORMAT_OPTIONS: Record<ReportFormat, { label: string; ext: string }> = {
  pdf: { label: 'PDF', ext: '.pdf' },
  html: { label: 'HTML', ext: '.html' },
  csv: { label: 'CSV', ext: '.csv' },
}

// ===== Component =====

export function ReportGenerator() {
  const [selectedType, setSelectedType] = useState<ReportType>('daily-summary')
  const [dateRange, setDateRange] = useState('7d')
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>([
    'executive-summary',
    'alert-analysis',
    'incident-summary',
  ])
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null)
  const [expandedConfig, setExpandedConfig] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const toggleSection = useCallback((section: ReportSection) => {
    setSelectedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }, [])

  const generateReport = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    setProgress(0)

    // Fetch REAL report data from the backend up front (no synthetic content)
    let reportData: unknown = null
    try {
      const days = parseInt(dateRange) || 7
      const res = await fetch(`/api/reports?type=${selectedType}&days=${days}`)
      if (res.ok) reportData = await res.json()
    } catch {
      /* report still recorded, just without payload */
    }
    const json = JSON.stringify(reportData ?? { note: 'No report data available' })
    const sizeMb = (new TextEncoder().encode(json).length / (1024 * 1024)).toFixed(2)

    let pct = 0
    timerRef.current = setInterval(() => {
      pct += Math.random() * 15 + 5
      if (pct >= 100) {
        pct = 100
        if (timerRef.current) clearInterval(timerRef.current)

        const newReport: GeneratedReport = {
          id: `rpt-${Date.now()}`,
          title: `${REPORT_TYPES[selectedType].label} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          type: selectedType,
          createdAt: new Date().toISOString(),
          format,
          size: `${sizeMb} MB`,
          sections: [...selectedSections],
          data: reportData,
        }

        setTimeout(() => {
          setReports((prev) => [newReport, ...prev])
          setGenerating(false)
          setProgress(0)
        }, 400)
      }
      setProgress(Math.min(pct, 100))
    }, 200)
  }, [generating, selectedType, format, selectedSections, dateRange])

  const deleteReport = useCallback((id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const openPreview = useCallback((report: GeneratedReport) => {
    setPreviewReport(report)
    setPreviewOpen(true)
  }, [])

  const typeBadgeColor: Record<ReportType, string> = {
    'daily-summary': 'bg-emerald-500/15 text-emerald-400',
    'weekly-threat': 'bg-amber-500/15 text-amber-400',
    'compliance-audit': 'bg-cyan-500/15 text-cyan-400',
    'incident-postmortem': 'bg-red-500/15 text-red-400',
    'executive-brief': 'bg-purple-500/15 text-purple-400',
  }

  const formatBadgeColor: Record<ReportFormat, string> = {
    pdf: 'bg-red-500/10 text-red-400',
    html: 'bg-amber-500/10 text-amber-400',
    csv: 'bg-emerald-500/10 text-emerald-400',
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-zinc-400">Report Generator</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
          onClick={() => setExpandedConfig(!expandedConfig)}
        >
          {expandedConfig ? 'Hide' : 'Configure'}
          {expandedConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Configuration Panel */}
      <AnimatePresence>
        {expandedConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-800/20 p-3">
              {/* Report Type + Date Range */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-zinc-500">Report Type</label>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ReportType)}>
                    <SelectTrigger className="h-8 border-zinc-700 bg-zinc-900/50 text-xs text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-900">
                      {Object.entries(REPORT_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key} className="text-xs text-zinc-200 focus:bg-zinc-800">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-zinc-500">Date Range</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="h-8 border-zinc-700 bg-zinc-900/50 text-xs text-zinc-200">
                      <Calendar className="mr-1 h-3 w-3 text-zinc-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-900">
                      {DATE_RANGES.map((dr) => (
                        <SelectItem key={dr.value} value={dr.value} className="text-xs text-zinc-200 focus:bg-zinc-800">
                          {dr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-zinc-500">Format</label>
                  <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
                    <SelectTrigger className="h-8 border-zinc-700 bg-zinc-900/50 text-xs text-zinc-200">
                      <FileDown className="mr-1 h-3 w-3 text-zinc-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-900">
                      {Object.entries(FORMAT_OPTIONS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key} className="text-xs text-zinc-200 focus:bg-zinc-800">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Include Sections */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[10px] font-medium text-zinc-500">
                  <Filter className="h-3 w-3" /> Include Sections
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(SECTION_OPTIONS).map(([key, { label, description }]) => {
                    const sectionKey = key as ReportSection
                    const checked = selectedSections.includes(sectionKey)
                    return (
                      <div
                        key={key}
                        className={cn(
                          'flex items-start gap-2 rounded-md border px-2 py-1.5 transition-colors cursor-pointer',
                          checked
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-zinc-800 bg-zinc-800/20 hover:border-zinc-700'
                        )}
                        onClick={() => toggleSection(sectionKey)}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSection(sectionKey)}
                          className="mt-0.5 h-3.5 w-3.5 border-zinc-600 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-zinc-300">{label}</p>
                          <p className="text-[9px] text-zinc-500 truncate">{description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Generate Button + Progress */}
              <div className="space-y-2">
                <Button
                  size="sm"
                  className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                  disabled={generating || selectedSections.length === 0}
                  onClick={generateReport}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      Generate Report
                    </>
                  )}
                </Button>
                <AnimatePresence>
                  {generating && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5 bg-zinc-800 [&>div]:bg-emerald-500" />
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>
                            {progress < 30
                              ? 'Collecting data...'
                              : progress < 60
                                ? 'Analyzing patterns...'
                                : progress < 90
                                  ? 'Generating content...'
                                  : 'Finalizing...'}
                          </span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Reports List */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-medium text-zinc-500">
            Generated Reports ({reports.length})
          </span>
        </div>
        <ScrollArea className="max-h-72">
          {reports.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              No reports generated yet
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/20 px-3 py-2 transition-colors hover:border-zinc-700 hover:bg-zinc-800/40"
                >
                  {/* Format icon */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
                      formatBadgeColor[report.format]
                    )}
                  >
                    {report.format.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-200 group-hover:text-zinc-50">
                      {report.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[9px] text-zinc-500">
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-4 border-0 px-1 text-[8px] font-medium',
                          typeBadgeColor[report.type]
                        )}
                      >
                        {REPORT_TYPES[report.type].label.split(' ')[0]}
                      </Badge>
                      <span>{report.size}</span>
                      <span>
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => openPreview(report)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => deleteReport(report.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Preview Dialog */}
      <AnimatePresence>
        {previewOpen && previewReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-sm font-medium text-zinc-200">Report Preview</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
                  onClick={() => setPreviewOpen(false)}
                >
                  ×
                </Button>
              </div>

              {/* Report metadata */}
              <div className="mb-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300">{previewReport.title}</span>
                  <Badge
                    variant="outline"
                    className={cn('h-5 border-0 text-[9px]', formatBadgeColor[previewReport.format])}
                  >
                    {previewReport.format.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  <span>{previewReport.size}</span>
                  <span>
                    {new Date(previewReport.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Sections included */}
              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-medium text-zinc-500">Included Sections</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewReport.sections.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400"
                    >
                      {SECTION_OPTIONS[s].label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Real summary preview from backend data */}
              <div className="mb-4">
                <p className="mb-1.5 text-[10px] font-medium text-zinc-500">Summary Preview</p>
                <div className="max-h-48 overflow-auto rounded-lg border border-zinc-800 bg-zinc-800/20 p-3 text-xs leading-relaxed text-zinc-400">
                  {previewReport.data ? (
                    <pre className="whitespace-pre-wrap font-mono text-[10px]">
{JSON.stringify(
  (previewReport.data as Record<string, unknown>).executive ?? previewReport.data,
  null,
  2
)}
                    </pre>
                  ) : (
                    <span className="text-zinc-500">No report data captured for this run.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                  onClick={() => setPreviewOpen(false)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="gap-1 bg-emerald-600 text-white hover:bg-emerald-500 text-xs"
                  onClick={() => {
                    if (!previewReport) return
                    const content = previewReport.data
                      ? JSON.stringify(previewReport.data, null, 2)
                      : 'No report data captured for this run.'
                    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${previewReport.title.replace(/[^a-zA-Z0-9]/g, '_')}.${FORMAT_OPTIONS[previewReport.format].ext}`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
