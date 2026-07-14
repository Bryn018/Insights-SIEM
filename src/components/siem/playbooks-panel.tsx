'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  Play,
  RotateCcw,
  CheckCircle2,
  Circle,
  Loader2,
  Zap,
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Bot,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ===== Types =====

type StepStatus = 'pending' | 'running' | 'completed'

interface PlaybookStep {
  id: string
  title: string
  description: string
  automated: boolean
}

interface Playbook {
  id: string
  name: string
  severity: 'critical' | 'high' | 'medium'
  steps: PlaybookStep[]
  estimatedTime: string
  lastUsed: string | null
}

// ===== Mock Data =====

const playbooks: Playbook[] = [
  {
    id: 'pb-1',
    name: 'SSH Brute Force Response',
    severity: 'high',
    estimatedTime: '~15 min',
    lastUsed: '2h ago',
    steps: [
      { id: 's1-1', title: 'Verify Attack Source', description: 'Confirm source IP and check against threat intel feeds for known malicious actors', automated: true },
      { id: 's1-2', title: 'Block Source IP', description: 'Add source IP to firewall blocklist at perimeter and internal segments', automated: true },
      { id: 's1-3', title: 'Check Compromised Accounts', description: 'Review authentication logs for successful logins from the source IP', automated: false },
      { id: 's1-4', title: 'Reset Affected Credentials', description: 'Force password reset on any accounts that had successful authentication', automated: false },
      { id: 's1-5', title: 'Document & Close', description: 'Create incident report, update knowledge base, and close the alert', automated: true },
    ],
  },
  {
    id: 'pb-2',
    name: 'Malware Containment',
    severity: 'critical',
    estimatedTime: '~30 min',
    lastUsed: '1d ago',
    steps: [
      { id: 's2-1', title: 'Isolate Infected Host', description: 'Network isolate the affected endpoint to prevent lateral movement', automated: true },
      { id: 's2-2', title: 'Capture Memory Dump', description: 'Collect volatile memory for forensic analysis before further changes', automated: false },
      { id: 's2-3', title: 'Identify Malware Family', description: 'Submit hash to VirusTotal and internal sandbox for identification', automated: true },
      { id: 's2-4', title: 'Block C2 Communications', description: 'Add identified C2 domains/IPs to DNS sinkhole and firewall rules', automated: true },
      { id: 's2-5', title: 'Scan for Lateral Movement', description: 'Run network scan to detect any other hosts communicating with same C2 infrastructure', automated: false },
      { id: 's2-6', title: 'Eradicate & Recover', description: 'Remove malware artifacts, patch vulnerability, and restore from clean backup if needed', automated: false },
    ],
  },
  {
    id: 'pb-3',
    name: 'Data Exfiltration Investigation',
    severity: 'critical',
    estimatedTime: '~45 min',
    lastUsed: '3d ago',
    steps: [
      { id: 's3-1', title: 'Identify Data Flow', description: 'Analyze network traffic logs to identify destination of data exfiltration', automated: true },
      { id: 's3-2', title: 'Block Exfil Channel', description: 'Block identified external destinations at firewall and proxy level', automated: true },
      { id: 's3-3', title: 'Determine Data Scope', description: 'Review DLP logs and endpoint activity to determine what data was accessed', automated: false },
      { id: 's3-4', title: 'Identify Affected Users', description: 'Correlate access patterns to identify compromised user accounts', automated: false },
      { id: 's3-5', title: 'Preserve Evidence', description: 'Capture full packet capture and log snapshots for forensic chain of custody', automated: true },
      { id: 's3-6', title: 'Assess Regulatory Impact', description: 'Determine if exfiltrated data triggers breach notification requirements', automated: false },
      { id: 's3-7', title: 'Remediate & Report', description: 'Close access vectors, reset credentials, and prepare regulatory notifications', automated: false },
    ],
  },
  {
    id: 'pb-4',
    name: 'Ransomware Incident Response',
    severity: 'critical',
    estimatedTime: '~60 min',
    lastUsed: null,
    steps: [
      { id: 's4-1', title: 'Identify Patient Zero', description: 'Trace initial infection vector through email logs, web proxy, and endpoint telemetry', automated: true },
      { id: 's4-2', title: 'Isolate Affected Systems', description: 'Network isolate all identified infected endpoints immediately', automated: true },
      { id: 's4-3', title: 'Identify Ransomware Variant', description: 'Analyze ransom note and encrypted file headers to identify the ransomware family', automated: true },
      { id: 's4-4', title: 'Check for Decryptor', description: 'Search NoMoreRansom.org and vendor advisories for available decryption tools', automated: true },
      { id: 's4-5', title: 'Assess Backup Integrity', description: 'Verify that backup systems are not compromised and can support recovery', automated: false },
      { id: 's4-6', title: 'Contain Lateral Spread', description: 'Block known ransomware communication and propagation channels', automated: true },
      { id: 's4-7', title: 'Preserve Forensic Evidence', description: 'Capture disk images and memory dumps before any remediation', automated: false },
      { id: 's4-8', title: 'Recover & Restore', description: 'Rebuild from clean images or restore from verified backups', automated: false },
    ],
  },
  {
    id: 'pb-5',
    name: 'Privilege Escalation Remediation',
    severity: 'high',
    estimatedTime: '~25 min',
    lastUsed: '5d ago',
    steps: [
      { id: 's5-1', title: 'Confirm Escalation Path', description: 'Verify the method used for privilege escalation (misconfiguration, vulnerability, credential theft)', automated: true },
      { id: 's5-2', title: 'Revoke Elevated Access', description: 'Remove unauthorized privilege grants and reset affected service accounts', automated: true },
      { id: 's5-3', title: 'Audit Group Memberships', description: 'Review all administrative group memberships for unauthorized additions', automated: false },
      { id: 's5-4', title: 'Patch Vulnerability', description: 'Apply patches for any exploited vulnerability used in the escalation', automated: false },
      { id: 's5-5', title: 'Implement Detection Rule', description: 'Create detection rule to alert on similar escalation attempts in the future', automated: true },
    ],
  },
]

