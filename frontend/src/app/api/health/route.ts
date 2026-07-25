import { NextResponse } from 'next/server';

// فحص جاهزية الحاوية (docker-compose.yml healthcheck) — بلا cookies()/headers() أو أي نداء ديناميكي
// آخر، فلا يُطلق Render كامل للصفحة الرئيسية ولا أي نداء لـ Laravel API عند كل نبضة فحص.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok' });
}
