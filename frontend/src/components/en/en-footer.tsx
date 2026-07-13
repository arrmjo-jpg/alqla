import Link from 'next/link';

import { socialEntries } from '@/components/layout/social-map';
import { EnDesktopViewToggle } from '@/components/en/en-desktop-view-toggle';
import { enCategoryUrl, enSocialLabel, enUrl, looksArabic } from '@/lib/en';
import { getEnCategories } from '@/lib/en-data';
import type { SiteSettings } from '@/lib/site-settings';
import { getStaticPages } from '@/lib/static-pages';

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

// English footer (LTR) — matches AR's QalahFooter data model: brand column (logo + description +
// WhatsApp CTA + social icons), Quick Links (Home + CMS static pages tagged for footer placement —
// Privacy Policy/Terms/etc., the moment EN content exists for them), Contact (phones/email from
// Site Settings). Sections (EN's own category nav) is an EN-specific addition beyond AR's 3-column
// layout — harmless since it's equally CMS-driven (getEnCategories), not hardcoded editorial
// content. Every data field below comes from the already-locale='en' `settings` prop, or from
// getStaticPages('footer','en')/getEnCategories() — nothing here is CMS-overridable content that's
// instead baked into JSX; only universal chrome labels (column titles, "Home") are literal, same
// as AR's own footer.
export async function EnFooter({ settings }: { settings: SiteSettings | null }) {
  const [cats, pages] = await Promise.all([getEnCategories(), getStaticPages('footer', 'en')]);

  const name = settings?.site_name?.trim() || 'Alqalah News';
  const logo = settings?.logo_dark?.trim() || null;
  const year = new Date().getFullYear();
  // copyright/description aren't locale-scoped in the CMS yet for every field — /api/v1/en/site
  // and /api/v1/ar/site can return the exact same Arabic string. A shared-Arabic value isn't a
  // real English localization, so treat it the same as "not set" and use the English default
  // instead of ever rendering it — "no Arabic content on the English edition" wins over "show
  // whatever the CMS returns" when the two conflict.
  const rawCopyright = settings?.copyright?.trim() || '';
  const copyright = rawCopyright && !looksArabic(rawCopyright) ? rawCopyright : `© ${year} ${name}. All rights reserved.`;
  const rawDescription = settings?.description?.trim() || '';
  const description = rawDescription && !looksArabic(rawDescription) ? rawDescription : null;

  const phones = (settings?.phones ?? [])
    .map((c) => ({ name: (c.name ?? '').trim(), title: (c.title ?? '').trim(), phone: (c.phone ?? '').trim() }))
    .filter((c) => c.phone !== '');
  const email = settings?.email?.trim() || null;

  const social = socialEntries(settings?.social);
  const whatsapp = social.find((s) => s.key === 'whatsapp') ?? null;
  const socialRow = social.filter((s) => s.key !== 'whatsapp');
  const WaIcon = whatsapp?.Icon ?? null;

  const quickLinks = [{ label: 'Home', href: '/en' }, ...pages.map((p) => ({ label: p.title, href: enUrl(p.href) }))];

  return (
    <footer className="en-footer">
      <span className="en-footer-accent" aria-hidden />
      <div className="en-container">
        <div className="en-footer-grid">
          <div>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- absolute backend URL, no next/image config
              <img src={logo} alt={name} className="en-footer-logo" />
            ) : (
              <div className="en-footer-brandname">{name}</div>
            )}
            {description && (
              <p className="en-body" style={{ color: '#adadad', fontSize: '0.92rem', marginTop: 14, maxWidth: '40ch' }}>
                {description}
              </p>
            )}

            {whatsapp && WaIcon && (
              <a
                href={whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="en-footer-whatsapp"
                aria-label="Chat with us on WhatsApp"
              >
                <WaIcon className="en-footer-whatsapp__icon" aria-hidden />
                <span>Chat with us on WhatsApp</span>
              </a>
            )}

            {socialRow.length > 0 && (
              <div className="en-footer-social">
                {socialRow.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="en-footer-social__btn"
                    aria-label={enSocialLabel(key)}
                    title={enSocialLabel(key)}
                  >
                    <Icon className="en-footer-social__icon" aria-hidden />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Sections">
            <div className="en-footer-col-title">Sections</div>
            <ul className="en-footer-links">
              {cats.map((c) => (
                <li key={c.id}>
                  <Link href={c.id ? enCategoryUrl(c.id, c.slug) : `/en/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Quick Links">
            <div className="en-footer-col-title">Quick Links</div>
            <ul className="en-footer-links">
              {quickLinks.map((l) => (
                <li key={`${l.label}-${l.href}`}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
              <li><Link href="/">العربية · Arabic edition</Link></li>
            </ul>
          </nav>

          <nav aria-label="Contact">
            <div className="en-footer-col-title">Contact</div>
            {phones.length > 0 || email ? (
              <ul className="en-footer-contact">
                {phones.map((c, i) => (
                  <li key={i}>
                    <PhoneIcon className="en-footer-contact__icon" />
                    <span className="en-footer-contact__text">
                      <a href={`tel:${c.phone.replace(/\s+/g, '')}`} dir="ltr">{c.phone}</a>
                      {(c.title || c.name) && <small>{[c.title, c.name].filter(Boolean).join(' — ')}</small>}
                    </span>
                  </li>
                ))}
                {email && (
                  <li>
                    <MailIcon className="en-footer-contact__icon" />
                    <a href={`mailto:${email}`} dir="ltr">{email}</a>
                  </li>
                )}
              </ul>
            ) : (
              <p className="en-footer-muted">Not available yet</p>
            )}
          </nav>
        </div>

        {/* Mobile: simplified footer — mirrors AR's .footer-mobile exactly (logo, WhatsApp CTA,
            social icons, up to 6 quick links, view-toggle), hidden on desktop via CSS. The full
            grid above (Sections/Quick Links/Contact columns) is hidden on mobile instead. */}
        <div className="en-footer-mobile">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- absolute backend URL, no next/image config
            <img src={logo} alt={name} className="en-footer-m-logo" />
          ) : (
            <div className="en-footer-m-logo">{name}</div>
          )}

          {whatsapp && WaIcon && (
            <a
              href={whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="en-footer-m-whatsapp"
              aria-label="Chat with us on WhatsApp"
            >
              <WaIcon className="size-5" aria-hidden />
              <span>Follow us on WhatsApp</span>
            </a>
          )}

          {socialRow.length > 0 && (
            <div className="en-footer-m-social">
              {socialRow.map(({ key, url, Icon }) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={enSocialLabel(key)}>
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          )}

          <nav className="en-footer-m-links" aria-label="Quick Links">
            {quickLinks.slice(0, 6).map((l) => (
              <Link key={`${l.label}-${l.href}`} href={l.href}>{l.label}</Link>
            ))}
          </nav>

          <div className="en-footer-toggle-wrap">
            <EnDesktopViewToggle className="en-footer-toggle-btn" />
          </div>
        </div>

        <div className="en-footer-bottom">
          <span>{copyright}</span>
          <span>{name}</span>
        </div>
      </div>
    </footer>
  );
}
