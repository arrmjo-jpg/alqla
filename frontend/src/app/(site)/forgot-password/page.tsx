import type { Metadata } from 'next';

import { ForgotForm } from '@/components/auth/forgot-form';
import { Container } from '@/components/layout/container';
import { getRecaptchaConfig } from '@/lib/recaptcha';
import { buildMetadata } from '@/lib/seo';

// راجع login/page.tsx للسبب: بلا هذا التصريح تتجمّد الصفحة Static للأبد بإعداد reCAPTCHA فارغ
// (بُنيت وقت لا يوجد API_BASE_URL). 300 يطابق revalidate الفيتش الداخليّ في getRecaptchaConfig.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: 'استعادة كلمة المرور', path: '/forgot-password' });
}

export default async function ForgotPasswordPage() {
  const recaptcha = await getRecaptchaConfig();

  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-md border border-border bg-surface p-6 shadow-lg sm:p-8">
        <h1 className="font-heading text-h2 font-extrabold tracking-tight text-fg">استعادة كلمة المرور</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          أدخل بريدك الإلكترونيّ وسنرسل إليك رابطاً لإعادة تعيين كلمة المرور.
        </p>
        <ForgotForm recaptcha={{ enabled: recaptcha?.enabled ?? false, siteKey: recaptcha?.site_key ?? null }} />
      </div>
    </Container>
  );
}
