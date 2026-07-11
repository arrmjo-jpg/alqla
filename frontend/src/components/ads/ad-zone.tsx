'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getClientId } from '@/lib/client-id';

// طبقة عرض الإعلان الحيّة — منفذ React أمين لـ `resources/js/ads/slot.js` (الواجهة العامّة Next،
// منفصلة عن موقع Blade فلا تُحمَّل slot.js مباشرةً). عقد Cache/CDN إلزاميّ: جلب من العميل فقط عند
// التركيب، cache:'no-store'، لا SSR/ISR/CDN/تخزين — رمز الانطباع صالح ضمن نافذة الدلو الخادميّة فقط.
// الإبداع: صورة (رابط نقر موقّع) أو HTML مُعقَّم خادميًّا (HTMLPurifier) يُحقَن عبر innerHTML — لا
// iframe (وفق .ai/advertising.md §7: ثِق بالمُعقِّم+CSP). لا إعلان ⇒ يعيد null (بلا DOM/مساحة، عقد §6).

interface ServedAd {
  type: 'image' | 'html';
  width: number | null;
  height: number | null;
  render: { image_url?: string; alt?: string; html?: string };
  impression?: { token?: string };
  click?: { url?: string };
}

/** صنف جهاز خشن لتجزئة العرض (يطابق AdDeviceClass + slot.js). */
function detectDevice(): string {
  const w = window.innerWidth || document.documentElement.clientWidth || 1280;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/**
 * لغة الصفحة. الجذر <html lang> ثابت على "ar" دومًا (اختيار معماريّ متعمَّد — القسم الإنجليزيّ
 * غلاف .en-skin داخليّ فقط)، فلا يكفي وحده؛ بادئة المسار /en هي المصدر الفعليّ لصفحات الإنجليزيّة.
 */
function pageLocale(): string {
  if (window.location.pathname.startsWith('/en')) return 'en';
  const lang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
  return lang === 'en' ? 'en' : 'ar';
}


/** منارة تتبّع — keepalive يبقى حيًّا عبر التنقّل؛ no-store؛ تُتجاهَل الأخطاء (صامد). */
function beacon(path: string, token: string): void {
  void fetch(path, {
    method: 'POST',
    cache: 'no-store',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

// ─── الدفعة المشترَكة (batch) — طلب واحد لكلّ مساحات الصفحة ──────────────────────────────────
// المصدر الخلفيّ يحدّد مساحات الصفحة (page → chrome + مساحات الصفحة). الواجهة تمرّر page فقط
// (فصل تامّ عن أسماء المساحات). AdZone يستهلك من السياق كسولاً؛ ورمز أيّ مساحة تتجاوز نافذة الدلو
// (~30ث) عند رؤيتها يُجدَّد بطلب مفرد احتياطيّ ⇒ احتساب انطباع سليم. بلا مزوّد ⇒ السلوك المفرد القديم.

interface AdBatchValue {
  ready: boolean;
  /** ad=undefined ⇒ خارج خريطة الدفعة (يسقط للمفرد)؛ null ⇒ لا إعلان صراحةً. fresh ⇒ الرمز ضمن نافذة الدلو. */
  getZone: (zone: string) => { ad: ServedAd | null | undefined; fresh: boolean };
}

const AdBatchContext = createContext<AdBatchValue | null>(null);
const useAdBatch = (): AdBatchValue | null => useContext(AdBatchContext);

// مسار الصفحة → مفتاح صفحة (لا أسماء مساحات هنا؛ الخلفيّة تحلّ المفتاح → المساحات).
function pageKeyForPath(pathname: string): string {
  if (pathname === '/') return 'homepage';
  if (pathname.includes('/articles/') || pathname.includes('/article/')) return 'article';
  if (/^\/(bourse|gold-prices|sport|reels|weather|writer|category|videos|search|epaper|following)/.test(pathname)) {
    return 'inner';
  }
  return ''; // مساحات chrome فقط (احتياط).
}

interface BatchState {
  zones: Record<string, ServedAd | null>;
  fetchedAt: number;
  windowMs: number;
  ready: boolean;
}

const EMPTY_BATCH: BatchState = { zones: {}, fetchedAt: 0, windowMs: 30_000, ready: false };

export function AdBatchProvider({ page, children }: { page?: string; children: ReactNode }) {
  const pathname = usePathname();
  const resolvedPage = page ?? pageKeyForPath(pathname || '/');
  const [state, setState] = useState<BatchState>(EMPTY_BATCH);

  useEffect(() => {
    let alive = true;
    setState(EMPTY_BATCH);
    void (async () => {
      try {
        const query = new URLSearchParams({
          page: resolvedPage,
          locale: pageLocale(),
          device: detectDevice(),
        }).toString();
        const res = await fetch(`/api/ads/batch?${query}`, {
          cache: 'no-store',
          headers: { 'X-Client-Id': getClientId() },
        });
        if (!res.ok) {
          if (alive) setState((s) => ({ ...s, ready: true }));
          return;
        }
        const data: { zones?: Record<string, ServedAd | null>; expires_in?: number } = await res
          .json()
          .catch(() => ({}));
        if (alive) {
          setState({
            zones: data.zones ?? {},
            fetchedAt: Date.now(),
            windowMs: Math.max(1, data.expires_in ?? 30) * 1000,
            ready: true,
          });
        }
      } catch {
        if (alive) setState((s) => ({ ...s, ready: true }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [resolvedPage]);

  const value = useMemo<AdBatchValue>(
    () => ({
      ready: state.ready,
      getZone: (zone) => ({
        ad: state.zones[zone],
        fresh: state.fetchedAt > 0 && Date.now() - state.fetchedAt < state.windowMs,
      }),
    }),
    [state],
  );

  return <AdBatchContext.Provider value={value}>{children}</AdBatchContext.Provider>;
}

export function AdZone({ zone, className }: { zone: string; className?: string }) {
  const batch = useAdBatch();
  const [ad, setAd] = useState<ServedAd | null>(null);
  // Lazy-load: لا يُطلَب الإعلان إلا عند اقتراب موضعه من الـviewport (يقلّص دفعة الطلبات عند أوّل تحميل).
  // فوق الشاشة ⇒ العنصر متقاطع فورًا ⇒ عرض فوريّ (بلا تأخير ملموس)؛ أسفل الشاشة ⇒ يؤجَّل حتى الاقتراب.
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLSpanElement | null>(null);

  // مراقبة موضع الزون عبر عنصر بحجم صفر (absolute فلا يؤثّر في التخطيط ولا فجوة الأبوين). عند الاقتراب
  // (rootMargin) يُسمح بالعرض مرّة واحدة. بلا IntersectionObserver ⇒ عرض فوريّ (تدهور رشيق = السلوك القديم).
  useEffect(() => {
    if (inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  // حلّ الإعلان بعد دخول النطاق (lazy): من الدفعة المشترَكة إن كانت جاهزة وحديثة (بلا طلب)؛ وإلا طلب مفرد
  // حيّ (بلا مزوّد، أو مساحة خارج الدفعة، أو رمز الدفعة تجاوز نافذة الدلو ⇒ رمز حديث للاحتساب الصحيح).
  useEffect(() => {
    if (!inView || ad) return;

    if (batch) {
      if (!batch.ready) return; // ننتظر وصول الدفعة (يُعاد التشغيل عند ready) — لا طلب مفرد.
      const { ad: batched, fresh } = batch.getZone(zone);
      if (batched !== undefined && fresh) {
        if (batched && (batched.type === 'image' || batched.type === 'html')) setAd(batched);
        return; // مخدوم من الدفعة (أو null صراحةً) — لا طلب مفرد.
      }
      // batched===undefined (خارج خريطة الصفحة) أو غير حديث (رمز منتهٍ) ⇒ نسقط للطلب المفرد أدناه.
    }

    let alive = true;
    void (async () => {
      try {
        const query = new URLSearchParams({ locale: pageLocale(), device: detectDevice() }).toString();
        const res = await fetch(`/api/ads/serve/${encodeURIComponent(zone)}?${query}`, {
          cache: 'no-store',
          headers: { 'X-Client-Id': getClientId() },
        });
        if (!res.ok) return;
        const data: { ad?: ServedAd | null } = await res.json().catch(() => ({}));
        const served = data?.ad ?? null;
        if (alive && served && (served.type === 'image' || served.type === 'html')) {
          setAd(served);
        }
      } catch {
        /* صامد — لا يكسر الصفحة */
      }
    })();
    return () => {
      alive = false;
    };
  }, [inView, zone, ad, batch]);

  // منارة الظهور — مرّة واحدة عند رؤية 50% (IntersectionObserver؛ تدهور رشيق بلا دعم).
  useEffect(() => {
    const token = ad?.impression?.token;
    const el = rootRef.current;
    if (!token || !el) return;
    if (!('IntersectionObserver' in window)) {
      beacon('/api/ads/impression', token);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          beacon('/api/ads/impression', token);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ad]);

  // لا إعلان بعد ⇒ عنصر مراقبة بحجم صفر (absolute: بلا مساحة/تخطيط/فجوة) = هدف الـlazy؛ يبقى لو لم يُخدَم
  // إعلان (صفر مساحة، عقد §6)، ويُستبدَل بالإبداع فور وصوله.
  if (!ad)
    return (
      <span
        ref={sentinelRef}
        aria-hidden
        data-ad-zone-pending={zone}
        style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
      />
    );

  // جذر الزون يتوسّط الإبداع عموديًّا (items-center) فلا يُمطّ (صورة أو HTML) لو كانت الحاوية flex
  // بـ align-items:stretch — فيلتزم كلّ إعلان بأبعاده الحقيقيّة بلا تشويه. (no-op إن لم تكن flex.)
  const rootClass = `${className ?? ''} items-center`;

  // الالتزام بأبعاد قاعدة البيانات (ad.width × ad.height): العرض = عرض DB (مع تصغير متجاوب لا يتجاوز
  // الحاوية)، والنسبة = نسبة DB (لا نسبة الصورة الطبيعيّة)، وobject-contain فلا تشويه. توفّرت الأبعاد؟
  const hasDims = ad.width != null && ad.height != null && ad.width > 0 && ad.height > 0;
  const imgDimStyle: CSSProperties | undefined = hasDims
    ? { width: `${ad.width}px`, aspectRatio: `${ad.width} / ${ad.height}` }
    : undefined;
  // لإعلان HTML: نمرّر الأبعاد كمتغيّرات CSS، وقاعدة في globals.css تُلزِم الإبداع المحقون بها.
  const htmlDimStyle = hasDims
    ? ({ ['--qn-ad-w']: `${ad.width}px`, ['--qn-ad-ar']: `${ad.width} / ${ad.height}` } as CSSProperties)
    : undefined;

  if (ad.type === 'image' && ad.render.image_url) {
    const clickUrl = ad.click?.url;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- رابط الصورة من نظام الإعلانات كما هو (لا Proxy/تحسين، عقد §5)
      <img
        src={ad.render.image_url}
        alt={ad.render.alt ?? ''}
        loading="lazy"
        decoding="async"
        width={ad.width ?? undefined}
        height={ad.height ?? undefined}
        // تُجبَر الصورة على أبعاد قاعدة البيانات (عرض DB + نسبة DB عبر style) وتملأ الصندوق تمامًا عبر
        // object-fill (تتمطّط لو خالفت نسبتها)، self-center فلا تتمدّد عموديًّا، وmax-w-full للتجاوب.
        className="block h-auto max-w-full self-center object-fill"
        style={imgDimStyle}
      />
    );
    return (
      <div ref={rootRef} className={rootClass} data-ad-zone={zone}>
        {clickUrl ? (
          <a href={clickUrl} target="_blank" rel="noopener noreferrer sponsored" className="block max-w-full self-center">
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    );
  }

  if (ad.type === 'html' && typeof ad.render.html === 'string') {
    const token = ad.impression?.token;
    return (
      <div
        ref={rootRef}
        className={`${rootClass} qn-ad-html`}
        data-ad-zone={zone}
        style={htmlDimStyle}
        // إبداع HTML مُعقَّم خادميًّا (بلا script/iframe/on*) — حقن آمن وفق الـSkill (لا iframe).
        dangerouslySetInnerHTML={{ __html: ad.render.html }}
        // روابط HTML تملك href الخاصّ ⇒ منارة نقر (لا تحويل موقّع) قبل التنقّل.
        onClickCapture={
          token
            ? (event) => {
                const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]');
                if (anchor) beacon('/api/ads/click', token);
              }
            : undefined
        }
      />
    );
  }

  return null;
}
