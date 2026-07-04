import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { Container } from '@/components/layout/container';
import { SidebarNewsWidget } from '@/components/reading/sidebar-news-widget';
import { NotFoundButtons } from '@/components/ui/not-found-buttons';
import { getNavCategories } from '@/lib/site-settings';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة - AlphaCMS',
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const navCategories = await getNavCategories('ar');
  
  // Popular tags fallback for SEO navigation
  const popularTags = [
    { name: 'أخبار عاجلة', href: '/search?q=عاجل' },
    { name: 'الأردن', href: '/search?q=الأردن' },
    { name: 'رياضة عالمية', href: '/search?q=رياضة' },
    { name: 'أسعار الذهب', href: '/gold-prices' },
    { name: 'الطقس اليوم', href: '/weather' },
    { name: 'أخبار البورصة', href: '/bourse' },
  ];

  // Quick navigation links
  const quickLinks = [
    { name: 'آخر الأخبار', href: '/latest' },
    { name: 'الأخبار الرائجة', href: '/trending' },
    { name: 'النسخة الورقية (E-paper)', href: '/epaper' },
    { name: 'تلفزيون الموقع', href: '/videos' },
    { name: 'البث المباشر', href: '/live' },
    { name: 'اتصل بنا', href: '/contact' },
  ];

  return (
    <Container className="py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-12" dir="rtl">
        {/* Left Side: 404 details and helper directories (8 columns) */}
        <main className="flex flex-col gap-8 lg:col-span-8">
          {/* Main 404 block with custom geometric illustration */}
          <div
            className="flex flex-col items-center justify-center border border-border bg-surface-2 px-6 py-12 text-center"
            style={{ borderRadius: '16px' }}
          >
            {/* Custom SVG Illustration */}
            <div className="relative mb-6 flex size-32 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg
                className="size-20 drop-shadow-md"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <span className="absolute -bottom-1 -right-1 rounded-full bg-primary px-2.5 py-0.5 font-heading text-xs font-bold text-white shadow-sm">
                404
              </span>
            </div>

            <h1 className="font-heading text-2xl font-extrabold text-fg sm:text-3xl">
              عذرًا، هذه الصفحة غير متوفرة
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
              ربما تم حذف هذه الصفحة، أو تعديل رابطها، أو أنها لم تكن موجودة في الأصل. يرجى التحقق من الرابط أو استخدام البحث أدناه.
            </p>

            {/* Back buttons client actions */}
            <NotFoundButtons />
          </div>

          {/* Search form box */}
          <div
            className="border border-border bg-surface-2 p-5"
            style={{ borderRadius: '12px' }}
          >
            <h2 className="mb-3 font-heading text-base font-extrabold text-fg">
              البحث في الأخبار والمقالات
            </h2>
            <form action="/search" method="get" role="search" className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-3 rounded-lg bg-surface-3 px-4">
                <Search className="size-5 shrink-0 text-muted" aria-hidden />
                <input
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder="ابحث عن المقالات أو الكلمات المفتاحية..."
                  className="h-11 w-full bg-transparent text-base text-fg outline-none placeholder:text-muted"
                />
              </div>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-lg bg-primary px-6 font-bold text-white transition hover:opacity-90 cursor-pointer"
              >
                بحث
              </button>
            </form>
          </div>

          {/* Categories Grid Directory */}
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
              <span className="h-5 w-1 bg-primary rounded-full" />
              <h2 className="font-heading text-base font-extrabold text-fg">أقسام الموقع الرئيسية</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {navCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${encodeURIComponent(cat.slug)}`}
                  className="flex items-center justify-center rounded-lg border border-border bg-surface-2 p-3 text-center text-sm font-bold text-fg transition hover:border-primary hover:text-primary"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Trending Tags and Quick Links */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Trending tags */}
            <div className="flex flex-col">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <span className="h-5 w-1 bg-primary rounded-full" />
                <h2 className="font-heading text-base font-extrabold text-fg">وسوم شائعة</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={tag.href}
                    className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="flex flex-col">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <span className="h-5 w-1 bg-primary rounded-full" />
                <h2 className="font-heading text-base font-extrabold text-fg">روابط سريعة ومفيدة</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-sm font-medium text-muted transition hover:text-primary"
                  >
                    ← {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Right Side: Tabbed Latest/MostRead widget (4 columns) */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="mb-1 flex items-center gap-2 border-b border-border pb-3">
            <span className="h-5 w-1 bg-primary rounded-full" />
            <h2 className="font-heading text-base font-extrabold text-fg">تابع آخر المستجدات</h2>
          </div>
          <SidebarNewsWidget />
        </aside>
      </div>
    </Container>
  );
}
