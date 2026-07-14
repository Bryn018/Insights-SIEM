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
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let where: Prisma.IncidentWhereInput = {};

    if (severity) {
      where.severity = { in: severity.split(',') };
    }
    if (status) {
      where.status = { in: status.split(',') };
    }
    if (priority) {
      where.priority = { in: priority.split(',') };
    }
    if (category) {
      where.category = { in: category.split(',') };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
        { attackVector: { contains: search } },
      ];
    }

    where = scopeOrg(where, orgId);

    const skip = (page - 1) * pageSize;

    const [incidents, total] = await Promise.all([
      db.incident.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip,
        take: pageSize,
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
          _count: {
            select: { alerts: true, comments: true },
          },
        },
      }),
      db.incident.count({ where }),
    ]);

    return NextResponse.json({
      data: incidents,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Incidents GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      severity,
      priority,
      category,
      attackVector,
      impact,
      dueAt,
    } = body;

    if (!title || !description || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, severity' },
        { status: 400 }
      );
    }

    const orgId = await getCurrentOrgId();
    const incident = await db.incident.create({
      data: {
        orgId: orgId ?? undefined,
        title,
        description,
        severity,
        status: 'open',
        priority: priority || 'medium',
        category: category || null,
        attackVector: attackVector || null,
        impact: impact || null,
        dueAt: dueAt ? new Date(dueAt) : null,
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    // Add initial timeline event
    await db.incidentTimeline.create({
      data: {
        incidentId: incident.id,
        event: 'Incident created',
        eventDate: new Date(),
      },
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error('Incidents POST error:', error);
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
  }
}
