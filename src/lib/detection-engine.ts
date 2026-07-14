// Safe, structured detection engine.
// Rules match on typed alert fields (severity / category / source / mitreTactic /
// mitreTechnique). No eval, no code execution — only equality + optional contains.
// Free-text `query` (KQL/Lucene) is preserved for a future full engine but is NOT
// executed here (security: never eval untrusted rule text).

import type { DetectionRule } from '@prisma/client'

export interface AlertLike {
  severity?: string | null
  category?: string | null
  source?: string | null
  mitreTactic?: string | null
  mitreTechnique?: string | null
  sourceIp?: string | null
  destIp?: string | null
  sourcePort?: number | null
  destPort?: number | null
  protocol?: string | null
  tags?: string | null
}

function fieldMatch(ruleValue: string | null | undefined, alertValue: string | null | undefined): boolean {
  if (!ruleValue) return true // unset rule filter => matches anything
  if (!alertValue) return false
  return ruleValue.toLowerCase() === alertValue.toLowerCase()
}

/**
 * Does a single rule match the alert? All *set* rule filters must pass.
 */
export function matchAlert(rule: DetectionRule, alert: AlertLike): boolean {
  if (!rule.enabled) return false
  if (!fieldMatch(rule.severity, alert.severity)) return false
  if (!fieldMatch(rule.category, alert.category)) return false
  if (!fieldMatch(rule.mitreTactic, alert.mitreTactic)) return false
  if (!fieldMatch(rule.mitreTechnique, alert.mitreTechnique)) return false
  return true
}

/**
 * Return every enabled rule that matches the given alert.
 */
export function evaluateAlert(rules: DetectionRule[], alert: AlertLike): DetectionRule[] {
  return rules.filter((rule) => matchAlert(rule, alert))
}
