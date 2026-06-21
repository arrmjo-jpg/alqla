'use client';

import { useState } from 'react';

// نموذج النشرة البريديّة (شكل التصميم). ملاحظة: لا يوجد حاليًّا مسار اشتراك بريديّ في الباك إند
// (الاشتراك الحقيقيّ المتوفّر هو واتساب عبر SubscribeBox). يبقى هنا بسلوك العرض حتى يُربط بمسار
// قائمة بريديّة، أو يُستبدَل بـ SubscribeBox إن رغبت بربطه بواتساب.
export function QalahNewsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
    setEmail('');
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <form className="newsletter-form" onSubmit={onSubmit}>
      <div className="newsletter-input-wrap">
        <input
          type="email"
          required
          className="newsletter-input"
          placeholder="أدخل بريدك الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" className="newsletter-btn">
        {done ? 'تم الاشتراك!' : 'اشترك'}
      </button>
    </form>
  );
}
