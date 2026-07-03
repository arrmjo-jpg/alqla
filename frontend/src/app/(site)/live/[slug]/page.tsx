import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BroadcastWatch } from '@/components/broadcast/broadcast-watch';
import { getBroadcast } from '@/lib/broadcast';

// صفحة بثّ مباشر (حدث) — /live/{slug}. تعيد استخدام GET /api/v1/live/{slug} (مع playback).
// ISR قصير (البثّ متغيّر). غير موجود/غير عامّ ⇒ 404.
export const revalidate = 30;

import { env } from '@/lib/env';
import { articleSeoToMetadata } from '@/lib/articles';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBroadcast('live', slug);
  if (!b) return { title: 'البث المباشر' };

  return articleSeoToMetadata(b, `${env.siteUrl}/live/${slug}`);
}

export default async function LiveBroadcastPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBroadcast('live', slug);
  if (!b) notFound();
  return <BroadcastWatch broadcast={b} />;
}
