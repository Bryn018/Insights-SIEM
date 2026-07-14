import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentOrgId, getCurrentUser, scopeOrg } from '@/lib/auth';
import { cache } from '@/lib/cache';
import { Prisma } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getCurrentOrgId();
    const incident = await db.incident.findFirst({
      where: { id, ...scopeOrg({}, orgId) },
      include: {
        alerts: {
          include: {
            alert: {
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
            },
          },
          orderBy: { addedAt: 'desc' },
        },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        timeline: {
          orderBy: { eventDate: 'desc' },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error('Incident GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const currentUser = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    const existingIncident = await db.incident.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!existingIncident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const allowedFields = [
      'title', 'description', 'severity', 'status', 'priority',
      'category', 'attackVector', 'impact', 'resolution',
    ];

    const updateData: Prisma.IncidentUpdateInput = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const oldValue = (existingIncident as Record<string, unknown>)[field];
        const newValue = body[field];
        if (oldValue !== newValue) {
          changes[field] = { from: oldValue, to: newValue };
          (updateData as Record<string, unknown>)[field] = newValue;
        }
      }
    }

    // Handle closedAt / closedBy when status changes to 'closed'
    if (body.status === 'closed' && existingIncident.status !== 'closed') {
      updateData.closedAt = new Date();
      updateData.closedBy = currentUser.id;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const incident = await db.incident.update({
      where: { id },
      data: updateData,
    });

    // Add timeline event for significant changes
    if (changes.status) {
      await db.incidentTimeline.create({
        data: {
          incidentId: id,
          event: `Status changed from ${changes.status.from} to ${changes.status.to}`,
          eventDate: new Date(),
        },
      });
    }
    if (changes.severity) {
      await db.incidentTimeline.create({
        data: {
          incidentId: id,
          event: `Severity changed from ${changes.severity.from} to ${changes.severity.to}`,
          eventDate: new Date(),
        },
      });
    }

    if (Object.keys(changes).length > 0) {
      await auditLog({
        userId: currentUser.id,
        action: 'incident.update',
        resource: 'incident',
        resourceId: id,
        details: { changes },
      });
    }

    cache.deleteByPrefix('dashboard:');
    cache.deleteByPrefix('incidents:');

    return NextResponse.json(incident);
  } catch (error) {
    console.error('Incident PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}
