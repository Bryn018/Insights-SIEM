import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentOrgId, getCurrentUser, requirePermission, errorStatus, scopeOrg } from '@/lib/auth'
import { MITRE_TACTICS, MITRE_TECHNIQUES } from '@/lib/mitre-taxonomy'

// Build a live MITRE ATT&CK coverage matrix from REAL data:
//  - detection coverage  = enabled DetectionRule rows tagged mitreTechnique
//  - recent alerts       = real Alert rows tagged mitreTechnique
// The tactic/technique taxonomy itself is reference data (mitre-taxonomy.ts).
export async function GET() {
  try {
    const user = await getCurrentUser()
    requirePermission(user.role, 'viewer')
    const orgId = await getCurrentOrgId()

    const [rules, alerts] = await Promise.all([
      db.detectionRule.findMany({
        where: { mitreTechnique: { not: null }, ...scopeOrg({}, orgId) },
        select: { id: true, name: true, severity: true, enabled: true, mitreTechnique: true },
      }),
      db.alert.findMany({
        where: { mitreTechnique: { not: null }, ...scopeOrg({}, orgId) },
        orderBy: { lastSeenAt: 'desc' },
        take: 200,
        select: { id: true, title: true, severity: true, mitreTechnique: true, lastSeenAt: true },
      }),
    ])

    const rulesByTech = new Map<string, typeof rules>()
    for (const r of rules) {
      if (!r.mitreTechnique) continue
      const arr = rulesByTech.get(r.mitreTechnique) ?? []
      arr.push(r)
      rulesByTech.set(r.mitreTechnique, arr)
    }

    const alertsByTech = new Map<string, typeof alerts>()
    for (const a of alerts) {
      if (!a.mitreTechnique) continue
      const arr = alertsByTech.get(a.mitreTechnique) ?? []
      arr.push(a)
      alertsByTech.set(a.mitreTechnique, arr)
    }

    const techniques = MITRE_TECHNIQUES.map((t) => {
      const techRules = rulesByTech.get(t.id) ?? []
      const enabled = techRules.filter((r) => r.enabled)
      let status: 'detected' | 'partial' | 'gap' = 'gap'
      if (enabled.length > 0) status = 'detected'
      else if (techRules.length > 0) status = 'partial'

      const recentAlerts = (alertsByTech.get(t.id) ?? [])
        .slice(0, 10)
        .map((a) => ({
          id: a.id,
          title: a.title,
          severity: a.severity,
          timestamp: a.lastSeenAt.toISOString(),
        }))

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        platforms: t.platforms,
        tacticId: t.tacticId,
        subTechniques: t.subTechniques,
        mitigations: t.mitigations,
        status,
        detectionRules: techRules.map((r) => ({
          id: r.id,
          name: r.name,
          severity: (r.severity ?? 'medium') as 'critical' | 'high' | 'medium' | 'low',
          enabled: r.enabled,
        })),
        recentAlerts,
      }
    })

    const tactics = MITRE_TACTICS.map((ta) => ({
      id: ta.id,
      name: ta.name,
      shortName: ta.shortName,
      techniques: techniques.filter((t) => t.tacticId === ta.id),
    }))

    // Coverage summary
    const total = techniques.length
    const detected = techniques.filter((t) => t.status === 'detected').length
    const partial = techniques.filter((t) => t.status === 'partial').length
    const gap = techniques.filter((t) => t.status === 'gap').length

    return NextResponse.json({
      tactics,
      summary: {
        total,
        detected,
        partial,
        gap,
        coveragePct: total ? Math.round(((detected + partial * 0.5) / total) * 100) : 0,
        enabledRules: rules.filter((r) => r.enabled).length,
        totalRules: rules.length,
        recentAlerts: alerts.length,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load MITRE coverage' }, { status: errorStatus(error) })
  }
}
