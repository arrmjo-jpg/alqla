// Static, non-category link lists — feature/platform links, not Category model data.
// Category names never live here: header nav, mobile menu, and both footers pull categories
// live from the dynamic Category API (see lib/site-settings.ts's getNavCategories, lib/feed.ts's
// fetchCategoriesRaw, lib/categories.ts). See docs/architecture/CACHE-INVALIDATION.md for the
// admin-write → cache-tag → revalidate chain that keeps those live sources fresh.

export type NavLink = { label: string; href: string };

// روابط الوسائط/الخدمات — على الموبايل في القائمة الجانبيّة (الهامبرغر)؛ على سطح المكتب في الشريط الأفقيّ تحت الهيدر.
export const SECTIONS_NAV: NavLink[] = [
  { label: 'فيديوهات', href: '/videos' },
  { label: 'الريلز', href: '/reels' },
  { label: 'البث المباشر', href: '/live' },
  { label: 'جدول الرياضة', href: '/sport' },
  { label: 'بورصة عمّان', href: '/bourse' },
  { label: 'اسعار الذهب', href: '/gold-prices' },
  { label: 'حالة الطقس', href: '/weather' },
];

// Platform links not (yet) modeled as CMS pages — placeholders pending Authors/Careers wiring.
export const PLATFORM_LINKS: NavLink[] = [
  { label: 'الكتّاب', href: '#' },
  { label: 'فرص العمل', href: '#' },
  { label: 'اتصل بنا', href: '/contact' },
  { label: 'أعلن معنا', href: '/advertise' },
];
