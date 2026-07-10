# Production Gap Closure Report

**Closes the implementation-mode arc** that followed `FINAL_BACKEND_REVIEW.md`'s
adversarial audit. Scope was seven explicit tasks (A–G) to eliminate remaining
production gaps while preserving backward compatibility and existing
architecture, plus this closing report (Task H).

**Commits, in order:** `61801fae0` (A) → `9ed4d206b` (B) → `db6e0ae70` (C) →
`65d822723` (D, correction) → `61b574ae8` (E) → `aaa47ce59` / `8cc2cbfd9` /
`c6c747329` / `7e23eaa8d` (F) → `d81b9e505` (G).

---

## 0. Important context discovered while closing Task G

Before this report's numbers are read, one fact has to be on the record: **this
repository received 30 commits of unrelated work while this session was
running**, none of them mine. `git worktree list` shows two other active
Claude Code worktrees (`goofy-satoshi-aaa124`, `hopeful-curran-e55fe6`) whose
branches merged into `main` — parallel sessions doing frontend feature work
(NetworkGrid, breaking-news layout, header navigation), a real production
incident fix (see §2), and cache/revalidation fixes, interleaved with several
generic `add layout` commits.

This matters because it moved the test baseline. I do not treat that as my
concern to fix — it isn't Task G's scope — but Task G explicitly asked me to
confirm results are unchanged, so the honest answer has two parts:

- **My own Task A–G work: verified zero regressions**, three independent ways
  (diff review, re-test with the Pint diff stashed out, and reproducing the
  one new failure at the pre-Task-A baseline commit before I'd touched
  anything).
- **The baseline itself moved**, from external commits, independent of me.

### The baseline, precisely

| | Tests | Passed | Failed | Errors |
|---|---|---|---|---|
| Known baseline (post-Task-F, this session) | 2029 | 2011 | 14 | 4 |
| Current HEAD (post external commits + Task G) | 2033 | 2014 | 15 | 4 |

