import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentUser } from '@/lib/auth';
import { cache } from '@/lib/cache';

export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Parse JSON values
    const parsed = settings.map((s) => ({
      ...s,
      value: safeJsonParse(s.value),
    }));

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const currentUser = await getCurrentUser();

    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json(
        { error: 'Request body must contain a settings array with { key, value } objects' },
        { status: 400 }
      );
    }

    const results: unknown[] = [];
    for (const setting of body.settings) {
      if (!setting.key) continue;

      const value = typeof setting.value === 'string'
        ? setting.value
        : JSON.stringify(setting.value);

      const result = await db.systemSetting.upsert({
        where: { key: setting.key },
        update: { value },
        create: { key: setting.key, value },
      });

      results.push(result);
    }

    await auditLog({
      userId: currentUser.id,
      action: 'settings.update',
      resource: 'setting',
      details: {
        updatedKeys: body.settings.map((s: { key: string }) => s.key),
      },
    });

    cache.deleteByPrefix('settings:');

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
