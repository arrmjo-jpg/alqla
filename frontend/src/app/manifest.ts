import type { MetadataRoute } from 'next';

import { getSiteSettings } from '@/lib/site-settings';

// أبعاد PNG من ترويسة IHDR: توقيع 8 بايت، ثمّ العرض (uint32) عند الإزاحة 16 والارتفاع عند 20 (big-endian).
// نعيد "WxH" لنصرّح بالحجم الحقيقيّ في الـmanifest؛ تعذّر ⇒ null.
async function readPngSize(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null; // ليس PNG
    const view = new DataView(bytes.buffer);
    const w = view.getUint32(16);
    const h = view.getUint32(20);
    return w && h ? `${w}x${h}` : null;
  } catch {
    return null;
  }
}

// Web App Manifest — name/description/icons من إعدادات الموقع (لا ملفّات ثابتة). RTL/عربيّة.
// الأيقونة: SVG قابلة للتحجيم (sizes:"any")؛ PNG نُصرّح بأبعادها الحقيقيّة كي لا يشتكي المتصفّح
// «Resource size is not correct». تعذّرت القراءة ⇒ نُسقط الأيقونة بدل ادّعاء حجم خاطئ.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSiteSettings();
  const name = s?.site_name?.trim() || 'AlphaCMS';

  const favicon = s?.favicon?.trim();
  let icons: MetadataRoute.Manifest['icons'] = [];
  if (favicon) {
    if (/\.svg(?:$|\?)/i.test(favicon)) {
      icons = [{ src: favicon, sizes: 'any', type: 'image/svg+xml' }];
    } else {
      const sizes = await readPngSize(favicon);
      if (sizes) icons = [{ src: favicon, sizes, type: 'image/png' }];
    }
  }

  return {
    name,
    short_name: name,
    description: s?.description?.trim() || undefined,
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#ffffff',
    theme_color: '#c8102e',
    icons,
  };
}
