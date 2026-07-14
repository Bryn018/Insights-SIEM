// ===== SIEM Application Type Definitions =====
// Aligned with Prisma schema and API routes

// ===== Enums / Literal Unions =====

export type ViewType =
  | 'dashboard'
  | 'alerts'
  | 'incidents'
  | 'logs'
  | 'threat-hunt'
  | 'rules'
  | 'assets'
  | 'compliance'
  | 'reports'
  | 'settings'
  | 'soar'
  | 'mitre'
  | 'network'
  | 'cases'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational'

export type AlertStatus =
  | 'new'
  | 'acknowledged'
  | 'investigating'
  | 'resolved'
  | 'suppressed'
  | 'escalated'

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'contained'
  | 'eradicated'
  | 'recovered'
  | 'closed'

export type IncidentPriority = 'p1' | 'p2' | 'p3' | 'p4'

export type ControlStatus =
  | 'compliant'
  | 'non_compliant'
  | 'partially_compliant'
  | 'not_assessed'
  | 'not_applicable'

export type AssetType =
  | 'server'
  | 'workstation'
  | 'network_device'
  | 'container'
  | 'cloud_instance'
  | 'iot'

export type AssetStatus = 'active' | 'inactive' | 'decommissioned' | 'maintenance'

export type AssetCriticality = 'critical' | 'high' | 'medium' | 'low'

export type UserRole = 'admin' | 'analyst' | 'responder' | 'viewer'

export type NotificationType = 'alert' | 'incident' | 'system' | 'compliance'

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export type QueryLanguage = 'kql' | 'lucene' | 'sql'

export type IntegrationType =
  | 'opensearch'
  | 'prometheus'
  | 'slack'
  | 'email'
  | 'webhook'
  | 'suricata'

export type AssignmentAction = 'assigned' | 'acknowledged' | 'escalated'

export type IncidentAssignmentRole = 'lead' | 'responder' | 'advisor'

