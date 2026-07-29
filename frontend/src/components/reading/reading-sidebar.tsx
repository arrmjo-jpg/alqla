import { AdZone } from '@/components/ads/ad-zone';

import { SidebarFollowUs } from './sidebar-follow-us';
import { SidebarNewsWidget } from './sidebar-news-widget';
import { SidebarSpecialCorner } from './sidebar-special-corner';
import { SidebarTodayMatches } from './sidebar-today-matches';
import { SidebarTrending } from './sidebar-trending';

// الشريط الجانبيّ المشترك لصفحات القراءة (المقال + الصفحات الثابتة + الأقسام): إعلان حيّ
// (AdZone — client island، no-store) فوق ودجت الأخبار، يليه زاوية خاصة (3 أخبار) + الرائج الآن +
// مباريات اليوم + روابط متابعة السوشيل ميديا. كلّ قسم يُخفي نفسه بصمت لو بلا محتوى حقيقيّ (لا
// عنصر فارغ). مصدر واحد للجانب (DRY) بدل تكراره في كلّ صفحة.
export function ReadingSidebar({ locale = 'ar' }: { locale?: string } = {}) {
  return (
    <div className="space-y-6">
      <AdZone zone="ads_in_side" />
      <SidebarNewsWidget locale={locale} />
      <SidebarSpecialCorner locale={locale} />
      <SidebarTrending locale={locale} />
      <SidebarTodayMatches />
      <SidebarFollowUs locale={locale} />
    </div>
  );
}
