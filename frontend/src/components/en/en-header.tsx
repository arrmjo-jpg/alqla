import Link from 'next/link';

import { socialEntries } from '@/components/layout/social-map';
import { EN_MEDIA_NAV, enSocialLabel } from '@/lib/en';
import { getEnCategories } from '@/lib/en-data';
import type { SiteSettings } from '@/lib/site-settings';
import { EnMenu } from './en-menu';

// English masthead (LTR), structured like the Arabic one:
//  • red top navbar: social (start) + media/service links (center) + Arabic switch (end)
//  • white header: English logo (localized) + date
//  • category row: Home + editorial categories (like the Arabic homepage)
export async function EnHeader({ settings }: { settings: SiteSettings | null }) {
  const cats = await getEnCategories();
  const name = settings?.site_name?.trim() || 'Alqalah News';
  const logo = settings?.logo_light?.trim() || null;
  const socials = socialEntries(settings?.social);
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <nav className="en-navbar" aria-label="Media & services">
        {socials.length > 0 && (
          <div className="en-navbar-socials">
            {socials.map(({ key, url, Icon }) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={enSocialLabel(key)} title={enSocialLabel(key)}>
                <Icon className="size-3.5" aria-hidden />
              </a>
            ))}
          </div>
        )}
        <ul className="en-navbar-nav">
          {EN_MEDIA_NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
        <div className="en-navbar-lang">
          <Link href="/" aria-label="التبديل إلى العربية">العربية</Link>
        </div>
      </nav>

      <header className="en-header">
        <div className="en-container">
          <div className="en-header-row">
            <div className="en-header-logo-group">
              <EnMenu categories={cats} social={settings?.social} />
              <Link href="/en" className="en-brand" aria-label={name}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- absolute backend URL, no next/image config
                  <img src={logo} alt={name} />
                ) : (
                  <span className="en-brand-name">{name}</span>
                )}
              </Link>
            </div>
            <span className="en-header-date">{today}</span>
          </div>

          <nav className="en-header-nav" aria-label="Sections">
            <ul className="en-header-nav-list">
              <li>
                <Link href="/en" className="en-header-nav-item">Home</Link>
              </li>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link href={c.id ? `/en/category-${c.id}/${encodeURIComponent(c.slug)}` : `/en/category/${encodeURIComponent(c.slug)}`} className="en-header-nav-item">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}
