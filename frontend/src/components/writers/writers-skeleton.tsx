import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200/80', className)}
      {...props}
    />
  );
}

export function WriterCardSkeleton() {
  return (
    <div className="flex flex-col items-center p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
      <Skeleton className="w-24 h-24 rounded-full mb-4" />
      <Skeleton className="h-6 w-3/4 mb-1" />
      
      <div className="flex flex-col items-center gap-1 mt-3 w-full border-t border-gray-50 pt-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3 mt-1" />
      </div>
    </div>
  );
}

export function WritersGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <WriterCardSkeleton key={i} />
      ))}
    </div>
  );
}
