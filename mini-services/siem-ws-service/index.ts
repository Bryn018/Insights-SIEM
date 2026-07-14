import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
type AlertCategory =
  | 'authentication'
  | 'network'
  | 'privilege'
  | 'malware'
  | 'data-protection'
  | 'dns'
  | 'system'

interface SimulatedAlert {
  id: string
  title: string
  severity: Severity
  source: string
  sourceIp: string
  destIp: string
  timestamp: string
  category: AlertCategory
  description: string
}

interface SimulatedLog {
  id: string
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  service: string
  host: string
  message: string
}

interface SystemHealth {
  timestamp: string
  cpu: number
  memory: number
  disk: number
  eventRate: number
  activeAlerts: number
  uptime: number
}

interface SimulatedIncident {
  id: string
  title: string
  severity: Severity
  status: 'new' | 'investigating' | 'contained' | 'resolved'
  alertIds: string[]
  timestamp: string
  assignee: string | null
}

// ─── Constants & Data ────────────────────────────────────────────────────────

const ALERT_TEMPLATES: {
  title: string
  category: AlertCategory
  severity: Severity
  description: string
}[] = [
  {
    title: 'SSH Brute Force Attack Detected',
    category: 'authentication',
    severity: 'critical',
    description:
      'Multiple failed SSH login attempts detected from a single source within a short time window. Over 50 attempts in 5 minutes, suggesting automated brute force activity.',
  },
  {
    title: 'Port Scan Activity Detected',
    category: 'network',
    severity: 'high',
    description:
      'Systematic port scanning activity identified. Source IP attempted connections across sequential port ranges, indicating reconnaissance activity.',
  },
  {
    title: 'Suspicious Sudo Command Execution',
    category: 'privilege',
    severity: 'high',
    description:
      'Unusual sudo command executed by a non-standard user account. Command executed outside of normal operational hours and deviates from baseline behavior.',
  },
  {
    title: 'New User Account Created',
    category: 'system',
    severity: 'medium',
    description:
      'A new user account was created on a critical server. Account creation was not preceded by an approved change request in the ticketing system.',
  },
  {
    title: 'Malware Detection - Trojan Signature',
    category: 'malware',
    severity: 'critical',
    description:
      'Known malware signature detected in network traffic. The payload matches a known Trojan variant communicating with a command-and-control server.',
  },
  {
    title: 'DNS Tunneling Activity Suspected',
    category: 'dns',
    severity: 'high',
    description:
      'Unusually high volume of DNS queries with long subdomain labels detected. Pattern consistent with DNS tunneling used for data exfiltration or C2 communication.',
  },
  {
    title: 'Data Exfiltration Attempt Detected',
    category: 'data-protection',
    severity: 'critical',
    description:
      'Large volume of data transferred to an external IP address outside of normal business patterns. Transfer size exceeds configured threshold for the data classification level.',
  },
  {
    title: 'Privilege Escalation Attempt',
    category: 'privilege',
    severity: 'critical',
    description:
      'Attempted privilege escalation detected. A user account attempted to gain root/admin access through an exploitable vulnerability or misconfiguration.',
  },
]

const LOG_SERVICES = [
  'sshd',
  'suricata',
  'fluent-bit',
  'opensearch',
  'prometheus',
  'nginx',
  'kernel',
  'systemd',
  'auditd',
  'firewall',
]

const LOG_HOSTS = [
  'prod-web-01',
  'prod-web-02',
  'prod-db-01',
  'staging-app-01',
  'infra-proxy-01',
  'sec-monitor-01',
  'k8s-node-03',
  'edge-firewall-01',
]

