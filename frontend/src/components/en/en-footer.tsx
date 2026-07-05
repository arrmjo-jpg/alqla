import Link from 'next/link';

import { getEnCategories } from '@/lib/en-data';
import type { SiteSettings } from '@/lib/site-settings';

// English footer (LTR) — dark, matched to the Arabic footer (red accent line,
// red-underlined column titles, Arabic-edition switch).
export async function EnFooter({ settings }: { settings: SiteSettings | null }) {
  const cats = await getEnCategories();
  const name = settings?.site_name?.trim() || 'Alqalah News';
  const logo = settings?.logo_dark?.trim() || null;
  const year = new Date().getFullYear();
  const copyright = settings?.copyright?.trim() || `© ${year} ${name}. All rights reserved.`;
  const description = settings?.description?.trim() || null;

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
          </div>

          <nav aria-label="Sections">
            <div className="en-footer-col-title">Sections</div>
            <ul className="en-footer-links">
              <li><Link href="/en">Home</Link></li>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link href={c.id ? `/en/category-${c.id}/${encodeURIComponent(c.slug)}` : `/en/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="More">
            <div className="en-footer-col-title">More</div>
            <ul className="en-footer-links">
              <li><Link href="/">العربية · Arabic edition</Link></li>
            </ul>
          </nav>
        </div>

        <div className="en-footer-bottom">
          <span>{copyright}</span>
          <span>{name} · English edition</span>
        </div>
      </div>
    </footer>
  );
}
