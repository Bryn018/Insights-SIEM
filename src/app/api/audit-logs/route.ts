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
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = { contains: action };
    }
    if (resource) {
      where.resource = { in: resource.split(',') };
    }
    if (userId) {
      where.userId = userId;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    where = scopeOrg(where, orgId);

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    // Parse JSON details
    const parsed = logs.map((log) => ({
      ...log,
      details: safeJsonParse(log.details),
    }));

    return NextResponse.json({
      data: parsed,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Audit logs GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

function safeJsonParse(str: string | null): unknown {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
