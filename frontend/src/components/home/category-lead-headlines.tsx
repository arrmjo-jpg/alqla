import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { SectionHeader } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type CategoryRef, type FeedItem } from '@/lib/feed';

// نقطة الرصاصة (dot.png) — أمام كل عنوان خبر بهاي الأقسام الأربعة فقط (لا الترويسة، لا رابط
// «المزيد»). حجم ثابت لكل الأخبار، بلا تمطّط (object-contain)، ومحاذاة مع أعلى السطر الأوّل للعنوان.
function TitleDot() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- أيقونة زخرفيّة ثابتة صغيرة (259 بايت)
    <img src="/dot.png" alt="" aria-hidden width={14} height={14} className="mt-[3px] size-3 shrink-0 object-contain sm:size-3.5" />
  );
}

export interface CategoryLeadHeadlinesConfig {
  categoryId: number;
  fallbackTitle?: string;
  /** الخبر الأول بصورة صغيرة (ListCard، ٨٤×٨٤). false ⇒ كلّ العناصر عناوين فقط. افتراضيًّا true. */
  showLead?: boolean;
  /** عدد العناوين (بلا صور) أسفل الخبر الأوّل — أو كامل القائمة إن showLead=false. افتراضيًّا 3. */
  headlineCount?: number;
}

// صفّ بعمودين (يمين/يسار، RTL) — كلّ عمود قسم مستقلّ بالـID الثابت: خبر أوّل بصورة صغيرة (اختياريّ،
// يُعاد استخدام ListCard من LatestUpdates) + عناوين فقط (بلا صور/مقتطف/تاريخ) أسفله. الترويسة
// موحّدة (SectionHeader الأحمر) لكِلا العمودين. نمط الجلب/الكاش مطابق لـ CategoryGridPair (فحص
// كلا القسمين بـ Promise.all، عمود فارغ ⇒ يُحذف بلا كسر الشبكة، الصفّ كلّه فارغ ⇒ يُخفى).
export async function TwoColumnCategoryRow({
  right,
  left,
}: {
  right: CategoryLeadHeadlinesConfig;
  left: CategoryLeadHeadlinesConfig;
}) {
  const [rightBlock, leftBlock] = await Promise.all([resolveColumn(right), resolveColumn(left)]);

  if (!rightBlock && !leftBlock) return null;

  return (
    <section className="mt-6 sm:mt-8" dir="rtl">
      <Container>
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          {rightBlock}
          {leftBlock}
        </div>
      </Container>
    </section>
  );
}

async function resolveColumn(config: CategoryLeadHeadlinesConfig) {
  const { categoryId, fallbackTitle, showLead = true, headlineCount = 3 } = config;
  const category = await getCategoryById(categoryId);
  if (!category) return null;

  const items = await getCategoryFeed(category.slug, (showLead ? 1 : 0) + headlineCount);
  if (items.length === 0) return null;

  const lead = showLead ? items[0] : null;
  const headlines = showLead ? items.slice(1) : items;

  return (
    <CategoryColumn
      key={category.id}
      category={category}
      lead={lead}
      headlines={headlines}
      fallbackTitle={fallbackTitle}
    />
  );
}

function CategoryColumn({
  category,
  lead,
  headlines,
  fallbackTitle,
}: {
  category: CategoryRef;
  lead: FeedItem | null;
  headlines: FeedItem[];
  fallbackTitle?: string;
}) {
  const title = category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');
  const moreHref = lead?.categoryHref ?? headlines[0]?.categoryHref ?? `/category/${encodeURIComponent(category.slug)}`;

  return (
    <div>
      {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض — نفس أسلوب عناوين الموقع الحمراء. */}
      <SectionHeader title={title} href={moreHref} />

      {lead && (
        <div className="mb-4">
          <LeadCard item={lead} />
        </div>
      )}

      {headlines.length > 0 && (
        <ul className="flex flex-col divide-y divide-dashed divide-border/70">
          {headlines.map((item) => (
            <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
              <Link
                href={item.href}
                className="flex items-start gap-2 text-[15px] font-bold leading-snug text-fg transition-colors hover:text-primary"
              >
                <TitleDot />
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// نسخة محليّة من ListCard (latest-updates.tsx) خاصّة بهاي الأقسام الأربعة فقط — بلا لمس المكوّن
// المشترك (مُستهلَك بأقسام تانية زي «أخبار محلية»/صفحة الاقتصاد). فرقها الوحيد: نقطة الرصاصة قبل
// العنوان + ارتفاع ثابت للعنوان (سطرين محجوزين دايمًا) بحيث كل البطاقات المميّزة بنفس الارتفاع
// بغضّ النظر عن طول العنوان — بدل ما ترتفع/تنخفض البطاقة حسب عدد أسطر العنوان الفعليّ.
function LeadCard({ item }: { item: FeedItem }) {
  return (
    <div
      className="group relative flex h-full items-center gap-3 border border-border bg-surface p-2 transition hover:border-primary/30 hover:shadow-sm"
      style={{ borderRadius: '10px' }}
    >
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />

      <div
        className="relative size-[84px] shrink-0 overflow-hidden bg-surface-2"
        style={{ borderRadius: '8px' }}
      >
        <OptimizedImage
          cover={item.cover}
          src={item.image}
          alt={item.imageAlt}
          sizes="84px"
          className="size-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-start">
        <div className="flex items-start gap-2">
          <TitleDot />
          {/* min-h-[2.75em]: يحجز ارتفاع سطرين دايمًا (leading-snug=1.375 × 2) بغضّ النظر عن طول
              العنوان الفعليّ — يمنع اختلاف ارتفاع البطاقات المميّزة بين بعضها. */}
          <h3 className="line-clamp-2 min-h-[2.75em] text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-[15px]">
            {item.title}
          </h3>
        </div>
        {item.category &&
          (item.categoryHref ? (
            <Link
              href={item.categoryHref}
              className="relative z-20 w-fit text-caption font-extrabold text-primary hover:underline"
            >
              {item.category}
            </Link>
          ) : (
            <span className="text-caption font-extrabold text-primary">{item.category}</span>
          ))}
      </div>
    </div>
  );
}
