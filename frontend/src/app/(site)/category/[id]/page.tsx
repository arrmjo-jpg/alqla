import { notFound, permanentRedirect } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/feed';

export const dynamic = 'force-dynamic';

export default async function OldCategoryRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    /* raw */
  }

  const category = await getCategoryBySlug(decoded, 'ar');
  if (!category) notFound();

  permanentRedirect(`/category-${category.id}/${category.slug}`);
}
