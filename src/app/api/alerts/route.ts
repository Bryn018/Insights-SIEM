import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateAlert } from '@/lib/detection-engine';
import { getCurrentOrgId, scopeOrg } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let where: Prisma.AlertWhereInput = {};

    if (severity) {
      const severities = severity.split(',');
      where.severity = { in: severities };
    }
    if (status) {
      const statuses = status.split(',');
      where.status = { in: statuses };
    }
    if (category) {
      const categories = category.split(',');
      where.category = { in: categories };
    }
    if (source) {
      const sources = source.split(',');
      where.source = { in: sources };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { sourceIp: { contains: search } },
        { destIp: { contains: search } },
        { hostname: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    where = scopeOrg(where, orgId);

    const skip = (page - 1) * pageSize;

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip,
        take: pageSize,
        include: {
          assignedTo: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
          incidents: {
            select: { incidentId: true, incident: { select: { id: true, title: true, status: true } } },
          },
        },
      }),
      db.alert.count({ where }),
    ]);

    return NextResponse.json({
      data: alerts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      severity,
      category,
      source,
      sourceIp,
      destIp,
      sourcePort,
      destPort,
      protocol,
      hostname,
      rawLog,
      mitreTactic,
      mitreTechnique,
      tags,
      sourceId,
    } = body;

    if (!title || !description || !severity || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, severity, source' },
        { status: 400 }
      );
    }

    const now = new Date();
    const orgId = await getCurrentOrgId();
    const alert = await db.alert.create({
      data: {
        orgId: orgId ?? undefined,
        sourceId,
        title,
        description,
        severity,
        status: 'new',
        category: category || null,
        source,
        sourceIp: sourceIp || null,
        destIp: destIp || null,
        sourcePort: sourcePort || null,
        destPort: destPort || null,
        protocol: protocol || null,
        hostname: hostname || null,
        rawLog: rawLog || null,
        mitreTactic: mitreTactic || null,
        mitreTechnique: mitreTechnique || null,
        tags: tags || null,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });

    // Detection engine: match enabled rules against the new alert and record hits.
    try {
      const rules = await db.detectionRule.findMany({ where: scopeOrg({ enabled: true }, orgId) });
      const matched = evaluateAlert(rules, alert);
      if (matched.length > 0) {
        await db.detectionRule.updateMany({
          where: { id: { in: matched.map((r) => r.id) } },
          data: { hitCount: { increment: 1 }, lastHitAt: now },
        });
        // Tag the alert with the matched rule names for analyst visibility.
        const ruleNames = matched.map((r) => r.name).join(', ');
        await db.alert.update({
          where: { id: alert.id },
          data: { tags: [alert.tags, `rule:${ruleNames}`].filter(Boolean).join(', ') },
        });
      }
    } catch (detErr) {
      console.error('Detection engine error (non-fatal):', detErr);
    }

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Alerts POST error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}
