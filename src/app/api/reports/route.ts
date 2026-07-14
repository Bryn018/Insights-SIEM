import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentOrgId, scopeOrg } from '@/lib/auth'

// GET /api/reports - Get report data based on type
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily'
    const days = parseInt(searchParams.get('days') || '7')

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get alerts in period
    const alerts = await db.alert.findMany({
      where: { createdAt: { gte: since }, ...scopeOrg({}, orgId) },
      orderBy: { createdAt: 'desc' },
    })

    // Get incidents in period
    const incidents = await db.incident.findMany({
      where: { createdAt: { gte: since }, ...scopeOrg({}, orgId) },
      orderBy: { createdAt: 'desc' },
    })

    // Get compliance status (global reference data, not org-scoped)
    const controls = await db.complianceControl.findMany()
    const compliant = controls.filter(c => c.status === 'compliant').length
    const total = controls.length

    // Get rules (org-scoped)
    const rules = await db.detectionRule.findMany({
      where: scopeOrg({}, orgId),
    })
    const activeRules = rules.filter(r => r.enabled).length

    // Build report data
    const alertsBySeverity: Record<string, number> = {}
    const alertsByCategory: Record<string, number> = {}
    const alertsBySource: Record<string, number> = {}
    const alertsByStatus: Record<string, number> = {}

    for (const alert of alerts) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1
      if (alert.category) alertsByCategory[alert.category] = (alertsByCategory[alert.category] || 0) + 1
      alertsBySource[alert.source] = (alertsBySource[alert.source] || 0) + 1
      alertsByStatus[alert.status] = (alertsByStatus[alert.status] || 0) + 1
    }

    const resolved = alerts.filter(a => a.status === 'resolved').length
    const acknowledged = alerts.filter(a => a.status === 'acknowledged' || a.status === 'investigating').length

    // MTTA / MTTR computed from real alert timestamps (null when no data)
    const ackTimes = alerts.filter(a => a.acknowledgedAt).map(a => a.acknowledgedAt!.getTime() - a.createdAt.getTime())
    const resTimes = alerts.filter(a => a.resolvedAt).map(a => a.resolvedAt!.getTime() - a.createdAt.getTime())
    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length / 60000) * 10) / 10 : null
    const mtta = avg(ackTimes)
    const mttr = avg(resTimes)

    const report = {
      type,
      period: { from: since.toISOString(), to: new Date().toISOString(), days },
      generatedAt: new Date().toISOString(),
      executive: {
        totalAlerts: alerts.length,
        criticalAlerts: alertsBySeverity['critical'] || 0,
        highAlerts: alertsBySeverity['high'] || 0,
        activeIncidents: incidents.filter(i => i.status !== 'closed' && i.status !== 'recovered').length,
        complianceScore: total > 0 ? Math.round((compliant / total) * 100) : 0,
        threatLevel: (alertsBySeverity['critical'] || 0) > 5 ? 'CRITICAL' :
                     (alertsBySeverity['critical'] || 0) > 0 || (alertsBySeverity['high'] || 0) > 3 ? 'HIGH' :
                     (alertsBySeverity['high'] || 0) > 0 ? 'MODERATE' : 'LOW',
      },
      alerts: {
        total: alerts.length,
        bySeverity: alertsBySeverity,
        byCategory: alertsByCategory,
        bySource: alertsBySource,
        byStatus: alertsByStatus,
        resolved,
        acknowledged,
        mtta,
        mttr,
        topAlerts: alerts.slice(0, 10).map(a => ({
          id: a.id,
          title: a.title,
          severity: a.severity,
          status: a.status,
          category: a.category,
          source: a.source,
          createdAt: a.createdAt,
        })),
      },
      incidents: {
        total: incidents.length,
        open: incidents.filter(i => i.status === 'open').length,
        investigating: incidents.filter(i => i.status === 'investigating').length,
        contained: incidents.filter(i => i.status === 'contained').length,
        closed: incidents.filter(i => i.status === 'closed' || i.status === 'recovered').length,
        topIncidents: incidents.slice(0, 5).map(i => ({
          id: i.id,
          title: i.title,
          severity: i.severity,
          status: i.status,
          priority: i.priority,
        })),
      },
      compliance: {
        score: total > 0 ? Math.round((compliant / total) * 100) : 0,
        totalControls: total,
        compliant,
        nonCompliant: controls.filter(c => c.status === 'non_compliant').length,
        partiallyCompliant: controls.filter(c => c.status === 'partially_compliant').length,
      },
      rules: {
        total: rules.length,
        active: activeRules,
        totalHits: rules.reduce((sum, r) => sum + r.hitCount, 0),
        topRules: rules.sort((a, b) => b.hitCount - a.hitCount).slice(0, 5).map(r => ({
          name: r.name,
          hitCount: r.hitCount,
          severity: r.severity,
        })),
      },
      recommendations: [
        'Review and update detection rules with low hit rates to reduce false positives',
        'Prioritize resolution of critical alerts to improve mean time to resolve',
        'Address non-compliant controls to improve compliance score',
        'Consider enabling additional threat intelligence feeds',
        'Review incident response playbooks for recently observed attack patterns',
      ],
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
