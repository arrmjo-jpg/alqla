# Phase 1 — Foundation Consolidation & Event Spine

Running execution log for AlphaCMS 2036 Roadmap, Phase 1. One section per
completed task, in commit order. This is the official reference for
Phase 1 — do not treat any task as done without an entry here.

Phase 1 definition of done (from the roadmap): all six content types emit
real domain events; zero API/route/schema breakage; first entity-tagged
content exists.

---

## Task 4 — Canonical Entity registry (manual tagging)

**Commit:** `9546972da` — Add canonical Entity registry for manual content
tagging (Phase 1)

### What was implemented
- `entities` table: canonical, disambiguated records of type
  `person|organization|place|topic` (`App\Enums\EntityType`), with a
  slug unique per type, optional description, and a reserved
  (unused) `external_ref` column.
- `content_entity` pivot table: polymorphic link from any content type
  to an `Entity`, with reserved (unused) `assigned_by_type/id`,
  `status`, and `confidence` columns for later phases.
- `Article::entities()` — the first (reference) `morphToMany` wiring,
  manual attach/detach only.
- `App\Models\Entity` — audited via `AuditsChanges` per the model-audit
  convention (`auditLogName='entity'`).

### Why
- ADR-E5 (`docs/adr/E5-entity-registry-not-tags.md`): entity tagging is
  the one Phase 1 item that is genuinely one-way — content published
  without a canonical entity link cannot be re-linked with full accuracy
  later. Cheapest to start now, before archive volume grows further.
- Deliberately **not** built on the existing `Spatie\Tags` system
  already used by `Article` (`HasTags`): tags solve free-text
  folksonomy, not canonical disambiguated identity. Conflating the two
  was rejected as a modeling mistake (see ADR-E5 for the full
  alternatives-rejected list).
- Manual tagging only — AI-assisted tagging (Phase 5) and Knowledge
  Graph linkage (Phase 4) are out of dependency order this early; the
  schema reserves the columns they'll need so no later migration is
  required, only activation.

### Database changes
- **New tables (2):** `entities`, `content_entity`.
- **New indexes:** `entities`: `type`, `unique(type,slug)`,
  `entities_type_name_idx(type,name)`,
  `entities_deleted_type_idx(deleted_at,type)`. `content_entity`:
  `content_entity_unique(entity_id,taggable_type,taggable_id)`,
  `content_entity_taggable_idx(taggable_type,taggable_id)`, plus the
  automatic FK index on `entity_id`.
- **New FKs:** `entities.created_by_id → users.id` (nullOnDelete);
  `content_entity.entity_id → entities.id` (cascadeOnDelete).
  `taggable_type/taggable_id` has no DB-level FK (standard Laravel
  polymorphic limitation).
- **Existing tables/columns modified:** none.
- **Migration class:** pure `CREATE TABLE` on new, empty tables —
  online-safe, no lock on `articles`, no downtime.

### Public contracts affected
**None — verified, not assumed.** `ArticleResource` was read directly:
it is a strict explicit whitelist (`whenLoaded()`-guarded), contains no
`entities` key, and cannot change shape without a deliberate future
edit. Grep confirmed zero existing call sites reference `->entities()`
anywhere in `app/` outside this task's own files. Scout
(`toSearchableArray`/`searchableAs`/`makeAllSearchableUsing`), cache
tags (`ArticleCacheTags`), routes, and pagination are all byte-identical
to before. Full audit in the Task 4 validation report (this
conversation) covers Article/Category/Search/Admin APIs, SEO, URLs,
Resources, JSON structure, pagination, and cache tags individually.

### Test evidence
- New: `tests/Feature/Admin/Content/EntityTaggingTest.php` — 7/7
  passing (creation + audit-log assertion, cross-type slug
  non-collision, same-type slug uniquification, multi-entity tagging,
  duplicate-tag rejection via unique constraint, independence from
  `Spatie\Tags`, soft-delete behavior of the relation).
