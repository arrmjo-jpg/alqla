import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BroadcastWatch } from '@/components/broadcast/broadcast-watch';
import { getBroadcast } from '@/lib/broadcast';

// صفحة محطّة راديو — /radio/{slug}. تعيد استخدام GET /api/v1/radio/{slug}.
export const revalidate = 30;

import { env } from '@/lib/env';
import { articleSeoToMetadata } from '@/lib/articles';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBroadcast('radio', slug);
  if (!b) return { title: 'محطات الراديو' };

  return articleSeoToMetadata(b, `${env.siteUrl}/radio/${slug}`);
}

export default async function RadioBroadcastPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBroadcast('radio', slug);
  if (!b) notFound();
  return <BroadcastWatch broadcast={b} />;
}