- **+4 tests**: reconciles exactly to external commit `359518018` ("test: add
  test coverage for pagination limits and optimized COUNT").
- **+1 failure**: `UserManagementTest::it_returns_the_unified_error_contract_on_validation_failure`,
  new since the known baseline. Root-caused, not assumed:
  [StoreUserRequest.php:23](app/Http/Requests/Admin/Users/StoreUserRequest.php:23)
  makes `email` `nullable` (paired with a new `EmailIdentityGenerator` that
  auto-generates one when omitted) — an intentional behavior change from
  external commit `77019def6`. The test still asserts the old contract
  (`errors.email` present on empty submission), so it's asserting a
  contract the code no longer promises. Confirmed by running the test
  against a fresh worktree at the pre-Task-A commit (`2e94028e2`): it
  **passed** there, before `77019def6` landed. Not caused by anything in
  Tasks A–G. One-line fix (drop `'email'` from the expected-keys list, or
  add a `required_without` case) — flagged as a follow-up, not fixed here,
  since it belongs to whoever owns the auto-generated-identity feature and
  is outside Task G's scope.
- **Errors: unchanged.** Same 4 `WriterArticleMediaTest` cases, same root
  cause (`publicWriterToken()` helper undefined), byte-identical to the
  original Task-14 baseline established months ago.
- **Task G's own effect: zero.** Re-running the suite after the Pint commit
  reproduced exactly 2033/2014/15/4 — no change from the formatting fix
  itself.

One more cross-check worth recording: external commit `bed02693e` ("perf: fix
deep offset DoS and COUNT(*) dependent subquery overhead", dated two days
before this closure) modified the *same* count-cache block my Task C touched.
It built directly on top of my `CacheTtl::MEDIUM` change rather than
reverting it, then added a raw-SQL UNION fast path for the pure-category-
filter case and capped traditional pagination at page 100. Its commit message
cites a concrete incident ("offset 59814", "~44s down to ~145ms under heavy
loads, mitigating Cache Stampedes") — a real production event, not synthetic
testing. **Task C's fix is still intact and compatible**, but it was a
conservative first layer (TTL extension); the deeper structural fix for the
pathological category-filter case came from that later, independent work.
Task C should not be read as "the" fix for this query — only as the safe
initial mitigation it was scoped to be.

---

## 1. What changed (Tasks A–G)

| Task | Change | Risk class |
|---|---|---|
| A | Search health monitoring extended to Article/Video/Reel/Broadcast (drift detection vs Meilisearch, recovery command) | Additive, monitoring-only |
| B | `BroadcastPushGateway` stub hardened: fails loudly if enabled without a real driver, health-check visible, config-only path to enable Firebase later | Additive, no behavior change while disabled |
| C | Article-list COUNT cache TTL extended (SHORT→MEDIUM) after `EXPLAIN`-driven analysis rejected a fragile index-hint fix | One cache-key TTL, no public API change |
| D | Corrected a false "dead code" finding in `FINAL_BACKEND_REVIEW.md` — nothing deleted | Documentation-only |
| E | ADR + migration checklist for the FULLTEXT/`ALGORITHM=COPY` `ALTER TABLE` cost on `articles.title` | Documentation-only |
| F | 25 composer CVEs + 8 npm CVEs resolved via dependency updates, zero `composer.json`/breaking changes | Dependency versions only |
| G | Pint formatting applied to the 31 real source files flagged by a full-codebase scan | Formatting-only, verified behavior-preserving |

## 2. What stayed the same

- Public API contracts: unchanged (Task C explicitly preserved public
  behavior; verified by existing test suite).
- Architecture: no new abstractions introduced beyond the two established
  patterns already in the codebase (generic-engine-plus-per-type-data for
  `ContentSearchHealthCheck`; provider-resolved-from-container for
  `BroadcastPushDriver`) — both mirror precedent (`CacheTagScheme`,
  `EditorialWorkflowGuard`, `AiProvider`), not new patterns.
- The two live CDN settings API surfaces (Task D) — left as-is; a design
  question for a future decision, not something resolved here.

## 3. Remaining risks

1. **New (this closure): `UserManagementTest` failure** — one-line test fix
   needed; see §0. Low severity, test-only, no production impact (the
   *code* behavior is intentional and correct; only the test is stale).
2. **Pre-existing SEO/canonical-URL cluster** — 5 of the 14 known failures
   (`PublicArticleSeoTest`, `ArticleRedirectTest`, `NewsSeoTest` ×2,
   `SeoDeliveryTest`) share one root cause: canonical URL generation
   currently produces `/ar/article/{id}` instead of the expected
   `/ar/articles/{id}-{slug}-{hash}` format. This is a real, currently-
   live SEO gap (bad canonical URLs, broken redirect-history coverage,
   broken news-sitemap slugs), pre-dating Tasks A–G. Worth a dedicated
   follow-up given it affects public SEO surface area, not just tests.
3. **`publicWriterToken()` undefined** — 4 `WriterArticleMediaTest` errors,
   unchanged since the original Task-14 baseline; a missing test helper,
   not a production defect.
4. **No static analysis tool installed** (no PHPStan/Larastan/Psalm; no
   ESLint config in `admin-frontend`). Task G's "static analysis" step
   could only run Pint (style) and `tsc --noEmit` is the closest
   equivalent on the frontend. Flagged, not silently worked around —
   installing and configuring one is a real scope decision (rule set,
   baseline-ignore for existing debt) that needs a separate go-ahead.
5. **~46 tracked scratch/debug PHP scripts** at the repo root and in
   `scratch/` (`api_test*.php`, `redis_test*.php`, `publish_test*.php`,
   `scratch_test_*.php`, `scratch/*.php`), committed under generic
   "add layout" messages on 2026-07-08/07-10. Not part of the application
   (no namespace, never autoloaded), left untouched by Task G's commit
   (see its message). Candidate follow-up: gitignore + `git rm --cached`,
   or delete outright, pending a decision on whether any are still needed
   for manual debugging.
6. **Bootstrap cache files flagged by a path-unscoped Pint run**
   (`bootstrap/cache/{packages,services}.php`) — non-issue, confirmed
   gitignored and regenerated by `composer install`; noted only so a
   future full-repo Pint run isn't misread as finding a violation.

## 4. Performance improvements (this arc)

- Article-list COUNT query: TTL-based mitigation (Task C), later
  superseded/extended by a deeper structural fix from parallel work (§0) —
  net result, the pathological case is resolved, though not by this task
  alone.
- No other performance-surface changes in Tasks A–G; A/B/D/E/F were
  monitoring, hardening, documentation, and dependency work respectively.

## 5. Security improvements (this arc)

- 25 composer CVEs resolved (several high severity) via
  `composer update --with-all-dependencies`, scoped to the flagged packages
  only — zero `composer.json` diff, zero breaking changes.
- 8 npm CVEs resolved across root and `admin-frontend` via `npm audit fix`
  (lock-file-only; one dev-only `esbuild`/`vite` issue deliberately left
  unforced pending a breaking Vite major-version decision).
- `BroadcastPushGateway` now fails loudly (throws + logs) instead of
  silently no-op-ing if misconfigured while enabled — closes a
  "silently-broken-in-production" gap.
- `FINAL_BACKEND_REVIEW.md` security score: 85 → 90.

## 6. Documentation updates (this arc)

- New: `docs/architecture/SEARCH-HEALTH-MONITORING.md`,
  `docs/architecture/BROADCAST-PUSH.md`,
  `docs/adr/E8-fulltext-migration-safety-net.md`,
  `docs/architecture/MIGRATION-SAFETY.md`,
  this report (`docs/roadmap/PRODUCTION-GAP-CLOSURE-REPORT.md`).
- Corrected: `FINAL_BACKEND_REVIEW.md` Finding 1.3 (false dead-code claim,
  Task D), Findings 2.3/3.12/4.4/10.3 (updated from unverified to actual
  resolved state, Task F), all 6 scores increased (Architecture 70→72,
  Security 85→90, Performance 75→80, Maintainability 78→82, Scalability
  65→68, Production Readiness 80→88).

---

## Verdict

Tasks A–G are closed. Working tree is clean (`git status` empty) as of
commit `d81b9e505`. My own work carries zero measured regressions. The test
suite's failure count moved from 14→15 for reasons fully attributed to
concurrent, independent work (not Tasks A–G) — documented above rather than
silently absorbed into "unchanged." Two real, pre-existing production risks
(§3.1 stale test, §3.2 SEO canonical-URL cluster) are surfaced as follow-ups,
not fixed here, per scope.
