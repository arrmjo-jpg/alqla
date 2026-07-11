import Link from 'next/link';

// Fork of components/writers/writers-empty-state.tsx — same structure, English copy.
export function EnWritersEmpty({ searchQuery }: { searchQuery?: string }) {
  return (
    <div className="en-writers-empty">
      <h3>No writers found</h3>
      {searchQuery && (
        <p>
          We couldn&apos;t find any writer matching &quot;{searchQuery}&quot;. Try a different search.
        </p>
      )}
      <Link href="/en/writers" className="en-link en-meta" style={{ display: 'inline-block', marginTop: 18 }}>
        Clear search
      </Link>
    </div>
  );
}
