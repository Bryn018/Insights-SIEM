import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentOrgId, scopeOrg } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getCurrentOrgId();
    const incident = await db.incident.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const timeline = await db.incidentTimeline.findMany({
      where: { incidentId: id },
      orderBy: { eventDate: 'desc' },
    });

    return NextResponse.json({ data: timeline });
  } catch (error) {
    console.error('Incident timeline GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { event, eventDate } = body;
    const orgId = await getCurrentOrgId();

    if (!event) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 });
    }

    const incident = await db.incident.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const timelineEntry = await db.incidentTimeline.create({
      data: {
        incidentId: id,
        event,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
      },
    });

    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error) {
    console.error('Incident timeline POST error:', error);
    return NextResponse.json({ error: 'Failed to add timeline event' }, { status: 500 });
  }
}
