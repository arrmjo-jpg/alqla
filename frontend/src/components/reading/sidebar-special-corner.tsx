import { getCategoryById, getCategoryFeed } from '@/lib/feed';

import { SidebarFeedCard } from './sidebar-feed-card';

// «زاوية خاصة» بالشريط الجانبيّ — نفس تصنيف #32 المستخدَم بالرئيسية (TwoColumnCategoryRow)، 3
// أخبار فقط. غير موجود/فارغ ⇒ يُخفى.
const SPECIAL_CORNER_CATEGORY_ID = 32;

export async function SidebarSpecialCorner({ locale = 'ar' }: { locale?: string } = {}) {
  const category = await getCategoryById(SPECIAL_CORNER_CATEGORY_ID, locale);
  if (!category) return null;

  const items = await getCategoryFeed(category.slug, 3, locale);
  if (items.length === 0) return null;

  return (
    <SidebarFeedCard
      title={category.name.trim() || 'زاوية خاصة'}
      href={`/category/${encodeURIComponent(category.slug)}`}
      items={items}
    />
  );
}
