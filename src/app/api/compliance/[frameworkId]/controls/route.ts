import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentUser } from '@/lib/auth';
import { cache } from '@/lib/cache';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ frameworkId: string }> }
) {
  try {
    const { frameworkId } = await params;
    const framework = await db.complianceFramework.findUnique({
      where: { id: frameworkId },
      include: {
        controls: {
          orderBy: { controlId: 'asc' },
        },
      },
    });

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    return NextResponse.json(framework);
  } catch (error) {
    console.error('Compliance controls GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch controls' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ frameworkId: string }> }
) {
  try {
    const { frameworkId } = await params;
    const body = await request.json();
    const { controlId, status, notes, evidence, assessedBy } = body;
    const currentUser = await getCurrentUser();

    if (!controlId) {
      return NextResponse.json({ error: 'controlId is required' }, { status: 400 });
    }

    const control = await db.complianceControl.findFirst({
      where: { id: controlId, frameworkId },
    });

    if (!control) {
      return NextResponse.json({ error: 'Control not found in this framework' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (evidence !== undefined) updateData.evidence = typeof evidence === 'string' ? evidence : JSON.stringify(evidence);
    if (status) {
      updateData.assessedAt = new Date();
      updateData.assessedBy = assessedBy || currentUser.id;
    }

    const updatedControl = await db.complianceControl.update({
      where: { id: controlId },
      data: updateData,
    });

    await auditLog({
      userId: currentUser.id,
      action: 'compliance.control_update',
      resource: 'compliance',
      resourceId: controlId,
      details: {
        frameworkId,
        controlId: control.controlId,
        changes: updateData,
      },
    });

    cache.deleteByPrefix('compliance:');
    cache.deleteByPrefix('dashboard:');

    return NextResponse.json(updatedControl);
  } catch (error) {
    console.error('Compliance control PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update control' }, { status: 500 });
  }
}
