import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentOrgId, getCurrentUser, scopeOrg } from '@/lib/auth';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const integrations = await db.integration.findMany({
      where: scopeOrg({}, orgId),
      orderBy: { name: 'asc' },
    });

    // Parse config JSON
    const parsed = integrations.map((i) => ({
      ...i,
      config: safeJsonParse(i.config),
    }));

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error('Integrations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, config, enabled } = body;
    const currentUser = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const integration = await db.integration.create({
      data: {
        orgId: orgId ?? undefined,
        name,
        type,
        config: typeof config === 'string' ? config : JSON.stringify(config || {}),
        enabled: enabled !== undefined ? enabled : true,
      },
    });

    await auditLog({
      userId: currentUser.id,
      action: 'integration.create',
      resource: 'integration',
      resourceId: integration.id,
      details: { name, type },
    });

    cache.deleteByPrefix('integrations:');
    cache.deleteByPrefix('dashboard:');

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    console.error('Integrations POST error:', error);
    return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, config, enabled } = body;
    const currentUser = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.integration.findFirst({ where: { id, ...scopeOrg({}, orgId) } });
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (config !== undefined) {
      updateData.config = typeof config === 'string' ? config : JSON.stringify(config);
    }
    if (enabled !== undefined) updateData.enabled = enabled;

    const integration = await db.integration.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      userId: currentUser.id,
      action: 'integration.update',
      resource: 'integration',
      resourceId: id,
      details: { changes: updateData },
    });

    cache.deleteByPrefix('integrations:');
    cache.deleteByPrefix('dashboard:');

    return NextResponse.json(integration);
  } catch (error) {
    console.error('Integrations PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
  }
}

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