const LOG_MESSAGES: Record<string, string[]> = {
  sshd: [
    'Failed password for root from 192.168.1.%d port %d ssh2',
    'Accepted publickey for admin from 10.0.0.%d port %d',
    'Connection closed by 192.168.2.%d port %d [preauth]',
    'Invalid user backup from 172.16.0.%d port %d',
  ],
  suricata: [
    '[ET SCAN] Potential SSH Scan',
    '[ET TROJAN] Possible Trojan Outbound Connection',
    '[ET EXPLOIT] Possible SQL Injection Attempt',
    '[ALERT] TLS certificate verification failed',
  ],
  'fluent-bit': [
    '[info] [engine] started',
    '[warn] [output:es] cannot flush records',
    '[info] [input] tail.0: inotify watch added',
    '[error] [buffer] failed to create chunk',
  ],
  opensearch: [
    '[INFO] [cluster] shard started',
    '[WARN] [index] slow indexing detected',
    '[INFO] [transport] publish_address {10.0.1.%d:9300}',
    '[ERROR] [discovery] failed to connect to master',
  ],
  prometheus: [
    '[INFO] completed evaluation in 12ms',
    '[WARN] scrape target down: instance=10.0.0.%d:9090',
    '[INFO] server is ready to receive web requests',
    '[ERROR] query evaluation timeout',
  ],
  nginx: [
    'GET /api/v1/health 200 %d 0.003',
    'POST /api/v1/login 401 %d 0.012',
    'GET /admin/config 403 %d 0.001',
    'GET /.env 404 %d 0.001 [suspicious]',
  ],
  kernel: [
    'TCP: Possible SYN flooding detected',
    'OOM killer invoked: process suricata pid %d',
    'nf_conntrack: table full, dropping packet',
    'EXT4-fs warning: checksum failed',
  ],
  systemd: [
    'Started Suricata IDS Service',
    'Failed to start OpenSearch daemon',
    'Reloading Fluent Bit configuration',
    'Session c%d logged out - waiting for processes',
  ],
  auditd: [
    'type=USER_AUTH msg=audit(): user pid=%d uid=0 auid=1000',
    'type=SYSCALL msg=audit(): arch=40000003 syscall=59 success=yes',
    'type=EXECVE msg=audit(): argc=3 a0="/usr/bin/wget"',
    'type=CRED_ACQ msg=audit(): user pid=%d acct="root"',
  ],
  firewall: [
    'DROP IN=eth0 SRC=192.168.1.%d DST=10.0.0.1 PROTO=TCP DPT=22',
    'ACCEPT IN=eth0 SRC=10.0.0.%d DST=10.0.0.1 PROTO=TCP DPT=443',
    'REJECT IN=eth0 SRC=172.16.0.%d PROTO=UDP DPT=53',
    'DROP IN=eth0 SRC=203.0.113.%d DST=10.0.0.1 PROTO=ICMP',
  ],
}

const ASSIGNEES = [
  'j.smith',
  'm.chen',
  'a.patel',
  'k.williams',
  null,
  null,
  null,
]

const ROOMS = ['alerts', 'incidents', 'dashboard', 'logs'] as const

// ─── Utility Functions ───────────────────────────────────────────────────────

let alertCounter = 0
let logCounter = 0
let incidentCounter = 0
let ruleCounter = 0
const startTime = Date.now()

function generateId(prefix: string, counter: number): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `${prefix}-${timestamp}-${counter.toString(36).padStart(4, '0')}-${random}`
}

