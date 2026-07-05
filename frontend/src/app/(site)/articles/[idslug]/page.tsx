import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OldArticlesRedirectPage({ params }: { params: Promise<{ idslug: string }> }) {
  const { idslug } = await params;
  let decoded = idslug;
  try {
    decoded = decodeURIComponent(idslug);
  } catch {
    // raw
  }
  const id = decoded.split('-')[0];
  if (!id || isNaN(Number(id))) {
    permanentRedirect('/');
  }
  permanentRedirect(`/article/${id}`);
}
