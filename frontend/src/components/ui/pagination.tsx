import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;
  const page = Math.min(Math.max(1, currentPage), totalPages);

  // Generate responsive range: [1, '…', page-1, page, page+1, '…', total]
  const range: (number | '…')[] = [];
  const sibling = 1; // Show 1 page before and after current page

  range.push(1);
  
  if (page - sibling > 2) {
    range.push('…');
  }

  const start = Math.max(2, page - sibling);
  const end = Math.min(totalPages - 1, page + sibling);

  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  if (page + sibling < totalPages - 1) {
    range.push('…');
  }

  if (totalPages > 1) {
    range.push(totalPages);
  }

  const baseBtn =
    'flex h-10 min-w-10 items-center justify-center rounded-xl border text-sm font-bold transition-all duration-300 active:scale-95 select-none';
  const activeBtn = `${baseBtn} border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20`;
  const normalBtn = `${baseBtn} border-border/60 bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5`;
  const disabledBtn = `${baseBtn} border-border/40 bg-surface text-muted-foreground/30 cursor-not-allowed opacity-50 active:scale-100`;

  return (
    <nav 
      className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 print:hidden" 
      aria-label="ترقيم الصفحات"
    >
      {/* First Page Button */}
      {page > 1 ? (
        <Link 
          href={hrefFor(1)} 
          title="الصفحة الأولى" 
          className={normalBtn}
        >
          <ChevronsRight className="size-4" />
        </Link>
      ) : (
        <span className={disabledBtn} aria-hidden>
          <ChevronsRight className="size-4" />
        </span>
      )}

      {/* Prev Page Button */}
      {page > 1 ? (
        <Link 
          href={hrefFor(page - 1)} 
          rel="prev" 
          className={`${normalBtn} px-3 gap-1`}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="size-4" />
          <span className="hidden sm:inline">السابق</span>
        </Link>
      ) : (
        <span className={`${disabledBtn} px-3 gap-1`} aria-hidden>
          <ChevronRight className="size-4" />
          <span className="hidden sm:inline">السابق</span>
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {range.map((item, idx) =>
          item === '…' ? (
            <span 
              key={`ellipsis-${idx}`} 
              className="flex h-10 w-8 items-center justify-center text-muted-foreground/50 font-bold"
              aria-hidden
            >
              …
            </span>
          ) : item === page ? (
            <span 
              key={item} 
              aria-current="page" 
              className={activeBtn}
            >
              {item}
            </span>
          ) : (
            <Link 
              key={item} 
              href={hrefFor(item)} 
              className={normalBtn}
            >
              {item}
            </Link>
          )
        )}
      </div>

      {/* Next Page Button */}
      {page < totalPages ? (
        <Link 
          href={hrefFor(page + 1)} 
          rel="next" 
          className={`${normalBtn} px-3 gap-1`}
          aria-label="الصفحة التالية"
        >
          <span className="hidden sm:inline">التالي</span>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={`${disabledBtn} px-3 gap-1`} aria-hidden>
          <span className="hidden sm:inline">التالي</span>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {/* Last Page Button */}
      {page < totalPages ? (
        <Link 
          href={hrefFor(totalPages)} 
          title="الصفحة الأخيرة" 
          className={normalBtn}
        >
          <ChevronsLeft className="size-4" />
        </Link>
      ) : (
        <span className={disabledBtn} aria-hidden>
          <ChevronsLeft className="size-4" />
        </span>
      )}
    </nav>
  );
}
