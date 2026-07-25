// تبديل «النسخة الكاملة / نسخة الجوال» — عميليّ بحت (localStorage)، بدون أي حالة على الخادم.
// الآلية: تغيير وسم <meta name="viewport"> ليجبر المتصفّح على قياس تخطيط ثابت (1280px) فتنطبق
// وسوم Tailwind الحقيقية lg:/md: (بلا نسخة تخطيط مكرّرة). انظر mobile-view-banner.tsx (الاتجاهان
// معًا) وapp/layout.tsx (سكربت المزامنة المبكرة عند إعادة التحميل — يحذف وسم الـviewport القديم
// وينشئ وسمًا جديدًا بدل تعديل الموجود، لأن تعديل content عبر setAttribute لا يجبر إعادة التخطيط).
export const SITE_VIEW_STORAGE_KEY = 'acm_site_view';
export const FORCED_DESKTOP_WIDTH = 1280;

export function isForcedDesktop(): boolean {
  try {
    return localStorage.getItem(SITE_VIEW_STORAGE_KEY) === 'desktop';
  } catch {
    return false;
  }
}

export function setForcedDesktop(forced: boolean) {
  try {
    if (forced) localStorage.setItem(SITE_VIEW_STORAGE_KEY, 'desktop');
    else localStorage.removeItem(SITE_VIEW_STORAGE_KEY);
  } catch {
    // localStorage غير متاح (وضع خاص/محظور) — لا داعي لإيقاف التبديل، فقط لن يُتذكَّر لاحقًا.
  }
  location.reload();
}
