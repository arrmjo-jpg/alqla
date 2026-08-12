import type { Metadata } from 'next';
import localFont from 'next/font/local';

import './globals.css';
import './qalah-skin.css';
import { Analytics } from '@/components/seo/analytics';
import { CopyAttribution } from '@/components/seo/copy-attribution';
import { JsonLd } from '@/components/seo/json-ld';
import { ResourceHints } from '@/components/seo/resource-hints';
import { buildMetadata } from '@/lib/seo';

// Platform typeface — Al-Jazeera Arabic (Regular 400 + Bold 700), self-hosted via next/font/local.
const aljazeera = localFont({
  src: [
    { path: './fonts/Al-Jazeera-Arabic-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/Al-Jazeera-Arabic-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-aljazeera',
  display: 'swap',
});

// خطّ التصميم الجديد — Cairo (يُستهلَك فقط داخل كسوة .qalah-skin عبر --font-cairo).
// self-hosted (variable font, Arabic+Latin) عبر next/font/local — كان يُجلَب من next/font/google
// وقت البناء، لكن حاوية بناء Coolify فشلت في الوصول لـfonts.gstatic.com (2026-08-11)، فأسقط ذلك
// النشر كاملاً. الملف الآن جزء من المستودع فلا يعتمد بناء الصورة على الإنترنت إطلاقاً.
const cairo = localFont({
  src: './fonts/Cairo-Variable.ttf',
  variable: '--font-cairo',
  display: 'swap',
});

// خطّ الموقع — Awsat Digital (Regular 400 + Bold 700 + Black 900)، مستخدم فقط داخل كسوة .qalah-skin عبر --font-awsat.
const awsatDigital = localFont({
  src: [
    { path: './fonts/AwsatDigital-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/AwsatDigital-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/AwsatDigital-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-awsat',
  display: 'swap',
});

// خط القراءة الطويلة المريح للأخبار — self-hosted (variable font)، نفس سبب Cairo أعلاه.
const notoArabic = localFont({
  src: './fonts/NotoSansArabic-Variable.ttf',
  variable: '--font-noto-arabic',
  display: 'swap',
});

// English edition typefaces (LTR editorial identity — /en only, consumed via .en-skin).
// Source Serif 4 for headlines (editorial gravitas, Reuters/NYTimes-adjacent) + Inter for
// body/UI (clean humanist sans, BBC/CNN-adjacent). Additive only — no effect outside .en-skin.
// self-hosted (variable fonts)، نفس سبب Cairo/notoArabic أعلاه.
const sourceSerif = localFont({
  src: [
    { path: './fonts/SourceSerif4-Variable.ttf', style: 'normal' },
    { path: './fonts/SourceSerif4-Italic-Variable.ttf', style: 'italic' },
  ],
  variable: '--font-source-serif',
  display: 'swap',
});

const inter = localFont({
  src: './fonts/Inter-Variable.ttf',
  variable: '--font-inter',
  display: 'swap',
});

// All metadata derived from Site Settings (no hardcoded SEO content).
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata();
}

// Root shell only — global head/SEO/perf. Site chrome lives in (site)/layout; the dashboard
// (/account) ships its own shell. So route groups decide their own chrome.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning على <html>: إضافات المتصفّح (مثل crxlauncher) تحقن سمات قبل ترطيب React ⇒ عدم تطابق
  // زائف؛ يُسكِت سمات <html> نفسه فقط، لا الأبناء (فلا يُخفي عدم تطابق حقيقيّ في التطبيق).
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${aljazeera.variable} ${cairo.variable} ${awsatDigital.variable} ${notoArabic.variable} ${sourceSerif.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* مزامنة مبكرة لتفضيل «النسخة الكاملة» (site-view.ts) — قبل أي رسم قدر الإمكان لتقليل
            الوميض عند إعادة التحميل. لا حالة خادم/كوكيز هنا عمدًا.
            ملاحظة: تعديل content بوسم viewport القائم عبر setAttribute لا يجبر إعادة التخطيط
            (reflow) على أغلب متصفّحات الموبايل — القياس يُقفَل وقت الـparsing الأول. الحلّ المُثبَت:
            حذف الوسم القديم وإنشاء وسم جديد بدلاً من تعديل الموجود (تحقّق فعليّ عبر matchMedia). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('acm_site_view')==='desktop'){var old=document.querySelector('meta[name=\"viewport\"]');var w=1280,s=Math.min(1,window.innerWidth/w);var m=document.createElement('meta');m.setAttribute('name','viewport');m.setAttribute('content','width='+w+',initial-scale='+s+',maximum-scale=5,user-scalable=yes');if(old&&old.parentNode){old.parentNode.removeChild(old);}document.head.appendChild(m);}}catch(e){}})();",
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-fg">
        <ResourceHints />
        {children}
        <JsonLd />
        <Analytics />
        <CopyAttribution />
      </body>
    </html>
  );
}
