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
    const { reason, assignToUserId } = body;
    const currentUser = await getCurrentUser();
    requirePermission(currentUser.role, 'analyst');
    const orgId = await getCurrentOrgId();

    const alert = await db.alert.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Change status to escalated
    const updatedAlert = await db.alert.update({
      where: { id },
      data: { status: 'escalated' },
    });

    // Create assignment if user specified
    if (assignToUserId) {
      await db.alertAssignment.create({
        data: {
          alertId: id,
          userId: assignToUserId,
          action: 'escalated',
        },
      });
    }

    // Create notification for the assigned user or all admins
    const notifyUserId = assignToUserId || currentUser.id;
    await db.notification.create({
      data: {
        userId: notifyUserId,
        type: 'alert',
        title: `Alert Escalated: ${alert.title}`,
        message: reason || `Alert "${alert.title}" has been escalated by ${currentUser.name}`,
        priority: alert.severity === 'critical' ? 'critical' : 'high',
        alertId: id,
      },
    });

    await auditLog({
      userId: currentUser.id,
      action: 'alert.escalate',
      resource: 'alert',
      resourceId: id,
      details: {
        previousStatus: alert.status,
        reason: reason || null,
        assignedTo: assignToUserId || null,
      },
    });

    cache.deleteByPrefix('dashboard:');
    cache.deleteByPrefix('alerts:');

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Alert escalate error:', error);
    return NextResponse.json({ error: 'Failed to escalate alert' }, { status: errorStatus(error) });
  }
}
