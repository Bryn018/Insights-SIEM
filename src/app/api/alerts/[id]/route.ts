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
    const alert = await db.alert.findFirst({
      where: { id, ...scopeOrg({}, orgId) },
      include: {
        assignedTo: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        incidents: {
          select: {
            incidentId: true,
            incident: { select: { id: true, title: true, severity: true, status: true } },
          },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Alert GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch alert' }, { status: 500 });
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

    const existingAlert = await db.alert.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const allowedFields = [
      'status', 'severity', 'category', 'title', 'description',
      'sourceIp', 'destIp', 'sourcePort', 'destPort', 'protocol',
      'hostname', 'mitreTactic', 'mitreTechnique', 'tags',
    ];

    // Handle comment addition via PATCH with { comment: "text" }
    if (typeof body.comment === 'string' && body.comment.trim()) {
      const newComment = await db.comment.create({
        data: {
          alertId: id,
          userId: currentUser.id,
          content: body.comment.trim(),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await auditLog({
        userId: currentUser.id,
        action: 'alert.comment',
        resource: 'alert',
        resourceId: id,
        details: { comment: body.comment.slice(0, 200) },
      });

      cache.deleteByPrefix('alerts:');
      return NextResponse.json(newComment);
    }

    const updateData: Prisma.AlertUpdateInput = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const oldValue = (existingAlert as Record<string, unknown>)[field];
        const newValue = body[field];
        if (oldValue !== newValue) {
          changes[field] = { from: oldValue, to: newValue };
          (updateData as Record<string, unknown>)[field] = newValue;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Track SLA timestamps on status transitions (real, for MTTA/MTTR).
    const newStatus = (updateData as Record<string, unknown>).status as string | undefined
    if (newStatus && newStatus !== existingAlert.status) {
      if (newStatus !== 'new' && !existingAlert.acknowledgedAt) {
        ;(updateData as Record<string, unknown>).acknowledgedAt = new Date()
      }
      if (newStatus === 'resolved' && !existingAlert.resolvedAt) {
        ;(updateData as Record<string, unknown>).resolvedAt = new Date()
      }
    }

    const alert = await db.alert.update({
      where: { id },
      data: updateData,
    });

    // Log all changes to audit log
    if (Object.keys(changes).length > 0) {
      await auditLog({
        userId: currentUser.id,
        action: 'alert.update',
        resource: 'alert',
        resourceId: id,
        details: { changes },
      });
    }

    // Invalidate caches
    cache.deleteByPrefix('dashboard:');
    cache.deleteByPrefix('alerts:');

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Alert PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
