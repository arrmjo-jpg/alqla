import { NextResponse } from 'next/server';

import { getUnreadCount } from '@/lib/account';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const unread = user ? await getUnreadCount() : 0;
    
    return NextResponse.json({ user, unread }, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json({ user: null, unread: 0 }, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  }
}
