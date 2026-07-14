import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog, getCurrentUser } from '@/lib/auth';
import { cache } from '@/lib/cache';
import { Prisma } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.asset.findUnique({ where: { id } });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Asset GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
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

    const existingAsset = await db.asset.findUnique({ where: { id } });
    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const allowedFields = [
      'name', 'type', 'ipAddress', 'macAddress', 'os', 'osVersion',
      'status', 'criticality', 'owner', 'department', 'location',
      'tags', 'metadata', 'lastSeenAt',
    ];

    const updateData: Prisma.AssetUpdateInput = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const oldValue = (existingAsset as Record<string, unknown>)[field];
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

    const asset = await db.asset.update({
      where: { id },
      data: updateData,
    });

    if (Object.keys(changes).length > 0) {
      await auditLog({
        userId: currentUser.id,
        action: 'asset.update',
        resource: 'asset',
        resourceId: id,
        details: { changes },
      });
    }

    cache.deleteByPrefix('assets:');
    cache.deleteByPrefix('dashboard:');

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Asset PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    const existingAsset = await db.asset.findUnique({ where: { id } });
    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    await db.asset.delete({ where: { id } });

    await auditLog({
      userId: currentUser.id,
      action: 'asset.delete',
      resource: 'asset',
      resourceId: id,
      details: { name: existingAsset.name, type: existingAsset.type },
    });

    cache.deleteByPrefix('assets:');
    cache.deleteByPrefix('dashboard:');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Asset DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
