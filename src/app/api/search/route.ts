import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentOrgId, scopeOrg } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const orgFilter = scopeOrg({}, orgId);
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');

    if (!q || q.trim().length === 0) {
      // Return empty result set instead of 400 - allows the UI to render
      // an empty state without treating a missing query as an error.
      return NextResponse.json({
        query: '',
        results: {
          alerts: [],
          incidents: [],
          rules: [],
          assets: [],
        },
        totalResults: 0,
      });
    }

    const searchTerm = q.trim();
    const containsQuery: Prisma.StringFilter = { contains: searchTerm };

    // Search across alerts, incidents, rules, assets in parallel
    const [alerts, incidents, rules, assets] = await Promise.all([
      db.alert.findMany({
        where: {
          ...orgFilter,
          OR: [
            { title: containsQuery },
            { description: containsQuery },
            { sourceIp: containsQuery },
            { destIp: containsQuery },
            { hostname: containsQuery },
            { tags: containsQuery },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          category: true,
          source: true,
          createdAt: true,
        },
      }),
      db.incident.findMany({
        where: {
          ...orgFilter,
          OR: [
            { title: containsQuery },
            { description: containsQuery },
            { category: containsQuery },
            { attackVector: containsQuery },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
      db.detectionRule.findMany({
        where: {
          ...orgFilter,
          OR: [
            { name: containsQuery },
            { description: containsQuery },
            { query: containsQuery },
            { category: containsQuery },
            { mitreTactic: containsQuery },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          severity: true,
          category: true,
          enabled: true,
          createdAt: true,
        },
      }),
      db.asset.findMany({
        where: {
          ...orgFilter,
          OR: [
            { name: containsQuery },
            { ipAddress: containsQuery },
            { macAddress: containsQuery },
            { os: containsQuery },
            { owner: containsQuery },
            { department: containsQuery },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          criticality: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      query: searchTerm,
      results: {
        alerts,
        incidents,
        rules,
        assets,
      },
      totalResults: alerts.length + incidents.length + rules.length + assets.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
