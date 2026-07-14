import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentOrgId, getCurrentUser, requirePermission, errorStatus, scopeOrg } from '@/lib/auth';
import { cache } from '@/lib/cache';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    requirePermission(currentUser.role, 'admin');
    const orgId = await getCurrentOrgId();

    const rule = await db.detectionRule.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const newEnabled = !rule.enabled;
    const updatedRule = await db.detectionRule.update({
      where: { id },
      data: { enabled: newEnabled, updatedBy: currentUser.id },
    });

    await auditLog({
      userId: currentUser.id,
      action: newEnabled ? 'rule.enable' : 'rule.disable',
      resource: 'rule',
      resourceId: id,
      details: { previousEnabled: rule.enabled, newEnabled },
    });

    cache.deleteByPrefix('rules:');

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Rule toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle rule' }, { status: errorStatus(error) });
  }
}
