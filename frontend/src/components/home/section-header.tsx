import Link from 'next/link';

import { SectionMoreLink } from '@/components/ui/section-more-link';

// ترويسة قسم موحّدة لأقسام الرئيسية الإخباريّة: اسم القسم بخلفيّة حمراء + رابط «المزيد» على الطرف
// المقابل من نفس الصفّ (لا رابط تذييل منفصل أسفل القسم بعد اليوم). خطّ سفليّ بلون الموقع الأساسيّ (أحمر)
// يفصل الترويسة عن المحتوى. تُطبَّق على كلّ أقسام الأخبار للتناسق، عدا (الاقتصاد/تريندنغ/الوفيات) التي
// تحتفظ بتصميمها الخاصّ.
export function SectionHeader({
  title,
  headingId,
  href,
  moreLabel = 'المزيد',
}: {
  title: string;
  headingId?: string;
  href?: string;
  moreLabel?: string;
}) {
  return (
    // flex-row يعكس اتّجاهه تلقائيًّا حسب `dir` المحيط ⇒ «المزيد» يهبط دومًا على الطرف المقابل للعنوان
    // بلا أي شرط لغة صريح. خطّ سفليّ أحمر بعرض القسم كاملًا (بدل الرماديّ المحايد سابقًا).
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-primary">
      <h2
        id={headingId}
        className="bg-primary px-4 py-2 font-heading text-lg font-extrabold leading-tight text-white sm:text-xl"
      >
        {href ? (
          <Link href={href} className="text-white transition-opacity hover:opacity-90">
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>

      {href && <SectionMoreLink href={href} label={moreLabel} className="me-1" />}
    </div>
  );
}
