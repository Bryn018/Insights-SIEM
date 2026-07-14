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
    const { reason } = body;
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

    if (alert.status === 'suppressed') {
      return NextResponse.json({ error: 'Alert is already suppressed' }, { status: 409 });
    }

    const updatedAlert = await db.alert.update({
      where: { id },
      data: { status: 'suppressed' },
    });

    await auditLog({
      userId: currentUser.id,
      action: 'alert.suppress',
      resource: 'alert',
      resourceId: id,
      details: {
        previousStatus: alert.status,
        reason: reason || null,
      },
    });

    cache.deleteByPrefix('dashboard:');
    cache.deleteByPrefix('alerts:');

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Alert suppress error:', error);
    return NextResponse.json({ error: 'Failed to suppress alert' }, { status: errorStatus(error) });
  }
}
