import { getTrendingFeed } from '@/lib/feed';

import { SidebarFeedCard } from './sidebar-feed-card';

// «الرائج الآن» بالشريط الجانبيّ — خوارزميّة التفاعل الحقيقيّة (/articles/trending)، لا مجرّد أكثر
// قراءة (تلك موجودة أصلاً بتبويب «الأكثر شيوعًا» جنبها). نافذته 7 أيام: لا نتائج ⇒ يُخفى (سلوك متوقَّع).
export async function SidebarTrending({ locale = 'ar' }: { locale?: string } = {}) {
  const items = await getTrendingFeed(5, locale);
  if (items.length === 0) return null;

  return <SidebarFeedCard title="الرائج الآن" href="/trending" items={items} />;
}
