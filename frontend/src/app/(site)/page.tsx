import { Suspense } from 'react';

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
import { SubscribeBox } from '@/components/public-forms/subscribe-box';
import { SportsShowcase } from '@/components/sport/sports-showcase';
import { VideoSection } from '@/components/videos/video-section';
import { WeatherWrapper } from '@/components/weather/weather-wrapper';
import { getHomepageFeed } from '@/lib/feed';
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

function SectionLoader() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 mt-6">
      <div className="h-[250px] w-full animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}

export default async function Home() {
  const [homepageData, reels, settings] = await Promise.all([
    getHomepageFeed('ar'),
    getReelsFeed(),
    getSiteSettings(),
  ]);
  
  const heroItems = homepageData.hero;
  const editorsPick = homepageData.editors_pick;

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
      <Suspense fallback={<SectionLoader />}>
        <LatestUpdates categoryId={2} fallbackTitle="أخبار محلية" />
      </Suspense>

      {/* برلمانيات — 8 أخبار (كبير + 7 صغار، بلا سكرول جوّال) (#36) بخلفية صورة شفافة. */}
      <Suspense fallback={<SectionLoader />}>
        <CategoryFeatureQuad
          categoryId={36}
          fallbackTitle="برلمانيات"
          count={8}
          bgImage="https://middle-east-online.com/sites/default/files/styles/home_special_coverage_1920xauto/public/2021-05/jo_0.jpg?itok=NWiLImq5"
        />
      </Suspense>

      {/* شريط الاشتراك في واتساب. */}
      <SubscribeBox variant="bar" />

      {/* عربي دولي — 8 أخبار (كبير + 7 صغار، بلا سكرول جوّال) (#43). */}
      <Suspense fallback={<SectionLoader />}>
        <CategoryFeatureQuad categoryId={43} fallbackTitle="عربي دولي" count={8} />
      </Suspense>

      {/* أخبار ثقافية — تحت عربي دولي مباشرةً: 10 أخبار (كبير + 9 صغار، بلا سكرول) (#56) بخلفية صورة شفافة. */}
      <Suspense fallback={<SectionLoader />}>
        <CategoryFeatureQuad
          categoryId={56}
          fallbackTitle="أخبار ثقافية"
          count={10}
          bgImage="https://cnn-arabic-images.cnn.io/cloudinary/image/upload/w_1280,h_720,c_fill,q_auto,g_center/cnnarabic/2024/10/13/images/280022.jpg"
        />
      </Suspense>

      {/* ضيف الأسبوع — تحت أخبار ثقافية مباشرةً (تصنيف #58): 8 أخبار بنمط بطاقات عائمة. */}
      <Suspense fallback={<SectionLoader />}>
        <IncidentsSection categoryId={58} headingId="week-stories-heading" fallbackTitle="ضيف الأسبوع" count={8} />
      </Suspense>

      {/* قسم الاقتصاد (تصميم خاصّ: بورصة + ذهب). */}
      <Suspense fallback={<SectionLoader />}>
        <EconomyShowcase />
      </Suspense>

      {/* ودجت 3 أعمدة: تريندينغ + آخر المستجدات + الأكثر قراءة. */}
      <Suspense fallback={<SectionLoader />}>
        <TrendingLatestMostRead editorsPick={editorsPick} />
      </Suspense>

      {/* تحت الودجت مباشرةً: جامعات (4 أخبار: كبير + 3 صغار، بلا سكرول). */}
      <Suspense fallback={<SectionLoader />}>
        <CategoryFeatureQuad categoryId={42} fallbackTitle="جامعات" />
      </Suspense>

      {/* قسم الوفيات/التعزية — تصميم خاصّ مع آية قرآنيّة، أسفل أخبار ثقافية مباشرةً. */}
      <Suspense fallback={<SectionLoader />}>
        <ObituariesSection categoryId={49} fallbackTitle="الوفيات" count={8} />
      </Suspense>

      {/* زوج إعلانات فوق الريلز. */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
        <AdZone zone="aalan_fwq_qsm_alrylz_ymyn" className="mt-1 flex justify-center sm:flex-1" />
        <AdZone zone="aalan_fwq_qsm_alrylz_shmal" className="mt-1 flex justify-center sm:flex-1" />
      </div>

      <Suspense fallback={<SectionLoader />}>
        <ReelsCarousel
          items={reels.items}
          siteName={settings?.site_name || 'صدى الشعب الأخباري'}
          logo={settings?.logo_dark ?? settings?.logo_light ?? null}
        />
      </Suspense>

      {/* إعلان كبير فوق بقيّة الأقسام. */}
      <AdZone
        zone="aalan_kbyr_fwq_qsm_alakthr_shywha"
        className="mx-auto mt-3 flex w-full max-w-[1200px] justify-center px-4 sm:px-6 lg:px-8"
      />

      {/* اخبار الناس — التصميم الأصليّ (تحريريّ). */}
      <Suspense fallback={<SectionLoader />}>
        <EditorialCategorySection categoryId={31} headingId="people-news-heading" fallbackTitle="اخبار الناس" />
      </Suspense>

      {/* أخبار الفن — بتصميم القسم (شبكة بطاقات عائمة)، محلّ «حوادث» سابقًا. */}
      <Suspense fallback={<SectionLoader />}>
        <IncidentsSection categoryId={37} headingId="art-heading" fallbackTitle="أخبار الفن" />
      </Suspense>

      {/* قسم الرياضة — نظير الاقتصاد بطابعٍ رياضيّ + جدول ترتيب الدوري مباشرةً من 365Scores (محلّ كروسل رياضة). */}
      <Suspense fallback={<SectionLoader />}>
        <SportsShowcase />
      </Suspense>

      {/* قسم الطقس السينمائيّ — أسفل الرياضة: بطاقة «اليوم» الكبيرة (حرارة + إحساس + رطوبة/رياح + شروق/غروب) + الأسبوع. */}
      <WeatherWrapper />

      {/* قسمان شبكة 2×2 — صحة وجمال + منوعات — تحت الطقس (بدل كروسليهما السابقين). */}
      <Suspense fallback={<SectionLoader />}>
        <CategoryGridPair
          categories={[
            { categoryId: 51, fallbackTitle: 'صحة وجمال' },
            { categoryId: 55, fallbackTitle: 'منوعات' },
          ]}
        />
      </Suspense>

      {/* بقيّة أقسام الأخبار — كروسلات. */}
      <Suspense fallback={<SectionLoader />}>
        {CATEGORY_CAROUSELS.map((s) => (
          <CategoryCarousel key={s.categoryId} categoryId={s.categoryId} fallbackTitle={s.fallbackTitle} />
        ))}
      </Suspense>

      {/* قسم الفيديو — آخر شيء فوق الفوتر. */}
      <Suspense fallback={<SectionLoader />}>
        <VideoSection />
      </Suspense>
    </>
  );
}
