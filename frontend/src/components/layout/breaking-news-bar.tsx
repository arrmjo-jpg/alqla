'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// شريط الأخبار العاجلة — مستوحى من تصميم «صوت الحق» (breaking-news.blade):
//  • ديسكتوب: كل الأخبار العاجلة تحت بعض (قائمة مكدّسة ثابتة، بلا تقليب/حركة) + أزرار مشاركة لكل خبر.
//    إن كان الخبر تغطية حيّة (isLive) وله تحديثات موسومة عاجل، تُعرض روابط/عناوين تلك التحديثات
//    ("الأفرع العاجلة") تحت عنوانه — الصفحة الرئيسية فقط (تفاديًا لنداء إضافي بكل صفحة).
//  • جوّال: مودال منبثق يفتح تلقائيًّا للأخبار العاجلة غير المقروءة (تتبّع localStorage)، ثمّ يُغلق،
//    بالإضافة لتكير متحرّك مستمرّ (بلا تغيير عن التصميم السابق).
// لا عاجل ⇒ لا شيء (اذا توفر). يحترم prefers-reduced-motion.
export interface BreakingItem {
  id: number;
  title: string;
  href: string;
  isLive?: boolean;
}

interface BreakingSubUpdate {
  id: number;
  title: string;
}

const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';
const FACEBOOK_PATH = 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z';

export function BreakingNewsBar({ items }: { items: BreakingItem[] }) {
  const pathname = usePathname();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [origin, setOrigin] = useState('');
  const [subUpdates, setSubUpdates] = useState<Record<number, BreakingSubUpdate[]>>({});

  // بعد التركيب: أصل الرابط (للمشاركة)
  useEffect(() => {
    if (items.length === 0) return;
    setOrigin(window.location.origin);
  }, [items]);

  // الأفرع العاجلة: نداء خفيف عبر BFF القائم (/api/live-updates، لا توكن داخليّ) لكلّ خبر عاجل
  // نوعه تغطية حيّة — الرئيسية فقط، وبعد الرسم (لا يؤخّر أول عرض ولا يُطلق على بقيّة صفحات الموقع).
  useEffect(() => {
    if (pathname !== '/') return;
    const liveItems = items.filter((it) => it.isLive);
    if (liveItems.length === 0) return;

    let cancelled = false;
    for (const it of liveItems) {
      fetch(`/api/live-updates?slug=${encodeURIComponent(String(it.id))}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json: { data?: Array<{ id: number; title?: string | null; is_breaking?: boolean }> } | null) => {
          if (cancelled || !json?.data) return;
          const breakingUpdates = json.data
            .filter((u) => u.is_breaking && u.title)
            .map((u) => ({ id: u.id, title: u.title as string }))
            .slice(0, 10);
          if (breakingUpdates.length > 0) {
            setSubUpdates((prev) => ({ ...prev, [it.id]: breakingUpdates }));
          }
        })
        .catch(() => {
          // تجاهل — الشريط الأساسي يبقى شغّالاً بلا الأفرع
        });
    }
    return () => {
      cancelled = true;
    };
  }, [pathname, items]);

  if (items.length === 0 || !desktopOpen) return null;

  const shareUrl = (href: string) => (origin ? origin + href : href);

  return (
    <aside className="breaking-bar flex" aria-label="أخبار عاجلة">
      {/* شارة «عاجل» */}
      <div className="breaking-badge">
        <span className="breaking-badge-dot" aria-hidden />
        <span className="breaking-badge-text">عاجل</span>
      </div>

      {/* قائمة مكدّسة — كل الأخبار العاجلة تحت بعض دفعة وحدة، بلا تقليب (ديسكتوب فقط) */}
      <div className="breaking-list">
        {items.map((it, i) => (
          <div key={it.id} className="breaking-list__item">
            <span className="breaking-list__index" aria-hidden>{String(i + 1).padStart(2, '0')}</span>

            <div className="breaking-list__item-text">
              <Link href={it.href} className="breaking-headline">
                {it.title}
              </Link>

              {subUpdates[it.id] && subUpdates[it.id].length > 0 && (
                <div className="breaking-sublist">
                  {subUpdates[it.id].map((u) => (
                    <Link key={u.id} href={it.href} className="breaking-sublist__link">
                      <span className="breaking-sublist__arrow" aria-hidden>↰</span>
                      {u.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {origin && (
              <div className="breaking-share">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${it.title} ${shareUrl(it.href)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="مشاركة عبر واتساب"
                  className="breaking-share-btn"
                >
                  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                    <path d={WHATSAPP_PATH} />
                  </svg>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl(it.href))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="مشاركة عبر فيسبوك"
                  className="breaking-share-btn"
                >
                  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                    <path d={FACEBOOK_PATH} />
                  </svg>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* تكير متحرّك مستمرّ لكلّ العناوين معًا — جوّال فقط (بلا تغيير) */}
      <div className="breaking-marquee">
        <div className="breaking-marquee-track">
          {items.map((it) => (
            <span key={`a-${it.id}`} className="breaking-marquee__item-wrap">
              <Link href={it.href} className="breaking-marquee__item">{it.title}</Link>
              <span className="breaking-marquee__sep" aria-hidden>•</span>
            </span>
          ))}
          {items.map((it) => (
            <span key={`b-${it.id}`} className="breaking-marquee__item-wrap" aria-hidden>
              <Link href={it.href} className="breaking-marquee__item" tabIndex={-1}>{it.title}</Link>
              <span className="breaking-marquee__sep" aria-hidden>•</span>
            </span>
          ))}
        </div>
      </div>

      {/* زرّ الإغلاق */}
      <button onClick={() => setDesktopOpen(false)} className="breaking-close" aria-label="إغلاق شريط العاجل">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </aside>
  );
}
