'use client'

import { create } from 'zustand'
import type {
  ViewType,
  Severity,
  AlertStatus,
  IncidentStatus,
  IncidentPriority,
  ControlStatus,
  WsAlert,
  WsLogEvent,
  SystemHealth,
  StoreNotification,
} from '@/lib/types'

// Re-export types for backward compatibility with components that import from store
export type {
  ViewType,
  Severity,
  AlertStatus,
  IncidentStatus,
  IncidentPriority,
  ControlStatus,
  WsAlert,
  WsLogEvent,
  SystemHealth,
  StoreNotification,
}

// ThreatHuntState, ThreatHuntResult, SoarPlaybook, SoarStep, MitreState,
// MitreDetectionStatus, ReportTemplate, ReportHistoryItem, ReportFormat and
// ReportSchedule are declared and exported individually below — no re-export
// needed (a duplicate export conflicts with TS2484).

/** @deprecated Use ViewType instead */
export type SIEMView = ViewType

// ===== Alert Filters =====
export interface AlertFilters {
  severity: Severity[]
  status: AlertStatus[]
  category: string[]
  source: string[]
  search: string
  dateFrom: string
  dateTo: string
  page: number
  pageSize: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  selectedIds: string[]
}

// ===== Incident Filters =====
export interface IncidentFilters {
  severity: Severity[]
  status: IncidentStatus[]
  priority: IncidentPriority[]
  category: string[]
  assignee: string
  search: string
  page: number
  pageSize: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

// ===== Log Explorer State =====
export interface LogExplorerState {
  query: string
  timeRange: string
  indexPattern: string
  liveMode: boolean
  logs: WsLogEvent[]
  page: number
  pageSize: number
}

// ===== Rule Filters =====
export interface RuleFilters {
  search: string
  severity: Severity[]
  category: string[]
  enabled?: boolean
  page: number
  pageSize: number
}

// ===== Asset Filters =====
export interface AssetFilters {
  search: string
  type: string[]
  status: string[]
  criticality: string[]
  page: number
  pageSize: number
}

// ===== Compliance State =====
export interface ComplianceState {
  expandedFramework: string | null
  page: number
  pageSize: number
}

// ===== Threat Hunt State =====
export interface ThreatHuntResult {
  id: string
  timestamp: string
  source: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  message: string
  host: string
  user: string
}

export interface ThreatHuntState {
  query: string
  timeRange: string
  dataSource: string
  results: ThreatHuntResult[]
  isHunting: boolean
  huntHistory: Array<{
    query: string
    time: string
    resultCount: number
    dataSource: string
  }>
}

// ===== SOAR (Security Orchestration, Automation, and Response) State =====
export type SoarTriggerType = 'manual' | 'scheduled' | 'alert-based'
export type SoarPlaybookStatus = 'active' | 'draft' | 'disabled'
export type SoarStepType = 'trigger' | 'condition' | 'action' | 'notification' | 'wait' | 'approval'

export interface SoarStep {
  id: string
  name: string
  type: SoarStepType
  action: string
  config: Record<string, unknown>
}

export interface SoarPlaybook {
  id: string
  name: string
  description: string
  trigger: SoarTriggerType
  status: SoarPlaybookStatus
  lastRun: string | null
  runCount: number
  successCount: number
  failureCount: number
  avgDuration: number // in seconds
  steps: SoarStep[]
}

// ===== MITRE ATT&CK Navigator State =====
export type MitreDetectionStatus = 'detected' | 'partial' | 'gap' | 'n/a'

export interface MitreState {
  selectedTactic: string | null
  selectedTechnique: string | null
  filterSeverity: 'all' | 'detected' | 'partial' | 'gap' | 'n/a'
  filterPlatform: string
}

// ===== Settings State =====
export interface SettingsState {
  activeTab: string
}

// ===== Reports State =====
export type ReportFormat = 'pdf' | 'html' | 'csv' | 'json'
export type ReportSchedule = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on-demand'

export interface ReportTemplate {
  id: string
  name: string
  description: string
  type: 'daily-summary' | 'weekly-threat' | 'compliance-audit' | 'incident-postmortem' | 'executive-brief'
  defaultFormat: ReportFormat
  defaultSchedule: ReportSchedule
  sections: string[]
  lastGenerated: string | null
  totalGenerated: number
}

export interface ReportHistoryItem {
  id: string
  title: string
  type: string
  format: ReportFormat
  size: string
  generatedAt: string
  generatedBy: string
  status: 'completed' | 'failed' | 'scheduled' | 'generating'
  schedule?: ReportSchedule
  nextRunAt?: string | null
  recipients: string[]
}

export interface ReportsState {
  activeTab: 'generator' | 'templates' | 'scheduled' | 'history'
  selectedTemplateId: string | null
  selectedHistoryId: string | null
  filterFormat: ReportFormat | 'all'
  filterStatus: string | 'all'
}

// ===== Default Filter Values =====

const defaultAlertFilters: AlertFilters = {
  severity: [],
  status: [],
  category: [],
  source: [],
  search: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  selectedIds: [],
}

const defaultIncidentFilters: IncidentFilters = {
  severity: [],
  status: [],
  priority: [],
  category: [],
  assignee: '',
  search: '',
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

const defaultLogExplorer: LogExplorerState = {
  query: '',
  timeRange: '1h',
  indexPattern: 'insights-host-logs-*',
  liveMode: false,
  logs: [],
  page: 1,
  pageSize: 50,
}

const defaultRuleFilters: RuleFilters = {
  search: '',
  severity: [],
  category: [],
  enabled: undefined,
  page: 1,
  pageSize: 20,
}

const defaultThreatHunt: ThreatHuntState = {
  query: '',
  timeRange: '24h',
  dataSource: 'insights-host-logs-*',
  results: [],
  isHunting: false,
  huntHistory: [],
}

// SOAR playbooks are seeded by the view component on mount (client-side mock data)
const defaultSoar: SoarPlaybook[] = []

// MITRE ATT&CK Navigator state defaults
const defaultMitre: MitreState = {
  selectedTactic: null,
  selectedTechnique: null,
  filterSeverity: 'all',
  filterPlatform: 'all',
}

const defaultAssetFilters: AssetFilters = {
  search: '',
  type: [],
  status: [],
  criticality: [],
  page: 1,
  pageSize: 20,
}

// Reports state defaults
const defaultReports: ReportsState = {
  activeTab: 'generator',
  selectedTemplateId: null,
  selectedHistoryId: null,
  filterFormat: 'all',
  filterStatus: 'all',
}

// ===== Store Interface =====

interface SIEMStore {
  // Navigation
  activeView: ViewType
  setActiveView: (view: ViewType) => void

  // Sidebar
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // Theme
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void

  // WebSocket
  wsConnected: boolean
  setWsConnected: (connected: boolean) => void

  // Real-time alerts (from WebSocket)
  realtimeAlerts: WsAlert[]
  addRealtimeAlert: (alert: WsAlert) => void

  // System health (from WebSocket)
  systemHealth: SystemHealth | null
  setSystemHealth: (health: SystemHealth) => void

  // Notifications (in-app)
  notifications: StoreNotification[]
  addNotification: (n: Omit<StoreNotification, 'id' | 'read' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearAllNotifications: () => void
  unreadCount: () => number

  // Alert Filters
  alertFilters: AlertFilters
  setAlertFilters: (filters: Partial<AlertFilters>) => void
  setAlertFilter: <K extends keyof AlertFilters>(key: K, value: AlertFilters[K]) => void
  resetAlertFilters: () => void
  toggleAlertSelection: (id: string) => void
  selectAllAlerts: (ids: string[]) => void
  clearAlertSelection: () => void

  // Incident Filters
  incidentFilters: IncidentFilters
  setIncidentFilters: (filters: Partial<IncidentFilters>) => void
  setIncidentFilter: <K extends keyof IncidentFilters>(key: K, value: IncidentFilters[K]) => void
  resetIncidentFilters: () => void

  // Incident detail
  expandedIncident: string | null
  setExpandedIncident: (id: string | null) => void

  // Log Explorer
  logExplorer: LogExplorerState
  setLogExplorer: (state: Partial<LogExplorerState>) => void
  addLogEvent: (event: WsLogEvent) => void

  // Alert detail
  expandedAlert: string | null
  setExpandedAlert: (id: string | null) => void

  // Rule Filters
  ruleFilters: RuleFilters
  setRuleFilters: (filters: Partial<RuleFilters>) => void
  resetRuleFilters: () => void

  // Asset Filters
  assetFilters: AssetFilters
  setAssetFilters: (filters: Partial<AssetFilters>) => void
  resetAssetFilters: () => void

  // Compliance
  compliance: ComplianceState
  setCompliance: (state: Partial<ComplianceState>) => void

  // Threat Hunt
  threatHunt: ThreatHuntState
  setThreatHunt: (state: Partial<ThreatHuntState>) => void

  // SOAR
  soar: SoarPlaybook[]
  setSoar: (playbooks: SoarPlaybook[] | ((prev: SoarPlaybook[]) => SoarPlaybook[])) => void

  // MITRE ATT&CK Navigator
  mitre: MitreState
  setMitre: (state: Partial<MitreState>) => void

  // Settings
  settings: SettingsState
  setSettings: (state: Partial<SettingsState>) => void

  // Reports
  reports: ReportsState
  setReports: (state: Partial<ReportsState>) => void

  // Selected items (for bulk operations on alerts)
  selectedAlerts: string[]
  setSelectedAlerts: (ids: string[]) => void

  // Dialog states
  createIncidentOpen: boolean
  setCreateIncidentOpen: (open: boolean) => void
  alertDetailId: string | null
  setAlertDetailId: (id: string | null) => void
  incidentDetailId: string | null
  setIncidentDetailId: (id: string | null) => void

  // Live mode
  liveMode: boolean
  toggleLiveMode: () => void
  setLiveMode: (enabled: boolean) => void
}

// ===== Store Implementation =====

export const useSIEMStore = create<SIEMStore>((set, get) => ({
  // Navigation
  activeView: 'dashboard',
  setActiveView: (view) => set({
    activeView: view,
    // Clear detail drawer IDs when navigating to prevent stale dialogs
    alertDetailId: null,
    incidentDetailId: null,
  }),

  // Sidebar
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Theme
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  // WebSocket
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  // Real-time alerts
  realtimeAlerts: [],
  addRealtimeAlert: (alert) =>
    set((s) => ({
      realtimeAlerts: [alert, ...s.realtimeAlerts].slice(0, 50),
    })),

  // System health
  systemHealth: null,
  setSystemHealth: (health) => set({ systemHealth: health }),

  // Notifications (in-app)
  notifications: [],
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...s.notifications,
      ].slice(0, 100),
    })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  clearAllNotifications: () =>
    set({ notifications: [] }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  // Alert Filters
  alertFilters: defaultAlertFilters,
  setAlertFilters: (filters) =>
    set((s) => ({
      alertFilters: { ...s.alertFilters, ...filters },
    })),
  setAlertFilter: <K extends keyof AlertFilters>(key: K, value: AlertFilters[K]) =>
    set((s) => ({
      alertFilters: { ...s.alertFilters, [key]: value },
    })),
  resetAlertFilters: () => set({ alertFilters: defaultAlertFilters }),
  toggleAlertSelection: (id) =>
    set((s) => ({
      alertFilters: {
        ...s.alertFilters,
        selectedIds: s.alertFilters.selectedIds.includes(id)
          ? s.alertFilters.selectedIds.filter((i) => i !== id)
          : [...s.alertFilters.selectedIds, id],
      },
    })),
  selectAllAlerts: (ids) =>
    set((s) => ({
      alertFilters: { ...s.alertFilters, selectedIds: ids },
    })),
  clearAlertSelection: () =>
    set((s) => ({
      alertFilters: { ...s.alertFilters, selectedIds: [] },
    })),

  // Incident Filters
  incidentFilters: defaultIncidentFilters,
  setIncidentFilters: (filters) =>
    set((s) => ({
      incidentFilters: { ...s.incidentFilters, ...filters },
    })),
  setIncidentFilter: <K extends keyof IncidentFilters>(key: K, value: IncidentFilters[K]) =>
    set((s) => ({
      incidentFilters: { ...s.incidentFilters, [key]: value },
    })),
  resetIncidentFilters: () => set({ incidentFilters: defaultIncidentFilters }),

  // Incident detail
  expandedIncident: null,
  setExpandedIncident: (id) => set({ expandedIncident: id }),

  // Log Explorer
  logExplorer: defaultLogExplorer,
  setLogExplorer: (state) =>
    set((s) => ({
      logExplorer: { ...s.logExplorer, ...state },
    })),
  addLogEvent: (event) =>
    set((s) => ({
      logExplorer: {
        ...s.logExplorer,
        logs: [event, ...s.logExplorer.logs].slice(0, 500),
      },
    })),

  // Alert detail
  expandedAlert: null,
  setExpandedAlert: (id) => set({ expandedAlert: id }),

  // Rule Filters
  ruleFilters: defaultRuleFilters,
  setRuleFilters: (filters) =>
    set((s) => ({
      ruleFilters: { ...s.ruleFilters, ...filters },
    })),
  resetRuleFilters: () => set({ ruleFilters: defaultRuleFilters }),

  // Asset Filters
  assetFilters: defaultAssetFilters,
  setAssetFilters: (filters) =>
    set((s) => ({
      assetFilters: { ...s.assetFilters, ...filters },
    })),
  resetAssetFilters: () => set({ assetFilters: defaultAssetFilters }),

  // Compliance
  compliance: {
    expandedFramework: null,
    page: 1,
    pageSize: 20,
  },
  setCompliance: (state) =>
    set((s) => ({
      compliance: { ...s.compliance, ...state },
    })),

  // Threat Hunt
  threatHunt: defaultThreatHunt,
  setThreatHunt: (state) =>
    set((s) => ({
      threatHunt: { ...s.threatHunt, ...state },
    })),

  // SOAR
  soar: defaultSoar,
  setSoar: (playbooks) =>
    set((s) => ({
      soar: typeof playbooks === 'function' ? playbooks(s.soar) : playbooks,
    })),

  // MITRE ATT&CK Navigator
  mitre: defaultMitre,
  setMitre: (state) =>
    set((s) => ({
      mitre: { ...s.mitre, ...state },
    })),

  // Settings
  settings: {
    activeTab: 'general',
  },
  setSettings: (state) =>
    set((s) => ({
      settings: { ...s.settings, ...state },
    })),

  // Reports
  reports: defaultReports,
  setReports: (state) =>
    set((s) => ({
      reports: { ...s.reports, ...state },
    })),

  // Selected items (for bulk operations)
  selectedAlerts: [],
  setSelectedAlerts: (ids) => set({ selectedAlerts: ids }),

  // Dialog states
  createIncidentOpen: false,
  setCreateIncidentOpen: (open) => set({ createIncidentOpen: open }),
  alertDetailId: null,
  setAlertDetailId: (id) => set({ alertDetailId: id }),
  incidentDetailId: null,
  setIncidentDetailId: (id) => set({ incidentDetailId: id }),

  // Live mode
  liveMode: false,
  toggleLiveMode: () => set((s) => ({ liveMode: !s.liveMode })),
  setLiveMode: (enabled) => set({ liveMode: enabled }),
}))
