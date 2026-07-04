/**
 * Telemetry Analytics Helper - dispatch actions to GA4, GTM, and other pixels.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined') {
    const win = window as typeof window & {
      gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
      dataLayer?: Record<string, unknown>[];
      fbq?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
    };

    // 1. Google Analytics (gtag)
    if (typeof win.gtag === 'function') {
      win.gtag('event', name, params);
    }
    
    // 2. Google Tag Manager (dataLayer)
    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push({ event: name, ...params });
    }

    // 3. Facebook Pixel (fbq)
    if (typeof win.fbq === 'function') {
      win.fbq('trackCustom', name, params);
    }

    // 4. Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics Event] ${name}:`, params);
    }
  }
}