- Regression: `--filter="Article"` baseline (clean `main`,
  `5b141d3c4`) vs. post-change, measured twice:
  - Baseline: 217 tests, 208 passed, 9 failed, 716 assertions, 344.1s.
  - Post-change: 219 tests, 210 passed, **9 failed (identical set)**,
    719 assertions, 347.3s.
  - Delta fully reconciled: +2 tests / +3 assertions = exactly the new
    Entity tests whose descriptions match the "Article" filter
    substring. **Zero new failures, zero fixed, zero changed** — all 9
    failures proven pre-existing on unmodified `main` (see Known Issues
    below).

### Rollback procedure
1. `php artisan migrate:rollback --step=2` (drops `content_entity`,
   then `entities`, correct batch order, no manual intervention).
2. `git revert 9546972da`.
- No data loss for any pre-existing data. Any rows written into the two
  new tables during a live window would be lost on rollback — currently
  a non-issue since no consumer wires `->entities()` into any Action or
  UI yet (ships inert; Task 12 is the first real consumer).
- Old (pre-Task-4) code runs unaffected against the new schema in
  either rollback direction (code-only or schema-only).

### Known issues discovered (tracked separately, not Phase 1 scope)
- 3 pre-existing failures in `ArticleEditorContractTest` (content
  sanitizer accepting `javascript:` hrefs / non-allow-listed embeds /
  invalid text-alignment — expects 422, gets 201) — flagged as a
  possible security-relevant gap, spun off as `task_a9fe3b88`.
- 6 other pre-existing failures share one root cause: `canonicalPath()`
  emits `/article/{id}` while 4 test files expect
  `/articles/{id}-{slug}`. Tracked as separate technical debt, not
  mixed into the Phase 1 roadmap per explicit instruction.

---

## Task 5 — Domain event: wrap TransitionArticleStatusAction side-effects

**Commit:** `8094bea02` — Wrap article status transition side-effects in a
domain event

### What was implemented
- `App\Events\Content\ArticleStatusChanged` — the platform's first real
  domain event, dispatched once after a committed status transition.
- Three listeners in `App\Support\Content\Listeners` (deliberately **not**
  `app/Listeners` — see below): `InvalidateArticleCacheOnStatusChanged`,
  `PurgeArticleCdnOnStatusChanged`, `NotifyWriterOnArticleStatusChanged`,
  registered explicitly (and in that order) in
  `AppServiceProvider::configureContentEvents()`.
- `TransitionArticleStatusAction` now dispatches the event where it used
  to call the three side-effects inline; nothing else in the action
  changed.

### Why
- ADR-E2 (`docs/adr/E2-domain-events-wrap-not-replace.md`): the one real
  architectural gap in this slice of the system — side-effects written
  imperatively inside one Action, instead of an event spine new
  consumers (AI, read models, analytics) can attach to without touching
  the publish path itself.
- Wrap, not replace: every line moved verbatim into its listener — same
  behavior, same order, same synchronicity. Listeners are deliberately
  **not** queued — that would change observable response timing (a
  separate, not-yet-made architectural decision), not something to slip
  in here.

### Database changes
None — pure application-layer refactor.

### Public contracts affected
**None.** Same HTTP response shape, same cache tags, same CDN purge
call, same notification call, same listener execution order (verified
via `php artisan event:list`). Timing/synchronicity explicitly
preserved — the response still waits for all three side-effects exactly
as before.

### Test evidence
- New: `tests/Feature/Admin/Content/ArticleStatusEventTest.php` — 5/5
  passing (event dispatched exactly once with correct payload; not
  dispatched when the workflow guard denies before the transaction
  starts; cache tag still flushed, CDN batch still queued, writer still
  notified — all via the real, non-faked listener chain).
- **Bug caught by this task's own test, fixed before proceeding:**
  first run showed the writer notified **twice**. `event:list` proved
  each listener was registered twice — Laravel 11 auto-discovers
  `app/Listeners`, and I'd also registered them explicitly, causing
  double execution. Fixed by relocating listeners to
  `App\Support\Content\Listeners`, mirroring the existing
  `App\Modules\Notifications\Listeners` convention (which avoids this
  exact trap for the same reason). Re-verified via `event:list` (each
  listener now appears once) and the test suite (5/5 green).