function randomIp(): string {
  const subnets = ['192.168.1', '192.168.2', '10.0.0', '10.0.1', '172.16.0']
  const subnet = subnets[Math.floor(Math.random() * subnets.length)]
  return `${subnet}.${Math.floor(Math.random() * 254) + 1}`
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatLogMessage(service: string, template: string): string {
  return template.replace(/%d/g, () =>
    String(Math.floor(Math.random() * 65535) + 1)
  )
}

// ─── Event Generators ────────────────────────────────────────────────────────

function generateAlert(): SimulatedAlert {
  alertCounter++
  const template = randomFrom(ALERT_TEMPLATES)
  return {
    id: generateId('ALT', alertCounter),
    title: template.title,
    severity: template.severity,
    source: randomFrom(LOG_SERVICES),
    sourceIp: randomIp(),
    destIp: randomIp(),
    timestamp: new Date().toISOString(),
    category: template.category,
    description: template.description,
  }
}

function generateLog(): SimulatedLog {
  logCounter++
  const service = randomFrom(LOG_SERVICES)
  const messages = LOG_MESSAGES[service]
  const template = randomFrom(messages)
  const levels: SimulatedLog['level'][] = ['error', 'warn', 'info', 'debug']
  const levelWeights: SimulatedLog['level'][] = [
    'info',
    'info',
    'info',
    'warn',
    'warn',
    'error',
    'debug',
    'debug',
  ]

  return {
    id: generateId('LOG', logCounter),
    timestamp: new Date().toISOString(),
    level: randomFrom(levelWeights),
    service,
    host: randomFrom(LOG_HOSTS),
    message: formatLogMessage(service, template),
  }
}

function generateIncident(alertIds: string[]): SimulatedIncident {
  incidentCounter++
  const severities: Severity[] = ['critical', 'high', 'medium']
  const statuses: SimulatedIncident['status'][] = [
    'new',
    'investigating',
    'contained',
  ]
  return {
    id: generateId('INC', incidentCounter),
    title: `Security Incident - ${randomFrom(ALERT_TEMPLATES).title.replace('Detected', 'Ongoing')}`,
    severity: randomFrom(severities),
    status: randomFrom(statuses),
    alertIds: alertIds.slice(0, Math.floor(Math.random() * 3) + 1),
    timestamp: new Date().toISOString(),
    assignee: randomFrom(ASSIGNEES),
  }
}

function generateSystemHealth(): SystemHealth {
  return {
    timestamp: new Date().toISOString(),
    cpu: Math.round((30 + Math.random() * 50) * 100) / 100,
    memory: Math.round((40 + Math.random() * 40) * 100) / 100,
    disk: Math.round((50 + Math.random() * 30) * 100) / 100,
    eventRate: Math.round(500 + Math.random() * 2000),
    activeAlerts: Math.floor(5 + Math.random() * 25),
    uptime: Math.round((Date.now() - startTime) / 1000),
  }
}

// ─── Connection Management ───────────────────────────────────────────────────

const connectedClients = new Map<
  string,
  { socket: Socket; rooms: Set<string>; joinedAt: Date }
>()

io.on('connection', (socket: Socket) => {
  const clientInfo = {
    socket,
    rooms: new Set<string>(),
    joinedAt: new Date(),
  }
  connectedClients.set(socket.id, clientInfo)

  console.log(
    `[SIEM-WS] Client connected: ${socket.id} (total: ${connectedClients.size})`
  )

  // Send welcome event with available rooms
  socket.emit('connected', {
    message: 'Connected to SIEM WebSocket Service',
    availableRooms: ROOMS,
    serverTime: new Date().toISOString(),
  })

  // ── Room Management ──────────────────────────────────────────────────

  socket.on('subscribe', (room: string) => {
    if (!ROOMS.includes(room as (typeof ROOMS)[number])) {
      socket.emit('error', {
        message: `Invalid room: ${room}. Available rooms: ${ROOMS.join(', ')}`,
      })
      return
    }

    socket.join(room)
    clientInfo.rooms.add(room)
    console.log(`[SIEM-WS] Client ${socket.id} joined room: ${room}`)

    socket.emit('subscribed', {
      room,
      message: `Subscribed to ${room} updates`,
      timestamp: new Date().toISOString(),
    })
  })

  socket.on('unsubscribe', (room: string) => {
    socket.leave(room)
    clientInfo.rooms.delete(room)
    console.log(`[SIEM-WS] Client ${socket.id} left room: ${room}`)

    socket.emit('unsubscribed', {
      room,
      message: `Unsubscribed from ${room} updates`,
      timestamp: new Date().toISOString(),
    })
  })

  // ── Client-initiated Events ──────────────────────────────────────────

  socket.on('alert:acknowledge', (data: { alertId: string }) => {
    console.log(
      `[SIEM-WS] Alert acknowledgment received: ${data.alertId} from ${socket.id}`
    )
    io.to('alerts').emit('alert:update', {
      id: data.alertId,
      status: 'acknowledged',
      acknowledgedBy: socket.id,
      timestamp: new Date().toISOString(),
    })
    io.to('dashboard').emit('dashboard:metric', {
      type: 'alert_acknowledged',
      alertId: data.alertId,
      timestamp: new Date().toISOString(),
    })
  })

  socket.on('incident:update', (data: { incidentId: string; status: string }) => {
    console.log(
      `[SIEM-WS] Incident update received: ${data.incidentId} → ${data.status} from ${socket.id}`
    )
    io.to('incidents').emit('incident:update', {
      id: data.incidentId,
      status: data.status,
      updatedBy: socket.id,
      timestamp: new Date().toISOString(),
    })
  })

  // ── Disconnect ───────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    connectedClients.delete(socket.id)
    console.log(
      `[SIEM-WS] Client disconnected: ${socket.id} reason: ${reason} (total: ${connectedClients.size})`
    )
  })

  socket.on('error', (error) => {
    console.error(`[SIEM-WS] Socket error (${socket.id}):`, error)
  })
})

