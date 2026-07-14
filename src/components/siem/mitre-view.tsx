'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  X,
  Filter,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
  Activity,
  AlertTriangle,
  ChevronRight,
  Crosshair,
  Radar,
  Bell,
  Lightbulb,
  Layers,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useSIEMStore, type MitreDetectionStatus } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ===== Types =====

interface MitreTactic {
  id: string // e.g. TA0043
  name: string
  shortName: string
}

interface MitreSubTechnique {
  id: string
  name: string
}

interface MitreDetectionRule {
  id: string
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  enabled: boolean
}

interface MitreRecentAlert {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  timestamp: string
}

interface MitreTechnique {
  id: string // e.g. T1059
  name: string
  description: string
  status: MitreDetectionStatus
  platforms: string[]
  tacticId: string
  subTechniques: MitreSubTechnique[]
  detectionRules: MitreDetectionRule[]
  recentAlerts: MitreRecentAlert[]
  mitigations: string[]
}

// ===== Detection Status Visual Config =====

const STATUS_CONFIG: Record<
  MitreDetectionStatus,
  {
    label: string
    short: string
    bg: string
    border: string
    text: string
    hoverBg: string
    dot: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  detected: {
    label: 'Detected',
    short: 'Detected',
    bg: 'bg-emerald-500/25',
    border: 'border-emerald-500/40',
    text: 'text-emerald-200',
    hoverBg: 'hover:bg-emerald-500/40',
    dot: 'bg-emerald-400',
    icon: ShieldCheck,
  },
  partial: {
    label: 'Partial Coverage',
    short: 'Partial',
    bg: 'bg-amber-500/25',
    border: 'border-amber-500/40',
    text: 'text-amber-200',
    hoverBg: 'hover:bg-amber-500/40',
    dot: 'bg-amber-400',
    icon: ShieldAlert,
  },
  gap: {
    label: 'Detection Gap',
    short: 'Gap',
    bg: 'bg-red-500/25',
    border: 'border-red-500/40',
    text: 'text-red-200',
    hoverBg: 'hover:bg-red-500/40',
    dot: 'bg-red-400',
    icon: ShieldX,
  },
  'n/a': {
    label: 'Not Applicable',
    short: 'N/A',
    bg: 'bg-zinc-600/25',
    border: 'border-zinc-600/40',
    text: 'text-zinc-300',
    hoverBg: 'hover:bg-zinc-600/40',
    dot: 'bg-zinc-500',
    icon: Shield,
  },
}

// ===== Platform Options =====

const PLATFORMS = [
  'Windows',
  'Linux',
  'macOS',
  'Network',
  'Container',
  'Office 365',
  'Azure AD',
] as const

// ===== Mock Tactic Data (14 Enterprise ATT&CK Tactics) =====

const MITRE_TACTICS: MitreTactic[] = [
  { id: 'TA0043', name: 'Reconnaissance', shortName: 'Recon' },
  { id: 'TA0042', name: 'Resource Development', shortName: 'Resource Dev' },
  { id: 'TA0001', name: 'Initial Access', shortName: 'Initial Access' },
  { id: 'TA0002', name: 'Execution', shortName: 'Execution' },
  { id: 'TA0003', name: 'Persistence', shortName: 'Persistence' },
  { id: 'TA0004', name: 'Privilege Escalation', shortName: 'Priv Esc' },
  { id: 'TA0005', name: 'Defense Evasion', shortName: 'Def Evasion' },
  { id: 'TA0006', name: 'Credential Access', shortName: 'Cred Access' },
  { id: 'TA0007', name: 'Discovery', shortName: 'Discovery' },
  { id: 'TA0008', name: 'Lateral Movement', shortName: 'Lat Movement' },
  { id: 'TA0009', name: 'Collection', shortName: 'Collection' },
  { id: 'TA0011', name: 'Command and Control', shortName: 'C2' },
  { id: 'TA0010', name: 'Exfiltration', shortName: 'Exfil' },
  { id: 'TA0040', name: 'Impact', shortName: 'Impact' },
]

// ===== Mock Technique Data =====
// Real MITRE ATT&CK technique IDs and descriptions (publicly published knowledge)

