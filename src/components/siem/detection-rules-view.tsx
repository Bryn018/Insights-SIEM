'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  RefreshCw,
  Upload,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Play,
  Activity,
  ChevronLeft,
  ChevronRight,
  Check,
  FileCode2,
  Shield,
  Copy,
  Download,
  Search,
  Filter,
  Code2,
  Terminal,
  Zap,
  Clock,
  AlertTriangle,
  Loader2,
  X,
  Tag,
  Library,
  Sparkles,
  Pencil,
  FlaskConical,
  Mail,
  Webhook,
  Bell,
  Workflow,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useSIEMStore, type Severity } from '@/lib/store'
import { SeverityBadge } from '@/components/siem/status-badge'
import { ExportButton } from '@/components/siem/export-button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ReactNode } from 'react'

interface RuleRow {
  id: string
  name: string
  description: string
  query: string
  queryLanguage: string
  severity: string
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
  lastRunAt: string | null
  lastHitAt: string | null
  hitCount: number
  falsePositiveCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// ===== Rule editor types =====
type RuleType = 'sigma' | 'yara' | 'kql' | 'lucene'

interface EditorRule {
  id?: string
  name: string
  description: string
  ruleType: RuleType
  severity: Severity
  category: string
  tags: string
  query: string
  schedule: string
  lookback: string
  threshold: number
  alertActions: string[]
  mitreTactic: string
  mitreTechnique: string
  indexPattern: string
}

interface TestMatch {
  timestamp: string
  source: string
  matchedField: string
  sampleValue: string
}

interface TemplateCardData {
  id: string
  name: string
  type: RuleType
  category: string
  description: string
  mitre: string
  severity: Severity
  query: string
}

const RULE_CATEGORIES = [
  'Malware Detection',
  'Lateral Movement',
  'Credential Access',
  'Persistence',
  'Defense Evasion',
  'Exfiltration',
]

const SCHEDULE_OPTIONS = [
  { value: 'realtime', label: 'Real-time' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '0 * * * *', label: 'Hourly' },
  { value: '0 0 * * *', label: 'Daily' },
]

const LOOKBACK_OPTIONS = ['1m', '5m', '15m', '30m', '1h', '6h', '24h']

const ALERT_ACTIONS = [
  { id: 'email', label: 'Email Notification', icon: Mail },
  { id: 'siem', label: 'SIEM Alert', icon: Bell },
  { id: 'webhook', label: 'Webhook', icon: Webhook },
  { id: 'soar', label: 'SOAR Playbook', icon: Workflow },
]

const COMMON_LOG_FIELDS = [
  'EventID', 'Image', 'CommandLine', 'DestinationIp', 'DestinationPort',
  'SourceIp', 'SourcePort', 'User', 'TargetFilename', 'ParentImage',
  'ProcessGuid', 'ComputerName', 'RegistryKey', 'RegistryValue',
  'LogonType', 'IpAddress', 'WorkstationName', 'Hashes', 'Protocol',
]

// ===== Sigma YAML templates (5) =====
const SIGMA_TEMPLATES: Record<string, string> = {
  'Process Creation': `title: Suspicious PowerShell Execution
status: experimental
description: Detects suspicious PowerShell command line arguments commonly used by attackers
author: SOC Team
date: 2024/01/15
logsource:
  product: windows
  service: process_creation
detection:
  selection:
    Image|endswith: '\\\\powershell.exe'
    CommandLine|contains:
      - '-enc '
      - '-ExecutionPolicy Bypass'
      - 'DownloadString'
      - 'Invoke-Shellcode'
  condition: selection
fields:
  - CommandLine
  - User
  - ComputerName
falsepositives:
  - Administrative scripts
level: high
`,
  'Network Connection': `title: Suspicious Outbound Network Connection
status: experimental
description: Detects outbound connections to known suspicious ports or rare destination IPs
author: SOC Team
date: 2024/01/15
logsource:
  product: windows
  service: network_connection
detection:
  selection:
    DestinationPort:
      - 4444
      - 6667
      - 1337
    Initiated: 'true'
  condition: selection
fields:
  - Image
  - DestinationIp
  - DestinationPort
  - User
falsepositives:
  - Legitimate IRC clients
level: medium
`,
  'File Creation': `title: Ransomware File Extension Dropped
status: experimental
description: Detects creation of files with known ransomware extensions
author: SOC Team
date: 2024/01/15
logsource:
  product: windows
  service: file_create
detection:
  selection:
    TargetFilename|endswith:
      - '.locked'
      - '.encrypted'
      - '.crypt'
      - '.ryuk'
      - '.locky'
  condition: selection
fields:
  - TargetFilename
  - Image
  - User
falsepositives:
  - Backup software using custom extensions
level: critical
`,
  'Registry Modification': `title: Registry Run Key Persistence
status: experimental
description: Detects modifications to the Run registry key for persistence
author: SOC Team
date: 2024/01/15
logsource:
  product: windows
  service: registry_event
detection:
  selection:
    EventType: SetValue
    TargetObject|contains:
      - 'CurrentVersion\\\\Run'
      - 'CurrentVersion\\\\RunOnce'
  condition: selection
fields:
  - TargetObject
  - Details
  - Image
falsepositives:
  - Legitimate startup programs
level: high
`,
  'Authentication': `title: Brute Force Authentication Detection
status: experimental
description: Detects multiple failed authentication attempts from a single source
author: SOC Team
date: 2024/01/15
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4625
  timeframe: 5m
  condition: selection | count() by IpAddress > 10
fields:
  - IpAddress
  - TargetUserName
  - LogonType
falsepositives:
  - Misconfigured service accounts
level: high
`,
}

// ===== YARA templates (5) =====
const YARA_TEMPLATES: Record<string, string> = {
  'Malware Family': `rule MalwareFamily_Generic {
  meta:
    description = "Detects generic malware family indicators"
    author = "SOC Team"
    date = "2024-01-15"
    severity = "high"
    family = "generic"
  strings:
    $s1 = "CreateRemoteThread" nocase
    $s2 = "VirtualAllocEx" nocase
    $s3 = "WriteProcessMemory" nocase
    $hex = { 4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF }
    $regex = /hxxps?:\\/\\/[^\\/]+\\/[a-z]{8}\\.exe/i
  condition:
    uint16(0) == 0x5A4D and 2 of them
}
`,
  'Ransomware': `rule Ransomware_Note_Detection {
  meta:
    description = "Detects common ransom note filenames and content"
    author = "SOC Team"
    date = "2024-01-15"
    severity = "critical"
  strings:
    $note1 = "YOUR FILES ARE ENCRYPTED" nocase
    $note2 = "HOW_TO_DECRYPT" nocase
    $note3 = "send BTC to" nocase
    $wallet = /\\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,42}\\b/
    $ext = /\\.(locked|encrypted|ryuk|locky|crypt)$/i
  condition:
    any of ($note*) or $wallet or $ext
}
`,
  'Web Shell': `rule WebShell_Detection {
  meta:
    description = "Detects common web shell signatures"
    author = "SOC Team"
    date = "2024-01-15"
    severity = "critical"
  strings:
    $php1 = "eval(base64_decode(" nocase
    $php2 = "system($_" nocase
    $php3 = "passthru($_" nocase
    $jsp1 = "Runtime.getRuntime().exec(" nocase
    $asp1 = "WScript.Shell" nocase
    $generic = "c99shell" nocase
    $b374k = "b374k" nocase
  condition:
    1 of them
}
`,
  'RAT': `rule Remote_Access_Trojan {
  meta:
    description = "Detects remote access trojan beacon patterns"
    author = "SOC Team"
    date = "2024-01-15"
    severity = "critical"
  strings:
    $beacon1 = "C2_CALLBACK" nocase
    $beacon2 = "REGISTRY_PERSIST" nocase
    $keylog = "GetAsyncKeyState" nocase
    $screen = "BitBlt" nocase
    $inject = "NtUnmapViewOfSection" nocase
    $mutex = "Global\\\\\\\\MutEx_C2_" ascii
  condition:
    2 of them
}
`,
  'Exploit Kit': `rule ExploitKit_Landing {
  meta:
    description = "Detects exploit kit landing page patterns"
    author = "SOC Team"
    date = "2024-01-15"
    severity = "high"
  strings:
    $flash = "application/x-shockwave-flash" nocase
    $java1 = "sun.audio." nocase
    $java2 = "java.applet" nocase
    $obf1 = "unescape(unescape" nocase
    $obf2 = "String.fromCharCode" nocase
    $shellcode = { FC E8 89 00 00 00 60 89 E5 31 D2 }
  condition:
    2 of them
}
`,
}

// ===== Templates library (10 mix) =====
const TEMPLATE_LIBRARY: TemplateCardData[] = [
  {
    id: 'tpl-1',
    name: 'Suspicious PowerShell Execution',
    type: 'sigma',
    category: 'Malware Detection',
    description: 'Detects suspicious PowerShell command line arguments commonly used by attackers for execution and lateral movement.',
    mitre: 'T1059.001',
    severity: 'high',
    query: SIGMA_TEMPLATES['Process Creation'],
  },
  {
    id: 'tpl-2',
    name: 'C2 Beacon Network Activity',
    type: 'sigma',
    category: 'Exfiltration',
    description: 'Detects outbound connections to suspicious ports associated with command-and-control beacons.',
    mitre: 'T1071',
    severity: 'medium',
    query: SIGMA_TEMPLATES['Network Connection'],
  },
  {
    id: 'tpl-3',
    name: 'Ransomware File Extension Drop',
    type: 'sigma',
    category: 'Defense Evasion',
    description: 'Detects creation of files with known ransomware extensions indicating encryption activity.',
    mitre: 'T1486',
    severity: 'critical',
    query: SIGMA_TEMPLATES['File Creation'],
  },
  {
    id: 'tpl-4',
    name: 'Registry Run Key Persistence',
    type: 'sigma',
    category: 'Persistence',
    description: 'Detects modifications to the Windows Run registry key used for malware persistence.',
    mitre: 'T1547.001',
    severity: 'high',
    query: SIGMA_TEMPLATES['Registry Modification'],
  },
  {
    id: 'tpl-5',
    name: 'Brute Force Authentication',
    type: 'sigma',
    category: 'Credential Access',
    description: 'Detects multiple failed authentication attempts from a single source indicating brute force.',
    mitre: 'T1110',
    severity: 'high',
    query: SIGMA_TEMPLATES['Authentication'],
  },
  {
    id: 'tpl-6',
    name: 'Generic Malware Family Strings',
    type: 'yara',
    category: 'Malware Detection',
    description: 'YARA rule detecting generic malware family indicators including API hooking and process injection.',
    mitre: 'T1027',
    severity: 'high',
    query: YARA_TEMPLATES['Malware Family'],
  },
  {
    id: 'tpl-7',
    name: 'Ransomware Note Detection',
    type: 'yara',
    category: 'Exfiltration',
    description: 'YARA rule detecting common ransom note content, Bitcoin wallet addresses, and encrypted file extensions.',
    mitre: 'T1486',
    severity: 'critical',
    query: YARA_TEMPLATES['Ransomware'],
  },
  {
    id: 'tpl-8',
    name: 'Web Shell Detection',
    type: 'yara',
    category: 'Persistence',
    description: 'YARA rule detecting common web shell signatures across PHP, JSP, and ASP platforms.',
    mitre: 'T1505.003',
    severity: 'critical',
    query: YARA_TEMPLATES['Web Shell'],
  },
  {
    id: 'tpl-9',
    name: 'Remote Access Trojan Beacon',
    type: 'yara',
    category: 'Lateral Movement',
    description: 'YARA rule detecting RAT beacon patterns, keylogging, screen capture, and process injection APIs.',
    mitre: 'T1071',
    severity: 'critical',
    query: YARA_TEMPLATES['RAT'],
  },
  {
    id: 'tpl-10',
    name: 'Exploit Kit Landing Page',
    type: 'yara',
    category: 'Defense Evasion',
    description: 'YARA rule detecting exploit kit landing page patterns including Flash, Java exploits, and shellcode.',
    mitre: 'T1190',
    severity: 'high',
    query: YARA_TEMPLATES['Exploit Kit'],
  },
]

const RULE_TYPE_INFO: Record<RuleType, { label: string; icon: typeof Code2; color: string; desc: string }> = {
  sigma: { label: 'Sigma', icon: Shield, color: 'text-emerald-400', desc: 'YAML-based detection rules for SIEM log sources' },
  yara: { label: 'YARA', icon: FileCode2, color: 'text-cyan-400', desc: 'Pattern-matching rules for files and memory' },
  kql: { label: 'KQL', icon: Terminal, color: 'text-purple-400', desc: 'Kusto Query Language for structured queries' },
  lucene: { label: 'Lucene', icon: Search, color: 'text-amber-400', desc: 'Apache Lucene full-text search syntax' },
}

const DEFAULT_EDITOR_RULE: EditorRule = {
  name: '',
  description: '',
  ruleType: 'sigma',
  severity: 'medium',
  category: '',
  tags: '',
  query: '',
  schedule: 'realtime',
  lookback: '5m',
  threshold: 1,
  alertActions: ['email', 'siem'],
  mitreTactic: '',
  mitreTechnique: '',
  indexPattern: 'insights-*',
}

// ===== Syntax highlighting =====
// Lightweight per-line tokenizers that emit <span> elements with CSS classes.
// Designed to be fast and dependency-free; not a full parser.

function highlightValue(s: string): ReactNode[] {
  const tokens: ReactNode[] = []
  const regex = /("(?:[^"\\]|\\.)*"|'[^']*'|-?\b\d+\.?\d*\b)/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(s)) !== null) {
    if (m.index > lastIdx) tokens.push(s.slice(lastIdx, m.index))
    const val = m[0]
    if (val.startsWith('"') || val.startsWith("'")) {
      tokens.push(<span key={i++} className="siem-syntax-string">{val}</span>)
    } else {
      tokens.push(<span key={i++} className="siem-syntax-number">{val}</span>)
    }
    lastIdx = m.index + val.length
  }
  if (lastIdx < s.length) tokens.push(s.slice(lastIdx))
  return tokens
}

