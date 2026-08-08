import Link from 'next/link';

import { getReelsFeed } from '@/lib/reels';
import { getSiteSettings } from '@/lib/site-settings';

import { SidebarReelsStrip } from './sidebar-reels-strip';

// «الريلز» بالشريط الجانبيّ — تحت تريندينغ مباشرةً (نفس ترتيبها بالرئيسية: أسفل ودجت تريندينغ).
// نفس مصدر البيانات (getReelsFeed) ونفس بطاقة/موديل الرئيسية، برأس مضغوط بنمط السايدبار.
// بلا ريلز ⇒ يُخفى بصمت.
export async function SidebarReels({ locale = 'ar' }: { locale?: string } = {}) {
  const [reels, settings] = await Promise.all([getReelsFeed(null, locale), getSiteSettings(locale)]);
  if (reels.items.length === 0) return null;

  return (
    <div className="border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-primary bg-primary px-3 py-2">
        <span className="text-sm font-extrabold text-white">الريلز</span>
        <Link href="/reels" className="text-xs font-bold text-white/85 hover:text-white">
          المزيد
        </Link>
      </div>

      <SidebarReelsStrip
        items={reels.items}
        siteName={settings?.site_name || 'القلعة نيوز'}
        logo={settings?.logo_dark ?? settings?.logo_light ?? null}
      />
    </div>
  );
}
