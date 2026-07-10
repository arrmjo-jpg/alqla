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
            className="relative flex flex-col items-center justify-center overflow-hidden border border-border/60 bg-gradient-to-br from-surface to-surface-2 px-6 py-24 text-center shadow-2xl transition-all duration-500 hover:shadow-primary/10 group"
            style={{ borderRadius: '24px' }}
          >
            {/* الخلفية الإبداعية - تأثير الإضاءة (Glowing Orbs) */}
            <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-primary/20 blur-[80px] transition-opacity duration-1000 group-hover:opacity-70 opacity-30" aria-hidden={true} />
            <div className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-yellow-400/10 blur-[80px] transition-opacity duration-1000 group-hover:opacity-70 opacity-30" aria-hidden={true} />

            <div className="relative z-10 mb-6 flex flex-col items-center">
              <div className="relative">
                <h1 className="select-none text-[8rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary via-red-700 to-black drop-shadow-xl sm:text-[10rem]">
                  404
                </h1>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] text-center">
                  <span className="inline-block -rotate-6 transform rounded-full bg-primary px-4 py-1.5 text-sm font-extrabold uppercase tracking-widest text-white shadow-xl border-2 border-white/20">
                    أين نحن؟
                  </span>
                </div>
              </div>
            </div>

            <h2 className="relative z-10 font-heading text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
              عذرًا، يبدو أنك ضللت الطريق!
            </h2>
            <p className="relative z-10 mt-4 max-w-lg text-lg font-medium leading-relaxed text-muted">
              الصفحة التي تبحث عنها غير موجودة في هذا الكون. ربما تم نقلها، أو حذفها، أو لم تكن موجودة من الأساس.
            </p>

            <div className="relative z-10 mt-10">
              <NotFoundButtons />
            </div>
          </div>

          {/* Search form box */}
          <div
            className="relative overflow-hidden border border-border/80 bg-surface p-6 shadow-lg sm:p-8"
            style={{ borderRadius: '20px' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
            <div className="relative z-10">
              <h2 className="mb-4 font-heading text-xl font-extrabold text-fg flex items-center gap-2">
                <Search className="size-5 text-primary" />
                البحث في الموقع
              </h2>
              <form action="/search" method="get" role="search" className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex flex-1 w-full items-center gap-3 rounded-xl bg-surface-3 px-5 transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:bg-surface border border-border/50">
                  <Search className="size-5 shrink-0 text-muted" aria-hidden={true} />
                  <input
                    name="q"
                    type="search"
                    autoComplete="off"
                    placeholder="ابحث عن المقالات، الأخبار، أو الكلمات المفتاحية..."
                    className="h-14 w-full bg-transparent text-base font-medium text-fg outline-none placeholder:text-muted/70"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 w-full sm:w-auto shrink-0 rounded-xl bg-primary px-8 font-bold text-white shadow-md transition-all hover:bg-black hover:shadow-xl active:scale-95 cursor-pointer"
                >
                  بحث الآن
                </button>
              </form>
            </div>
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
