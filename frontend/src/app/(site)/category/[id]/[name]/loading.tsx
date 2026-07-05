import { Container } from '@/components/layout/container';

export default function CategoryLoading() {
  return (
    <Container className="py-8 sm:py-10 animate-pulse">
      {/* 1. Header Placeholder */}
      <div className="mb-8 flex items-center gap-3 border-b border-border pb-4">
        <span className="h-8 w-1 bg-border rounded-full shrink-0" />
        <div className="h-7 w-48 bg-border/80 rounded-lg" />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Main Column */}
        <main className="min-w-0 lg:col-span-8 space-y-8">
          
          {/* 2. Featured Category Hero Skeleton */}
          <div className="p-5 border border-border/40 rounded-3xl space-y-4">
            <div className="relative aspect-video w-full rounded-2xl bg-border/70" />
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="h-3.5 w-16 bg-border/60 rounded" />
                <div className="h-3.5 w-24 bg-border/60 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-border/80 rounded-lg" />
              <div className="h-6 w-1/2 bg-border/80 rounded-lg sm:hidden" />
              <div className="space-y-2 pt-1">
                <div className="h-4 w-full bg-border/50 rounded" />
                <div className="h-4 w-5/6 bg-border/50 rounded" />
                <div className="h-4 w-2/3 bg-border/50 rounded" />
              </div>
            </div>
            <div className="border-t border-border/30 pt-3 flex justify-between">
              <div className="flex gap-3">
                <div className="h-5 w-10 bg-border/50 rounded" />
                <div className="h-5 w-10 bg-border/50 rounded" />
              </div>
              <div className="flex gap-3">
                <div className="h-5 w-5 bg-border/50 rounded-full" />
                <div className="h-5 w-5 bg-border/50 rounded-full" />
              </div>
            </div>
          </div>

          {/* 3. Responsive News Grid Skeleton */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-4 border border-border/40 rounded-2xl flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between gap-4">
                  {/* Text details */}
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3.5 w-20 bg-border/60 rounded" />
                    <div className="space-y-1.5">
                      <div className="h-4.5 w-full bg-border/80 rounded" />
                      <div className="h-4.5 w-3/4 bg-border/80 rounded" />
                    </div>
                  </div>
                  {/* Image block */}
                  <div className="w-20 sm:w-28 aspect-[4/3] bg-border/70 rounded-xl shrink-0" />
                </div>
                <div className="border-t border-border/30 pt-2.5 flex justify-between">
                  <div className="flex gap-2">
                    <div className="h-4 w-8 bg-border/50 rounded" />
                    <div className="h-4 w-8 bg-border/50 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-4 w-4 bg-border/50 rounded-full" />
                    <div className="h-4 w-4 bg-border/50 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Pagination Skeleton */}
          <div className="flex justify-center gap-2 pt-6">
            <div className="h-10 w-10 bg-border/50 rounded-xl" />
            <div className="h-10 w-16 bg-border/50 rounded-xl" />
            <div className="h-10 w-10 bg-border/50 rounded-xl" />
            <div className="h-10 w-10 bg-border/50 rounded-xl" />
            <div className="h-10 w-16 bg-border/50 rounded-xl" />
            <div className="h-10 w-10 bg-border/50 rounded-xl" />
          </div>
        </main>

        {/* Sidebar Column */}
        <aside className="hidden lg:col-span-4 lg:block">
          <div className="space-y-6">
            <div className="h-8 w-32 bg-border/80 rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex gap-3 py-2 border-b border-border/30">
                  <div className="h-16 w-16 bg-border/70 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-border/80 rounded" />
                    <div className="h-3 w-1/2 bg-border/60 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
