import Link from 'next/link';

// أدوات ترويسة/تذييل موحّدة لأقسام الرئيسية الإخباريّة:
//   • <SectionHeader/> — اسم القسم بخلفيّة حمراء بمقاس النصّ + خطّ أبيض (بلا شحطة عموديّة، بلا رابط علويّ).
//   • <SectionMore/>   — رابط «عرض الكل» يُوضَع **أسفل** القسم (نُقِل من أعلاه).
// تُطبَّق على كلّ أقسام الأخبار للتناسق، عدا (الاقتصاد/الرياضة/تريندنغ/الوفيات) التي تحتفظ بتصميمها الخاصّ.

// شيفرون يشير لجهة القراءة-للأمام (يسار في RTL) — أيقونة مضمّنة (لا تبعيّة).
function ChevronForward({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// ترويسة القسم — اسم القسم داخل مستطيل أحمر بمقاس النصّ (inline-block) وخطّ أبيض. القسم رابط اختياريّ
// لصفحة التصنيف. خطّ سفليّ محايد رفيع للفصل (ليس أحمر).
export function SectionHeader({
  title,
  headingId,
  href,
}: {
  title: string;
  headingId?: string;
  href?: string;
}) {
  return (
    // flex بلا padding سفليّ ⇒ الخطّ السفليّ يلامس قاعدة الصندوق الأحمر تمامًا (بلا فراغ)، ويمتدّ عرضيًّا.
    <div className="mb-6 flex border-b border-border">
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
    </div>
  );
}

// رابط «عرض الكل» أسفل القسم — زرّ أسود/خطّ أبيض، يصير أحمر عند المرور. أقصى الشمال (يسار):
// الصفحة RTL ⇒ justify-end يدفع الزرّ إلى الحافة اليسرى. خطّ علويّ يمتدّ بعرض القسم كاملًا فوق الزرّ
// (مطابق لخطّ اسم القسم: border-border) وملاصق للزرّ مباشرةً (بلا حاشية علويّة).
export function SectionMore({ href }: { href: string }) {
  return (
    <div className="mt-6 flex justify-end border-t border-border">
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-md bg-black px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary"
      >
        <span>عرض الكل</span>
        <ChevronForward className="size-4" />
      </Link>
    </div>
  );
}
