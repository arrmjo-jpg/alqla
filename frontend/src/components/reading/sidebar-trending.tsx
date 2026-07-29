import { TrendingBox } from '@/components/home/trending-latest-mostread';
import { getEditorsPickFeed } from '@/lib/feed';

// «تريندينغ» بالشريط الجانبيّ — نفس صندوق الرئيسية بالضبط: نفس المكوّن (أحمر، أيقونة لهب، أرقام
// ذهبيّة) ونفس مصدر البيانات (is_editor_pick) — فيه محتوى حقيقيّ فعليّ الآن، بعكس /articles/trending
// (خوارزميّة تفاعل، نافذته 7 أيام فارغة حاليًّا فتخفي الصندوق بلا داعٍ). مختلف عن «الأكثر شيوعًا»
// (مشاهدات) و«زاوية خاصة» (تصنيف ثابت) فوقها بالعمود.
export async function SidebarTrending({ locale = 'ar' }: { locale?: string } = {}) {
  const items = await getEditorsPickFeed(5, locale);
  return <TrendingBox items={items} compact />;
}
