import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requirePermission, errorStatus } from '@/lib/auth'

// Ensure the single global policy row exists.
async function ensurePolicy() {
  const existing = await db.retentionPolicy.findUnique({ where: { id: 'global' } })
  if (existing) return existing
  return db.retentionPolicy.create({ data: { id: 'global' } })
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    requirePermission(user.role, 'analyst')
    const policy = await ensurePolicy()
    return NextResponse.json(policy)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load retention policy' }, { status: errorStatus(error) })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    requirePermission(user.role, 'admin')
    const body = await request.json()
    const { alertRetentionDays, incidentRetentionDays, legalHold } = body

    const data: Record<string, unknown> = { updatedBy: user.id }
    if (typeof alertRetentionDays === 'number' && alertRetentionDays >= 0) {
      data.alertRetentionDays = alertRetentionDays
    }
    if (typeof incidentRetentionDays === 'number' && incidentRetentionDays >= 0) {
      data.incidentRetentionDays = incidentRetentionDays
    }
    if (typeof legalHold === 'boolean') {
      data.legalHold = legalHold
    }

    const policy = await db.retentionPolicy.upsert({
      where: { id: 'global' },
      update: data,
      create: { id: 'global', ...(data as { alertRetentionDays?: number; incidentRetentionDays?: number; legalHold?: boolean; updatedBy?: string }) },
    })
    return NextResponse.json(policy)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update retention policy' }, { status: errorStatus(error) })
  }
}
