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
*(in progress)*