// ─── Scheduled Event Emitters ────────────────────────────────────────────────

// Recent alert IDs for incident correlation
const recentAlertIds: string[] = []

// 1. Simulated alerts every 10-20 seconds
function scheduleAlert() {
  const delay = 10000 + Math.random() * 10000 // 10-20 seconds
  setTimeout(() => {
    try {
      const alert = generateAlert()
      recentAlertIds.push(alert.id)
      if (recentAlertIds.length > 20) recentAlertIds.shift()

      // Emit to alerts room
      io.to('alerts').emit('alert:new', alert)
      console.log(
        `[SIEM-WS] Alert emitted: ${alert.title} (${alert.severity})`
      )

      // Also notify dashboard room
      io.to('dashboard').emit('dashboard:metric', {
        type: 'new_alert',
        alertId: alert.id,
        severity: alert.severity,
        category: alert.category,
        timestamp: alert.timestamp,
      })

      // Occasionally trigger a rule event alongside the alert
      if (Math.random() < 0.3) {
        ruleCounter++
        io.to('alerts').emit('rule:triggered', {
          id: generateId('RUL', ruleCounter),
          ruleName: `SIEM-Rule-${alert.category.toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`,
          alertId: alert.id,
          severity: alert.severity,
          category: alert.category,
          timestamp: new Date().toISOString(),
          description: `Detection rule triggered for: ${alert.title}`,
        })
      }
    } catch (err) {
      console.error('[SIEM-WS] Error generating alert:', err)
    }
    scheduleAlert()
  }, delay)
}

// 2. Simulated incidents every 30-60 seconds
function scheduleIncident() {
  const delay = 30000 + Math.random() * 30000 // 30-60 seconds
  setTimeout(() => {
    try {
      const incident = generateIncident(recentAlertIds)
      io.to('incidents').emit('incident:new', incident)
      console.log(
        `[SIEM-WS] Incident emitted: ${incident.title} (${incident.severity})`
      )

      // Also notify dashboard
      io.to('dashboard').emit('dashboard:metric', {
        type: 'new_incident',
        incidentId: incident.id,
        severity: incident.severity,
        timestamp: incident.timestamp,
      })
    } catch (err) {
      console.error('[SIEM-WS] Error generating incident:', err)
    }
    scheduleIncident()
  }, delay)
}

