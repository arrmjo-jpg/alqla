'use client';

import dynamic from 'next/dynamic';

const DynamicWeatherFeature = dynamic(
  () => import('./weather-feature').then((m) => m.WeatherFeature),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 mt-6">
        <div className="h-[120px] w-full animate-pulse rounded-xl bg-surface-2" />
      </div>
    ),
  }
);

export function WeatherWrapper() {
  return <DynamicWeatherFeature />;
}
