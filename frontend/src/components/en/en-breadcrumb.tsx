import Link from 'next/link';

import { enCategoryUrl } from '@/lib/en';
import { env } from '@/lib/env';

// Fork of components/articles/blocks/breadcrumb.tsx (ArticleBreadcrumb) — same 3-level
// structure (Home / Category / Title) + BreadcrumbList JSON-LD, English copy.
export function EnBreadcrumb({
  category,
  title,
  articleUrl,
}: {
  category: { id: number | string; name: string; slug: string } | null;
  title: string;
  articleUrl: string;
}) {
  const siteUrl = env.siteUrl || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/en` },
      ...(category
        ? [{ '@type': 'ListItem', position: 2, name: category.name, item: `${siteUrl}${enCategoryUrl(category.id, category.slug)}` }]
        : []),
      { '@type': 'ListItem', position: category ? 3 : 2, name: title, item: `${siteUrl}${articleUrl}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb" className="en-breadcrumb">
        <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, listStyle: 'none', margin: 0, padding: 0 }} itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link itemProp="item" href="/en" className="en-headline-link">
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>

          {category && (
            <>
              <span className="sep" aria-hidden>/</span>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link itemProp="item" href={enCategoryUrl(category.id, category.slug)} className="en-headline-link">
                  <span itemProp="name">{category.name}</span>
                </Link>
                <meta itemProp="position" content="2" />
              </li>
            </>
          )}

          <span className="sep" aria-hidden>/</span>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" style={{ minWidth: 0 }}>
            <span itemProp="name" style={{ color: 'var(--en-ink)', fontWeight: 700, display: 'inline-block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
              {title}
            </span>
            <meta itemProp="position" content={category ? '3' : '2'} />
          </li>
        </ol>
      </nav>
    </>
  );
}
