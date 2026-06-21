import Link from 'next/link';

import { SiteLogo } from '@/components/branding/site-logo';
import { getSiteSettings } from '@/lib/site-settings';
import { getStaticPages } from '@/lib/static-pages';

import { PLATFORM_LINKS } from '../nav-data';
import { socialEntries } from '../social-map';
import { QalahScrollTop } from './scroll-top';

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

// فوتر premium (غامق). الديسكتوب: خطّ هويّة علويّ متدرّج + عمود العلامة **على اليمين** (لوجو من
// الإعدادات + وصف الموقع + واتساب + سوشال) ثمّ روابط سريعة + تواصل + تطبيقات. الجوّال: فوتر مُبسَّط.
export async function QalahFooter() {
  const [settings, pages] = await Promise.all([getSiteSettings(), getStaticPages('footer')]);

  const siteName = settings?.site_name?.trim() || 'القلعة نيوز';
  const year = new Date().getFullYear();
  const copyright = settings?.copyright?.trim() || `${siteName} ${year} - جميع الحقوق محفوظة`;
  const description = settings?.description?.trim() || null;
  const phone = settings?.phone?.trim() || null;
  const email = settings?.email?.trim() || null;
  const social = socialEntries(settings?.social);
  const whatsapp = social.find((s) => s.key === 'whatsapp') ?? null;
  const socialRow = social.filter((s) => s.key !== 'whatsapp');
  const WaIcon = whatsapp?.Icon ?? null;

  const quickLinks = [
    { label: 'الرئيسية', href: '/' },
    ...pages.map((p) => ({ label: p.title, href: p.href })),
    ...PLATFORM_LINKS.filter((l) => l.href !== '#'),
  ];

  return (
    <footer className="footer" id="main-footer">
      <div className="footer-accent" aria-hidden />

      {/* ===== ديسكتوب: تصميم premium (العلامة على اليمين) ===== */}
      <div className="footer-grid">
        {/* العلامة (يمين) */}
        <div className="footer-brand-col">
          <SiteLogo variant="dark" className="footer-logo" />
          {description && <p className="footer-about-text">{description}</p>}

          {whatsapp && WaIcon && (
            <a href={whatsapp.url} target="_blank" rel="noopener noreferrer" className="footer-whatsapp-cta" aria-label="واتساب">
              <WaIcon className="size-5" aria-hidden />
              <span>تواصل معنا على واتساب</span>
            </a>
          )}

          {socialRow.length > 0 && (
            <div className="social-icons">
              {socialRow.map(({ key, url, Icon, label }) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label={label}>
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* روابط سريعة */}
        <div className="footer-col">
          <h3 className="footer-col-title">روابط سريعة</h3>
          <ul className="footer-links">
            {quickLinks.map((l) => (
              <li key={`${l.label}-${l.href}`}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* تواصل معنا */}
        <div className="footer-col">
          <h3 className="footer-col-title">تواصل معنا</h3>
          {phone || email ? (
            <ul className="footer-contact">
              {phone && (
                <li>
                  <PhoneIcon className="size-4" />
                  <a href={`tel:${phone}`} dir="ltr">{phone}</a>
                </li>
              )}
              {email && (
                <li>
                  <MailIcon className="size-4" />
                  <a href={`mailto:${email}`} dir="ltr">{email}</a>
                </li>
              )}
            </ul>
          ) : (
            <p className="footer-muted">غير متوفّر حاليًّا</p>
          )}
        </div>

        {/* تطبيقاتنا (يسار) */}
        <div className="footer-col">
          <h3 className="footer-col-title">تطبيقاتنا</h3>
          <div className="app-buttons">
            {[{ sys: 'Android' }, { sys: 'iPhone' }].map((a) => (
              <a key={a.sys} href="#" className="app-btn">
                <div className="app-btn-text">
                  <span className="app-btn-subtitle">تحميل لنظام</span>
                  <span className="app-btn-title">{a.sys}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ===== جوّال: فوتر مُبسَّط ===== */}
      <div className="footer-mobile">
        <SiteLogo variant="dark" className="footer-m-logo" />

        {whatsapp && WaIcon && (
          <a href={whatsapp.url} target="_blank" rel="noopener noreferrer" className="footer-m-whatsapp" aria-label="واتساب">
            <WaIcon className="size-5" aria-hidden />
            <span>تابعنا على واتساب</span>
          </a>
        )}

        {socialRow.length > 0 && (
          <div className="footer-m-social">
            {socialRow.map(({ key, url, Icon, label }) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
                <Icon className="size-4" aria-hidden />
              </a>
            ))}
          </div>
        )}

        <nav className="footer-m-links">
          {quickLinks.slice(0, 6).map((l) => (
            <Link key={`${l.label}-${l.href}`} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="footer-bottom">
        <span>{copyright}</span>
        <span>{siteName}</span>
      </div>

      <QalahScrollTop />
    </footer>
  );
}
