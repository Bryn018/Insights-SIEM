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
    const rule = await db.detectionRule.findFirst({ where: { id, ...scopeOrg({}, orgId) } });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Rule GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch rule' }, { status: 500 });
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

    const existingRule = await db.detectionRule.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const allowedFields = [
      'name', 'description', 'query', 'queryLanguage', 'severity',
      'category', 'mitreTactic', 'mitreTechnique', 'tags',
      'enabled', 'schedule', 'lookback', 'threshold',
      'indexPattern', 'actions',
    ];

    const updateData: Prisma.DetectionRuleUpdateInput = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const oldValue = (existingRule as Record<string, unknown>)[field];
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

    updateData.updatedBy = currentUser.id;

    const rule = await db.detectionRule.update({
      where: { id },
      data: updateData,
    });

    if (Object.keys(changes).length > 0) {
      await auditLog({
        userId: currentUser.id,
        action: 'rule.update',
        resource: 'rule',
        resourceId: id,
        details: { changes },
      });
    }

    cache.deleteByPrefix('rules:');

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Rule PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    const existingRule = await db.detectionRule.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Soft delete - set enabled to false
    const rule = await db.detectionRule.update({
      where: { id },
      data: { enabled: false, updatedBy: currentUser.id },
    });

    await auditLog({
      userId: currentUser.id,
      action: 'rule.delete',
      resource: 'rule',
      resourceId: id,
      details: { softDelete: true, previousEnabled: existingRule.enabled },
    });

    cache.deleteByPrefix('rules:');

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error('Rule DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