// ===== Core Entities =====

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  avatar: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserSummary {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Alert {
  id: string
  sourceId: string | null
  title: string
  description: string
  severity: Severity
  status: AlertStatus
  category: string | null
  source: string
  sourceIp: string | null
  destIp: string | null
  sourcePort: number | null
  destPort: number | null
  protocol: string | null
  hostname: string | null
  rawLog: string | null
  mitreTactic: string | null
  mitreTechnique: string | null
  tags: string | null
  occurrenceCount: number
  firstSeenAt: string
  lastSeenAt: string
  assignedTo: AlertAssignment[]
  comments: Comment[]
  incidents?: IncidentAlertLink[]
  createdAt: string
  updatedAt: string
}

export interface AlertSummary {
  id: string
  title: string
  severity: Severity
  status: AlertStatus
  category: string | null
  source: string
  sourceIp: string | null
  destIp: string | null
  createdAt: string
}

export interface AlertAssignment {
  id: string
  alertId: string
  userId: string
  user: UserSummary
  action: AssignmentAction
  createdAt: string
}

export interface Incident {
  id: string
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  priority: IncidentPriority
  category: string | null
  attackVector: string | null
  impact: string | null
  resolution: string | null
  closedAt: string | null
  closedBy: string | null
  dueAt: string | null
  alerts?: IncidentAlertLink[]
  assignments: IncidentAssignment[]
  timeline?: IncidentTimeline[]
  comments?: Comment[]
  createdAt: string
  updatedAt: string
}

export interface IncidentSummary {
  id: string
  title: string
  severity: Severity
  status: IncidentStatus
  priority: IncidentPriority
  createdAt: string
}

export interface IncidentAlertLink {
  id: string
  incidentId: string
  alertId: string
  alert?: AlertSummary
  addedAt: string
}

export interface IncidentAssignment {
  id: string
  incidentId: string
  userId: string
  user: UserSummary
  role: IncidentAssignmentRole
  assignedAt: string
}

export interface IncidentTimeline {
  id: string
  incidentId: string
  event: string
  eventDate: string
  createdAt: string
}

export interface DetectionRule {
  id: string
  name: string
  description: string
  query: string
  queryLanguage: QueryLanguage
  severity: Severity
  category: string | null
  mitreTactic: string | null
  mitreTechnique: string | null
  tags: string | null
  enabled: boolean
  isDefault: boolean
  schedule: string | null
  lookback: string | null
  threshold: number | null
  indexPattern: string | null
  actions: string | null
  lastRunAt: string | null
  lastHitAt: string | null
  hitCount: number
  falsePositiveCount: number
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  ipAddress: string | null
  macAddress: string | null
  os: string | null
  osVersion: string | null
  status: AssetStatus
  criticality: AssetCriticality
  owner: string | null
  department: string | null
  location: string | null
  tags: string | null
  lastSeenAt: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
}

export interface ComplianceFramework {
  id: string
  name: string
  version: string | null
  description: string | null
  controls: ComplianceControl[]
  createdAt: string
  updatedAt: string
}

export interface ComplianceFrameworkSummary {
  id: string
  name: string
  version: string | null
  description: string | null
  totalControls: number
  statusCounts: Record<ControlStatus, number>
  complianceScore: number
  createdAt: string
  updatedAt: string
}

export interface ComplianceControl {
  id: string
  frameworkId: string
  framework?: ComplianceFramework
  controlId: string
  title: string
  description: string
  category: string | null
  status: ControlStatus
  evidence: string | null
  notes: string | null
  assessedAt: string | null
  assessedBy: string | null
  remediationDue: string | null
  createdAt: string
  updatedAt: string
}

export interface Integration {
  id: string
  name: string
  type: IntegrationType
  config: Record<string, unknown> | string
  enabled: boolean
  lastTestAt: string | null
  lastStatus: 'success' | 'failure' | null
  createdAt: string
  updatedAt: string
}

export interface SystemSetting {
  id: string
  key: string
  value: unknown
  updatedAt: string
}

export interface AuditLog {
  id: string
  userId: string
  user: UserSummary
  action: string
  resource: string
  resourceId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  read: boolean
  alertId: string | null
  alert?: AlertSummary | null
  createdAt: string
}

export interface Comment {
  id: string
  userId: string
  user: UserSummary
  content: string
  alertId: string | null
  incidentId: string | null
  createdAt: string
  updatedAt: string
}

// ===== Dashboard / Aggregation Types =====

export interface DashboardSummary {
  alertsBySeverity: Record<Severity, number>
  incidentsByStatus: Record<string, number>
  topCategories: Array<{ category: string; count: number }>
  recentAlerts: AlertSummary[]
  recentAlertsCount: number
  enabledRules: number
  totalRules: number
  mttaMin: number | null
  mttrMin: number | null
  systemHealth: {
    assetsByStatus: Record<string, number>
    integrationHealth: Record<string, number>
  }
  compliance: {
    score: number
    totalControls: number
    compliantControls: number
    partiallyCompliantControls: number
    nonCompliantControls: number
  }
  alertTrend: Array<{
    date: string
    critical: number
    high: number
    medium: number
    low: number
    informational: number
    total: number
  }>
}

// ===== WebSocket Event Types =====

export interface WsAlert {
  id: string
  title: string
  severity: Severity
  source: string
  sourceIp?: string
  destIp?: string
  timestamp: string
  category: string
  description: string
}

export interface WsAlertUpdate {
  id: string
  status: string
  updatedBy: string
  timestamp: string
  alert?: WsAlert
}

export interface WsIncident {
  id: string
  title: string
  severity: Severity
  status: string
  alertIds: string[]
  timestamp: string
  assignee: string | null
}

export interface WsIncidentUpdate {
  id: string
  status: string
  updatedBy: string | null
  timestamp: string
}

export interface WsLogEvent {
  id?: string
  timestamp: string
  hostname?: string
  message: string
  source?: string
  service: string
  level: string
  raw?: Record<string, unknown>
}

export interface SystemHealth {
  timestamp?: string
  cpu: number
  memory: number
  disk: number
  eventRate: number
  activeAlerts: number
  uptime: number
}

export interface WsDashboardMetric {
  type: string
  alertId?: string
  incidentId?: string
  severity?: string
  category?: string
  timestamp: string
}

export interface WsRuleTriggered {
  id: string
  ruleName: string
  alertId: string
  severity: string
  category: string
  timestamp: string
  description: string
}

// ===== API Response Types =====

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface NotificationResponse extends PaginatedResponse<Notification> {
  unreadCount: number
}

export interface SearchResults {
  query: string
  results: {
    alerts: AlertSummary[]
    incidents: IncidentSummary[]
    rules: Array<{
      id: string
      name: string
      severity: string
      category: string | null
      enabled: boolean
      createdAt: string
    }>
    assets: Array<{
      id: string
      name: string
      type: string
      status: string
      criticality: string
      ipAddress: string | null
      createdAt: string
    }>
  }
  totalResults: number
}

// ===== Store Notification Type =====

export interface StoreNotification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}
