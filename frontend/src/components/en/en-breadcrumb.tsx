import Link from 'next/link';

import { enCategoryUrl } from '@/lib/en';

// Article breadcrumb: Home / Category. LTR.
export function EnBreadcrumb({ category }: { category: { name: string; slug: string } | null }) {
  return (
    <nav className="en-breadcrumb" aria-label="Breadcrumb">
      <Link href="/en">Home</Link>
      {category && (
        <>
          <span className="sep" aria-hidden>/</span>
          <Link href={enCategoryUrl(category.slug)}>{category.name}</Link>
        </>
      )}
    </nav>
  );
}
