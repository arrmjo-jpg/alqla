import React from 'react';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { LivePulse } from '@/components/ui/live-pulse';
import type { FeedItem } from '@/lib/feed';

import { HeroDesktopCarousel } from './hero-desktop-carousel';
import { HeroMobileCarousel } from './hero-mobile-carousel';
import { LatestHeaderList } from './latest-header-list';

// كتلة الهيرو (الأخبار المميّزة is_featured). الجوّال يبقى كما هو (HeroMobileCarousel، بلا تغيير).
// سطح المكتب: صورة رئيسية + شريط صور مصغّرة متزامن (HeroDesktopCarousel، 9 أعمدة) بجانب قائمة
// «آخر المستجدات» (3 أعمدة، علم is_header من كلّ الموقع) — محلّ إعلان aalan_kbyr_asfl_alhyrw_1410
// الذي كان هنا سابقًا (بطلب المستخدم: استبدال الإعلان بالقائمة).
export function FeaturedHero({ items, headerItems = [] }: { items: FeedItem[]; headerItems?: FeedItem[] }) {
  if (items.length === 0) return <FeaturedHeroEmpty />;

  return (
    <Container className="py-6 sm:py-8">
      {/* الجوّال: كاروسيل عصريّ بملء العرض قابل للسحب + نقاط ترقيم — بدل الشبكة المزدحمة. */}
      <HeroMobileCarousel items={items.slice(0, 5)} />

      {/* سطح المكتب (≥1024px): 8 أعمدة كاروسيل + 4 أعمدة «آخر المستجدات» (كانت 9/3 — كاروسيل أصغر شوي لصالح القائمة). */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
        <div className="lg:col-span-8">
          <HeroDesktopCarousel items={items.slice(0, 5)} />
        </div>
        <div className="lg:col-span-4">
          <LatestHeaderList items={headerItems} />
        </div>
      </div>
    </Container>
  );
}

// شارة عاجل/تغطية خاصة (أعلى البداية) — من أعلام حقيقية فقط؛ لا تلتقط النقر (يمرّ لرابط الخبر).
// موحّدة لكامل الموقع: أحمر فاقع #ff1e1e، حوافّ قائمة (border-radius:0)، وأيقونة بثٍّ نابضة للتغطية الخاصة.
export function FeedBadge({ badge }: { badge: FeedItem['badge'] }) {
  if (!badge) return null;
  return (
    <span
      className="pointer-events-none absolute start-2 top-2 z-20 inline-flex items-center gap-1.5 px-2 py-1 text-caption font-bold text-white"
      style={{ background: '#ff1e1e', borderRadius: 0 }}
    >
      {badge.kind === 'live' && <LivePulse />}
      {badge.label}
    </span>
  );
}

// اسم القسم كشارة ذهبيّة — رابط مستقلّ يفتح القسم (فوق رابط الخبر) إن توفّر slug.
export function CategoryChip({ name, href }: { name: string | null; href: string | null }) {
  if (!name) return null;
  const cls = 'px-2 py-0.5 text-caption font-bold text-black';
  const style = { background: '#C9A227' } as React.CSSProperties;
  if (href) {
    return (
      <Link href={href} className={`pointer-events-auto relative transition-opacity hover:opacity-90 ${cls}`} style={style}>
        {name}
      </Link>
    );
  }
  return <span className={cls} style={style}>{name}</span>;
}

// حالة فارغة صادقة (عزل فشل الكتلة، لا تلفيق) — لا تُترك الصفحة فارغة.
function FeaturedHeroEmpty() {
  return (
    <Container className="py-6 sm:py-8">
      <div
        className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface-2 px-6 py-20 text-center"
        style={{ borderRadius: '15px' }}
      >
        <h2 className="font-heading text-h3 font-bold text-fg">لا توجد أخبار مميّزة بعد</h2>
        <p className="max-w-md text-sm text-muted">
          ستظهر هنا الأخبار المميّزة فور تفعيلها من لوحة التحرير.
        </p>
      </div>
    </Container>
  );
}
