import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EnStaticPageView } from '@/components/en/en-static-page-view';
import { ReadingSidebar } from '@/components/reading/reading-sidebar';
import { env } from '@/lib/env';
import { extractHeadings } from '@/lib/reading';
import { buildMetadata } from '@/lib/seo';
import { getStaticPage, splitFaq } from '@/lib/static-pages';
import { getTtsConfig } from '@/lib/tts';

// English static content page (About/Privacy/Terms/FAQ/…) — mirrors app/(site)/pages/[slug],
// reusing the same GET /en/pages/{slug} endpoint (getStaticPage already takes a locale). Needed so
// the EN footer's CMS-driven "Quick Links" (Privacy Policy etc., once EN content exists for them)
// resolve to a real page instead of 404ing — confirmed via the backend that EN currently has zero
// static pages for any placement, so this renders notFound() for every slug today; it activates
// automatically the moment an editor adds EN-locale pages in the CMS, no further code change.
export const revalidate = 86400;

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getStaticPage(decodeSlug(slug), 'en');
  if (!page) return { title: 'Page not found' };

  const base = await buildMetadata({
    title: page.seo.title || page.title,
    description: page.seo.description || undefined,
    path: page.seo.canonicalUrl || `/en${page.href}`,
    keywords: page.seo.keywords
      ? page.seo.keywords.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    type: 'article',
  });

  if (env.isProd && page.seo.robots) {
    return { ...base, robots: page.seo.robots };
  }
  return base;
}

export default async function EnStaticContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getStaticPage(decodeSlug(slug), 'en');
  if (!page) notFound();

  const isFaq = page.template === 'faq';
  const { html } = extractHeadings(page.contentHtml);
  const faqItems = isFaq ? splitFaq(page.contentHtml) : [];
  const shareUrl = `${env.siteUrl}/en${page.href}`;
  const ttsEnabled = (await getTtsConfig())?.enabled ?? false;

  const primary =
    isFaq && faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((it) => ({
            '@type': 'Question',
            name: it.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: it.answerHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            },
          })),
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: page.title,
          description: page.seo.description ?? undefined,
          url: shareUrl,
          inLanguage: 'en',
          dateModified: page.updatedAt ?? undefined,
        };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${env.siteUrl}/en` },
      { '@type': 'ListItem', position: 2, name: page.title, item: shareUrl },
    ],
  };
  const jsonLd = [primary, breadcrumb].map((o) => JSON.stringify(o).replace(/</g, '\\u003c'));

  return (
    <div className="en-container en-static-page">
      <nav aria-label="Breadcrumb" className="en-breadcrumb en-static-page__crumb">
        <Link href="/en">Home</Link>
        <span className="sep" aria-hidden>/</span>
        <span>{page.title}</span>
      </nav>

      <div className="en-static-page__layout">
        <main className="en-static-page__main">
          <EnStaticPageView page={page} contentHtml={html} faqItems={faqItems} shareUrl={shareUrl} ttsEnabled={ttsEnabled} />
        </main>
        <aside className="en-static-page__aside">
          <ReadingSidebar locale="en" />
        </aside>
      </div>

      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: j }} />
      ))}
    </div>
  );
}
