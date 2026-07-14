import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentOrgId, getCurrentUser, requirePermission, errorStatus, scopeOrg } from '@/lib/auth';
import { cache } from '@/lib/cache';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, action } = body;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(currentUser.role, 'analyst');
    const orgId = await getCurrentOrgId();

    const alert = await db.alert.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Check if already assigned to this user
    const existing = await db.alertAssignment.findFirst({
      where: { alertId: id, userId: userId || currentUser.id },
    });

    if (existing) {
      return NextResponse.json({ error: 'Alert already assigned to this user' }, { status: 409 });
    }

    const assignment = await db.alertAssignment.create({
      data: {
        alertId: id,
        userId: userId || currentUser.id,
        action: action || 'assigned',
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Update alert status to acknowledged if it was new
    if (alert.status === 'new') {
      await db.alert.update({
        where: { id },
        data: { status: 'acknowledged' },
      });
    }

    await auditLog({
      userId: currentUser.id,
      action: 'alert.assign',
      resource: 'alert',
      resourceId: id,
      details: { assignedTo: userId || currentUser.id, action: action || 'assigned' },
    });

    cache.deleteByPrefix('dashboard:');
    cache.deleteByPrefix('alerts:');

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Alert assign error:', error);
    return NextResponse.json({ error: 'Failed to assign alert' }, { status: errorStatus(error) });
  }
}
