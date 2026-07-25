import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { ListCard } from '@/components/home/latest-updates';
import { SectionHeader, SectionMore } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type CategoryRef, type FeedItem } from '@/lib/feed';

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
          <ListCard item={lead} />
        </div>
      )}

      {headlines.length > 0 && (
        <ul className="flex flex-col divide-y divide-dashed divide-border/70">
          {headlines.map((item) => (
            <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
              <Link
                href={item.href}
                className="block text-[15px] font-bold leading-snug text-fg transition-colors hover:text-primary"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SectionMore href={moreHref} />
    </div>
  );
}
