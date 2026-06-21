import { ChevronLeft, Clock, Trophy } from 'lucide-react';
import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { Container } from '@/components/layout/container';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';
import { getMatchesByCompetition } from '@/lib/sport/games';

import { SportsMatchdays, type MatchDay } from './sports-matchdays';

// قسم الرياضة — نظير قسم الاقتصاد بطابعٍ رياضيّ أخضر: شبكة أخبار (¾) + **ودجت مباريات الأيّام مباشرةً من 365Scores** (¼).
const SPORTS_CATEGORY_ID = 9; // رياضة (مُعرّف فيرتكس الثابت)
const GREEN = 'linear-gradient(100deg, #0b7a3b 0%, #064e2a 100%)';

// أولويّة عرض البطولات في ودجت المباريات (الأهمّ أوّلاً): كأس العالم، دوري الأبطال، الدوريات الأوروبيّة الكبرى، ثمّ العربيّة.
const MATCH_PRIORITY = [5930, 572, 7, 11, 17, 25, 35, 649, 552, 5635];

// تاريخ بإزاحة أيّام عن اليوم ⇒ YYYY-MM-DD (يُحسب وقت التوليد/التحديث ISR).
function ymd(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// مباريات يومٍ واحد — مرتّبة بالأولويّة (البطولات المهمّة أوّلاً)، مسطّحة مع اسم/شعار البطولة، أعلى ٦ (يناسب الشريط الجانبيّ).
async function buildMatchDay(offset: number, label: string): Promise<MatchDay> {
  const date = ymd(offset);
  const groups = await getMatchesByCompetition(1, date);
  const rank = (id: number) => {
    const i = MATCH_PRIORITY.indexOf(id);
    return i < 0 ? 999 : i;
  };
  const matches = [...groups]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .flatMap((g) =>
      g.matches.map((m) => ({
        id: m.id,
        kind: m.kind,
        minute: m.minute,
        startTime: m.startTime,
        comp: g.name,
        compLogo: g.logo,
        home: { name: m.home.name, score: m.home.score, logo: m.home.logo },
        away: { name: m.away.name, score: m.away.score, logo: m.away.logo },
      })),
    )
    .slice(0, 10);
  return { label, date, matches };
}

export async function SportsShowcase() {
  const category = await getCategoryById(SPORTS_CATEGORY_ID);
  const [articles, matchDays] = await Promise.all([
    category ? getCategoryFeed(category.slug, 6) : Promise.resolve<FeedItem[]>([]),
    Promise.all([
      buildMatchDay(-1, 'أمس'),
      buildMatchDay(0, 'اليوم'),
      buildMatchDay(1, 'غداً'),
      buildMatchDay(2, 'بعد غد'),
    ]),
  ]);

  const hasMatches = matchDays.some((d) => d.matches.length > 0);
  if (articles.length === 0 && !hasMatches) return null;

  const moreHref = category ? `/category/${encodeURIComponent(category.slug)}` : '/sport';
  const title = category?.name.trim() || 'رياضة';

  return (
    <section className="mt-6 bg-white sm:mt-8" dir="rtl" aria-labelledby="sports-heading">
      {/* شريط العنوان الرياضيّ — أخضر بعرض الموقع، الاسم فقط + أيقونة كأس */}
      <div className="text-white" style={{ background: GREEN }}>
        <Container className="flex items-center justify-between gap-4 py-3 sm:py-4">
          <h2 id="sports-heading" className="flex items-center gap-2.5 font-heading text-xl font-extrabold sm:text-2xl">
            <Trophy className="size-6 shrink-0" style={{ color: '#ffd34d' }} aria-hidden />
            <Link href={moreHref} className="transition-opacity hover:opacity-80">
              {title}
            </Link>
          </h2>
          <Link
            href={moreHref}
            className="flex shrink-0 items-center gap-1 border border-white/40 px-3 py-1.5 text-sm font-bold transition hover:bg-white/10"
            style={{ borderRadius: '9999px' }}
          >
            المزيد
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </Container>
      </div>

      {/* الجسم — أبيض: شبكة أخبار + ودجت المباريات الجانبيّ بنفس الارتفاع */}
      <Container className="py-8 sm:py-10">
        <div className="grid items-stretch gap-6 lg:grid-cols-4">
          <div className={hasMatches ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
              {articles.slice(0, 6).map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {hasMatches && (
            <aside className="lg:relative">
              {/* lg: ابن مطلق يملأ ارتفاع الصفّ (الذي تحدّده شبكة الأخبار) فلا يطوّل القسم؛ القائمة تسكرول داخليًّا. */}
              <div className="lg:absolute lg:inset-0">
                <SportsMatchdays days={matchDays} />
              </div>
            </aside>
          )}
        </div>
      </Container>
    </section>
  );
}

// بطاقة خبر رياضيّة (نفس نمط الاقتصاد): صورة 16:9 + عنوان سطرين + تاريخ نسبيّ.
function NewsCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-3" style={{ borderRadius: '10px' }}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
          <img
            src={item.image}
            alt={item.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="size-full bg-surface-3" aria-hidden />
        )}
        {/* تاج عاجل/تغطية خاصة */}
        <FeedBadge badge={item.badge} />
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary">
        {item.title}
      </h3>
      {item.publishedAt && (
        <time dateTime={item.publishedAt} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted">
          <Clock className="size-3 shrink-0" aria-hidden />
          {formatRelativeTime(item.publishedAt)}
        </time>
      )}
    </article>
  );
}
