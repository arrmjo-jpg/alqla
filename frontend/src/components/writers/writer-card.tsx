import Link from 'next/link';
import Image from 'next/image';
import type { WriterProfile } from '@/lib/writer';
import { User, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WriterCardProps {
  writer: WriterProfile;
}

export function WriterCard({ writer }: WriterCardProps) {
  const href = `/writer/${writer.id}`;
  
  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr));
  };
  
  return (
    <Link 
      href={href}
      className={cn(
        "group relative flex flex-col items-center p-7 bg-white rounded-3xl",
        "border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)]",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary/30",
        "overflow-hidden"
      )}
    >
      {/* Soft background gradient that appears on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Avatar Container with gradient border effect */}
      <div className="relative w-24 h-24 mb-5 rounded-full p-[3px] bg-gradient-to-br from-gray-100 to-gray-50 group-hover:from-primary/40 group-hover:to-primary/10 transition-all duration-500 shadow-inner">
        <div className="relative w-full h-full rounded-full overflow-hidden bg-white border-2 border-white">
          {writer.avatar ? (
            <Image
              src={writer.avatar}
              alt={`صورة الكاتب ${writer.name}`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full bg-gray-50/80 flex items-center justify-center text-gray-300">
              <User size={36} strokeWidth={1.5} />
            </div>
          )}
        </div>
        {/* Verified Badge */}
        {writer.verified && (
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-full p-1.5 border-2 border-white shadow-sm ring-1 ring-black/5" title="حساب موثق">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      <h3 className="relative text-[1.1rem] font-bold text-gray-900 text-center mb-1.5 line-clamp-1 group-hover:text-primary transition-colors duration-300">
        {writer.name}
      </h3>

      <div className="relative flex flex-col items-center gap-2 mt-4 w-full">
        {/* Divider */}
        <div className="w-8 h-[2px] bg-gray-100 rounded-full mb-2 group-hover:bg-primary/20 transition-colors duration-500" />
        
        <div className="flex items-center text-[13px] font-medium text-gray-500 gap-1.5 group-hover:text-gray-700 transition-colors duration-300">
          <FileText size={14} className="text-gray-400 group-hover:text-primary/60 transition-colors" />
          <span>{writer.articles_count ? `${writer.articles_count} مقال` : 'لا توجد مقالات'}</span>
        </div>
        
        {writer.last_activity_at && (
          <div className="flex items-center text-[12px] text-gray-400 gap-1.5">
            <Clock size={12} className="text-gray-300" />
            <span>نشر في {formatDate(writer.last_activity_at)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
