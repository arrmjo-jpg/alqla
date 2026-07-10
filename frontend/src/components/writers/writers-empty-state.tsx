import Link from 'next/link';
import { SearchX } from 'lucide-react';

export function WritersEmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="bg-gray-50 p-6 rounded-full mb-6">
        <SearchX size={48} className="text-gray-400" />
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        لا يوجد كاتب بهذا الاسم
      </h3>
      
      {searchQuery && (
        <p className="text-gray-500 mb-8 max-w-md">
          لم نتمكن من العثور على أي كاتب يطابق بحثك عن &quot;<span className="font-semibold text-gray-700">{searchQuery}</span>&quot;. حاول استخدام كلمات مختلفة.
        </p>
      )}
      
      <Link 
        href="/writers" 
        className="inline-flex items-center justify-center h-10 px-6 font-medium text-white transition-colors rounded-md bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        إزالة البحث
      </Link>
    </div>
  );
}
