import { NextResponse } from 'next/server';

import { env } from '@/lib/env';

// BFF: GET /api/ads/batch?page=&locale=&device= → GET /api/v1/ads?page=&locale=&device=
// دفعة **كلّ مساحات الصفحة** في استجابة واحدة (بدل طلب لكل مساحة). عقد Cache/CDN كنقطة العرض المفردة:
// cache:'no-store' (رموز الانطباع صالحة ضمن نافذة الدلو الخادميّة فقط). يمرّر X-Client-Id (فاعل/throttle).
// يرجع { bucket, zones, expires_in } فقط. لا نظام جديد: نمط BFF القائم + env القائم.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' } as const;
const KEY_RE = /^[a-z0-9_]+$/;

const EMPTY = { bucket: 0, zones: {}, expires_in: 0 } as const;

export async function GET(request: Request): Promise<Response> {
  if (!env.apiBaseUrl) {
    return NextResponse.json(EMPTY, { headers: NO_STORE });
  }

  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams({
    locale: searchParams.get('locale') ?? 'ar',
    device: searchParams.get('device') ?? 'desktop',
  });
  const page = searchParams.get('page');
  if (page && KEY_RE.test(page)) query.set('page', page);
  const zones = searchParams.get('zones');
  if (zones) query.set('zones', zones);

  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/ads?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Client-Id': request.headers.get('x-client-id') ?? '',
      },
    });
    const json: {
      data?: { bucket?: number; zones?: Record<string, unknown> };
      meta?: { expires_in?: number };
    } = await res.json().catch(() => ({}));

    const body = res.ok
      ? {
          bucket: json?.data?.bucket ?? 0,
          zones: json?.data?.zones ?? {},
          expires_in: json?.meta?.expires_in ?? 30,
        }
      : EMPTY;

    return NextResponse.json(body, { headers: NO_STORE });
  } catch {
    return NextResponse.json(EMPTY, { headers: NO_STORE });
  }
}