const MITRE_TECHNIQUES: MitreTechnique[] = [
  // ----- Reconnaissance (TA0043) -----
  {
    id: 'T1595',
    name: 'Active Scanning',
    description: 'Adversaries scan victim IP addresses to gather information for follow-on behaviors.',
    status: 'detected',
    platforms: ['Network'],
    tacticId: 'TA0043',
    subTechniques: [{ id: 'T1595.001', name: 'Scanning IP Blocks' }, { id: 'T1595.002', name: 'Vulnerability Scanning' }],
    detectionRules: [{ id: 'rule-t1595-1', name: 'Port Scan Burst Detection', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a1', title: 'Nmap scan from 203.0.113.45', severity: 'medium', timestamp: '2024-01-15T14:23:00Z' }],
    mitigations: ['Network segmentation', 'IDS/IPS at perimeter'],
  },
  {
    id: 'T1592',
    name: 'Gather Victim Host Information',
    description: 'Adversaries gather information about the victim host that can be used during targeting.',
    status: 'partial',
    platforms: ['Network', 'Windows', 'Linux'],
    tacticId: 'TA0043',
    subTechniques: [{ id: 'T1592.001', name: 'Hardware' }, { id: 'T1592.002', name: 'Software' }, { id: 'T1592.004', name: 'Client Configurations' }],
    detectionRules: [{ id: 'rule-t1592-1', name: 'DNS Reconnaissance Burst', severity: 'low', enabled: true }],
    recentAlerts: [],
    mitigations: ['Monitor DNS query patterns', 'Egress filtering'],
  },
  {
    id: 'T1589',
    name: 'Gather Victim Identity Information',
    description: 'Adversaries gather identity information about the victim that can be used during targeting.',
    status: 'gap',
    platforms: ['Windows', 'Office 365', 'Azure AD'],
    tacticId: 'TA0043',
    subTechniques: [{ id: 'T1589.001', name: 'Credentials' }, { id: 'T1589.002', name: 'Email Addresses' }, { id: 'T1589.003', name: 'Employee Names' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Audit public-facing information', 'Employee security awareness training'],
  },
  {
    id: 'T1590',
    name: 'Gather Victim Network Information',
    description: 'Adversaries gather network information about the victim that can be used during targeting.',
    status: 'partial',
    platforms: ['Network'],
    tacticId: 'TA0043',
    subTechniques: [{ id: 'T1590.001', name: 'Domain Properties' }, { id: 'T1590.002', name: 'DNS' }, { id: 'T1590.005', name: 'IP Addresses' }],
    detectionRules: [{ id: 'rule-t1590-1', name: 'WHOIS Bulk Query', severity: 'low', enabled: false }],
    recentAlerts: [],
    mitigations: ['DNS logging and analysis'],
  },
  {
    id: 'T1593',
    name: 'Search Open Websites/Domains',
    description: 'Adversaries search freely available websites and/or domains for information about victims.',
    status: 'n/a',
    platforms: ['Network'],
    tacticId: 'TA0043',
    subTechniques: [{ id: 'T1593.001', name: 'Social Media' }, { id: 'T1593.002', name: 'Search Engines' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['OSINT monitoring services'],
  },
  {
    id: 'T1591',
    name: 'Gather Victim Org Information',
    description: 'Adversaries gather information about the victim organization that can be used during targeting.',
    status: 'gap',
    platforms: ['Network'],
    tacticId: 'TA0043',
    subTechniques: [{ id: 'T1591.001', name: 'Determine Physical Locations' }, { id: 'T1591.002', name: 'Business Relationships' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Limit publicly disclosed information'],
  },

  // ----- Resource Development (TA0042) -----
  {
    id: 'T1583',
    name: 'Acquire Infrastructure',
    description: 'Adversaries buy, lease, rent, or obtain infrastructure used for targeting.',
    status: 'gap',
    platforms: ['Network'],
    tacticId: 'TA0042',
    subTechniques: [{ id: 'T1583.001', name: 'Domains' }, { id: 'T1583.002', name: 'DNS Server' }, { id: 'T1583.003', name: 'Virtual Private Server' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Threat intel feeds for malicious infrastructure'],
  },
  {
    id: 'T1587',
    name: 'Develop Capabilities',
    description: 'Adversaries develop malware and exploits for use during targeting.',
    status: 'n/a',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0042',
    subTechniques: [{ id: 'T1587.001', name: 'Malware' }, { id: 'T1587.002', name: 'Code Signing Certificates' }, { id: 'T1587.003', name: 'Digital Certificates' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Threat intel sharing', 'Code signing enforcement'],
  },
  {
    id: 'T1588',
    name: 'Obtain Capabilities',
    description: 'Adversaries buy, steal, or download malware, exploits, and tools for use during targeting.',
    status: 'partial',
    platforms: ['Network'],
    tacticId: 'TA0042',
    subTechniques: [{ id: 'T1588.001', name: 'Malware' }, { id: 'T1588.002', name: 'Tool' }, { id: 'T1588.006', name: 'Vulnerabilities' }],
    detectionRules: [{ id: 'rule-t1588-1', name: 'Suspicious Tool Download', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a2', title: 'Sysinternals download from non-corporate host', severity: 'low', timestamp: '2024-01-14T09:10:00Z' }],
    mitigations: ['Egress URL filtering', 'Threat intel feeds'],
  },
  {
    id: 'T1608',
    name: 'Stage Capabilities',
    description: 'Adversaries stage capabilities to support execution during targeting.',
    status: 'gap',
    platforms: ['Network'],
    tacticId: 'TA0042',
    subTechniques: [{ id: 'T1608.001', name: 'Upload Malware' }, { id: 'T1608.002', name: 'Upload Tool' }, { id: 'T1608.004', name: 'Drive-by Target' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Domain reputation monitoring'],
  },
  {
    id: 'T1505',
    name: 'Server Software Component',
    description: 'Adversaries may abuse legitimate server software components for malicious purposes.',
    status: 'detected',
    platforms: ['Windows', 'Linux'],
    tacticId: 'TA0042',
    subTechniques: [{ id: 'T1505.003', name: 'Web Shell' }],
    detectionRules: [{ id: 'rule-t1505-1', name: 'Web Shell Detection', severity: 'high', enabled: true }, { id: 'rule-t1505-2', name: 'Suspicious IIS Module', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a3', title: 'China Chopper webshell uploaded to /tmp/', severity: 'high', timestamp: '2024-01-13T22:41:00Z' }],
    mitigations: ['File integrity monitoring on web roots', 'Web application firewall'],
  },

  // ----- Initial Access (TA0001) -----
  {
    id: 'T1078',
    name: 'Valid Accounts',
    description: 'Adversaries use credentials of existing accounts to gain initial access.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'Office 365', 'Azure AD'],
    tacticId: 'TA0001',
    subTechniques: [{ id: 'T1078.001', name: 'Default Accounts' }, { id: 'T1078.002', name: 'Domain Accounts' }, { id: 'T1078.004', name: 'Cloud Accounts' }],
    detectionRules: [{ id: 'rule-t1078-1', name: 'Login from Anomalous Geo', severity: 'high', enabled: true }, { id: 'rule-t1078-2', name: 'Impossible Travel', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a4', title: 'Admin login from Russia', severity: 'critical', timestamp: '2024-01-15T03:12:00Z' }, { id: 'a5', title: 'User login after deactivation', severity: 'high', timestamp: '2024-01-12T17:55:00Z' }],
    mitigations: ['MFA enforcement', 'Privileged access management', 'Account monitoring'],
  },
  {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    description: 'Adversaries attempt to exploit a weakness in an internet-facing host or system.',
    status: 'detected',
    platforms: ['Network', 'Windows', 'Linux', 'Container'],
    tacticId: 'TA0001',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1190-1', name: 'Web Exploit Attempt (Log4Shell)', severity: 'critical', enabled: true }, { id: 'rule-t1190-2', name: 'SQL Injection Pattern', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a6', title: 'Log4Shell exploitation attempt on /api/login', severity: 'critical', timestamp: '2024-01-15T11:02:00Z' }],
    mitigations: ['WAF deployment', 'Patching/updates', 'Vulnerability scanning'],
  },
  {
    id: 'T1566',
    name: 'Phishing',
    description: 'Adversaries send phishing messages to gain access to victim systems.',
    status: 'partial',
    platforms: ['Windows', 'macOS', 'Office 365', 'Azure AD'],
    tacticId: 'TA0001',
    subTechniques: [{ id: 'T1566.001', name: 'Spearphishing Attachment' }, { id: 'T1566.002', name: 'Spearphishing Link' }, { id: 'T1566.003', name: 'Spearphishing via Service' }],
    detectionRules: [{ id: 'rule-t1566-1', name: 'Phishing URL Click', severity: 'high', enabled: true }, { id: 'rule-t1566-2', name: 'Suspicious Macro Document', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a7', title: 'User reported phishing - finance@ev1l.com', severity: 'medium', timestamp: '2024-01-14T15:30:00Z' }],
    mitigations: ['Email filtering (anti-spam/anti-phish)', 'User training', 'URL detonation sandbox'],
  },
  {
    id: 'T1133',
    name: 'External Remote Services',
    description: 'Adversaries leverage external remote services to gain initial access.',
    status: 'partial',
    platforms: ['Windows', 'Network'],
    tacticId: 'TA0001',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1133-1', name: 'VPN Brute Force', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a8', title: 'VPN login brute-force from Tor exit', severity: 'high', timestamp: '2024-01-13T05:18:00Z' }],
    mitigations: ['MFA for VPN', 'Geo-blocking', 'Rate limiting'],
  },
  {
    id: 'T1195',
    name: 'Supply Chain Compromise',
    description: 'Adversaries manipulate products or delivery mechanisms prior to receipt by the final consumer.',
    status: 'gap',
    platforms: ['Windows', 'Linux', 'Container'],
    tacticId: 'TA0001',
    subTechniques: [{ id: 'T1195.001', name: 'Compromise Software Dependencies and Development Tools' }, { id: 'T1195.002', name: 'Compromise Software Supply Chain' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['SBOM verification', 'Code signing validation', 'Vendor risk assessment'],
  },
  {
    id: 'T1199',
    name: 'Trusted Relationship',
    description: 'Adversaries leverage trusted relationships to gain initial access.',
    status: 'n/a',
    platforms: ['Windows', 'Azure AD'],
    tacticId: 'TA0001',
    subTechniques: [],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Monitor third-party access', 'Just-in-time access provisioning'],
  },

  // ----- Execution (TA0002) -----
  {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    description: 'Adversaries abuse command and script interpreters to execute commands or scripts.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS', 'Container'],
    tacticId: 'TA0002',
    subTechniques: [{ id: 'T1059.001', name: 'PowerShell' }, { id: 'T1059.003', name: 'Windows Command Shell' }, { id: 'T1059.004', name: 'Unix Shell' }, { id: 'T1059.006', name: 'Python' }],
    detectionRules: [{ id: 'rule-t1059-1', name: 'Suspicious PowerShell Encoded Command', severity: 'high', enabled: true }, { id: 'rule-t1059-2', name: 'Bash Reverse Shell Pattern', severity: 'high', enabled: true }, { id: 'rule-t1059-3', name: 'Python Download Exec', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a9', title: 'powershell.exe -enc SQBFAFgAKABO', severity: 'high', timestamp: '2024-01-15T10:01:00Z' }, { id: 'a10', title: 'Bash reverse shell to 198.51.100.7', severity: 'high', timestamp: '2024-01-14T20:45:00Z' }],
    mitigations: ['PowerShell Constrained Language Mode', 'AppLocker/WDAC', 'Audit script block logging'],
  },
  {
    id: 'T1106',
    name: 'Native API',
    description: 'Adversaries interact directly with the OS via native API calls.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0002',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1106-1', name: 'Suspicious CreateRemoteThread', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['EDR/behavioral monitoring', 'API hooking detection'],
  },
  {
    id: 'T1053',
    name: 'Scheduled Task/Job',
    description: 'Adversaries abuse task scheduling to execute malicious code.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0002',
    subTechniques: [{ id: 'T1053.005', name: 'Scheduled Task' }, { id: 'T1053.003', name: 'Cron' }],
    detectionRules: [{ id: 'rule-t1053-1', name: 'Suspicious Scheduled Task Creation', severity: 'medium', enabled: true }, { id: 'rule-t1053-2', name: 'Cron Job Modified by Non-Root', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a11', title: 'schtasks /create /tn Update /tr malicious.exe', severity: 'medium', timestamp: '2024-01-13T11:20:00Z' }],
    mitigations: ['Audit task scheduler events', 'Restrict cron modification'],
  },
  {
    id: 'T1047',
    name: 'Windows Management Instrumentation',
    description: 'Adversaries abuse WMI to execute commands and configure settings.',
    status: 'detected',
    platforms: ['Windows'],
    tacticId: 'TA0002',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1047-1', name: 'WMI Process Creation', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a12', title: 'WMIExec lateral movement detected', severity: 'high', timestamp: '2024-01-12T08:15:00Z' }],
    mitigations: ['Monitor WMI event subscriptions', 'Restrict remote WMI access'],
  },
  {
    id: 'T1204',
    name: 'User Execution',
    description: 'Adversaries rely on user execution of malicious files.',
    status: 'detected',
    platforms: ['Windows', 'macOS', 'Linux'],
    tacticId: 'TA0002',
    subTechniques: [{ id: 'T1204.001', name: 'Malicious Link' }, { id: 'T1204.002', name: 'Malicious File' }],
    detectionRules: [{ id: 'rule-t1204-1', name: 'Suspicious File Executed from Downloads', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a13', title: 'User executed invoice.exe from Downloads', severity: 'high', timestamp: '2024-01-15T09:33:00Z' }],
    mitigations: ['Endpoint protection', 'User awareness training'],
  },
  {
    id: 'T1129',
    name: 'Shared Modules',
    description: 'Adversaries load malicious DLLs or shared modules to execute code.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0002',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1129-1', name: 'DLL Loaded from Suspicious Path', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['AppLocker/WDAC', 'DLL load path auditing'],
  },

  // ----- Persistence (TA0003) -----
  {
    id: 'T1098',
    name: 'Account Manipulation',
    description: 'Adversaries manipulate accounts to maintain or elevate access.',
    status: 'detected',
    platforms: ['Windows', 'Azure AD', 'Office 365'],
    tacticId: 'TA0003',
    subTechniques: [{ id: 'T1098.001', name: 'Additional Cloud Credentials' }, { id: 'T1098.005', name: 'Device Registration' }],
    detectionRules: [{ id: 'rule-t1098-1', name: 'Admin Added to Global Admin Role', severity: 'critical', enabled: true }, { id: 'rule-t1098-2', name: 'Service Principal Created', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a14', title: 'New service principal "audit-tool" with Mail.Read', severity: 'high', timestamp: '2024-01-14T16:00:00Z' }],
    mitigations: ['PIM/PAM for privileged roles', 'Audit directory changes'],
  },
  {
    id: 'T1543',
    name: 'Create or Modify System Process',
    description: 'Adversaries create or modify system-level processes to execute malicious code.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0003',
    subTechniques: [{ id: 'T1543.002', name: 'Systemd Service' }, { id: 'T1543.003', name: 'Windows Service' }],
    detectionRules: [{ id: 'rule-t1543-1', name: 'Suspicious Service Created', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Audit service creation', 'Application allow-listing'],
  },
  {
    id: 'T1547',
    name: 'Boot or Logon Autostart Execution',
    description: 'Adversaries configure system settings to execute malicious code at boot or logon.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0003',
    subTechniques: [{ id: 'T1547.001', name: 'Registry Run Keys / Startup Folder' }, { id: 'T1547.009', name: 'Shortcut Modification' }],
    detectionRules: [{ id: 'rule-t1547-1', name: 'Run Key Modification', severity: 'medium', enabled: true }, { id: 'rule-t1547-2', name: 'Startup Folder New Binary', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a15', title: 'HKCU\\...\\Run set to %APPDATA%\\update.exe', severity: 'medium', timestamp: '2024-01-13T07:22:00Z' }],
    mitigations: ['Registry monitoring', 'EDR autostart enumeration'],
  },
  {
    id: 'T1136',
    name: 'Create Account',
    description: 'Adversaries create new accounts to maintain access.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'Azure AD'],
    tacticId: 'TA0003',
    subTechniques: [{ id: 'T1136.001', name: 'Local Account' }, { id: 'T1136.002', name: 'Domain Account' }, { id: 'T1136.003', name: 'Cloud Account' }],
    detectionRules: [{ id: 'rule-t1136-1', name: 'Local Account Created Outside Business Hours', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a16', title: 'New local user svc_helper created at 02:14', severity: 'medium', timestamp: '2024-01-12T02:14:00Z' }],
    mitigations: ['Audit account creation', 'Off-hours change alerts'],
  },
  {
    id: 'T1574',
    name: 'Hijack Execution Flow',
    description: 'Adversaries execute malicious code by hijacking how a legitimate process loads.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0003',
    subTechniques: [{ id: 'T1574.001', name: 'DLL Search Order Hijacking' }, { id: 'T1574.011', name: 'Registry Run Keys / Startup Folder' }],
    detectionRules: [{ id: 'rule-t1574-1', name: 'DLL Side-Loading Detected', severity: 'high', enabled: true }],
    recentAlerts: [],
    mitigations: ['AppLocker', 'Path auditing'],
  },

  // ----- Privilege Escalation (TA0004) -----
  {
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    description: 'Adversaries exploit software vulnerabilities to elevate privileges.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'Container'],
    tacticId: 'TA0004',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1068-1', name: 'Kernel Exploit Pattern (CVE-2021-3493)', severity: 'critical', enabled: true }, { id: 'rule-t1068-2', name: 'Container Escape Suspected', severity: 'critical', enabled: true }],
    recentAlerts: [{ id: 'a17', title: 'overlayfs privilege escalation attempt on host-03', severity: 'critical', timestamp: '2024-01-15T12:45:00Z' }],
    mitigations: ['Patch management', 'Kernel hardening', 'Container isolation'],
  },
  {
    id: 'T1548',
    name: 'Abuse Elevation Control Mechanism',
    description: 'Adversaries abuse elevation mechanisms to gain higher privileges.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0004',
    subTechniques: [{ id: 'T1548.002', name: 'Bypass User Account Control' }, { id: 'T1548.003', name: 'Sudo and Sudo Caching' }],
    detectionRules: [{ id: 'rule-t1548-1', name: 'UAC Bypass via Fodhelper', severity: 'high', enabled: true }],
    recentAlerts: [],
    mitigations: ['UAC level set to Always Notify', 'sudoers audit'],
  },
  {
    id: 'T1134',
    name: 'Access Token Manipulation',
    description: 'Adversaries manipulate access tokens to operate as another user.',
    status: 'detected',
    platforms: ['Windows'],
    tacticId: 'TA0004',
    subTechniques: [{ id: 'T1134.001', name: 'Token Impersonation/Theft' }, { id: 'T1134.002', name: 'Create Process with Token' }],
    detectionRules: [{ id: 'rule-t1134-1', name: 'Token Impersonation Detected', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a18', title: 'Incognito token theft observed', severity: 'high', timestamp: '2024-01-12T19:01:00Z' }],
    mitigations: ['EDR token manipulation detection', 'LSASS protection'],
  },
  {
    id: 'T1484',
    name: 'Domain Policy Modification',
    description: 'Adversaries modify domain policies to gain or escalate privileges.',
    status: 'gap',
    platforms: ['Windows'],
    tacticId: 'TA0004',
    subTechniques: [{ id: 'T1484.001', name: 'Group Policy Modification' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['GPO change auditing', 'Tier-0 admin monitoring'],
  },

  // ----- Defense Evasion (TA0005) -----
  {
    id: 'T1027',
    name: 'Obfuscated Files or Information',
    description: 'Adversaries encode or obfuscate files or information to evade detection.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0005',
    subTechniques: [{ id: 'T1027.001', name: 'Binary Padding' }, { id: 'T1027.002', name: 'Software Packing' }, { id: 'T1027.013', name: 'Encrypted/Encoded File' }],
    detectionRules: [{ id: 'rule-t1027-1', name: 'Packed Binary Detected (UPX)', severity: 'medium', enabled: true }, { id: 'rule-t1027-2', name: 'Encrypted Payload Extracted', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a19', title: 'UPX-packed ELF binary dropped in /tmp', severity: 'medium', timestamp: '2024-01-14T22:09:00Z' }],
    mitigations: ['Anti-malware with unpacking', 'File entropy analysis'],
  },
  {
    id: 'T1036',
    name: 'Masquerading',
    description: 'Adversaries manipulate features of artifacts to make them appear legitimate.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0005',
    subTechniques: [{ id: 'T1036.005', name: 'Match Legitimate Name or Location' }, { id: 'T1036.008', name: 'Masquerade File Type' }],
    detectionRules: [{ id: 'rule-t1036-1', name: 'Binary Masquerading as svchost.exe', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a20', title: 'svchost.exe launched from C:\\Temp\\', severity: 'high', timestamp: '2024-01-13T14:55:00Z' }],
    mitigations: ['Path allow-listing', 'Digital signature validation'],
  },
  {
    id: 'T1562',
    name: 'Impair Defenses',
    description: 'Adversaries modify tools and features to impair detection capabilities.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0005',
    subTechniques: [{ id: 'T1562.001', name: 'Disable or Modify Tools' }, { id: 'T1562.002', name: 'Disable Windows Event Logging' }, { id: 'T1562.006', name: 'Indicator Blocking' }],
    detectionRules: [{ id: 'rule-t1562-1', name: 'Defender Tamper Attempt', severity: 'critical', enabled: true }, { id: 'rule-t1562-2', name: 'Audit Policy Cleared', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a21', title: 'Set-MpPreference -DisableRealtimeMonitoring', severity: 'critical', timestamp: '2024-01-15T06:30:00Z' }],
    mitigations: ['Tamper protection', 'Centralized log forwarding', 'Agent health monitoring'],
  },
  {
    id: 'T1140',
    name: 'Deobfuscate/Decode Files or Information',
    description: 'Adversaries decode or deobfuscate files or information to use them at execution time.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0005',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1140-1', name: 'Base64 Decode to Disk', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Script block logging', 'Behavioral analysis'],
  },
  {
    id: 'T1572',
    name: 'Protocol Tunneling',
    description: 'Adversaries tunnel network communications through legitimate protocols.',
    status: 'partial',
    platforms: ['Network', 'Windows', 'Linux'],
    tacticId: 'TA0005',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1572-1', name: 'DNS Tunneling Pattern', severity: 'high', enabled: true }, { id: 'rule-t1572-2', name: 'SSH Tunnel Detected', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a22', title: 'Long DNS labels from host-12 (dnscat2)', severity: 'high', timestamp: '2024-01-14T11:48:00Z' }],
    mitigations: ['DNS inspection', 'Egress filtering', 'TLS inspection'],
  },
  {
    id: 'T1202',
    name: 'Indirect Command Execution',
    description: 'Adversaries use indirect methods to execute commands to evade defenses.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0005',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1202-1', name: 'LOLBin Usage (certutil)', severity: 'medium', enabled: true }, { id: 'rule-t1202-2', name: 'Wmic Process Call Create', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a23', title: 'certutil -decode invoked by user', severity: 'medium', timestamp: '2024-01-13T08:11:00Z' }],
    mitigations: ['Application allow-listing', 'LOLBins monitoring'],
  },
  {
    id: 'T1620',
    name: 'Reflective Code Loading',
    description: 'Adversaries reflectively load code into a process to bypass process-based defenses.',
    status: 'gap',
    platforms: ['Windows', 'Linux'],
    tacticId: 'TA0005',
    subTechniques: [],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['EDR with reflective load detection', 'AMSI'],
  },

  // ----- Credential Access (TA0006) -----
  {
    id: 'T1110',
    name: 'Brute Force',
    description: 'Adversaries use brute-force techniques to attempt access to accounts.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'Azure AD', 'Office 365'],
    tacticId: 'TA0006',
    subTechniques: [{ id: 'T1110.001', name: 'Password Guessing' }, { id: 'T1110.003', name: 'Password Spraying' }, { id: 'T1110.004', name: 'Credential Stuffing' }],
    detectionRules: [{ id: 'rule-t1110-1', name: 'Password Spray (Multiple Users, One IP)', severity: 'high', enabled: true }, { id: 'rule-t1110-2', name: 'RDP Brute Force', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a24', title: '50+ failed RDP logins from 198.51.100.22 in 5 min', severity: 'high', timestamp: '2024-01-15T04:25:00Z' }],
    mitigations: ['Account lockout policies', 'MFA', 'Anomaly detection'],
  },
  {
    id: 'T1003',
    name: 'OS Credential Dumping',
    description: 'Adversaries dump credentials from the OS and applications.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0006',
    subTechniques: [{ id: 'T1003.001', name: 'LSASS Memory' }, { id: 'T1003.002', name: 'Security Account Manager (SAM)' }, { id: 'T1003.006', name: 'DCSync' }],
    detectionRules: [{ id: 'rule-t1003-1', name: 'LSASS Access by Suspicious Process', severity: 'critical', enabled: true }, { id: 'rule-t1003-2', name: 'DCSync Replication Request', severity: 'critical', enabled: true }],
    recentAlerts: [{ id: 'a25', title: 'mimikatz detected on DC01', severity: 'critical', timestamp: '2024-01-15T07:40:00Z' }],
    mitigations: ['Credential Guard', 'LSASS protection (RunAsPPL)', 'Alert on DCSync'],
  },
  {
    id: 'T1555',
    name: 'Credentials from Password Stores',
    description: 'Adversaries extract credentials from password stores and browsers.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0006',
    subTechniques: [{ id: 'T1555.003', name: 'Credentials from Web Browsers' }, { id: 'T1555.005', name: 'Password Managers' }],
    detectionRules: [{ id: 'rule-t1555-1', name: 'Browser Credential File Access', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['EDR monitoring of credential stores', 'Encrypted password stores'],
  },
  {
    id: 'T1528',
    name: 'Steal Application Access Token',
    description: 'Adversaries steal OAuth tokens used by applications for authentication.',
    status: 'gap',
    platforms: ['Azure AD', 'Office 365'],
    tacticId: 'TA0006',
    subTechniques: [],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Token lifetime policies', 'Conditional Access', 'App audit logs'],
  },
  {
    id: 'T1552',
    name: 'Unsecured Credentials',
    description: 'Adversaries search for unsecured credentials in files and configurations.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS', 'Container'],
    tacticId: 'TA0006',
    subTechniques: [{ id: 'T1552.001', name: 'Credentials In Files' }, { id: 'T1552.004', name: 'Private Keys' }],
    detectionRules: [{ id: 'rule-t1552-1', name: 'SSH Private Key Read by Non-Owner', severity: 'high', enabled: true }, { id: 'rule-t1552-2', name: 'Secrets in Container Env Vars', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a26', title: '~/.ssh/id_rsa read by unfamiliar process', severity: 'high', timestamp: '2024-01-12T16:25:00Z' }],
    mitigations: ['Secrets management (Vault)', 'File permission auditing'],
  },
  {
    id: 'T1056',
    name: 'Input Capture',
    description: 'Adversaries capture user input via keylogging or other methods.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0006',
    subTechniques: [{ id: 'T1056.001', name: 'Keylogging' }, { id: 'T1056.004', name: 'Credential API Hooking' }],
    detectionRules: [{ id: 'rule-t1056-1', name: 'Keyboard Hook DLL Loaded', severity: 'high', enabled: true }],
    recentAlerts: [],
    mitigations: ['EDR with keylogger detection', 'Endpoint isolation'],
  },

  // ----- Discovery (TA0007) -----
  {
    id: 'T1046',
    name: 'Network Service Discovery',
    description: 'Adversaries discover services on the network to identify targets.',
    status: 'detected',
    platforms: ['Network', 'Windows', 'Linux'],
    tacticId: 'TA0007',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1046-1', name: 'Internal Port Sweep', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a27', title: 'Host scanned entire 10.0.0.0/8 range', severity: 'medium', timestamp: '2024-01-14T13:10:00Z' }],
    mitigations: ['Network IDS', 'Behavioral baselining'],
  },
  {
    id: 'T1049',
    name: 'System Network Connections',
    description: 'Adversaries enumerate active network connections to identify relationships.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0007',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1049-1', name: 'netstat / ss by Unusual User', severity: 'low', enabled: true }],
    recentAlerts: [],
    mitigations: ['Command-line auditing'],
  },
  {
    id: 'T1087',
    name: 'Account Discovery',
    description: 'Adversaries enumerate accounts to determine valid targets.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'Azure AD'],
    tacticId: 'TA0007',
    subTechniques: [{ id: 'T1087.001', name: 'Local Account' }, { id: 'T1087.002', name: 'Domain Account' }],
    detectionRules: [{ id: 'rule-t1087-1', name: 'Bulk AD Enumeration with BloodHound Pattern', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Honeypot accounts', 'AD query rate limiting'],
  },
  {
    id: 'T1082',
    name: 'System Information Discovery',
    description: 'Adversaries gather information about the OS and hardware.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0007',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1082-1', name: 'systeminfo / uname Anomaly', severity: 'low', enabled: true }],
    recentAlerts: [],
    mitigations: ['Command-line logging'],
  },
  {
    id: 'T1018',
    name: 'Remote System Discovery',
    description: 'Adversaries enumerate remote systems to identify targets.',
    status: 'partial',
    platforms: ['Windows', 'Network'],
    tacticId: 'TA0007',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1018-1', name: 'Ping Sweep Detected', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Network monitoring'],
  },
  {
    id: 'T1135',
    name: 'Network Share Discovery',
    description: 'Adversaries enumerate network shares for sensitive data.',
    status: 'partial',
    platforms: ['Windows', 'Linux'],
    tacticId: 'TA0007',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1135-1', name: 'net view / smbclient Enumeration', severity: 'low', enabled: true }],
    recentAlerts: [],
    mitigations: ['Share access auditing'],
  },

  // ----- Lateral Movement (TA0008) -----
  {
    id: 'T1021',
    name: 'Remote Services',
    description: 'Adversaries use remote services to move laterally across systems.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'Network'],
    tacticId: 'TA0008',
    subTechniques: [{ id: 'T1021.001', name: 'RDP' }, { id: 'T1021.004', name: 'SSH' }, { id: 'T1021.006', name: 'WinRM' }],
    detectionRules: [{ id: 'rule-t1021-1', name: 'RDP from Unusual Source', severity: 'high', enabled: true }, { id: 'rule-t1021-2', name: 'WinRM Lateral Movement', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a28', title: 'Admin RDP from workstation to DC', severity: 'high', timestamp: '2024-01-14T18:30:00Z' }],
    mitigations: ['Jump servers', 'Network segmentation', 'Remote access logging'],
  },
  {
    id: 'T1077',
    name: 'Windows Admin Shares',
    description: 'Adversaries use Windows admin shares for lateral movement.',
    status: 'detected',
    platforms: ['Windows'],
    tacticId: 'TA0008',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1077-1', name: 'ADMIN$ Access from Workstation', severity: 'high', enabled: true }],
    recentAlerts: [],
    mitigations: ['Restrict admin shares', 'LAPS', 'Local admin password randomization'],
  },
  {
    id: 'T1570',
    name: 'Lateral Tool Transfer',
    description: 'Adversaries transfer tools between systems on the network.',
    status: 'partial',
    platforms: ['Windows', 'Linux'],
    tacticId: 'TA0008',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1570-1', name: 'Tool Dropped via SMB', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['File transfer monitoring', 'EDR file origin tracking'],
  },
  {
    id: 'T1550',
    name: 'Use Alternate Authentication Material',
    description: 'Adversaries use stolen authentication material (tickets, hashes) to move laterally.',
    status: 'detected',
    platforms: ['Windows'],
    tacticId: 'TA0008',
    subTechniques: [{ id: 'T1550.002', name: 'Pass the Hash' }, { id: 'T1550.003', name: 'Pass the Ticket' }],
    detectionRules: [{ id: 'rule-t1550-1', name: 'Pass-the-Hash via NTLM', severity: 'critical', enabled: true }, { id: 'rule-t1550-2', name: 'Kerberos Ticket Anomaly', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a29', title: 'PtH on SRV-FILE01 (NTLM from non-domain system)', severity: 'critical', timestamp: '2024-01-13T21:15:00Z' }],
    mitigations: ['Disable NTLM where possible', 'Local admin account management'],
  },
  {
    id: 'T1534',
    name: 'Internal Spearphishing',
    description: 'Adversaries send phishing messages from compromised internal accounts.',
    status: 'gap',
    platforms: ['Office 365', 'Windows'],
    tacticId: 'TA0008',
    subTechniques: [],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Mail flow rules', 'Anomalous send pattern detection'],
  },

  // ----- Collection (TA0009) -----
  {
    id: 'T1560',
    name: 'Archive Collected Data',
    description: 'Adversaries compress and encrypt collected data before exfiltration.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0009',
    subTechniques: [{ id: 'T1560.001', name: 'Archive via Utility' }, { id: 'T1560.002', name: 'Archive via Library' }],
    detectionRules: [{ id: 'rule-t1560-1', name: 'Large Archive Creation in User Dir', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Archive tool monitoring', 'Data loss prevention'],
  },
  {
    id: 'T1005',
    name: 'Data from Local System',
    description: 'Adversaries search local systems for sensitive files.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0009',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1005-1', name: 'Bulk File Read in User Profile', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['File access auditing', 'EDR file access monitoring'],
  },
  {
    id: 'T1119',
    name: 'Automated Collection',
    description: 'Adversaries use scripted methods to collect data at scale.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0009',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1119-1', name: 'Script Iterating Sensitive Directories', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Behavioral monitoring', 'Application allow-listing'],
  },
  {
    id: 'T1113',
    name: 'Screen Capture',
    description: 'Adversaries capture screenshots of the user desktop.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0009',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1113-1', name: 'Screen Capture Tool Execution', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Endpoint monitoring', 'Restrict screen capture utilities'],
  },
  {
    id: 'T1074',
    name: 'Data Staged',
    description: 'Adversaries stage collected data in a central location before exfiltration.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0009',
    subTechniques: [{ id: 'T1074.001', name: 'Local Data Staging' }],
    detectionRules: [{ id: 'rule-t1074-1', name: 'Staging Directory Created (Recycle Bin)', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a30', title: 'Staging folder with 4GB created in C:\\Recycle.Bin', severity: 'high', timestamp: '2024-01-12T14:50:00Z' }],
    mitigations: ['File integrity monitoring', 'Unusual directory size alerts'],
  },

  // ----- Command and Control (TA0011) -----
  {
    id: 'T1071',
    name: 'Application Layer Protocol',
    description: 'Adversaries communicate using application layer protocols to blend with normal traffic.',
    status: 'detected',
    platforms: ['Network', 'Windows', 'Linux'],
    tacticId: 'TA0011',
    subTechniques: [{ id: 'T1071.001', name: 'Web Protocols' }, { id: 'T1071.004', name: 'DNS' }],
    detectionRules: [{ id: 'rule-t1071-1', name: 'C2 Beaconing (HTTP)', severity: 'high', enabled: true }, { id: 'rule-t1071-2', name: 'Suspicious DNS TXT Queries', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a31', title: 'Cobalt Strike beacon over HTTPS detected', severity: 'critical', timestamp: '2024-01-15T08:20:00Z' }],
    mitigations: ['TLS inspection', 'Domain reputation', 'Traffic analysis'],
  },
  {
    id: 'T1573',
    name: 'Encrypted Channel',
    description: 'Adversaries use encrypted protocols to hide C2 traffic.',
    status: 'partial',
    platforms: ['Network', 'Windows', 'Linux'],
    tacticId: 'TA0011',
    subTechniques: [{ id: 'T1573.002', name: 'Asymmetric Cryptography' }],
    detectionRules: [{ id: 'rule-t1573-1', name: 'TLS Self-Signed Cert to Rare Domain', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['TLS fingerprinting (JA3/JA4)', 'Egress filtering'],
  },
  {
    id: 'T1090',
    name: 'Proxy',
    description: 'Adversaries use proxies to chain C2 connections and hide origin.',
    status: 'partial',
    platforms: ['Network'],
    tacticId: 'TA0011',
    subTechniques: [{ id: 'T1090.001', name: 'Internal Proxy' }, { id: 'T1090.003', name: 'Multi-hop Proxy' }, { id: 'T1090.004', name: 'Tor' }],
    detectionRules: [{ id: 'rule-t1090-1', name: 'Tor Exit Node Connection', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a32', title: 'Connection to Tor exit node', severity: 'medium', timestamp: '2024-01-14T19:35:00Z' }],
    mitigations: ['Block Tor exit nodes', 'Egress filtering'],
  },
  {
    id: 'T1105',
    name: 'Ingress Tool Transfer',
    description: 'Adversaries transfer tools to the victim system from external sources.',
    status: 'detected',
    platforms: ['Network', 'Windows', 'Linux', 'macOS'],
    tacticId: 'TA0011',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1105-1', name: 'Binary Dropped from Internet', severity: 'high', enabled: true }, { id: 'rule-t1105-2', name: 'curl/wget to File Hosting Domain', severity: 'medium', enabled: true }],
    recentAlerts: [{ id: 'a33', title: 'powershell.exe downloaded evil.exe from pastebin', severity: 'high', timestamp: '2024-01-15T10:45:00Z' }],
    mitigations: ['Egress URL filtering', 'Application allow-listing'],
  },
  {
    id: 'T1095',
    name: 'Non-Application Layer Protocol',
    description: 'Adversaries use non-application layer protocols (e.g. ICMP, TCP) for C2.',
    status: 'partial',
    platforms: ['Network', 'Windows', 'Linux'],
    tacticId: 'TA0011',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1095-1', name: 'ICMP Tunneling Pattern', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Network behavior analysis', 'Protocol anomaly detection'],
  },
  {
    id: 'T1132',
    name: 'Data Encoding',
    description: 'Adversaries encode C2 traffic to evade detection.',
    status: 'gap',
    platforms: ['Network'],
    tacticId: 'TA0011',
    subTechniques: [{ id: 'T1132.001', name: 'Standard Encoding' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['Traffic analysis', 'Protocol inspection'],
  },

  // ----- Exfiltration (TA0010) -----
  {
    id: 'T1041',
    name: 'Exfiltration Over C2 Channel',
    description: 'Adversaries exfiltrate data over an existing C2 channel.',
    status: 'detected',
    platforms: ['Network', 'Windows', 'Linux'],
    tacticId: 'TA0010',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1041-1', name: 'Large Egress to Known C2 IP', severity: 'critical', enabled: true }],
    recentAlerts: [],
    mitigations: ['Egress bandwidth monitoring', 'DLP'],
  },
  {
    id: 'T1567',
    name: 'Exfiltration Over Web Service',
    description: 'Adversaries exfiltrate data via legitimate web services.',
    status: 'partial',
    platforms: ['Network', 'Windows', 'Linux', 'macOS'],
    tacticId: 'TA0010',
    subTechniques: [{ id: 'T1567.001', name: 'Exfiltration to Code Repository' }, { id: 'T1567.002', name: 'Exfiltration to Cloud Storage' }],
    detectionRules: [{ id: 'rule-t1567-1', name: 'Large Upload to Mega/Dropbox', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a34', title: '2GB upload to file.io from finance workstation', severity: 'high', timestamp: '2024-01-14T17:00:00Z' }],
    mitigations: ['Web proxy with DLP', 'Cloud storage egress controls'],
  },
  {
    id: 'T1048',
    name: 'Exfiltration Over Alternative Protocol',
    description: 'Adversaries exfiltrate data via protocols like DNS, ICMP, or SSH.',
    status: 'detected',
    platforms: ['Network', 'Linux'],
    tacticId: 'TA0010',
    subTechniques: [{ id: 'T1048.002', name: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol' }],
    detectionRules: [{ id: 'rule-t1048-1', name: 'DNS Exfiltration Pattern', severity: 'critical', enabled: true }],
    recentAlerts: [{ id: 'a35', title: 'DNS exfil: 5MB over 40,000 TXT queries', severity: 'critical', timestamp: '2024-01-13T03:22:00Z' }],
    mitigations: ['DNS inspection', 'Egress filtering'],
  },
  {
    id: 'T1052',
    name: 'Exfiltration Over Physical Medium',
    description: 'Adversaries exfiltrate data via physical media (USB, etc.).',
    status: 'n/a',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0010',
    subTechniques: [{ id: 'T1052.001', name: 'Exfiltration over USB' }],
    detectionRules: [],
    recentAlerts: [],
    mitigations: ['USB device control', 'DLP for removable media'],
  },
  {
    id: 'T1537',
    name: 'Transfer Data to Cloud Account',
    description: 'Adversaries transfer data from a victim environment to a cloud account they control.',
    status: 'partial',
    platforms: ['Azure AD', 'Office 365', 'Container'],
    tacticId: 'TA0010',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1537-1', name: 'Bulk S3 Blob Download Anomaly', severity: 'high', enabled: true }],
    recentAlerts: [],
    mitigations: ['Cloud activity monitoring', 'Anomaly detection'],
  },

  // ----- Impact (TA0040) -----
  {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    description: 'Adversaries encrypt data to disrupt availability (ransomware).',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS', 'Container'],
    tacticId: 'TA0040',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1486-1', name: 'Mass File Encryption (Ransomware)', severity: 'critical', enabled: true }, { id: 'rule-t1486-2', name: 'Extension Renaming Burst', severity: 'critical', enabled: true }],
    recentAlerts: [{ id: 'a36', title: 'LockBit ransomware activity on FS01', severity: 'critical', timestamp: '2024-01-15T05:55:00Z' }],
    mitigations: ['Backups (3-2-1 rule)', 'EDR with behavioral ransomware detection', 'Volume Shadow Copy protection'],
  },
  {
    id: 'T1485',
    name: 'Data Destruction',
    description: 'Adversaries destroy data to disrupt operations.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0040',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1485-1', name: 'Bulk File Deletion', severity: 'critical', enabled: true }],
    recentAlerts: [],
    mitigations: ['Backups', 'File integrity monitoring'],
  },
  {
    id: 'T1490',
    name: 'Inhibit System Recovery',
    description: 'Adversaries delete backups and recovery mechanisms.',
    status: 'detected',
    platforms: ['Windows'],
    tacticId: 'TA0040',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1490-1', name: 'vssadmin delete shadows', severity: 'critical', enabled: true }, { id: 'rule-t1490-2', name: 'wbadmin delete catalog', severity: 'critical', enabled: true }],
    recentAlerts: [{ id: 'a37', title: 'VSS shadows deleted on DC01', severity: 'critical', timestamp: '2024-01-15T05:54:00Z' }],
    mitigations: ['Immutable backups', 'Alert on vssadmin/wbadmin abuse'],
  },
  {
    id: 'T1561',
    name: 'Disk Wipe',
    description: 'Adversaries wipe or reformat disks to destroy data.',
    status: 'partial',
    platforms: ['Windows', 'Linux'],
    tacticId: 'TA0040',
    subTechniques: [{ id: 'T1561.001', name: 'Disk Content Wipe' }, { id: 'T1561.002', name: 'Disk Structure Wipe' }],
    detectionRules: [{ id: 'rule-t1561-1', name: 'Disk Wipe Utility Detected', severity: 'critical', enabled: true }],
    recentAlerts: [],
    mitigations: ['Restrict disk wipe utilities', 'EDR monitoring'],
  },
  {
    id: 'T1496',
    name: 'Resource Hijacking',
    description: 'Adversaries use systems for cryptomining or other resource-intensive operations.',
    status: 'detected',
    platforms: ['Windows', 'Linux', 'Container'],
    tacticId: 'TA0040',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1496-1', name: 'XMRig Process Detected', severity: 'high', enabled: true }, { id: 'rule-t1496-2', name: 'Container Mining Pattern', severity: 'high', enabled: true }],
    recentAlerts: [{ id: 'a38', title: 'Cryptominer detected on kube-worker-4', severity: 'high', timestamp: '2024-01-13T19:40:00Z' }],
    mitigations: ['Resource monitoring', 'Container image scanning'],
  },
  {
    id: 'T1499',
    name: 'Endpoint Denial of Service',
    description: 'Adversaries perform DoS against endpoints to disrupt availability.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'Network'],
    tacticId: 'TA0040',
    subTechniques: [{ id: 'T1499.001', name: 'OS Exhaustion Flood' }, { id: 'T1499.004', name: 'Application or System Exploitation' }],
    detectionRules: [{ id: 'rule-t1499-1', name: 'Application DoS Pattern', severity: 'high', enabled: true }],
    recentAlerts: [],
    mitigations: ['Rate limiting', 'DDoS protection', 'WAF'],
  },
  {
    id: 'T1489',
    name: 'Service Stop',
    description: 'Adversaries stop or disable services to disrupt availability.',
    status: 'detected',
    platforms: ['Windows', 'Linux'],
    tacticId: 'TA0040',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1489-1', name: 'Critical Service Stopped', severity: 'high', enabled: true }],
    recentAlerts: [],
    mitigations: ['Service monitoring', 'Auto-restart policies'],
  },
  {
    id: 'T1529',
    name: 'System Shutdown/Reboot',
    description: 'Adversaries shutdown or reboot systems to disrupt operations.',
    status: 'partial',
    platforms: ['Windows', 'Linux', 'macOS'],
    tacticId: 'TA0040',
    subTechniques: [],
    detectionRules: [{ id: 'rule-t1529-1', name: 'Forced Shutdown by Non-Admin', severity: 'medium', enabled: true }],
    recentAlerts: [],
    mitigations: ['Privilege management', 'Audit shutdown events'],
  },
]

// ===== Severity Helpers =====

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// ===== Component =====

export function MitreView() {
  const mitre = useSIEMStore((s) => s.mitre)
  const setMitre = useSIEMStore((s) => s.setMitre)
  const setActiveView = useSIEMStore((s) => s.setActiveView)

  const [searchQuery, setSearchQuery] = useState('')
  const [liveById, setLiveById] = useState<Record<string, {
    status: 'detected' | 'partial' | 'gap'
    detectionRules: { id: string; name: string; severity: 'critical' | 'high' | 'medium' | 'low'; enabled: boolean }[]
    recentAlerts: { id: string; title: string; severity: string; timestamp: string }[]
  }>>({})

  // Load LIVE MITRE coverage from real DetectionRule + Alert data.
  useEffect(() => {
    let cancelled = false
    fetch('/api/mitre')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.tactics) return
        const map: Record<string, (typeof liveById)[string]> = {}
        for (const tac of d.tactics) {
          for (const tech of tac.techniques) {
            map[tech.id] = {
              status: tech.status,
              detectionRules: tech.detectionRules,
              recentAlerts: tech.recentAlerts,
            }
          }
        }
        setLiveById(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Merge static taxonomy (names/descriptions/mitigations) with live data.
  const techniques = useMemo(() => {
    return MITRE_TECHNIQUES.map((t) => {
      const live = liveById[t.id]
      return live
        ? ({ ...t, status: live.status, detectionRules: live.detectionRules, recentAlerts: live.recentAlerts } as MitreTechnique)
        : t
    })
  }, [liveById])

  // Apply filters
  const filteredTechniques = useMemo(() => {
    return techniques.filter((t) => {
      if (mitre.filterSeverity !== 'all' && t.status !== mitre.filterSeverity) return false
      if (mitre.filterPlatform !== 'all' && !t.platforms.includes(mitre.filterPlatform)) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const haystack = `${t.id} ${t.name} ${t.description}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [mitre.filterSeverity, mitre.filterPlatform, searchQuery, techniques])

  // Group techniques by tactic
  const techniquesByTactic = useMemo(() => {
    const map: Record<string, MitreTechnique[]> = {}
    for (const tactic of MITRE_TACTICS) {
      map[tactic.id] = filteredTechniques.filter((t) => t.tacticId === tactic.id)
    }
    return map
  }, [filteredTechniques])

  // Statistics
  const stats = useMemo(() => {
    const total = techniques.length
    const detected = techniques.filter((t) => t.status === 'detected').length
    const partial = techniques.filter((t) => t.status === 'partial').length
    const gap = techniques.filter((t) => t.status === 'gap').length
    const na = techniques.filter((t) => t.status === 'n/a').length
    return {
      total,
      detected,
      partial,
      gap,
      na,
      detectionPct: total > 0 ? Math.round((detected / total) * 100) : 0,
      partialPct: total > 0 ? Math.round((partial / total) * 100) : 0,
    }
  }, [techniques])

  // Selected technique
  const selectedTechnique = useMemo(() => {
    if (!mitre.selectedTechnique) return null
    return techniques.find((t) => t.id === mitre.selectedTechnique) ?? null
  }, [mitre.selectedTechnique, techniques])

  const handleTechniqueClick = useCallback((t: MitreTechnique) => {
    setMitre({ selectedTechnique: t.id, selectedTactic: t.tacticId })
  }, [setMitre])

  const handleDetailClose = useCallback(() => {
    setMitre({ selectedTechnique: null })
  }, [setMitre])

  const handleStatusChange = useCallback((techId: string, newStatus: MitreDetectionStatus) => {
    // In a real app, this would persist to the backend. For now, we just show a toast.
    toast.success(`Marked ${techId} as ${STATUS_CONFIG[newStatus].label}`, {
      description: 'Coverage status updated (mock — not persisted in this demo).',
    })
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setMitre({ filterSeverity: 'all', filterPlatform: 'all' })
    setSearchQuery('')
  }, [setMitre])

  const hasActiveFilters = mitre.filterSeverity !== 'all' || mitre.filterPlatform !== 'all' || searchQuery.trim().length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Target className="size-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
              MITRE ATT&amp;CK Navigator
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                Enterprise v15
              </Badge>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Detection coverage mapped to ATT&amp;CK tactics and techniques
            </p>
          </div>
        </div>
      </motion.div>

      {/* Coverage Statistics Panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          icon={Layers}
          label="Techniques Tracked"
          value={stats.total}
          sublabel={`${MITRE_TACTICS.length} tactics`}
          accent="text-sky-400"
          bg="bg-sky-500/10"
          border="border-sky-500/30"
        />
        <StatCard
          icon={ShieldCheck}
          label="Detection Coverage"
          value={`${stats.detectionPct}%`}
          sublabel={`${stats.detected} of ${stats.total} techniques`}
          accent="text-emerald-400"
          bg="bg-emerald-500/10"
          border="border-emerald-500/30"
          progress={stats.detectionPct}
          progressColor="bg-emerald-500"
        />
        <StatCard
          icon={ShieldAlert}
          label="Partial Coverage"
          value={`${stats.partialPct}%`}
          sublabel={`${stats.partial} of ${stats.total} techniques`}
          accent="text-amber-400"
          bg="bg-amber-500/10"
          border="border-amber-500/30"
          progress={stats.partialPct}
          progressColor="bg-amber-500"
        />
        <StatCard
          icon={ShieldX}
          label="Detection Gaps"
          value={stats.gap}
          sublabel={`${stats.na} not applicable`}
          accent="text-red-400"
          bg="bg-red-500/10"
          border="border-red-500/30"
          progress={stats.total > 0 ? Math.round((stats.gap / stats.total) * 100) : 0}
          progressColor="bg-red-500"
        />
      </motion.div>

      {/* Filter Bar + Legend */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              {/* Filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Filter className="size-3" />
                    Platform
                  </label>
                  <Select
                    value={mitre.filterPlatform}
                    onValueChange={(v) => setMitre({ filterPlatform: v })}
                  >
                    <SelectTrigger className="w-[160px] h-9 bg-zinc-800/60 border-zinc-700 text-sm">
                      <SelectValue placeholder="All platforms" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="all">All platforms</SelectItem>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Crosshair className="size-3" />
                    Detection Status
                  </label>
                  <Select
                    value={mitre.filterSeverity}
                    onValueChange={(v) => setMitre({ filterSeverity: v as MitreDetectionStatus | 'all' })}
                  >
                    <SelectTrigger className="w-[180px] h-9 bg-zinc-800/60 border-zinc-700 text-sm">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="detected">Detected (Green)</SelectItem>
                      <SelectItem value="partial">Partial (Amber)</SelectItem>
                      <SelectItem value="gap">Gap (Red)</SelectItem>
                      <SelectItem value="n/a">Not Applicable (Gray)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="T1059 or technique name..."
                    className="w-full sm:w-[220px] h-9 px-3 rounded-md bg-zinc-800/60 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                  />
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  >
                    <X className="size-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Legend</span>
                <div className="flex flex-wrap items-center gap-2">
                  {(['detected', 'partial', 'gap', 'n/a'] as MitreDetectionStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s]
                    const Icon = cfg.icon
                    return (
                      <Tooltip key={s}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/40 border border-zinc-700/60">
                            <span className={cn('size-3 rounded-sm border', cfg.bg, cfg.border)} />
                            <span className="text-[11px] text-zinc-300 flex items-center gap-1">
                              <Icon className={cn('size-3', cfg.text)} />
                              {cfg.short}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-zinc-200">
                          <span className="font-medium">{cfg.label}</span>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Result count */}
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                Showing <span className="text-emerald-400 font-medium">{filteredTechniques.length}</span> of{' '}
                <span className="text-zinc-300 font-medium">{MITRE_TECHNIQUES.length}</span> techniques
                {hasActiveFilters && <span className="text-zinc-500"> (filtered)</span>}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* MITRE Matrix Grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
      >
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Target className="size-4 text-emerald-400" />
              ATT&amp;CK Matrix — Enterprise
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="w-full whitespace-nowrap pb-3">
              <div className="inline-flex gap-1.5 min-w-full">
                {MITRE_TACTICS.map((tactic) => {
                  const techniques = techniquesByTactic[tactic.id] ?? []
                  const detectedCount = techniques.filter((t) => t.status === 'detected').length
                  return (
                    <div
                      key={tactic.id}
                      className="flex flex-col w-[140px] shrink-0"
                    >
                      {/* Tactic header */}
                      <div className="rounded-t-md bg-gradient-to-b from-zinc-800/80 to-zinc-800/40 border border-zinc-700/60 border-b-0 px-2 py-2 sticky top-0 z-10">
                        <div className="text-[10px] font-mono text-zinc-500 truncate">{tactic.id}</div>
                        <div className="text-xs font-semibold text-zinc-100 leading-tight truncate" title={tactic.name}>
                          {tactic.name}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{techniques.length} techs</span>
                          {techniques.length > 0 && (
                            <span className="text-emerald-400">{detectedCount}/{techniques.length}</span>
                          )}
                        </div>
                      </div>
                      {/* Technique cells */}
                      <div className="flex flex-col gap-1 p-1 bg-zinc-950/30 border border-zinc-800 border-t-0 rounded-b-md min-h-[80px]">
                        {techniques.length === 0 ? (
                          <div className="flex items-center justify-center py-4 text-[10px] text-zinc-600 italic">
                            No matches
                          </div>
                        ) : (
                          techniques.map((tech) => (
                            <TechniqueCell
                              key={tech.id}
                              technique={tech}
                              onClick={() => handleTechniqueClick(tech)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Coverage Summary Footer */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
      >
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <Activity className="size-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-100">Coverage Health</h3>
                  <p className="text-xs text-zinc-400">
                    Overall coverage score based on detected + partial weighted techniques
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                    {Math.round(((stats.detected + stats.partial * 0.5) / Math.max(stats.total, 1)) * 100)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Weighted Score</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info('Export started', {
                      description: 'Generating MITRE ATT&CK coverage report...',
                    })
                  }}
                  className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200"
                >
                  Export Coverage Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Technique Detail Dialog */}
      <Dialog open={!!selectedTechnique} onOpenChange={(o) => { if (!o) handleDetailClose() }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-700">
          {selectedTechnique && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg text-zinc-100">
                        {selectedTechnique.name}
                      </DialogTitle>
                      <Badge variant="outline" className="font-mono text-[11px] border-emerald-500/30 text-emerald-400">
                        {selectedTechnique.id}
                      </Badge>
                    </div>
                    <DialogDescription className="text-zinc-400 mt-1">
                      {(() => {
                        const tac = MITRE_TACTICS.find((t) => t.id === selectedTechnique.tacticId)
                        return tac ? `${tac.id} · ${tac.name}` : selectedTechnique.tacticId
                      })()}
                    </DialogDescription>
                  </div>
                  <StatusBadge status={selectedTechnique.status} />
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Description */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Description
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {selectedTechnique.description}
                  </p>
                </div>

                {/* Platforms */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Platforms
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTechnique.platforms.map((p) => (
                      <Badge key={p} variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50 text-[11px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sub-techniques */}
                {selectedTechnique.subTechniques.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                      <Layers className="size-3" />
                      Sub-Techniques ({selectedTechnique.subTechniques.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {selectedTechnique.subTechniques.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center gap-2 rounded-md bg-zinc-800/40 border border-zinc-800 px-2.5 py-1.5"
                        >
                          <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-zinc-400 shrink-0">
                            {st.id}
                          </Badge>
                          <span className="text-xs text-zinc-300 truncate">{st.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detection Rules */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <Radar className="size-3" />
                    Detection Rules ({selectedTechnique.detectionRules.length})
                  </h4>
                  {selectedTechnique.detectionRules.length === 0 ? (
                    <div className="rounded-md border border-dashed border-zinc-800 px-3 py-2.5 text-xs text-zinc-500 italic">
                      No detection rules mapped. This is a coverage gap.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTechnique.detectionRules.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2 rounded-md bg-zinc-800/40 border border-zinc-800 px-2.5 py-1.5 hover:bg-zinc-800/70 cursor-pointer transition-colors group"
                          onClick={() => {
                            setActiveView('rules')
                            handleDetailClose()
                            toast.info('Navigating to Detection Rules', { description: `Opening rule: ${r.name}` })
                          }}
                        >
                          <Badge className={cn('text-[10px] border', SEVERITY_COLOR[r.severity])}>
                            {r.severity}
                          </Badge>
                          <span className="text-xs text-zinc-200 flex-1 truncate font-mono">{r.id}</span>
                          <span className="text-xs text-zinc-300 truncate flex-1 group-hover:text-zinc-100">{r.name}</span>
                          {r.enabled ? (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] shrink-0">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px] shrink-0">
                              Disabled
                            </Badge>
                          )}
                          <ChevronRight className="size-3.5 text-zinc-600 group-hover:text-emerald-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Alerts */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <Bell className="size-3" />
                    Recent Alerts ({selectedTechnique.recentAlerts.length})
                  </h4>
                  {selectedTechnique.recentAlerts.length === 0 ? (
                    <div className="rounded-md border border-dashed border-zinc-800 px-3 py-2.5 text-xs text-zinc-500 italic">
                      No recent alerts for this technique.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTechnique.recentAlerts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 rounded-md bg-zinc-800/40 border border-zinc-800 px-2.5 py-1.5 hover:bg-zinc-800/70 cursor-pointer transition-colors group"
                          onClick={() => {
                            setActiveView('alerts')
                            handleDetailClose()
                            toast.info('Navigating to Alerts', { description: `Opening alert: ${a.title}` })
                          }}
                        >
                          <Badge className={cn('text-[10px] border shrink-0', SEVERITY_COLOR[a.severity])}>
                            {a.severity}
                          </Badge>
                          <span className="text-xs text-zinc-300 flex-1 truncate group-hover:text-zinc-100">{a.title}</span>
                          <span className="text-[10px] text-zinc-500 shrink-0 flex items-center gap-1">
                            <Clock className="size-3" />
                            {relativeTime(a.timestamp)}
                          </span>
                          <ChevronRight className="size-3.5 text-zinc-600 group-hover:text-emerald-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mitigations */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="size-3" />
                    Mitigation Recommendations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {selectedTechnique.mitigations.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1.5"
                      >
                        <AlertTriangle className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-zinc-200">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Quick status change */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Update Coverage Status
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(['detected', 'partial', 'gap', 'n/a'] as MitreDetectionStatus[]).map((s) => {
                      const cfg = STATUS_CONFIG[s]
                      const isActive = selectedTechnique.status === s
                      return (
                        <Button
                          key={s}
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(selectedTechnique.id, s)}
                          className={cn(
                            'h-8 gap-1.5 text-xs transition-all',
                            isActive
                              ? cn(cfg.bg, cfg.border, cfg.text, 'opacity-100')
                              : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 opacity-60'
                          )}
                        >
                          <span className={cn('size-2.5 rounded-sm border', cfg.bg, cfg.border)} />
                          {cfg.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleDetailClose}
                  className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setActiveView('rules')
                    handleDetailClose()
                    toast.info('Navigating to Detection Rules', {
                      description: 'Create a new rule for this technique.',
                    })
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Radar className="size-3.5 mr-1.5" />
                  Create Detection Rule
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===== Sub-components =====

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
  bg,
  border,
  progress,
  progressColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sublabel: string
  accent: string
  bg: string
  border: string
  progress?: number
  progressColor?: string
}) {
  return (
    <Card className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 truncate">{label}</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1 tabular-nums">{value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{sublabel}</p>
          </div>
          <div className={cn('flex size-9 items-center justify-center rounded-md border shrink-0', bg, border)}>
            <Icon className={cn('size-4', accent)} />
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-3 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={cn('h-full rounded-full', progressColor)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TechniqueCell({ technique, onClick }: { technique: MitreTechnique; onClick: () => void }) {
  const cfg = STATUS_CONFIG[technique.status]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          onClick={onClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'group relative w-full rounded-sm border px-1.5 py-1 text-left transition-all',
            cfg.bg,
            cfg.border,
            cfg.hoverBg,
            'hover:border-emerald-500/50'
          )}
          aria-label={`${technique.id} — ${technique.name} (${cfg.label})`}
        >
          <div className="flex items-center gap-1">
            <span className={cn('size-1.5 rounded-full shrink-0', cfg.dot)} />
            <span className="font-mono text-[9px] text-zinc-400 shrink-0 leading-none mt-px">{technique.id}</span>
          </div>
          <div className={cn('text-[10px] font-medium leading-tight mt-0.5 line-clamp-2', cfg.text)}>
            {technique.name}
          </div>
          {/* Tiny alert indicator */}
          {technique.recentAlerts.length > 0 && (
            <span
              className="absolute top-0.5 right-0.5 size-1 rounded-full bg-red-500 ring-1 ring-zinc-950"
              title={`${technique.recentAlerts.length} recent alert(s)`}
            />
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-emerald-400">{technique.id}</span>
            <span className="font-semibold text-xs">{technique.name}</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            {technique.description}
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className={cn('size-2 rounded-sm border', cfg.bg, cfg.border)} />
            <span className={cn('text-[10px] font-medium', cfg.text)}>{cfg.label}</span>
            {technique.detectionRules.length > 0 && (
              <span className="text-[10px] text-zinc-500 ml-auto">
                {technique.detectionRules.length} rule(s) · {technique.recentAlerts.length} alert(s)
              </span>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function StatusBadge({ status }: { status: MitreDetectionStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium', cfg.bg, cfg.border, cfg.text)}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  )
}