- Regression (`--filter="Article"`): baseline 217/208 passed/9 failed →
  post-change 224/215 passed/**9 failed (identical set)**. Delta (+7
  tests/+12 assertions) fully reconciled to the 5 new tests (whose
  filename itself matches the filter) — **zero new failures, zero
  fixed, zero changed** among the pre-existing 9.
- A 10th failure surfaced outside the "Article" filter's scope
  (`WriterNotificationTest::returns_403_for_a_non_writer_user`). Proven
  pre-existing via an explicit stash-and-rerun against the clean
  Task-4-only state (failed identically with zero Task 5 changes
  present) — unrelated, spun off as `task_47f36988`, not mixed into
  this roadmap.

### Rollback procedure
1. `git revert 8094bea02` — single commit, no migration to unwind, no
   data implications (zero tables touched).
2. Old/new code distinction doesn't apply here — no schema changed in
   either direction.

### Known issues discovered (tracked separately, not Phase 1 scope)
- Notifications-list endpoint returns 200 instead of 403 for
  non-writers — pre-existing, proven unrelated, tracked as
  `task_47f36988`.

---

## Task 6 — Editorial workflow: shared engine + event-wrapping for Video/Reel

**Roadmap correction:** the original wording ("extend workflow
guard+transition pattern to Video/Reel/Broadcast") was wrong on
inspection. `VideoWorkflowGuard` and `ReelWorkflowGuard` already existed,
independently evolved, not copied from Article. Broadcast has no
transition-matrix workflow at all (verb-specific lifecycle actions:
`StartBroadcastAction`, `EndBroadcastAction`, `FailBroadcastAction`,
etc.) — confirmed via `app/Actions/Admin/Broadcast/` (27 actions), not
assumed, and excluded from this task entirely.

### Design review (performed before any extraction — see conversation
for full 6-question review)
Read all three guards + both existing transition actions side by side.
Findings: `TRANSITIONS`/`WRITER_ALLOWED` and the guard algorithm shape
are byte-identical across Article/Video/Reel; `isEditorial()` is also
byte-identical in all three `*AuthorizationGuard` classes. Real,
preserved divergences: Video/Reel gate certain transitions behind an
extra permission (`videos.publish/archive`, `reels.publish/archive`)
that Article's guard lacks; Video has no revision recording
(`VideoRevisionRecorder` doesn't exist — confirmed via grep); Video has
no dedicated CDN-purge class (Article/Reel do). Chosen architecture:
one generic, model-agnostic `EditorialWorkflowGuard` engine consuming a
per-type `WorkflowDefinition` (pure data) — composition, not
inheritance — with the divergences expressed as data (an empty
`abilityForTarget` map for Article) rather than branches.

### Task 6a — shared engine + guard migration (4 commits)
- `a94ac6a82` — `WorkflowDefinition` + `EditorialWorkflowGuard` +
  `ApplyEditorialTransition`, new and isolated, 11 unit-level tests
  against fabricated definitions before any real guard touched it.
- `7d6c137c1` — `ArticleWorkflowGuard` migrated (thin wrapper, signature
  unchanged, `abilityForTarget: []`). Regression: 225/216 passed
  (`--filter="Article"`), same 9 pre-existing failures, zero
  new/fixed/changed.
- `a09deb83c` — `VideoWorkflowGuard` migrated (ability map: publish→
  `videos.publish` for both published and scheduled, archive→
  `videos.archive`). Regression: 89/88 passed (all VideoLibrary tests +
  WriterNotificationTest), same 1 pre-existing failure only.
- `a5cf40cff` — `ReelWorkflowGuard` migrated (ability map: publish/
  archive only — Reel does **not** gate scheduling behind an ability,
  unlike Video; preserved as a real difference, not unified).
  Regression: 105/104 passed, same 1 pre-existing failure only.

### Task 6b — event-wrapping Video/Reel (1 commit, `f5606fe2e`)
`VideoStatusChanged` / `ReelStatusChanged`, mirroring
`ArticleStatusChanged` exactly — separate small event classes per type
(not one generic discriminated event, per the design review). Listeners
placed under `App\Support\Content\Listeners` from the start (learned
from Task 5 — verified via `event:list` that each registers exactly
once before trusting any test). Every listener moves an existing
imperative call verbatim; Video's still-missing CDN-purge class and
still-missing revision recording are untouched, not silently "fixed" as
a side effect. Regression: Video 93/92 passed (+4 new tests), Reel
89/89 passed (+4 new tests), zero new/fixed/changed.

### Database changes
None across all of Task 6 — pure application-layer refactor.

### Public contracts affected
None. Every `*WorkflowGuard::check()` public signature is byte-identical
to before; every Action's HTTP contract, cache tags, CDN behavior, and
notification behavior is unchanged — only the internal implementation
moved from copy-pasted logic to shared engine + data, and from
imperative calls to event dispatch.

### Rollback procedure
Six independent commits (`a94ac6a82` through `f5606fe2e`), each already
proven not to break anything on its own — revert from the end backward
as far as needed; no migration to unwind at any point, no data
implications (zero tables touched in Task 6).

### Known issues discovered (tracked separately, not Phase 1 scope)
- Video has no revision recording (unlike Article/Reel) — real gap,
  not fixed here, not silently decided either way.
- Video has no dedicated CDN-purge class (unlike Article/Reel) — same
  treatment.
- Error-message translation key naming has already drifted per type
  (`article.schedule_requires_future_date` vs `video.schedule_requires_date`
  vs `reel.schedule_future` for the same rule) — preserved exactly as-is
  per type in each `WorkflowDefinition.messages` map; not unified, to
  avoid an unrequested user-facing string change.

---

## Task 7 — Shared cache-tag scheme (Article/Reel/Video/Page/Broadcast)

**Roadmap correction (smaller than expected):** the original wording
("kill the 7-near-duplicate cache-tag-class pattern") assumed uniform
duplication. Reading all five side by side (`AdCacheTags`/
`TeamMemberCacheTags` excluded — confirmed genuinely different concerns,
zone/campaign and roster tagging, not feed/detail/category content)
showed the identical part is only the key-string format; the
substantive logic (`invalidationTags`) has real per-type variation:
category cardinality (Article: many, Video/Broadcast: one, Reel/Page:
none), sitemap presence, and — the one true outlier — Broadcast omits
its partition dimension (`kind`) from `detail()`/`category()` keys
entirely, unlike the other four.

### Design
`CacheTagScheme` (readonly DTO + methods) captures this as data:
`sitemap: ?string`, `detailDimensioned`/`categoryDimensioned: bool`,
category slugs always passed as an array (0, 1, or many elements
uniformly — no separate single/multi code path). Hand-verified against
each of the five classes' actual current output before touching any of
them (10 tests in `CacheTagSchemeTest.php`), including reproducing
Broadcast's non-dimensioned keys exactly.

### Commits (6, each independently verified)
- `6941f0050` — `CacheTagScheme`, new and isolated, 10 tests replaying
  each type's documented behavior by hand.
- `6fe40715d` — `ArticleCacheTags` migrated. Regression: 55/53 passed,
  same 2 pre-existing failures only.
- `5efb05b25` — `ReelCacheTags` migrated (no sitemap, no category).
  Regression: 89/89 passed.
- `098063a61` — `VideoCacheTags` migrated; `playlist()` family left
  untouched as a genuinely Video-only concept, not forced into the
  scheme. Regression: 93/92 passed, same 1 pre-existing failure only.
- `8c3d4e4da` — `PageCacheTags` migrated (same shape as Reel).
  Regression: 20/20 passed.
- `7630c4535` — `BroadcastCacheTags` migrated — the critical case
  (non-dimensioned keys), verified against the full 140-test Broadcast
  suite rather than a subset. Regression: 140/140 passed.

Zero new/fixed/changed failures across all six commits.

### Database changes
None — pure application-layer refactor.

### Public contracts affected
None. Every `*CacheTags` public method signature is byte-identical to
before (verified per-commit against each type's real test suite, not
assumed from the shared design alone).

### Rollback procedure
Six independent commits (`6941f0050` through `7630c4535`); revert from
the end backward as far as needed. No migration to unwind, no data
implications at any point.

### Known issues discovered (tracked separately, not Phase 1 scope)
None new — this task's investigation confirmed prior findings
(Reel/Page's independent scope, no fresh gaps).

---

## Task 8 — MediaAsset rights/license metadata

**Commit:** `d6c9c0ee9`

### Pre-task review
Confirmed `credit`/`source` already exist (added in
`2026_05_20_110000_extend_media_assets_for_editorial_library.php`, read
in full to match its exact style); `license_type`/`rights_expiry_at`/
`usage_terms` genuinely absent. No architectural ambiguity found — the
one judgment call (formal enum vs. plain string for `license_type`) is
recorded below, not silently decided.

### What changed
Three nullable columns on `media_assets`: `license_type` (string),
`rights_expiry_at` (timestamp), `usage_terms` (text). Added to
`MediaAsset`'s `$fillable` and `AuditsChanges` `$auditAttributes`
whitelist.

### Why
Real, present-day legal/compliance exposure (using media past a rights
expiry or without required attribution), independent of scale — see the
product-philosophy review earlier in this project's history.

### What stayed the same
Everything else. `license_type` is a **plain nullable string, not a
formal PHP enum** — deliberately, since no admin UI consumes it yet and
no taxonomy has been requested; committing to a specific closed set of
values now would be inventing business rules nobody asked for. Upgrading
to an enum later (once a real UI need defines the taxonomy) is a
non-breaking, additive change to the cast layer only.

### Regression / backward compatibility
68/68 passed across all Media tests (65 baseline + 3 new). Grep-confirmed
zero existing `Http\Resources` reference the new fields — no API
response shape changes anywhere.

### Performance impact
None measurable — three new nullable columns on an existing table, no
new queries, no new indexes needed (not queried/filtered by yet).

### Risks
None identified. Purely additive, all-null default state.

### Architecturally better, or just cleaner?
Neither, strictly — this task adds new *capability* (data the system
didn't capture before), not a refactor of existing structure. It doesn't
change the system's architecture; it closes a real gap flagged in the
Product Evolution review.

---

## Task 9 — Reserve nullable `tenant_id` on core content tables

**Commit:** `82e9565ed`

### Pre-task review (scope correction)
The roadmap's wording assumed one `categories` table. Verified via
migration search: there are **three** (`categories`, `video_categories`,
`broadcast_categories`), plus `pages`, `video_playlists`, and Task 4's
`entities` — all genuinely core-content tables. Expanded scope to all 11
for consistency rather than reserving the column on an arbitrary subset.

### What changed
`tenant_id` (nullable `unsignedBigInteger`, no FK — no `tenants` table
exists) added to: articles, videos, reels, broadcasts, pages, categories,
video_categories, broadcast_categories, video_playlists, media_assets,
entities.

### Why
Cheap now (tables far from 2M+ rows on most of them), expensive later
(`ALTER TABLE` on a live multi-million-row table). Matches the
architecture review's ADR-005 (tenant identity is a first-class,
Must-Decide-Now concern) — but only the column, nothing else.

### What stayed the same
Everything. Zero application code reads or writes this column — no
`$fillable` addition, no cast, no query scope. **No index added** —
deliberately: the correct composite index shape depends on real
tenant-scoped query patterns that won't exist until Phase 6 activates
this (gated on a real second white-label client, not a calendar date,
per the architecture review). Guessing an index shape now would be
speculative.

### Regression / backward compatibility
Cross-section covering every affected table type (Article, Category,
Page, Video playlists, Broadcast, MediaAsset, Entity): 99/99 passed.
Fully additive; no existing code path touches the new column.

### Performance impact
None measurable. One extra nullable column per row on 11 tables — no
new queries, no new indexes, no write-path changes.

### Risks
The single real risk this task defers rather than resolves: **when**
Phase 6 activates tenancy, retrofitting *enforcement* (scoping every
query, every cache key, every search index by tenant) is a substantial
undertaking regardless of whether the column exists — this task only
removes the schema-migration part of that future cost, not the
application-logic part.

### Architecturally better, or just cleaner?
Neither yet — this is pure optionality banking. It becomes
architecturally significant only when Phase 6 activates it.

---
