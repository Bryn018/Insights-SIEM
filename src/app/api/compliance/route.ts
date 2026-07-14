import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function GET() {
  try {
    const cached = cache.get<unknown>('compliance:frameworks');
    if (cached) return NextResponse.json(cached);

    const frameworks = await db.complianceFramework.findMany({
      include: {
        controls: {
          select: {
            status: true,
          },
        },
        _count: {
          select: { controls: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = frameworks.map((fw) => {
      const statusCounts: Record<string, number> = {
        compliant: 0,
        non_compliant: 0,
        partially_compliant: 0,
        not_assessed: 0,
        not_applicable: 0,
      };

      for (const control of fw.controls) {
        statusCounts[control.status] = (statusCounts[control.status] || 0) + 1;
      }

      const assessableControls = fw._count.controls - (statusCounts.not_applicable || 0);
      const compliantScore = assessableControls > 0
        ? Math.round(
            ((statusCounts.compliant + statusCounts.partially_compliant * 0.5) /
              assessableControls) *
              100
          )
        : 0;

      return {
        id: fw.id,
        name: fw.name,
        version: fw.version,
        description: fw.description,
        totalControls: fw._count.controls,
        statusCounts,
        complianceScore: compliantScore,
        createdAt: fw.createdAt,
        updatedAt: fw.updatedAt,
      };
    });

    const responseData = { data: result };
    cache.set('compliance:frameworks', responseData, 1_000);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Compliance GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch compliance frameworks' }, { status: 500 });
  }
}
