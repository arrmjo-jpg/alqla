# Next.js Caching Gotchas — Developer Guide

Real, discovered-in-this-project traps in Next.js 15's caching model that
are easy to misread from the source code alone. Read this before changing
any `revalidate` value or debugging "why is this page updating faster/
slower than I set it to."

---

## 1. `export const revalidate = N` on a page is NOT the real ISR interval

**The trap**: a page file declares, e.g.:

```ts
// app/(site)/page.tsx
export const revalidate = 3600; // looks like: "this page updates once an hour"
```

A developer reading this reasonably assumes the homepage regenerates
hourly. **This is wrong**, and the gap isn't small.

**The actual rule**: Next.js computes the *effective* revalidate window for
a statically-rendered page as the **minimum** of:
- the page's own `export const revalidate`, and
- the `next: { revalidate }` value of **every single `fetch()` call**
  anywhere in that page's render tree — including every nested Server
  Component, every section, every child fetch, no matter how deep.

The page-level export is a *ceiling*, not the actual interval. One `fetch`
buried in a rarely-noticed subcomponent with a short `revalidate` silently
overrides the number at the top of the file — no warning, no error, no
lint rule catches it.

**Confirmed real example from this project** (measured directly, not
theoretical): the homepage declares `revalidate = 3600` in
`app/(site)/page.tsx`. A clean production build (`next build`) reports its
*actual* effective revalidate as **`1m`** (60 seconds) — because at least
one of the ~18 independently-fetching sections rendered on that page uses a
60-second `next.revalidate` somewhere in its own data call. See
`docs/roadmap/baselines/next-build-output.txt` (Sprint 0 baseline) for the
literal build table showing this.

**How to check the real number for any page**: run a production build and
read its own report — don't trust the source file:

```bash
npm run build
# then look at the "Revalidate" column in the Route (app) table
# for the specific route you care about
```

If you need a page to genuinely honor a longer window, every `fetch()` in
its entire render tree needs to agree on that window (or a longer one) —
changing the page-level export alone does nothing if a child fetch
disagrees.

---

## 2. Practical implications

- **Don't infer freshness from the page file.** If you're debugging "why
  did this content update sooner than I expected," check the build's own
  report first, then audit every fetch in the tree — not just the page's
  top-level export.
- **When composing a page from many independently-fetching sections**
  (common on this project's homepage-style pages), the effective
  revalidate is only ever as long as the *shortest* section's fetch. Adding
  one more section with an aggressive revalidate value silently shortens
  the whole page's effective cache window.
- **This is a build-time-visible fact, not a runtime mystery** — always
  reproducible by running `next build` and reading its table. Don't guess;
  check.