// 3. Simulated log stream every 2-5 seconds
function scheduleLog() {
  const delay = 2000 + Math.random() * 3000 // 2-5 seconds
  setTimeout(() => {
    try {
      const log = generateLog()
      io.to('logs').emit('log:stream', log)
    } catch (err) {
      console.error('[SIEM-WS] Error generating log:', err)
    }
    scheduleLog()
  }, delay)
}

// 4. System health updates every 30 seconds
function scheduleHealth() {
  setInterval(() => {
    try {
      const health = generateSystemHealth()
      io.to('dashboard').emit('system:health', health)
      console.log(
        `[SIEM-WS] Health update: CPU=${health.cpu}% MEM=${health.memory}% Events/s=${health.eventRate}`
      )
    } catch (err) {
      console.error('[SIEM-WS] Error generating health:', err)
    }
  }, 30000)
}

// 5. Occasional alert status updates (every 25-45 seconds)
function scheduleAlertUpdate() {
  const delay = 25000 + Math.random() * 20000
  setTimeout(() => {
    try {
      if (recentAlertIds.length > 0) {
        const alertId = randomFrom(recentAlertIds)
        const statuses = [
          'acknowledged',
          'investigating',
          'escalated',
          'resolved',
          'false_positive',
        ]
        const status = randomFrom(statuses)
        io.to('alerts').emit('alert:update', {
          id: alertId,
          status,
          updatedBy: 'system-automation',
          timestamp: new Date().toISOString(),
        })
        console.log(
          `[SIEM-WS] Alert update: ${alertId} → ${status}`
        )
      }
    } catch (err) {
      console.error('[SIEM-WS] Error updating alert:', err)
    }
    scheduleAlertUpdate()
  }, delay)
}

// 6. Occasional incident updates (every 40-70 seconds)
function scheduleIncidentUpdate() {
  const delay = 40000 + Math.random() * 30000
  setTimeout(() => {
    try {
      if (incidentCounter > 0) {
        const incidentId = generateId('INC', Math.max(1, incidentCounter - Math.floor(Math.random() * 3)))
        const statuses: SimulatedIncident['status'][] = [
          'investigating',
          'contained',
          'resolved',
        ]
        io.to('incidents').emit('incident:update', {
          id: incidentId,
          status: randomFrom(statuses),
          updatedBy: randomFrom(ASSIGNEES.filter(Boolean) as string[]),
          timestamp: new Date().toISOString(),
        })
        console.log(`[SIEM-WS] Incident update: ${incidentId}`)
      }
    } catch (err) {
      console.error('[SIEM-WS] Error updating incident:', err)
    }
    scheduleIncidentUpdate()
  }, delay)
}

// ─── Server Start ────────────────────────────────────────────────────────────

const PORT = 3003

httpServer.listen(PORT, () => {
  console.log(`[SIEM-WS] 🔒 SIEM WebSocket Service running on port ${PORT}`)
  console.log(`[SIEM-WS] Available rooms: ${ROOMS.join(', ')}`)
  console.log(`[SIEM-WS] Starting event generators...`)

  // Start all scheduled emitters
  scheduleAlert()
  scheduleIncident()
  scheduleLog()
  scheduleHealth()
  scheduleAlertUpdate()
  scheduleIncidentUpdate()

  // Emit an initial health update
  io.to('dashboard').emit('system:health', generateSystemHealth())
})

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

function gracefulShutdown(signal: string) {
  console.log(`[SIEM-WS] Received ${signal}, shutting down gracefully...`)

  // Notify connected clients
  io.emit('server:shutdown', {
    message: 'SIEM WebSocket Service is shutting down',
    timestamp: new Date().toISOString(),
  })

  // Close all connections
  io.disconnectSockets()

  httpServer.close(() => {
    console.log('[SIEM-WS] Server closed')
    process.exit(0)
  })

  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('[SIEM-WS] Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('uncaughtException', (error) => {
  console.error('[SIEM-WS] Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[SIEM-WS] Unhandled Rejection:', reason)
})
