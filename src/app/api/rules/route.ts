import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentOrgId, scopeOrg } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const category = searchParams.get('category');
    const enabled = searchParams.get('enabled');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let where: Prisma.DetectionRuleWhereInput = {};

    if (category) {
      where.category = { in: category.split(',') };
    }
    if (enabled !== null && enabled !== undefined && enabled !== '') {
      where.enabled = enabled === 'true';
    }
    if (severity) {
      where.severity = { in: severity.split(',') };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { query: { contains: search } },
        { mitreTactic: { contains: search } },
        { mitreTechnique: { contains: search } },
      ];
    }

    where = scopeOrg(where, orgId);

    const skip = (page - 1) * pageSize;

    const [rules, total] = await Promise.all([
      db.detectionRule.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip,
        take: pageSize,
      }),
      db.detectionRule.count({ where }),
    ]);

    return NextResponse.json({
      data: rules,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Rules GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      query,
      queryLanguage,
      severity,
      category,
      mitreTactic,
      mitreTechnique,
      tags,
      enabled,
      schedule,
      lookback,
      threshold,
      indexPattern,
      actions,
    } = body;

    if (!name || !description || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, query' },
        { status: 400 }
      );
    }

    const orgId = await getCurrentOrgId();
    const rule = await db.detectionRule.create({
      data: {
        orgId: orgId ?? undefined,
        name,
        description,
        query,
        queryLanguage: queryLanguage || 'kql',
        severity: severity || 'medium',
        category: category || null,
        mitreTactic: mitreTactic || null,
        mitreTechnique: mitreTechnique || null,
        tags: tags || null,
        enabled: enabled !== undefined ? enabled : true,
        schedule: schedule || null,
        lookback: lookback || '5m',
        threshold: threshold || 1,
        indexPattern: indexPattern || 'insights-host-logs-*',
        actions: actions ? JSON.stringify(actions) : null,
        createdBy: 'system',
        updatedBy: 'system',
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Rules POST error:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}
