'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// شريط الأخبار العاجلة — مستوحى من تصميم «صوت الحق» (breaking-news.blade):
//  • ديسكتوب: شريط ثابت أسفل الموقع يعرض خبرًا واحدًا في كلّ مرّة (يتبدّل كل ٥ث بتلاشٍ/انزلاق)،
//    مع شارة «عاجل» بيضاء نابضة + حافة مائلة، وأزرار مشاركة (واتساب/فيسبوك)، وزرّ إغلاق.
//  • جوّال: مودال منبثق يفتح تلقائيًّا للأخبار العاجلة غير المقروءة (تتبّع localStorage)، ثمّ يُغلق.
// لا عاجل ⇒ لا شيء (اذا توفر). يحترم prefers-reduced-motion.
export interface BreakingItem {
  id: number;
  title: string;
  href: string;
}


const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';
const FACEBOOK_PATH = 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z';

export function BreakingNewsBar({ items }: { items: BreakingItem[] }) {
  const [index, setIndex] = useState(0);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [origin, setOrigin] = useState('');

  // بعد التركيب: أصل الرابط (للمشاركة)
  useEffect(() => {
    if (items.length === 0) return;
    setOrigin(window.location.origin);
  }, [items]);

  // تدوير العناوين كل ٥ ثوانٍ
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0 || !desktopOpen) return null;

  const shareUrl = (href: string) => (origin ? origin + href : href);

  return (
    <aside className="breaking-bar flex" aria-label="أخبار عاجلة">
      {/* شارة «عاجل» */}
      <div className="breaking-badge">
        <span className="breaking-badge-text">عاجل</span>
        <span className="breaking-badge-skew" aria-hidden />
      </div>

      {/* مسرح العناوين — خبر واحد ظاهر */}
      <div className="breaking-stage">
        {items.map((it, i) => (
          <div key={it.id} className="breaking-slide" data-active={i === index} aria-hidden={i !== index}>
            <Link href={it.href} className="breaking-headline" tabIndex={i === index ? 0 : -1}>
              {it.title}
            </Link>
            {origin && (
              <div className="breaking-share">
                <span className="breaking-share-label">شارك:</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${it.title} ${shareUrl(it.href)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="مشاركة عبر واتساب"
                  className="breaking-share-btn"
                  tabIndex={i === index ? 0 : -1}
                >
                  <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
                    <path d={WHATSAPP_PATH} />
                  </svg>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl(it.href))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="مشاركة عبر فيسبوك"
                  className="breaking-share-btn"
                  tabIndex={i === index ? 0 : -1}
                >
                  <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
                    <path d={FACEBOOK_PATH} />
                  </svg>
                </a>
              </div>
            )}
          </div>
        ))}
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
