import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BroadcastWatch } from '@/components/broadcast/broadcast-watch';
import { getBroadcast } from '@/lib/broadcast';

// صفحة قناة تلفزيونيّة — /tv/{slug}. تعيد استخدام GET /api/v1/tv/{slug}.
export const revalidate = 30;

import { env } from '@/lib/env';
import { articleSeoToMetadata } from '@/lib/articles';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBroadcast('tv', slug);
  if (!b) return { title: 'القنوات' };

  return articleSeoToMetadata(b, `${env.siteUrl}/tv/${slug}`);
}

export default async function TvBroadcastPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBroadcast('tv', slug);
  if (!b) notFound();
  return <BroadcastWatch broadcast={b} />;
}
