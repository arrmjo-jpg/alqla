import { AdZone } from '@/components/ads/ad-zone';
import { EconomyShowcase } from '@/components/economy/economy-showcase';
import { CategoryCarousel } from '@/components/home/category-carousel';
import { CategoryFeatureQuad } from '@/components/home/category-feature-quad';
import { CategoryGridPair } from '@/components/home/category-grid-pair';
import { EditorialCategorySection } from '@/components/home/category-editorial-section';
import { FeaturedHero } from '@/components/home/featured-hero';
import { IncidentsSection } from '@/components/home/incidents-section';
import { LatestUpdates } from '@/components/home/latest-updates';
import { ObituariesSection } from '@/components/home/obituaries-section';
import { ReelsCarousel } from '@/components/home/reels-carousel';
import { TrendingLatestMostRead } from '@/components/home/trending-latest-mostread';
import { WeekStories } from '@/components/home/week-stories';
import { SubscribeBox } from '@/components/public-forms/subscribe-box';
import { SportsShowcase } from '@/components/sport/sports-showcase';
import { VideoSection } from '@/components/videos/video-section';
import { WeatherFeature } from '@/components/weather/weather-feature';
import { getHeroFeed } from '@/lib/feed';
import { getReelsFeed } from '@/lib/reels';
import { getSiteSettings } from '@/lib/site-settings';

// الصفحة الرئيسية — كتل: الهيرو (is_featured) + أقسام مختلطة (بعضها بتصميمه الأصليّ، وبعضها كروسل).
// ISR = سقف أمان (ساعة)؛ التحديث حدثيّ عبر الوسوم. تاج «تغطية خاصة» يظهر على البطاقات عند توفّر العلم.
export const revalidate = 3600;

// أقسام الأخبار السفليّة على شكل كروسل (محليات/اخبار الناس/مقالات/حوادث بتصاميمها الأصليّة فوق؛
// جامعات وأخبار ثقافية نُقلا تحت ودجت تريندينغ مباشرةً). **مصدر واحد بالـID الثابت** (لا slug؛
// الـID لا يتغيّر، يُحلّ وقت التشغيل). القسم الفارغ يُخفى تلقائيًّا. (مُعرّفات فيرتكس.)
const CATEGORY_CAROUSELS = [
  { categoryId: 53, fallbackTitle: 'تكنولوجيا' },
] as const;

