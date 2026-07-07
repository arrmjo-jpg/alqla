import { env } from '@/lib/env';

export async function GET(request: Request) {
  const sitemap = new URL(request.url).pathname.split('/').pop()?.replace('.xml', '') ?? '';
  const filename = `${sitemap}.xml`;
  const backendUrl = env.apiBaseUrl.replace(/\/api\/v1$/, '').replace(/\/v1$/, '');
  const siteUrl = env.siteUrl;

  try {
    const res = await fetch(`${backendUrl}/${filename}`, {
      headers: { ...env.internalHeaders },
      cache: 'no-store',
    });
    if (!res.ok) return new Response('Not Found', { status: 404 });
    let xml = await res.text();
    // Replace all backend URLs in XML with the Next.js siteUrl
    xml = xml.replaceAll(backendUrl, siteUrl);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    });
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }
}
