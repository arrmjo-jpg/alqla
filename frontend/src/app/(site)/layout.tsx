import { AdBatchProvider, AdZone } from '@/components/ads/ad-zone';
import { BreakingNewsBar } from '@/components/layout/breaking-news-bar';
import { CookiePolicyModal } from '@/components/layout/cookie-policy-modal';
import { HomeOnly } from '@/components/layout/home-only';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { NewsTicker } from '@/components/layout/news-ticker';
import { QalahFooter } from '@/components/layout/qalah/footer';
import { QalahHeader } from '@/components/layout/qalah/header';
import { QalahNavbar } from '@/components/layout/qalah/navbar';
import { getHomepageFeed } from '@/lib/feed';
import { getSiteSettings } from '@/lib/site-settings';
import { DesktopViewProvider } from '@/lib/desktop-view-context';
import { MobileTopToggleBanner } from '@/components/layout/desktop-view-toggle';

import { NetworkGrid } from '@/components/home/network-grid';
import { TopNewsCarousel } from '@/components/home/top-news-carousel';

// قشرة الموقع العامّ — تصميم «القلعة نيوز» الجديد، مُنطّق داخل .qalah-skin (إطار 1450px + هويّة).
// الإعلانات وقوائم الموبايل ومودال الكوكيز تبقى كما كانت. لوحة /account خارج هذه المجموعة بقالبها الخاصّ.
// التراجع للقشرة القديمة: استبدل QalahNavbar/QalahHeader/QalahFooter بـ SiteHeader/SectionsBar/SiteFooter
// واحذف صنفَي qalah-skin/site-frame من الغلاف (المكوّنات القديمة ما زالت بمكانها).
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, homepageData] = await Promise.all([
    getSiteSettings(),
    getHomepageFeed('ar'),
  ]);
  const { latest, breaking } = homepageData;


  return (
    <DesktopViewProvider>
      <div className={`qalah-skin site-frame${breaking.length > 0 ? ' has-breaking' : ''}`}>
      {/* مزوّد دفعة الإعلانات — طلب واحد لكلّ مساحات الصفحة (chrome + مساحات الصفحة). page يُشتقّ من المسار. */}
      <AdBatchProvider>
      <MobileTopToggleBanner />

      {/* إعلان بداية الموقع — أعلى كلّ شيء (قبل الشريط العلويّ والهيدر)، في كلّ صفحات الموقع. */}
      <AdZone zone="aalan_fwq_alhydr_fy_bdaya_almwqa" className="flex justify-center px-4 py-2" />

      {/* الشريط الأسود العلويّ (سوشال outline + روابط الوسائط بمساراتها الحقيقيّة) */}
      <QalahNavbar social={settings?.social} />

      {/* إعلان فوق الهيدر — AdZone القائم (client، no-store، تتبّع كامل)؛ بلا إعلان ⇒ صفر مساحة. */}
      <AdZone zone="aalan_fwq_alhydr" className="flex justify-center px-4 py-2" />

      {/* الهيدر الأبيض (سوشال/شعار/بحث/بث/حساب + شريط الأقسام) */}
      <QalahHeader />

      {/* الشريط الإخباريّ — آخر ١٠ أخبار تحت المنيو (آلة كاتبة على الديسكتوب / تكير متحرّك على الجوّال). */}
      <NewsTicker items={latest.slice(0, 10).map((i) => ({ id: i.id, title: i.title, href: i.href }))} />

      {/* شريط الأخبار العاجلة (يظهر تحت الشريط الإخباري في حال وجود عاجل) */}
      <BreakingNewsBar items={breaking.slice(0, 5).map((i) => ({ id: i.id, title: i.title, href: i.href }))} />

      {/* إعلان كبير (leaderboard) أسفل الهيدر مباشرة — صفّ كامل بعرض الحاوية. */}
      <AdZone
        zone="aalan_kbyr_asfl_alhydr_mbashra"
        className="mx-auto mt-6 flex w-full max-w-[1200px] justify-center px-4 sm:px-6 lg:px-8"
      />

      {/* الإعلانات وشبكة الأخبار على الرئيسية فقط (HomeOnly) */}
      <HomeOnly>
        {/* الكروسيل الجديد تحت الشريط الإخباري (يظهر في الرئيسية فقط) */}
        <TopNewsCarousel items={latest.filter((i) => i.is_squares).slice(0, 10)} />

        {/* إعلان السلايدر الكبير (aalan_fy_qsm_slaydr_kbyr_1410) — إعلان واحد كبير فوق الهيرو والإعلانين. */}
        <AdZone zone="aalan_fy_qsm_slaydr_kbyr_1410" className="mb-2 flex justify-center px-4" />
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <AdZone zone="aalan_asfl_alhydr_mbashra_ymyn" className="mt-1 flex justify-center sm:flex-1" />
          <AdZone zone="aalan_asfl_alhydr_mbashra_shmal" className="mt-1 flex justify-center sm:flex-1" />
        </div>
      </HomeOnly>

      <main className="flex-1">{children}</main>

      <QalahFooter />

      {/* فاصل يمنع شريط التنقّل السفليّ الثابت من تغطية آخر الفوتر على الموبايل */}
      <div className="h-14 lg:hidden" aria-hidden />
      <MobileBottomNav />

      <CookiePolicyModal text={settings?.cookie_policy?.trim() || ''} hideTrigger autoOpenKey="acm_cookie_ack" />
      </AdBatchProvider>
      </div>
    </DesktopViewProvider>
  );
}
