import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';

    const currentUser = await getCurrentUser();

    const where = {
      userId: currentUser.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const skip = (page - 1) * pageSize;

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: [
          { read: 'asc' },  // Unread first
          { createdAt: 'desc' },
        ],
        skip,
        take: pageSize,
        include: {
          alert: {
            select: { id: true, title: true, severity: true, status: true },
          },
        },
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: { userId: currentUser.id, read: false },
      }),
    ]);

    return NextResponse.json({
      data: notifications,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAllRead } = body;
    const currentUser = await getCurrentUser();

    if (markAllRead) {
      await db.notification.updateMany({
        where: {
          userId: currentUser.id,
          read: false,
        },
        data: { read: true },
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: currentUser.id,
        },
        data: { read: true },
      });

      return NextResponse.json({ success: true, message: `${notificationIds.length} notifications marked as read` });
    }

    return NextResponse.json(
      { error: 'Provide notificationIds array or markAllRead: true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
