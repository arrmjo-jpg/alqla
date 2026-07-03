import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { NewspaperReader } from '@/components/epaper/reader/newspaper-reader';
import { getEpapers, type EpaperIssue } from '@/lib/epaper';
import { getSiteSettings } from '@/lib/site-settings';

// القارئ الأصليّ (pdf.js) — خارج مجموعة (site) ⇒ صفحة غامرة بلا هيدر/فوتر الموقع. SEO عبر
// buildMetadata (عنوان/وصف/canonical/OG)، قابلة للفهرسة (العدد عامّ). بوّابة newspaper_enabled.
export const revalidate = 300;

async function resolveIssue(idslug: string): Promise<EpaperIssue | null> {
  const id = Number.parseInt(idslug, 10);
  if (!Number.isInteger(id) || id <= 0) return null;
  const issues = await getEpapers();
  return issues.find((i) => i.id === id) ?? null;
}

import { articleSeoToMetadata } from '@/lib/articles';
import { env } from '@/lib/env';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idslug: string }>;
}): Promise<Metadata> {
  const { idslug } = await params;
  const issue = await resolveIssue(idslug);
  if (!issue) return { title: 'الجريدة الرقمية' };

  return articleSeoToMetadata(issue, `${env.siteUrl}/newspaper/${idslug}`);
}

export default async function NewspaperReaderPage({
  params,
}: {
  params: Promise<{ idslug: string }>;
}) {
  const settings = await getSiteSettings();
  if (!settings?.newspaper_enabled) notFound();

  const { idslug } = await params;
  const issue = await resolveIssue(idslug);
  if (!issue) notFound();

  return (
    <NewspaperReader
      src={`/api/epaper/${issue.id}`}
      storageId={String(issue.id)}
      title={issue.title}
      backHref="/epaper"
      downloadUrl={issue.downloadUrl}
    />
  );
}
