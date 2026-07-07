'use client';

import { Droplets, Sunrise, Sunset, Thermometer, Wind } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Container } from '@/components/layout/container';
import type { WeatherFull } from './weather-card';
import { AnimatedWeatherIcon } from './animated-weather-icon';

// قسم الطقس السينمائيّ — بطاقة «اليوم» الكبيرة (أيقونة متحرّكة ضخمة + الحرارة + الإحساس + الرطوبة/الرياح +
// شروق/غروب) بجانب توقّع الأسبوع، بخلفيّة سماويّة تتبدّل نهارًا/ليلًا. بيانات حقيقيّة من OpenWeather. لا طقس ⇒ يُخفى.
const CITY_ID = 'amman';

export function WeatherFeature() {
  const [weather, setWeather] = useState<WeatherFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/weather?gov=${encodeURIComponent(CITY_ID)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setWeather(data as WeatherFull);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mt-6 sm:mt-8" dir="rtl" aria-label="حالة الطقس">
        <Container>
          <div className="h-[120px] w-full animate-pulse rounded-xl bg-surface-2" />
        </Container>
      </section>
    );
  }

  if (!weather) return null;

  const { current } = weather;
  const days = (weather.daily ?? []).slice(0, 7);
  const night = current.icon.endsWith('n');
  const bg = night
    ? 'linear-gradient(120deg, #0a1430 0%, #15235a 52%, #25407f 100%)'
    : 'linear-gradient(120deg, #0b3a86 0%, #1769c7 48%, #2f93e0 100%)';
  const glow = night
    ? 'radial-gradient(52% 120% at 82% -12%, rgba(170,195,255,0.28), transparent 62%)'
    : 'radial-gradient(58% 130% at 82% -12%, rgba(255,214,120,0.38), transparent 60%)';


  return (
    <section className="mt-6 sm:mt-8" dir="rtl" aria-label="حالة الطقس">
      <div className="relative overflow-hidden text-white" style={{ background: bg }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: glow }} aria-hidden />
        <Container className="relative py-4 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
            {/* بطاقة «اليوم» السينمائيّة */}
            <Link
              href={`/weather/${CITY_ID}`}
              className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-95 sm:gap-4 lg:w-[40%]"
            >
              <AnimatedWeatherIcon
                code={current.icon}
                className="size-16 shrink-0 drop-shadow-lg sm:size-20"
                title={current.description}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-4xl font-black leading-none sm:text-5xl">{current.temp}°</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-extrabold">{weather.city}</span>
                </div>
                <div className="mt-1 truncate text-sm font-bold text-white/90">{current.description}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-white/85">
                  <span className="flex items-center gap-1">
                    <Thermometer className="size-3.5 shrink-0" aria-hidden />
                    الإحساس {current.feelsLike}°
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplets className="size-3.5 shrink-0" aria-hidden />
                    {current.humidity}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Wind className="size-3.5 shrink-0" aria-hidden />
                    {current.windKmh} كم/س
                  </span>
                  {current.sunrise && (
                    <span className="flex items-center gap-1">
                      <Sunrise className="size-3.5 shrink-0" style={{ color: '#ffd34d' }} aria-hidden />
                      {current.sunrise}
                    </span>
                  )}
                  {current.sunset && (
                    <span className="flex items-center gap-1">
                      <Sunset className="size-3.5 shrink-0" style={{ color: '#ffb86b' }} aria-hidden />
                      {current.sunset}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* فاصل */}
            <div className="hidden w-px self-stretch bg-white/20 lg:block" aria-hidden />

            {/* توقّع الأسبوع */}
            <div className="flex flex-1 items-stretch gap-1.5 overflow-x-auto sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {days.map((d, i) => (
                <DayMini key={d.date} day={d} today={i === 0} />
              ))}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}

function DayMini({
  day,
  today,
}: {
  day: {
    date: string;
    dayLabel: string;
    tempMin: number;
    tempMax: number;
    icon: string;
    description?: string;
  };
  today: boolean;
}) {
  return (
    <div
      className={`flex min-w-[54px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 ${
        today ? 'bg-white/20 ring-1 ring-inset ring-white/40' : ''
      }`}
      style={{ borderRadius: '10px' }}
    >
      <span className="text-[11px] font-extrabold leading-none">{today ? 'اليوم' : day.dayLabel}</span>
      <AnimatedWeatherIcon code={day.icon} className="size-9" title={day.description} />
      <span className="flex items-baseline gap-1 leading-none">
        <span className="text-[12px] font-extrabold">{day.tempMax}°</span>
        <span className="text-[11px] text-white/70">{day.tempMin}°</span>
      </span>
    </div>
  );
}