function highlightSigma(code: string): ReactNode {
  const lines = code.split('\n')
  return lines.map((line, i) => {
    if (line.trimStart().startsWith('#')) {
      return <div key={i}><span className="siem-syntax-comment">{line || ' '}</span></div>
    }
    const keyMatch = line.match(/^(\s*)([A-Za-z_][\w.]*)(\|[\w]+)*(:)(.*)$/)
    if (keyMatch) {
      const indent = keyMatch[1]
      const key = keyMatch[2]
      const modifier = keyMatch[3] || ''
      const colon = keyMatch[4]
      const rest = keyMatch[5]
      return (
        <div key={i}>
          {indent}
          <span className="siem-syntax-keyword">{key}</span>
          {modifier && <span className="siem-syntax-operator">{modifier}</span>}
          <span className="siem-syntax-operator">{colon}</span>
          {highlightValue(rest)}
        </div>
      )
    }
    const listMatch = line.match(/^(\s*)(-)(\s+)(.*)$/)
    if (listMatch) {
      return (
        <div key={i}>
          {listMatch[1]}<span className="siem-syntax-operator">{listMatch[2]}</span>{listMatch[3]}
          {highlightValue(listMatch[4])}
        </div>
      )
    }
    return <div key={i}>{line || ' '}</div>
  })
}