// ===== Severity Config =====

const severityConfig = {
  critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ShieldAlert },
  high: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertTriangle },
  medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Shield },
}

// ===== Step Status Icon =====

function StepStatusIcon({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
  }
  if (status === 'running') {
    return <Loader2 className="h-4 w-4 text-emerald-400 shrink-0 animate-spin" />
  }
  return <Circle className="h-4 w-4 text-zinc-600 shrink-0" />
}

// ===== Main Component =====

export function PlaybooksPanel() {
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null)
  const [runningPlaybook, setRunningPlaybook] = useState<string | null>(null)
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({})
  const runTimeouts = useRef<NodeJS.Timeout[]>([])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      runTimeouts.current.forEach(clearTimeout)
    }
  }, [])

  const handleToggle = useCallback((id: string) => {
    setExpandedPlaybook((prev) => (prev === id ? null : id))
  }, [])

  const handleRun = useCallback((pb: Playbook) => {
    // Clear any previous run
    runTimeouts.current.forEach(clearTimeout)
    runTimeouts.current = []

    setRunningPlaybook(pb.id)
    const statuses: Record<string, StepStatus> = {}
    pb.steps.forEach((s) => { statuses[s.id] = 'pending' })
    setStepStatuses(statuses)

    // Run steps one by one with delays
    pb.steps.forEach((step, i) => {
      const startDelay = i * 1200
      const completeDelay = startDelay + 800

      const startTimeout = setTimeout(() => {
        setStepStatuses((prev) => ({ ...prev, [step.id]: 'running' }))
      }, startDelay)

      const completeTimeout = setTimeout(() => {
        setStepStatuses((prev) => ({ ...prev, [step.id]: 'completed' }))
        // If last step, mark as done
        if (i === pb.steps.length - 1) {
          setTimeout(() => {
            setRunningPlaybook(null)
          }, 500)
        }
      }, completeDelay)

      runTimeouts.current.push(startTimeout, completeTimeout)
    })
  }, [])

  const handleReset = useCallback(() => {
    runTimeouts.current.forEach(clearTimeout)
    runTimeouts.current = []
    setRunningPlaybook(null)
    setStepStatuses({})
  }, [])

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-zinc-400">Response Playbooks</h3>
          <Badge variant="outline" className="border-zinc-700 text-[9px] text-zinc-500">
            {playbooks.length} templates
          </Badge>
        </div>
        {runningPlaybook && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px] text-zinc-500 hover:text-red-400"
            onClick={handleReset}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-[420px]">
        <div className="space-y-2">
          {playbooks.map((pb) => {
            const isExpanded = expandedPlaybook === pb.id
            const isRunning = runningPlaybook === pb.id
            const sevConfig = severityConfig[pb.severity]
            const SevIcon = sevConfig.icon

            // Check if any steps are completed for this playbook
            const completedSteps = pb.steps.filter((s) => stepStatuses[s.id] === 'completed').length
            const isCompleted = isRunning && completedSteps === pb.steps.length

            return (
              <div
                key={pb.id}
                className={cn(
                  'rounded-lg border transition-colors',
                  isRunning
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-zinc-800 bg-zinc-800/30'
                )}
              >
                {/* Playbook Header */}
                <button
                  className="flex w-full items-center gap-3 p-3 text-left"
                  onClick={() => !isRunning && handleToggle(pb.id)}
                >
                  {/* Severity Icon */}
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded', sevConfig.color)}>
                    <SevIcon className="h-3.5 w-3.5" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium', isRunning ? 'text-emerald-300' : 'text-zinc-200')}>
                        {pb.name}
                      </span>
                      {isRunning && (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                      )}
                      {isCompleted && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {pb.estimatedTime}
                      </span>
                      <span>{pb.steps.length} steps</span>
                      <span className="flex items-center gap-1">
                        <Bot className="h-2.5 w-2.5" />
                        {pb.steps.filter((s) => s.automated).length} automated
                      </span>
                      {pb.lastUsed && <span>Used {pb.lastUsed}</span>}
                    </div>
                  </div>

                  {/* Chevron / Run Button */}
                  {!isRunning ? (
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0 text-zinc-600 transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      {completedSteps}/{pb.steps.length}
                    </div>
                  )}
                </button>

                {/* Expanded Steps */}
                <AnimatePresence>
                  {(isExpanded || isRunning) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-zinc-800 px-3 py-3">
                        {/* Steps as vertical stepper */}
                        <div className="relative pl-5">
                          {/* Vertical line */}
                          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-zinc-800" />

                          <div className="space-y-3">
                            {pb.steps.map((step, i) => {
                              const status: StepStatus = stepStatuses[step.id] || 'pending'
                              return (
                                <div key={step.id} className="relative">
                                  {/* Step dot on the timeline */}
                                  <div className={cn(
                                    'absolute -left-5 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full',
                                    status === 'completed'
                                      ? 'bg-emerald-500/20 border border-emerald-500/40'
                                      : status === 'running'
                                        ? 'bg-emerald-500/15 border border-emerald-500/40 animate-pulse'
                                        : 'bg-zinc-800 border border-zinc-700'
                                  )}>
                                    <StepStatusIcon status={status} />
                                  </div>

                                  <div className={cn(
                                    'rounded-lg p-2 transition-colors',
                                    status === 'completed'
                                      ? 'bg-emerald-500/5'
                                      : status === 'running'
                                        ? 'bg-zinc-800/80'
                                        : ''
                                  )}>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        'text-[10px] font-medium',
                                        status === 'completed' ? 'text-emerald-400' : status === 'running' ? 'text-zinc-200' : 'text-zinc-500'
                                      )}>
                                        Step {i + 1}
                                      </span>
                                      {step.automated && (
                                        <Badge variant="outline" className="h-4 border-emerald-500/30 bg-emerald-500/10 px-1 text-[8px] text-emerald-400">
                                          <Bot className="mr-0.5 h-2 w-2" />
                                          AUTO
                                        </Badge>
                                      )}
                                    </div>
                                    <p className={cn(
                                      'text-xs font-medium',
                                      status === 'completed' ? 'text-emerald-300' : status === 'running' ? 'text-zinc-100' : 'text-zinc-300'
                                    )}>
                                      {step.title}
                                    </p>
                                    <p className={cn(
                                      'mt-0.5 text-[10px]',
                                      status === 'completed' ? 'text-emerald-500/70' : 'text-zinc-500'
                                    )}>
                                      {step.description}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Run Playbook Button */}
                        {!isRunning && (
                          <div className="mt-3 pl-5">
                            <Button
                              size="sm"
                              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRun(pb)
                              }}
                            >
                              <Play className="h-3 w-3" />
                              Run Playbook
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
