import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentOrgId, getCurrentUser, scopeOrg } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { alertId } = body;
    const currentUser = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }

    const [incident, alert] = await Promise.all([
      db.incident.findFirst({ where: { id, ...scopeOrg({}, orgId) } }),
      db.alert.findFirst({ where: { id: alertId, ...scopeOrg({}, orgId) } }),
    ]);

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Check if already linked
    const existing = await db.incidentAlert.findFirst({
      where: { incidentId: id, alertId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Alert already linked to this incident' }, { status: 409 });
    }

    const link = await db.incidentAlert.create({
      data: { incidentId: id, alertId },
      include: {
        alert: { select: { id: true, title: true, severity: true, status: true } },
      },
    });

    // Add timeline event
    await db.incidentTimeline.create({
      data: {
        incidentId: id,
        event: `Alert "${alert.title}" linked to incident`,
        eventDate: new Date(),
      },
    });

    await auditLog({
      userId: currentUser.id,
      action: 'incident.link_alert',
      resource: 'incident',
      resourceId: id,
      details: { alertId },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Incident link alert error:', error);
    return NextResponse.json({ error: 'Failed to link alert' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const alertId = searchParams.get('alertId');
    const currentUser = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    if (!alertId) {
      return NextResponse.json({ error: 'alertId query parameter is required' }, { status: 400 });
    }

    const incident = await db.incident.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const link = await db.incidentAlert.findFirst({
      where: { incidentId: id, alertId },
    });

    if (!link) {
      return NextResponse.json({ error: 'Alert not linked to this incident' }, { status: 404 });
    }

    await db.incidentAlert.delete({ where: { id: link.id } });

    // Add timeline event
    const alert = await db.alert.findUnique({ where: { id: alertId } });
    await db.incidentTimeline.create({
      data: {
        incidentId: id,
        event: `Alert "${alert?.title || alertId}" unlinked from incident`,
        eventDate: new Date(),
      },
    });

    await auditLog({
      userId: currentUser.id,
      action: 'incident.unlink_alert',
      resource: 'incident',
      resourceId: id,
      details: { alertId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Incident unlink alert error:', error);
    return NextResponse.json({ error: 'Failed to unlink alert' }, { status: 500 });
  }
}
