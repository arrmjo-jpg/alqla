import Link from 'next/link';

// English pagination — reuses the same sibling-range algorithm as components/ui/pagination.tsx
// (pure page-number math, locale-agnostic) but with English copy and .en-* styling. Forked rather
// than parameterized: the AR component's labels are hardcoded JSX text, not props.
export function EnPagination({
  currentPage,
  totalPages,
  hrefFor,
}: {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const page = Math.min(Math.max(1, currentPage), totalPages);

  const range: (number | '…')[] = [];
  const sibling = 1;
  range.push(1);
  if (page - sibling > 2) range.push('…');
  const start = Math.max(2, page - sibling);
  const end = Math.min(totalPages - 1, page + sibling);
  for (let i = start; i <= end; i++) range.push(i);
  if (page + sibling < totalPages - 1) range.push('…');
  if (totalPages > 1) range.push(totalPages);

  return (
    <nav className="en-pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className="en-page-link">← Previous</Link>
      ) : (
        <span className="en-page-link" aria-hidden style={{ opacity: 0.4, cursor: 'default' }}>← Previous</span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {range.map((item, idx) =>
          item === '…' ? (
            <span key={`ellipsis-${idx}`} className="en-meta" aria-hidden>…</span>
          ) : (
            <Link
              key={item}
              href={hrefFor(item)}
              className="en-page-link"
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Link>
          ),
        )}
      </div>

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className="en-page-link">Next →</Link>
      ) : (
        <span className="en-page-link" aria-hidden style={{ opacity: 0.4, cursor: 'default' }}>Next →</span>
      )}
    </nav>
  );
}
