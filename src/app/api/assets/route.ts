import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentOrgId, scopeOrg } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const criticality = searchParams.get('criticality');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let where: Prisma.AssetWhereInput = {};

    if (type) {
      where.type = { in: type.split(',') };
    }
    if (status) {
      where.status = { in: status.split(',') };
    }
    if (criticality) {
      where.criticality = { in: criticality.split(',') };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { ipAddress: { contains: search } },
        { macAddress: { contains: search } },
        { os: { contains: search } },
        { owner: { contains: search } },
        { department: { contains: search } },
        { location: { contains: search } },
      ];
    }

    where = scopeOrg(where, orgId);

    const skip = (page - 1) * pageSize;

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip,
        take: pageSize,
      }),
      db.asset.count({ where }),
    ]);

    return NextResponse.json({
      data: assets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Assets GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    const {
      name,
      type,
      ipAddress,
      macAddress,
      os,
      osVersion,
      status,
      criticality,
      owner,
      department,
      location,
      tags,
      metadata,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const asset = await db.asset.create({
      data: {
        orgId: orgId ?? undefined,
        name,
        type,
        ipAddress: ipAddress || null,
        macAddress: macAddress || null,
        os: os || null,
        osVersion: osVersion || null,
        status: status || 'active',
        criticality: criticality || 'medium',
        owner: owner || null,
        department: department || null,
        location: location || null,
        tags: tags || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Assets POST error:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
