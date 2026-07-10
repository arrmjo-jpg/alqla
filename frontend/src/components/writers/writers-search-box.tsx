'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

export function WritersSearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const initialQuery = searchParams?.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  
  // Custom debounce logic since we don't know if useDebounce hook exists
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString());
      if (query) {
        params.set('q', query);
      } else {
        params.delete('q');
      }
      // Reset page when searching
      params.delete('page');
      
      router.push(`${pathname}?${params.toString()}`);
    }, 400); // 400ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [query, router, pathname, searchParams]);

  // Sync state if URL changes externally (e.g. back button or clearing search)
  useEffect(() => {
    setQuery(searchParams?.get('q') || '');
  }, [searchParams]);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
        <Search size={20} className="text-gray-400" />
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full p-4 pr-12 text-sm text-gray-900 border border-gray-200 rounded-full bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm transition-all"
        placeholder="ابحث عن كاتب، محرر، أو مراسل..."
        dir="rtl"
      />
    </div>
  );
}