export default async function Home() {
  const [heroItems, reels, settings] = await Promise.all([
    getHeroFeed(),
    getReelsFeed(),
    getSiteSettings(),
  ]);
  return (
    <>
      <FeaturedHero items={heroItems} />
      {/* إعلان كبير أسفل الهيرو مباشرةً (aalan_kbyr_asfl_alhyrw_1410) — إعلان واحد، الرئيسيّة فقط. */}
      <AdZone zone="aalan_kbyr_asfl_alhyrw_1410" className="mt-2 flex justify-center px-4" />
      {/* زوج إعلانات أسفل السلايدر مباشرةً — جمب بعض على المتصفّح، تحت بعض على الجوّال. */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
        <AdZone zone="aalan_asfl_alslaydr_mbarshraymyn" className="mt-1 flex justify-center sm:flex-1" />
        <AdZone zone="aalan_asfl_alslaydr_mbarshra_shmal" className="mt-1 flex justify-center sm:flex-1" />
      </div>
      {/* زوج إعلانات فوق أوّل قسم. */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
        <AdZone zone="aalan_fwq_akhr_almstjdat_ymyn" className="mt-1 flex justify-center sm:flex-1" />
        <AdZone zone="aalan_fwq_akhr_almstjdat_shmal" className="mt-1 flex justify-center sm:flex-1" />
      </div>
      {/* أخبار محلية — التصميم الأصليّ (LatestUpdates، بالـID الثابت #2). */}
      <LatestUpdates categoryId={2} fallbackTitle="أخبار محلية" />
      {/* برلمانيات — 4 أخبار (كبير + 3 صغار، بلا سكرول جوّال) (#36). */}
      <CategoryFeatureQuad categoryId={36} fallbackTitle="برلمانيات" />
      {/* شريط الاشتراك في واتساب. */}
      <SubscribeBox variant="bar" />
      {/* عربي دولي — 4 أخبار (كبير + 3 صغار، بلا سكرول جوّال) (#43). */}
      <CategoryFeatureQuad categoryId={43} fallbackTitle="عربي دولي" />
      {/* أخبار ثقافية — تحت عربي دولي مباشرةً: 5 أخبار (كبير + 4 صغار، بلا سكرول) (#56). */}
      <CategoryFeatureQuad categoryId={56} fallbackTitle="أخبار ثقافية" count={5} />
      {/* ضيف الأسبوع — تحت أخبار ثقافية مباشرةً (تصنيف #58): ٤ مقالات بنمط بطاقات أفقيّة فاتحة. */}
      <WeekStories categoryId={58} fallbackTitle="ضيف الأسبوع" />
      {/* قسم الاقتصاد (تصميم خاصّ: بورصة + ذهب). */}
      <EconomyShowcase />
      {/* ودجت 3 أعمدة: تريندينغ + آخر المستجدات + الأكثر قراءة. */}
      <TrendingLatestMostRead />
      {/* تحت الودجت مباشرةً: جامعات (4 أخبار: كبير + 3 صغار، بلا سكرول). */}
      <CategoryFeatureQuad categoryId={42} fallbackTitle="جامعات" />
      {/* قسم الوفيات/التعزية — تصميم خاصّ مع آية قرآنيّة، أسفل أخبار ثقافية مباشرةً. */}
      <ObituariesSection categoryId={49} fallbackTitle="الوفيات" />
      {/* زوج إعلانات فوق الريلز. */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
        <AdZone zone="aalan_fwq_qsm_alrylz_ymyn" className="mt-1 flex justify-center sm:flex-1" />
        <AdZone zone="aalan_fwq_qsm_alrylz_shmal" className="mt-1 flex justify-center sm:flex-1" />
      </div>
      <ReelsCarousel
        items={reels.items}
        siteName={settings?.site_name || 'صدى الشعب الأخباري'}
        logo={settings?.logo_dark ?? settings?.logo_light ?? null}
      />
      {/* إعلان كبير فوق بقيّة الأقسام. */}
      <AdZone
        zone="aalan_kbyr_fwq_qsm_alakthr_shywha"
        className="mx-auto mt-3 flex w-full max-w-[1200px] justify-center px-4 sm:px-6 lg:px-8"
      />
      {/* اخبار الناس — التصميم الأصليّ (تحريريّ). */}
      <EditorialCategorySection categoryId={31} headingId="people-news-heading" fallbackTitle="اخبار الناس" />
      {/* «مقالات» و«مقالات مختارة» انتقلا إلى ودجت تريندينغ (كاروسيل الكُتّاب) أعلاه — أُزيلا هنا لمنع التكرار.
          و«ضيف الأسبوع» نُقِل تحت «أخبار ثقافية» أعلاه. */}
      {/* أخبار الفن — بتصميم القسم (شبكة بطاقات عائمة)، محلّ «حوادث» سابقًا. */}
      <IncidentsSection categoryId={37} headingId="art-heading" fallbackTitle="أخبار الفن" />
      {/* قسم الرياضة — نظير الاقتصاد بطابعٍ رياضيّ + جدول ترتيب الدوري مباشرةً من 365Scores (محلّ كروسل رياضة). */}
      <SportsShowcase />
      {/* قسم الطقس السينمائيّ — أسفل الرياضة: بطاقة «اليوم» الكبيرة (حرارة + إحساس + رطوبة/رياح + شروق/غروب) + الأسبوع. */}
      <WeatherFeature />
      {/* قسمان شبكة 2×2 — صحة وجمال + منوعات — تحت الطقس (بدل كروسليهما السابقين). */}
      <CategoryGridPair
        categories={[
          { categoryId: 51, fallbackTitle: 'صحة وجمال' },
          { categoryId: 55, fallbackTitle: 'منوعات' },
        ]}
      />
      {/* بقيّة أقسام الأخبار — كروسلات. */}
      {CATEGORY_CAROUSELS.map((s) => (
        <CategoryCarousel key={s.categoryId} categoryId={s.categoryId} fallbackTitle={s.fallbackTitle} />
      ))}
      {/* قسم الفيديو — آخر شيء فوق الفوتر. */}
      <VideoSection />
    </>
  );
}
