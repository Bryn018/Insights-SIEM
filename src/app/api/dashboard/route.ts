import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { getCurrentOrgId, scopeOrg } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const cacheKey = `dashboard:summary:${orgId ?? 'global'}`;
    const cached = cache.get<Record<string, unknown>>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const where = scopeOrg({}, orgId);

    // Total alerts by severity
    const alertsBySeverity = await db.alert.groupBy({
      by: ['severity'],
      where,
      _count: { id: true },
    });

    const severityCounts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    };
    for (const item of alertsBySeverity) {
      severityCounts[item.severity] = item._count.id;
    }

    // Active incidents count by status
    const incidentsByStatus = await db.incident.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const incidentCounts: Record<string, number> = {};
    for (const item of incidentsByStatus) {
      incidentCounts[item.status] = item._count.id;
    }

    // Top 5 alert categories
    const topCategories = await db.alert.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // Recent alerts (last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = await db.alert.findMany({
      where: scopeOrg({ createdAt: { gte: last24h } }, orgId),
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        category: true,
        source: true,
        sourceIp: true,
        destIp: true,
        createdAt: true,
      },
    });

    const recentAlertsCount = await db.alert.count({
      where: scopeOrg({ createdAt: { gte: last24h } }, orgId),
    });

    // System health - asset count by status
    const assetsByStatus = await db.asset.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const assetCounts: Record<string, number> = {};
    for (const item of assetsByStatus) {
      assetCounts[item.status] = item._count.id;
    }

    // Integration health
    const integrationStats = await db.integration.groupBy({
      by: ['lastStatus'],
      _count: { id: true },
    });

    const integrationHealth: Record<string, number> = {};
    for (const item of integrationStats) {
      const key = item.lastStatus || 'unknown';
      integrationHealth[key] = item._count.id;
    }

    // Compliance score overview
    const totalControls = await db.complianceControl.count();
    const compliantControls = await db.complianceControl.count({
      where: { status: 'compliant' },
    });
    const partiallyCompliantControls = await db.complianceControl.count({
      where: { status: 'partially_compliant' },
    });

    const complianceScore = totalControls > 0
      ? Math.round(((compliantControls + partiallyCompliantControls * 0.5) / totalControls) * 100)
      : 0;

    // Alert trend data (last 7 days, grouped by day)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allRecentAlerts = await db.alert.findMany({
      where: scopeOrg({ createdAt: { gte: sevenDaysAgo } }, orgId),
      select: { createdAt: true, severity: true },
    });

    // Group by day
    const trendData: Record<string, Record<string, number>> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      trendData[dateKey] = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
        total: 0,
      };
    }

    for (const alert of allRecentAlerts) {
      const dateKey = alert.createdAt.toISOString().split('T')[0];
      if (trendData[dateKey]) {
        trendData[dateKey][alert.severity] = (trendData[dateKey][alert.severity] || 0) + 1;
        trendData[dateKey].total += 1;
      }
    }

    const alertTrend = Object.entries(trendData).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Detection rules (real counts)
    const [totalRules, enabledRules] = await Promise.all([
      db.detectionRule.count({ where }),
      db.detectionRule.count({ where: scopeOrg({ enabled: true }, orgId) }),
    ]);

    // MTTA / MTTR computed from real alert timestamps (null when no data)
    const ackAlerts = await db.alert.findMany({
      where: scopeOrg({ acknowledgedAt: { not: null } }, orgId),
      select: { createdAt: true, acknowledgedAt: true },
    });
    const resolvedAlerts = await db.alert.findMany({
      where: scopeOrg({ resolvedAt: { not: null } }, orgId),
      select: { createdAt: true, resolvedAt: true },
    });
    const mttaMin = ackAlerts.length
      ? Math.round(
          (ackAlerts.reduce((s, a) => s + (a.acknowledgedAt!.getTime() - a.createdAt.getTime()), 0) /
            ackAlerts.length /
            60000) * 10
        ) / 10
      : null;
    const mttrMin = resolvedAlerts.length
      ? Math.round(
          (resolvedAlerts.reduce((s, a) => s + (a.resolvedAt!.getTime() - a.createdAt.getTime()), 0) /
            resolvedAlerts.length /
            60000) * 10
        ) / 10
      : null;

    const result = {
      alertsBySeverity: severityCounts,
      incidentsByStatus: incidentCounts,
      topCategories: topCategories.map((c) => ({
        category: c.category || 'Uncategorized',
        count: c._count.id,
      })),
      recentAlerts,
      recentAlertsCount,
      enabledRules,
      totalRules,
      mttaMin,
      mttrMin,
      systemHealth: {
        assetsByStatus: assetCounts,
        integrationHealth,
      },
      compliance: {
        score: complianceScore,
        totalControls,
        compliantControls,
        partiallyCompliantControls,
        nonCompliantControls: totalControls - compliantControls - partiallyCompliantControls,
      },
      alertTrend,
    };

    // Cache for 1 second (real-time: new captures surface immediately)
    cache.set(cacheKey, result, 1_000);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
