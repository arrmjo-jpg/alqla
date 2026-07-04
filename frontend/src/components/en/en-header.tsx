import Link from 'next/link';

import { getEnCategories } from '@/lib/en-data';
import type { SiteSettings } from '@/lib/site-settings';

// English masthead (LTR), matched to the Arabic look: red-gradient top navbar
// (category links + Arabic switch) over a white header with the wordmark + date.
export async function EnHeader({ settings }: { settings: SiteSettings | null }) {
  const cats = await getEnCategories();
  const name = settings?.site_name?.trim() || 'Alqalah News';
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <nav className="en-navbar" aria-label="Primary">
        <ul className="en-navbar-nav">
          <li>
            <Link href="/en">Home</Link>
          </li>
          {cats.map((c) => (
            <li key={c.id}>
              <Link href={`/en/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link>
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
            <Link href="/en" className="en-brand" aria-label={name}>
              <span className="en-brand-name">{name}</span>
            </Link>
            <span className="en-header-date">{today}</span>
          </div>
        </div>
      </header>
    </>
  );
}
