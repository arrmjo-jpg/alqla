import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// Pin the file-tracing root to this app so Next does not infer a parent workspace
// when sibling lockfiles exist.
// NEXT_CONFIG_API_BASE_URL (build-time-only) takes priority: this file's rewrites() runs
// at `next build` and gets baked into routes-manifest.json, so it needs a value even inside
// the isolated Docker build stage where the real API_BASE_URL is deliberately left unset
// (see Dockerfile) to keep page-level data fetching from hanging on an unreachable backend.
const API = (process.env.NEXT_CONFIG_API_BASE_URL ?? process.env.API_BASE_URL ?? "").replace(/\/$/, "");
const BACKEND_URL = API.replace(/\/api\/v1$/, "").replace(/\/v1$/, "");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),

  // قارئ الجريدة (Blade/SSR) يعيش في تطبيق Laravel؛ نمرّر مساراته وأصوله إلى أصل Next
  // ليصير القارئ القائم متاحاً من دومين الموقع دون إعادة بناء. مسبوق باللغة (ar|en) فلا
  // يتعارض مع صفحة /epaper (الهبوط في Next). /build/* أصول القارئ المبنيّة (pdf.js/cmaps/css).
  async rewrites() {
    if (!API) return [];
    return [
      { source: "/category-:id(\\d+)/:name*", destination: "/category/:id/:name*" },
      { source: "/en/category-:id(\\d+)/:name*", destination: "/en/category/:id/:name*" },
      { source: "/:locale(ar|en)/epaper", destination: `${API}/:locale/epaper` },
      { source: "/:locale(ar|en)/epaper/:path*", destination: `${API}/:locale/epaper/:path*` },
      { source: "/build/:path*", destination: `${API}/build/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
