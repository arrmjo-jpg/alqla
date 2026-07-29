import Link from 'next/link';
import { env } from '@/lib/env';

interface BreadcrumbProps {
  category: { id: number | string; name: string; slug: string } | null;
  title: string;
  articleUrl: string;
}

export function ArticleBreadcrumb({ category, title, articleUrl }: BreadcrumbProps) {
  const siteUrl = env.siteUrl || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'الرئيسية',
        'item': siteUrl || '/',
      },
      ...(category
        ? [
            {
              '@type': 'ListItem',
              'position': 2,
              'name': category.name,
              'item': `${siteUrl}/category-${category.id}/${encodeURIComponent(category.slug)}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        'position': category ? 3 : 2,
        'name': title,
        'item': `${siteUrl}${articleUrl}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <nav aria-label="مسار التنقّل" className="mb-1 flex flex-wrap items-center text-sm text-muted sm:text-base print:hidden">
        <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <li className="flex items-center">
            <Link href="/" className="transition-colors hover:text-primary font-medium">
              الرئيسية
            </Link>
          </li>

          {category && (
            <>
              <span aria-hidden className="text-muted/60 select-none">/</span>
              <li className="flex items-center">
                <Link
                  href={`/category-${category.id}/${encodeURIComponent(category.slug)}`}
                  className="transition-colors hover:text-primary font-medium"
                >
                  {category.name}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>
    </>
  );
}