const YARA_KEYWORDS = new Set([
  'rule', 'meta', 'strings', 'condition', 'any', 'of', 'them', 'and', 'or',
  'not', 'true', 'false', 'import', 'global', 'private', 'ascii', 'wide',
  'nocase', 'fullword', 'int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32',
  'all', 'for', 'in', 'filesize', 'entrypoint', 'at',
])

function highlightYara(code: string): ReactNode {
  const lines = code.split('\n')
  return lines.map((line, i) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//')) {
      return <div key={i}><span className="siem-syntax-comment">{line || ' '}</span></div>
    }
    const tokens: ReactNode[] = []
    const regex = /(\s+)|("(?:[^"\\]|\\.)*"|'[^']*')|(\/[^/\n]+\/[gimsux]*)|(\$\w+)|(\{[^}]*\})|([A-Za-z_]\w*)|(\b\d+(?:\.\d+)?\b)|([{}():,=<>!|&])/g
    let m: RegExpExecArray | null
    let ti = 0
    while ((m = regex.exec(line)) !== null) {
      const [full, ws, str, regexVal, variable, hex, word, num, op] = m
      if (ws !== undefined) { tokens.push(ws); continue }
      if (str !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-string">{str}</span>); continue }
      if (regexVal !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-string">{regexVal}</span>); continue }
      if (variable !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-variable">{variable}</span>); continue }
      if (hex !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-number">{hex}</span>); continue }
      if (word !== undefined) {
        if (YARA_KEYWORDS.has(word)) tokens.push(<span key={ti++} className="siem-syntax-keyword">{word}</span>)
        else tokens.push(word)
        continue
      }
      if (num !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-number">{num}</span>); continue }
      if (op !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-operator">{op}</span>); continue }
      tokens.push(full)
    }
    return <div key={i}>{tokens.length ? tokens : (line || ' ')}</div>
  })
}

const KQL_KEYWORDS = new Set([
  'where', 'project', 'summarize', 'extend', 'join', 'limit', 'order', 'by',
  'desc', 'asc', 'let', 'and', 'or', 'not', 'contains', 'has', 'startswith',
  'endswith', 'matches', 'regex', 'in', 'between', 'ago', 'now', 'bin', 'count',
  'sum', 'avg', 'min', 'max', 'AND', 'OR', 'NOT', 'take', 'sort', 'distinct',
  'union', 'make', 'list', 'set', 'dcount', 'iff',
])

function highlightKqlLike(code: string): ReactNode {
  const lines = code.split('\n')
  return lines.map((line, i) => {
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('#')) {
      return <div key={i}><span className="siem-syntax-comment">{line || ' '}</span></div>
    }
    const tokens: ReactNode[] = []
    const regex = /(\s+)|("(?:[^"\\]|\\.)*"|'[^']*')|(\*|:|=|\(|\)|\||<|>)/g
    let m: RegExpExecArray | null
    let ti = 0
    let lastIdx = 0
    while ((m = regex.exec(line)) !== null) {
      if (m.index > lastIdx) {
        const chunk = line.slice(lastIdx, m.index)
        // split chunk into words and numbers
        const sub = chunk.split(/(\b\d+(?:\.\d+)?\b)/)
        for (const part of sub) {
          if (!part) continue
          if (/^\d+(\.\d+)?$/.test(part)) {
            tokens.push(<span key={ti++} className="siem-syntax-number">{part}</span>)
          } else {
            const words = part.split(/(\s+)/)
            for (const w of words) {
              if (!w) continue
              if (/^\s+$/.test(w)) { tokens.push(w); continue }
              if (KQL_KEYWORDS.has(w)) tokens.push(<span key={ti++} className="siem-syntax-keyword">{w}</span>)
              else tokens.push(w)
            }
          }
        }
      }
      const [, ws, str, op] = m
      if (ws !== undefined) { tokens.push(ws); lastIdx = m.index + ws.length; continue }
      if (str !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-string">{str}</span>); lastIdx = m.index + str.length; continue }
      if (op !== undefined) { tokens.push(<span key={ti++} className="siem-syntax-operator">{op}</span>); lastIdx = m.index + op.length; continue }
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < line.length) {
      const chunk = line.slice(lastIdx)
      const sub = chunk.split(/(\b\d+(?:\.\d+)?\b)/)
      for (const part of sub) {
        if (!part) continue
        if (/^\d+(\.\d+)?$/.test(part)) {
          tokens.push(<span key={ti++} className="siem-syntax-number">{part}</span>)
        } else {
          const words = part.split(/(\s+)/)
          for (const w of words) {
            if (!w) continue
            if (/^\s+$/.test(w)) { tokens.push(w); continue }
            if (KQL_KEYWORDS.has(w)) tokens.push(<span key={ti++} className="siem-syntax-keyword">{w}</span>)
            else tokens.push(w)
          }
        }
      }
    }
    return <div key={i}>{tokens.length ? tokens : (line || ' ')}</div>
  })
}

function highlightCode(code: string, lang: RuleType): ReactNode {
  if (lang === 'sigma') return highlightSigma(code)
  if (lang === 'yara') return highlightYara(code)
  return highlightKqlLike(code)
}

// ===== Code editor (overlay technique) =====
function CodeEditor({
  value,
  onChange,
  lang,
  minHeight = 260,
}: {
  value: string
  onChange: (v: string) => void
  lang: RuleType
  minHeight?: number
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)

  const lineCount = useMemo(() => value.split('\n').length, [value])

  const handleScroll = useCallback(() => {
    if (taRef.current && preRef.current && gutterRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop
      preRef.current.scrollLeft = taRef.current.scrollLeft
      gutterRef.current.scrollTop = taRef.current.scrollTop
    }
  }, [])

  return (
    <div className="siem-code-editor flex" style={{ minHeight }}>
      {/* Line numbers gutter */}
      <div
        ref={gutterRef}
        className="siem-code-gutter w-10 shrink-0 py-2 text-xs"
        aria-hidden="true"
      >
        {Array.from({ length: Math.max(lineCount, 12) }, (_, i) => (
          <div key={i} className="px-2">{i + 1}</div>
        ))}
      </div>
      {/* Code area: pre (highlighted) behind transparent textarea */}
      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={preRef}
          className="absolute inset-0 overflow-hidden px-3 py-2 text-xs"
          aria-hidden="true"
        >
          <code>{highlightCode(value, lang)}{'\n'}</code>
        </pre>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          className="siem-code-scroll absolute inset-0 px-3 py-2 text-xs"
          style={{ caretColor: '#34d399' }}
          aria-label="Rule definition"
        />
      </div>
    </div>
  )
}

// ===== Tiny deterministic sparkline (preserved from original) =====
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

function generateSparklinePoints(ruleId: string, hitCount: number): number[] {
  if (hitCount <= 0) return [0, 0, 0, 0, 0, 0, 0, 0]
  const seed = hashString(ruleId)
  const points: number[] = []
  let prev = hitCount * 0.4
  for (let i = 0; i < 8; i++) {
    const r = ((seed >> (i * 3)) & 0xff) / 255 - 0.45
    prev = Math.max(0, prev + r * hitCount * 0.25)
    points.push(prev)
  }
  points[points.length - 1] = hitCount
  return points
}

function HitsSparkline({ ruleId, hitCount }: { ruleId: string; hitCount: number }) {
  const points = useMemo(
    () => generateSparklinePoints(ruleId, hitCount),
    [ruleId, hitCount]
  )
  const max = Math.max(1, ...points)
  const w = 44
  const h = 14
  const stepX = w / (points.length - 1)
  const path = points
    .map((p, i) => {
      const x = i * stepX
      const y = h - (p / max) * (h - 2) - 1
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const areaPath = `${path} L${w},${h} L0,${h} Z`
  const color =
    hitCount > 100 ? '#ef4444' : hitCount > 20 ? '#f97316' : hitCount > 0 ? '#10b981' : '#52525b'

  if (hitCount === 0) {
    return (
      <svg width={w} height={h} className="shrink-0 opacity-50" aria-hidden="true">
        <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    )
  }

  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${ruleId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${ruleId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ===== MITRE tooltip map (preserved) =====
const MITRE_TECHNIQUE_DESCRIPTIONS: Record<string, string> = {
  T1059: 'Command and Scripting Interpreter — Adversaries may abuse command and script interpreters to execute commands.',
  T1059_001: 'PowerShell — Adversaries may abuse PowerShell commands and scripts for execution.',
  T1059_004: 'Unix Shell — Adversaries may abuse Unix shell commands and scripts for execution.',
  T1078: 'Valid Accounts — Adversaries may compromise accounts with existing access to systems.',
  T1110: 'Brute Force — Adversaries may use brute-force techniques to attempt access to accounts.',
  T1003: 'OS Credential Dumping — Adversaries may attempt to dump credentials to obtain account login material.',
  T1566: 'Phishing — Adversaries may send phishing messages to gain access to victims.',
  T1566_001: 'Spearphishing Attachment — Phishing with a malicious attachment.',
  T1566_002: 'Spearphishing Link — Phishing with a malicious link.',
  T1486: 'Data Encrypted for Impact — Adversaries may encrypt data on target systems to interrupt availability.',
  T1190: 'Exploit Public-Facing Application — Adversaries may attempt to exploit a weakness in an internet-facing host.',
  T1048: 'Exfiltration Over Alternative Protocol — Exfiltration using a different protocol than the standard.',
  T1041: 'Exfiltration Over C2 Channel — Exfiltration over an existing command-and-control channel.',
  T1053: 'Scheduled Task/Job — Adversaries may abuse task scheduling utilities to execute code.',
  T1547: 'Boot or Logon Autostart Execution — Persistence via autostart mechanisms.',
  T1547_001: 'Boot or Logon Autostart Execution: Registry Run Keys — Persistence via Windows registry Run keys.',
  T1027: 'Obfuscated Files or Information — Adversaries may attempt to make payloads difficult to discover or analyze.',
  T1071: 'Application Layer Protocol — Adversaries may communicate using application layer protocols to blend with normal traffic.',
  T1090: 'Proxy — Adversaries may use proxy chains to hide their origin.',
  T1133: 'External Remote Services — Adversaries may leverage external remote services to maintain access.',
  T1485: 'Data Destruction — Adversaries may destroy data to disrupt operations.',
  T1505: 'Server Software Component — Adversaries may create or modify server software components.',
  T1505_003: 'Server Software Component: Web Shell — Adversaries may install a web shell to maintain access.',
}

function getMitreTooltipText(tactic: string | null, technique: string | null): string {
  if (technique) {
    const key = technique.replace('.', '_')
    const desc = MITRE_TECHNIQUE_DESCRIPTIONS[key]
    if (desc) return `${technique}: ${desc}`
  }
  if (tactic && technique) return `Tactic: ${tactic}\nTechnique: ${technique}`
  if (tactic) return `Tactic: ${tactic}`
  if (technique) return `Technique: ${technique}`
  return 'No MITRE ATT&CK mapping available'
}

// ===== Rule Test Panel =====
interface TestState {
  status: 'idle' | 'running' | 'complete' | 'error'
  results: TestMatch[] | null
  execTime: number
  fpEstimate: number
}

function RuleTestPanel({
  testState,
  onRun,
  ruleName,
}: {
  testState: TestState
  onRun: () => void
  ruleName: string
}) {
  const matches = testState.results || []
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className={cn('h-4 w-4', testState.status === 'running' ? 'text-emerald-400 animate-pulse' : 'text-zinc-400')} />
          <span className="text-xs font-medium text-zinc-200">Rule Test</span>
          {testState.status === 'running' && (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-400">
              <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" /> Running
            </Badge>
          )}
          {testState.status === 'complete' && (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-400">
              <Check className="mr-1 h-2.5 w-2.5" /> Complete
            </Badge>
          )}
          {testState.status === 'error' && (
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 px-1.5 py-0 text-[10px] text-red-400">
              <XCircle className="mr-1 h-2.5 w-2.5" /> Not available
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 border-zinc-700 text-xs hover:border-emerald-500/50 hover:text-emerald-400"
          onClick={onRun}
          disabled={testState.status === 'running' || !ruleName}
        >
          {testState.status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {testState.status === 'running' ? 'Testing...' : 'Test Rule'}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {testState.status === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Testing rule against live indices...</span>
              <span>real</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500/60 to-emerald-400"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        )}

        {testState.status === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Match Count</div>
                <div className="mt-0.5 text-lg font-semibold text-emerald-400 tabular-nums">{matches.length}</div>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Execution Time</div>
                <div className="mt-0.5 text-lg font-semibold text-cyan-400 tabular-nums">{testState.execTime}ms</div>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">FP Estimate</div>
                <div className={cn('mt-0.5 text-lg font-semibold tabular-nums', testState.fpEstimate > 20 ? 'text-amber-400' : 'text-emerald-400')}>
                  {testState.fpEstimate}%
                </div>
              </div>
            </div>

            {/* Sample matches table */}
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Sample Matches</div>
              <div className="max-h-44 overflow-y-auto rounded-md border border-zinc-800 siem-code-scroll">
                <table className="w-full text-left text-[10px]">
                  <thead className="sticky top-0 bg-zinc-900 text-zinc-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Timestamp</th>
                      <th className="px-2 py-1.5 font-medium">Source</th>
                      <th className="px-2 py-1.5 font-medium">Matched Field</th>
                      <th className="px-2 py-1.5 font-medium">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <tr key={i} className="border-t border-zinc-800/60 hover:bg-zinc-800/30">
                        <td className="px-2 py-1.5 font-mono text-zinc-400">{new Date(m.timestamp).toLocaleTimeString()}</td>
                        <td className="px-2 py-1.5 text-zinc-300">{m.source}</td>
                        <td className="px-2 py-1.5"><span className="text-emerald-400">{m.matchedField}</span></td>
                        <td className="px-2 py-1.5 font-mono text-amber-300 truncate max-w-[180px]">{m.sampleValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {testState.status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
              Rule test unavailable — no search backend (OpenSearch/Elasticsearch) is connected in this deployment. Connect a live data pipeline to execute real rule tests against captured events.
            </div>
          </motion.div>
        )}

        {testState.status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-md border border-dashed border-zinc-800 bg-zinc-900/30 px-3 py-2.5 text-[11px] text-zinc-500"
          >
            <Zap className="h-3.5 w-3.5 text-zinc-600" />
            Run a test against the connected log backend to preview matches and estimate false-positive rate. Requires a live OpenSearch/Elasticsearch pipeline.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== Main view =====
export function DetectionRulesView() {
  const { ruleFilters, setRuleFilters } = useSIEMStore()
  const [rules, setRules] = useState<RuleRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)

  // Tab: rules table vs templates library
  const [activeTab, setActiveTab] = useState<'rules' | 'templates'>('rules')

  // Rule editor wizard
  const [editorOpen, setEditorOpen] = useState(false)
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create')
  const [editorStep, setEditorStep] = useState(1)
  const [editorRule, setEditorRule] = useState<EditorRule>(DEFAULT_EDITOR_RULE)
  const [testState, setTestState] = useState<TestState>({
    status: 'idle',
    results: null,
    execTime: 0,
    fpEstimate: 0,
  })
  const [fieldHintOpen, setFieldHintOpen] = useState(false)

  // Templates library filters
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateTypeFilter, setTemplateTypeFilter] = useState<'all' | 'sigma' | 'yara'>('all')

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(ruleFilters.page))
      params.set('pageSize', String(ruleFilters.pageSize))
      if (ruleFilters.search) params.set('search', ruleFilters.search)
      if (ruleFilters.severity.length) params.set('severity', ruleFilters.severity.join(','))
      if (ruleFilters.category.length) params.set('category', ruleFilters.category.join(','))
      if (ruleFilters.enabled !== undefined) params.set('enabled', String(ruleFilters.enabled))

      const res = await fetch(`/api/rules?${params}`)
      if (res.ok) {
        const json = await res.json()
        setRules(json.data || [])
        setTotal(json.pagination?.total || 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [ruleFilters])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/rules/${ruleId}/toggle`, { method: 'POST' })
      if (res.ok) {
        toast.success(`Rule ${currentEnabled ? 'disabled' : 'enabled'}`)
        fetchRules()
      }
    } catch {
      toast.error('Failed to toggle rule')
    }
  }

  // ===== Editor helpers =====
  const openCreateEditor = useCallback(() => {
    setEditMode('create')
    setEditorStep(1)
    setEditorRule({ ...DEFAULT_EDITOR_RULE })
    setTestState({ status: 'idle', results: null, execTime: 0, fpEstimate: 0 })
    setEditorOpen(true)
  }, [])

  const openEditEditor = useCallback((rule: RuleRow) => {
    setEditMode('edit')
    setEditorStep(1)
    const lang = (['sigma', 'yara', 'kql', 'lucene'].includes(rule.queryLanguage)
      ? rule.queryLanguage
      : 'kql') as RuleType
    setEditorRule({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: lang,
      severity: rule.severity as Severity,
      category: rule.category || '',
      tags: rule.tags || '',
      query: rule.query,
      schedule: rule.schedule || 'realtime',
      lookback: rule.lookback || '5m',
      threshold: rule.threshold || 1,
      alertActions: ['email', 'siem'],
      mitreTactic: rule.mitreTactic || '',
      mitreTechnique: rule.mitreTechnique || '',
      indexPattern: rule.indexPattern || 'insights-*',
    })
    setTestState({ status: 'idle', results: null, execTime: 0, fpEstimate: 0 })
    setEditorOpen(true)
    setExpandedRule(null)
  }, [])

  const handleDuplicate = useCallback(async (rule: RuleRow) => {
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${rule.name} (Copy)`,
          description: rule.description,
          query: rule.query,
          queryLanguage: rule.queryLanguage,
          severity: rule.severity,
          category: rule.category,
          mitreTactic: rule.mitreTactic,
          mitreTechnique: rule.mitreTechnique,
          tags: rule.tags,
          schedule: rule.schedule,
          lookback: rule.lookback,
          threshold: rule.threshold,
          indexPattern: rule.indexPattern,
          enabled: false,
        }),
      })
      if (res.ok) {
        toast.success('Rule duplicated (disabled)')
        fetchRules()
      } else {
        toast.error('Failed to duplicate rule')
      }
    } catch {
      toast.error('Failed to duplicate rule')
    }
  }, [fetchRules])

  const handleExportRule = useCallback((rule: RuleRow) => {
    const ext = rule.queryLanguage === 'sigma' ? 'yml' : rule.queryLanguage === 'yara' ? 'yara' : 'txt'
    const filename = `${rule.name.replace(/\s+/g, '_').toLowerCase()}.${ext}`
    try {
      const blob = new Blob([rule.query], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${filename}`)
    } catch {
      toast.success(`Rule "${rule.name}" exported`)
    }
  }, [])

  const loadTemplate = useCallback((templateName: string) => {
    const lang = editorRule.ruleType
    const templates = lang === 'sigma' ? SIGMA_TEMPLATES : lang === 'yara' ? YARA_TEMPLATES : null
    if (!templates) return
    const tpl = templates[templateName]
    if (tpl) {
      setEditorRule((r) => ({ ...r, query: tpl }))
      toast.success(`Loaded "${templateName}" template`)
    }
  }, [editorRule.ruleType])

  const loadLibraryTemplate = useCallback((tpl: TemplateCardData) => {
    setEditMode('create')
    setEditorStep(1)
    setEditorRule({
      name: tpl.name,
      description: tpl.description,
      ruleType: tpl.type,
      severity: tpl.severity,
      category: tpl.category,
      tags: tpl.mitre,
      query: tpl.query,
      schedule: 'realtime',
      lookback: '5m',
      threshold: 1,
      alertActions: ['email', 'siem'],
      mitreTactic: '',
      mitreTechnique: tpl.mitre,
      indexPattern: 'insights-*',
    })
    setTestState({ status: 'idle', results: null, execTime: 0, fpEstimate: 0 })
    setActiveTab('rules')
    setEditorOpen(true)
  }, [])

  // When rule type changes and query is empty or matches a known template, seed default
  const handleRuleTypeChange = useCallback((newType: RuleType) => {
    setEditorRule((r) => {
      let newQuery = r.query
      const isEmptyOrTemplate =
        !r.query.trim() ||
        Object.values(SIGMA_TEMPLATES).includes(r.query) ||
        Object.values(YARA_TEMPLATES).includes(r.query)
      if (isEmptyOrTemplate) {
        if (newType === 'sigma') newQuery = SIGMA_TEMPLATES['Process Creation']
        else if (newType === 'yara') newQuery = YARA_TEMPLATES['Malware Family']
        else if (newType === 'kql') newQuery = '// KQL query\nSecurityEvent\n| where EventID == 4625\n| summarize count() by Account, IpAddress\n| where count_ > 10'
        else newQuery = '// Lucene query\nEventID:4625 AND source:sshd'
      }
      return { ...r, ruleType: newType, query: newQuery }
    })
  }, [])

  const runRuleTest = useCallback(() => {
    if (!editorRule.name || !editorRule.query) {
      toast.error('Rule name and query are required to test')
      return
    }
    // A real rule test requires a connected search backend (OpenSearch/
    // Elasticsearch) to actually execute the query against captured data.
    // This deployment has no live pipeline, so the test cannot run.
    setTestState({ status: 'error', results: null, execTime: 0, fpEstimate: 0 })
    toast.error('No search backend connected — cannot execute rule test')
  }, [editorRule.name, editorRule.query])

  const handleSaveRule = useCallback(async () => {
    if (!editorRule.name || !editorRule.query) {
      toast.error('Rule name and query are required')
      return
    }
    const payload = {
      name: editorRule.name,
      description: editorRule.description,
      query: editorRule.query,
      queryLanguage: editorRule.ruleType,
      severity: editorRule.severity,
      category: editorRule.category || null,
      mitreTactic: editorRule.mitreTactic || null,
      mitreTechnique: editorRule.mitreTechnique || null,
      tags: editorRule.tags || null,
      schedule: editorRule.schedule,
      lookback: editorRule.lookback,
      threshold: editorRule.threshold,
      indexPattern: editorRule.indexPattern,
    }
    try {
      if (editMode === 'edit' && editorRule.id) {
        const res = await fetch(`/api/rules/${editorRule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast.success('Rule updated')
          setEditorOpen(false)
          fetchRules()
        } else {
          toast.error('Failed to update rule')
        }
      } else {
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, enabled: true }),
        })
        if (res.ok) {
          toast.success('Rule created')
          setEditorOpen(false)
          fetchRules()
        } else {
          toast.error('Failed to create rule')
        }
      }
    } catch {
      toast.error(editMode === 'edit' ? 'Failed to update rule' : 'Failed to create rule')
    }
  }, [editorRule, editMode, fetchRules])

  const fpRate = (rule: RuleRow) => {
    if (rule.hitCount === 0) return 0
    return Math.round((rule.falsePositiveCount / rule.hitCount) * 100)
  }

  // Wizard step validation
  const stepValid = useMemo(() => {
    if (editorStep === 1) return editorRule.name.trim().length > 0
    if (editorStep === 2) return !!editorRule.ruleType
    if (editorStep === 3) return editorRule.query.trim().length > 0
    return true
  }, [editorStep, editorRule.name, editorRule.ruleType, editorRule.query])

  const wizardSteps = ['Basic Info', 'Rule Type', 'Definition', 'Schedule & Actions']

  // Filtered templates for library
  const filteredTemplates = useMemo(() => {
    return TEMPLATE_LIBRARY.filter((t) => {
      if (templateTypeFilter !== 'all' && t.type !== templateTypeFilter) return false
      if (templateSearch) {
        const q = templateSearch.toLowerCase()
        return (
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [templateSearch, templateTypeFilter])

  const templateOptions = editorRule.ruleType === 'sigma'
    ? Object.keys(SIGMA_TEMPLATES)
    : editorRule.ruleType === 'yara'
      ? Object.keys(YARA_TEMPLATES)
      : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab toggle */}
          <div className="flex items-center rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                activeTab === 'rules'
                  ? 'bg-emerald-600/15 text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Code2 className="h-3.5 w-3.5" /> Rules
              <span className="ml-1 rounded bg-zinc-800 px-1 text-[10px] tabular-nums">{total}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                activeTab === 'templates'
                  ? 'bg-emerald-600/15 text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Library className="h-3.5 w-3.5" /> Templates
              <span className="ml-1 rounded bg-zinc-800 px-1 text-[10px] tabular-nums">{TEMPLATE_LIBRARY.length}</span>
            </button>
          </div>

          {activeTab === 'rules' && (
            <>
              <Input
                placeholder="Search rules..."
                value={ruleFilters.search}
                onChange={(e) => setRuleFilters({ search: e.target.value, page: 1 })}
                className="h-8 w-56 text-sm"
              />
              <Select
                value={ruleFilters.severity[0] || 'all'}
                onValueChange={(v) => setRuleFilters({ severity: v === 'all' ? [] : [v as Severity], page: 1 })}
              >
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={ruleFilters.enabled === undefined ? 'all' : ruleFilters.enabled ? 'enabled' : 'disabled'}
                onValueChange={(v) => setRuleFilters({ enabled: v === 'all' ? undefined : v === 'enabled', page: 1 })}
              >
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchRules}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </Button>
            </>
          )}

          {activeTab === 'templates' && (
            <>
              <Input
                placeholder="Search templates by name/category..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="h-8 w-64 text-sm"
              />
              <Select value={templateTypeFilter} onValueChange={(v) => setTemplateTypeFilter(v as 'all' | 'sigma' | 'yara')}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sigma">Sigma</SelectItem>
                  <SelectItem value="yara">YARA</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'rules' && (
            <ExportButton
              filename="siem-detection-rules"
              fetchData={async () => {
                const params = new URLSearchParams()
                params.set('page', '1')
                params.set('pageSize', '10000')
                if (ruleFilters.search) params.set('search', ruleFilters.search)
                if (ruleFilters.severity.length)
                  params.set('severity', ruleFilters.severity.join(','))
                if (ruleFilters.enabled !== undefined)
                  params.set('enabled', String(ruleFilters.enabled))
                const res = await fetch(`/api/rules?${params.toString()}`)
                if (!res.ok) throw new Error('Failed to fetch rules for export')
                const json = await res.json()
                const rows = (json.data ?? json.rules ?? []) as Record<string, unknown>[]
                return rows.map((r) => ({
                  id: r.id,
                  name: r.name,
                  severity: r.severity,
                  category: r.category,
                  enabled: r.enabled,
                  mitreTactic: r.mitreTactic,
                  mitreTechnique: r.mitreTechnique,
                  description: r.description,
                  createdAt: r.createdAt,
                  updatedAt: r.updatedAt,
                }))
              }}
            />
          )}
          <Button size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={openCreateEditor}>
            <Plus className="h-3.5 w-3.5" /> New Rule
          </Button>
        </div>
      </div>

      {/* ===== Rules Table ===== */}
      {activeTab === 'rules' && (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
              <span className="w-16">Enabled</span>
              <span className="flex-1">Name</span>
              <span className="w-20">Severity</span>
              <span className="hidden w-24 md:block">Category</span>
              <span className="hidden w-24 lg:block">MITRE</span>
              <span className="hidden w-20 sm:block">Hits</span>
              <span className="hidden w-16 lg:block">FP Rate</span>
              <span className="hidden w-20 lg:block">Last Run</span>
              <span className="w-8" />
            </div>

            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded" />)}
              </div>
            ) : rules.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No rules found</div>
            ) : (
              <div>
                {rules.map((rule) => (
                  <div key={rule.id}>
                    <div
                      className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5 text-sm transition-colors hover:bg-accent/30 cursor-pointer"
                      onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                    >
                      <span className="w-16" onClick={(e) => e.stopPropagation()}>
                        <motion.div
                          layout
                          whileTap={{ scale: 0.92 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className="inline-flex"
                        >
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => handleToggleRule(rule.id, rule.enabled)}
                            className={cn(
                              'transition-all duration-300',
                              rule.enabled ? 'data-[state=checked]:bg-emerald-600' : ''
                            )}
                          />
                        </motion.div>
                      </span>
                      <span className="flex-1 truncate font-medium">{rule.name}</span>
                      <SeverityBadge severity={rule.severity as Severity} size="sm" />
                      <span className="hidden w-24 truncate text-xs text-muted-foreground md:block">
                        {rule.category || '—'}
                      </span>
                      <span className="hidden w-24 lg:block">
                        {rule.mitreTactic || rule.mitreTechnique ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex max-w-full items-center"
                              >
                                <Badge
                                  variant="outline"
                                  className="truncate border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] font-medium text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/20"
                                  title={rule.mitreTechnique || rule.mitreTactic || ''}
                                >
                                  {rule.mitreTechnique
                                    ? rule.mitreTechnique
                                    : rule.mitreTactic
                                      ? rule.mitreTactic.slice(0, 12) + (rule.mitreTactic.length > 12 ? '…' : '')
                                      : '—'}
                                </Badge>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs whitespace-pre-wrap border border-border bg-popover text-popover-foreground text-[10px] leading-relaxed"
                            >
                              {getMitreTooltipText(rule.mitreTactic, rule.mitreTechnique)}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </span>
                      <span className="hidden w-20 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                        <HitsSparkline ruleId={rule.id} hitCount={rule.hitCount} />
                        <span className="tabular-nums">{rule.hitCount}</span>
                      </span>
                      <span className={cn('hidden w-16 text-xs lg:block', fpRate(rule) > 50 ? 'text-red-400' : fpRate(rule) > 20 ? 'text-yellow-400' : 'text-emerald-400')}>
                        {fpRate(rule)}%
                      </span>
                      <span className="hidden w-20 text-xs text-muted-foreground lg:block">
                        {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleDateString() : 'Never'}
                      </span>
                      <span className="w-8">
                        {expandedRule === rule.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </span>
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {expandedRule === rule.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-b border-border bg-muted/20 p-4"
                        >
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="space-y-2 text-xs">
                              <div><span className="text-muted-foreground">Description:</span> {rule.description}</div>
                              <div><span className="text-muted-foreground">Query Language:</span> <Badge variant="outline" className="ml-1 border-zinc-700 px-1.5 py-0 text-[10px] uppercase">{rule.queryLanguage}</Badge></div>
                              <div><span className="text-muted-foreground">Schedule:</span> {rule.schedule || 'Manual'}</div>
                              <div><span className="text-muted-foreground">Lookback:</span> {rule.lookback || '—'}</div>
                              <div><span className="text-muted-foreground">Threshold:</span> {rule.threshold || 1}</div>
                              <div><span className="text-muted-foreground">Index Pattern:</span> {rule.indexPattern || '—'}</div>
                              <div><span className="text-muted-foreground">MITRE:</span> {rule.mitreTactic || '—'} / {rule.mitreTechnique || '—'}</div>
                              <div><span className="text-muted-foreground">Tags:</span> {rule.tags || '—'}</div>
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Rule Source</span>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px] hover:text-emerald-400" onClick={() => openEditEditor(rule)}>
                                        <Pencil className="h-3 w-3" /> Edit
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Open in rule editor</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px] hover:text-emerald-400" onClick={() => handleDuplicate(rule)}>
                                        <Copy className="h-3 w-3" /> Duplicate
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Create a disabled copy</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px] hover:text-emerald-400" onClick={() => handleExportRule(rule)}>
                                        <Download className="h-3 w-3" /> Export
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Download rule file</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                              <div
                                className="siem-code-editor siem-code-scroll max-h-44 overflow-auto"
                                style={{ fontSize: '11px', lineHeight: '18px' }}
                              >
                                <pre className="px-3 py-2" style={{ pointerEvents: 'auto', overflow: 'visible' }}>
                                  <code>{highlightCode(rule.query, (['sigma', 'yara', 'kql', 'lucene'].includes(rule.queryLanguage) ? rule.queryLanguage : 'kql') as RuleType)}</code>
                                </pre>
                              </div>
                              <div className="mt-2 flex gap-4 text-xs">
                                <span>Total Hits: <strong>{rule.hitCount}</strong></span>
                                <span>False Positives: <strong>{rule.falsePositiveCount}</strong></span>
                                <span>FP Rate: <strong className={fpRate(rule) > 50 ? 'text-red-400' : 'text-emerald-400'}>{fpRate(rule)}%</strong></span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== Templates Library ===== */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No templates match your filters
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const TypeInfo = RULE_TYPE_INFO[tpl.type]
              const Icon = TypeInfo.icon
              return (
                <motion.div
                  key={tpl.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="siem-template-card flex flex-col rounded-lg border border-border bg-card p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900', TypeInfo.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-zinc-700 px-1.5 py-0 text-[10px] uppercase',
                          tpl.type === 'sigma' ? 'text-emerald-400' : 'text-cyan-400'
                        )}
                      >
                        {tpl.type}
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] font-medium text-emerald-400"
                    >
                      {tpl.mitre}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{tpl.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {tpl.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                      <Tag className="h-2.5 w-2.5" /> {tpl.category}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <SeverityBadge severity={tpl.severity} size="sm" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 border-emerald-600/40 text-[11px] text-emerald-400 hover:border-emerald-500/70 hover:bg-emerald-500/10"
                      onClick={() => loadLibraryTemplate(tpl)}
                    >
                      <Sparkles className="h-3 w-3" /> Use Template
                    </Button>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {/* ===== Rule Editor Wizard Dialog ===== */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[88vh] w-[min(920px,95vw)] overflow-hidden bg-card border-border p-0">
          <DialogHeader className="border-b border-border px-5 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              {editMode === 'edit' ? <Pencil className="h-4 w-4 text-emerald-400" /> : <Plus className="h-4 w-4 text-emerald-400" />}
              {editMode === 'edit' ? 'Edit Detection Rule' : 'New Detection Rule'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editMode === 'edit'
                ? 'Modify the rule definition, schedule, and alert actions.'
                : 'Create a Sigma, YARA, KQL, or Lucene detection rule with a 4-step wizard.'}
            </DialogDescription>
          </DialogHeader>

          {/* Wizard progress */}
          <div className="flex items-center gap-1 border-b border-border bg-zinc-950/40 px-5 py-2.5">
            {wizardSteps.map((label, idx) => {
              const stepNum = idx + 1
              const isCurrent = editorStep === stepNum
              const isDone = editorStep > stepNum
              return (
                <div key={label} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      // Allow jumping back, or forward only if prior steps valid
                      if (stepNum <= editorStep) setEditorStep(stepNum)
                    }}
                    className={cn(
                      'siem-wizard-step flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs',
                      isCurrent && 'siem-wizard-step-active text-emerald-400',
                      isDone && 'siem-wizard-step-done',
                      !isCurrent && !isDone && 'text-muted-foreground'
                    )}
                    disabled={stepNum > editorStep}
                  >
                    <span className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold',
                      isCurrent ? 'bg-emerald-500/20 text-emerald-300' : isDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                    )}>
                      {isDone ? <Check className="h-2.5 w-2.5" /> : stepNum}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {idx < wizardSteps.length - 1 && (
                    <div className={cn('mx-1 h-px flex-1', isDone ? 'bg-emerald-500/40' : 'bg-zinc-800')} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step body */}
          <div className="max-h-[52vh] overflow-y-auto px-5 py-4 siem-code-scroll">
            <AnimatePresence mode="wait">
              {/* STEP 1: Basic Info */}
              {editorStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Rule Name <span className="text-emerald-400">*</span></label>
                    <Input
                      value={editorRule.name}
                      onChange={(e) => setEditorRule({ ...editorRule, name: e.target.value })}
                      className="mt-1 h-9 text-sm"
                      placeholder="e.g. Suspicious PowerShell Execution"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <Textarea
                      value={editorRule.description}
                      onChange={(e) => setEditorRule({ ...editorRule, description: e.target.value })}
                      className="mt-1 text-sm"
                      rows={2}
                      placeholder="What does this rule detect and why?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Category</label>
                      <Select value={editorRule.category || 'none'} onValueChange={(v) => setEditorRule({ ...editorRule, category: v === 'none' ? '' : v })}>
                        <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— None —</SelectItem>
                          {RULE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Severity</label>
                      <Select value={editorRule.severity} onValueChange={(v) => setEditorRule({ ...editorRule, severity: v as Severity })}>
                        <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                    <Input
                      value={editorRule.tags}
                      onChange={(e) => setEditorRule({ ...editorRule, tags: e.target.value })}
                      className="mt-1 h-9 text-sm"
                      placeholder="e.g. T1059.001, attack.execution, windows"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {editorRule.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6).map((t) => (
                        <Badge key={t} variant="outline" className="border-zinc-700 px-1.5 py-0 text-[10px] text-zinc-400">
                          <Tag className="mr-1 h-2.5 w-2.5" />{t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">MITRE Tactic</label>
                      <Input
                        value={editorRule.mitreTactic}
                        onChange={(e) => setEditorRule({ ...editorRule, mitreTactic: e.target.value })}
                        className="mt-1 h-9 text-xs"
                        placeholder="e.g. Execution"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">MITRE Technique</label>
                      <Input
                        value={editorRule.mitreTechnique}
                        onChange={(e) => setEditorRule({ ...editorRule, mitreTechnique: e.target.value })}
                        className="mt-1 h-9 text-xs"
                        placeholder="e.g. T1059.001"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Rule Type */}
              {editorStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-muted-foreground">Choose the detection rule format. Each format is optimized for different data sources.</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(Object.keys(RULE_TYPE_INFO) as RuleType[]).map((rt) => {
                      const info = RULE_TYPE_INFO[rt]
                      const Icon = info.icon
                      const selected = editorRule.ruleType === rt
                      return (
                        <button
                          key={rt}
                          type="button"
                          onClick={() => handleRuleTypeChange(rt)}
                          className={cn(
                            'siem-rule-type-card flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left',
                            selected && 'siem-rule-type-card-selected'
                          )}
                        >
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900', info.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{info.label}</span>
                              {selected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{info.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                      <Sparkles className="h-3 w-3 text-emerald-400" /> Preview
                    </div>
                    <pre className="overflow-x-auto text-[10px] leading-relaxed text-zinc-400 siem-code-scroll">
                      <code>{highlightCode(editorRule.query.split('\n').slice(0, 6).join('\n'), editorRule.ruleType)}</code>
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Rule Definition */}
              {editorStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Rule Definition <span className="text-emerald-400">*</span></label>
                      <Badge variant="outline" className="border-zinc-700 px-1.5 py-0 text-[10px] uppercase text-zinc-400">
                        {RULE_TYPE_INFO[editorRule.ruleType].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {templateOptions.length > 0 && (
                        <Select value="" onValueChange={(v) => v && loadTemplate(v)}>
                          <SelectTrigger className="h-7 w-40 text-[11px]">
                            <span className="flex items-center gap-1"><FileCode2 className="h-3 w-3" /> Load Template</span>
                          </SelectTrigger>
                          <SelectContent>
                            {templateOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {editorRule.ruleType === 'sigma' && (
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[11px]"
                            onClick={() => setFieldHintOpen((o) => !o)}
                          >
                            <Search className="h-3 w-3" /> Fields
                          </Button>
                          {fieldHintOpen && (
                            <div className="absolute right-0 top-8 z-50 w-44 rounded-md border border-zinc-800 bg-popover p-1 shadow-lg">
                              <div className="px-1.5 py-1 text-[10px] font-medium text-muted-foreground">Common Log Fields</div>
                              <div className="max-h-48 overflow-y-auto siem-code-scroll">
                                {COMMON_LOG_FIELDS.map((f) => (
                                  <button
                                    key={f}
                                    type="button"
                                    className="block w-full rounded px-1.5 py-1 text-left font-mono text-[10px] text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                                    onClick={() => {
                                      setEditorRule((r) => ({ ...r, query: r.query + (r.query.endsWith('\n') ? '' : '\n') + '      ' + f + ': ' }))
                                      setFieldHintOpen(false)
                                    }}
                                  >
                                    {f}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <CodeEditor
                    value={editorRule.query}
                    onChange={(v) => setEditorRule({ ...editorRule, query: v })}
                    lang={editorRule.ruleType}
                    minHeight={280}
                  />

                  {/* Syntax legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><span className="siem-syntax-keyword">keyword</span></span>
                    <span className="flex items-center gap-1"><span className="siem-syntax-string">string</span></span>
                    <span className="flex items-center gap-1"><span className="siem-syntax-comment">comment</span></span>
                    <span className="flex items-center gap-1"><span className="siem-syntax-number">number</span></span>
                    <span className="flex items-center gap-1"><span className="siem-syntax-operator">operator</span></span>
                    {editorRule.ruleType === 'yara' && (
                      <span className="flex items-center gap-1"><span className="siem-syntax-variable">$variable</span></span>
                    )}
                  </div>

                  {/* Test panel */}
                  <RuleTestPanel testState={testState} onRun={runRuleTest} ruleName={editorRule.name} />
                </motion.div>
              )}

              {/* STEP 4: Schedule & Actions */}
              {editorStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Clock className="h-3 w-3" /> Schedule</label>
                      <Select value={editorRule.schedule} onValueChange={(v) => setEditorRule({ ...editorRule, schedule: v })}>
                        <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Lookback Period</label>
                      <Select value={editorRule.lookback} onValueChange={(v) => setEditorRule({ ...editorRule, lookback: v })}>
                        <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LOOKBACK_OPTIONS.map((l) => <SelectItem key={l} value={l}>Last {l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Threshold (events to trigger)</label>
                      <Input
                        type="number"
                        min={1}
                        value={editorRule.threshold}
                        onChange={(e) => setEditorRule({ ...editorRule, threshold: Number(e.target.value) || 1 })}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Index Pattern</label>
                      <Input
                        value={editorRule.indexPattern}
                        onChange={(e) => setEditorRule({ ...editorRule, indexPattern: e.target.value })}
                        className="mt-1 h-9 text-xs"
                        placeholder="insights-*"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Zap className="h-3 w-3" /> Alert Actions</label>
                    <p className="mb-2 text-[10px] text-muted-foreground">Choose what happens when the rule fires.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALERT_ACTIONS.map((a) => {
                        const Icon = a.icon
                        const active = editorRule.alertActions.includes(a.id)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setEditorRule((r) => ({
                              ...r,
                              alertActions: active
                                ? r.alertActions.filter((x) => x !== a.id)
                                : [...r.alertActions, a.id],
                            }))}
                            className={cn(
                              'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors',
                              active
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                                : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                            )}
                          >
                            <Icon className={cn('h-3.5 w-3.5', active ? 'text-emerald-400' : 'text-zinc-500')} />
                            <span className="flex-1">{a.label}</span>
                            {active ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4 text-zinc-600" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
                    <div className="mb-1.5 text-[11px] font-medium text-zinc-300">Rule Summary</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div><span className="text-zinc-500">Name:</span> <span className="text-zinc-200">{editorRule.name || '—'}</span></div>
                      <div><span className="text-zinc-500">Type:</span> <span className={RULE_TYPE_INFO[editorRule.ruleType].color}>{RULE_TYPE_INFO[editorRule.ruleType].label}</span></div>
                      <div><span className="text-zinc-500">Severity:</span> <span className="text-zinc-200 capitalize">{editorRule.severity}</span></div>
                      <div><span className="text-zinc-500">Category:</span> <span className="text-zinc-200">{editorRule.category || '—'}</span></div>
                      <div><span className="text-zinc-500">Schedule:</span> <span className="text-zinc-200">{SCHEDULE_OPTIONS.find((s) => s.value === editorRule.schedule)?.label || editorRule.schedule}</span></div>
                      <div><span className="text-zinc-500">Lookback:</span> <span className="text-zinc-200">{editorRule.lookback}</span></div>
                      <div><span className="text-zinc-500">Threshold:</span> <span className="text-zinc-200">{editorRule.threshold}</span></div>
                      <div><span className="text-zinc-500">Actions:</span> <span className="text-zinc-200">{editorRule.alertActions.length || 'none'}</span></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Wizard footer */}
          <DialogFooter className="border-t border-border bg-zinc-950/40 px-5 py-3">
            <div className="flex w-full items-center justify-between">
              <div className="text-[11px] text-muted-foreground">
                Step <span className="font-semibold text-emerald-400">{editorStep}</span> of {wizardSteps.length}
                {editorStep === 3 && testState.status === 'complete' && (
                  <span className="ml-2 text-emerald-400">• Last test: {testState.results?.length || 0} matches</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditorOpen(false)}>Cancel</Button>
                {editorStep > 1 && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditorStep((s) => Math.max(1, s - 1))}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                )}
                {editorStep === 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 border-emerald-600/40 text-emerald-400 hover:border-emerald-500/70 hover:bg-emerald-500/10"
                    onClick={runRuleTest}
                    disabled={testState.status === 'running' || !editorRule.name || !editorRule.query}
                  >
                    {testState.status === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                    Test Rule
                  </Button>
                )}
                {editorStep < 4 ? (
                  <Button
                    size="sm"
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setEditorStep((s) => Math.min(4, s + 1))}
                    disabled={!stepValid}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSaveRule}
                    disabled={!editorRule.name || !editorRule.query}
                  >
                    {editMode === 'edit' ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {editMode === 'edit' ? 'Update Rule' : 'Create Rule'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
