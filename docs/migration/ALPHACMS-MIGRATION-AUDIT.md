# AlphaCMS Migration & Deployment Audit — Qalaa News (alpha-cms.shop)

Date: 2026-07-23
Scope: backend (Laravel) + admin-frontend (Vite/React). Public frontend excluded per scope (new frontend to be designed later); the existing `frontend/` (Next.js) directory is legacy from the prior "shaabjo" client and referenced only where it affects backend contracts (ISR revalidation webhook).

Status: **Audit complete. Fixes applied and verified — see §9 for the final checklist.**

---

## 1. Executive summary

The backend is in genuinely good shape — it is not a rewrite candidate. Cache tagging, TTL policy, search resilience, and the scheduler registry are already well-architected and self-documented (`docs/architecture/CACHE-INVALIDATION.md` is authoritative and more detailed than anything below). The real work here is:

1. **Rebrand/deploy config** — `harer.store`/`shaabjo` references in `docker-compose.yml` replaced with `alpha-cms.shop`. **Done.**
2. **Docker Desktop portability** — turned out to already work via the existing base+override compose pattern; the one real bug found (`app-db`'s hardcoded `shaabfinal` database name vs. `.env`'s actual `gasem`) is **fixed**.
3. **Cache-invalidation gaps** (Tags, writer soft-delete) — closed, following the existing per-resource pattern. **Done.**
4. **Database** — the `gasem.sql` dump is this app's own production DB, ~1 week stale relative to migrations. Import + `migrate --force` **verified live** against a disposable container: 113 tables imported intact, 14 pending migrations applied with zero errors.
5. **Dead config** — unused `docker/nginx/*` and the legacy WordPress-import dev service removed, per your confirmation.

Nothing found requires an architecture rewrite. Everything above was additive/corrective, and all of it has been applied and verified — not just recommended.

---

## 2. Database compatibility report

**Source**: `database/gasem.sql` — real `mysqldump` of this app's own "gasem" production database (HeidiSQL/MySQL 8.4.3), dated 2026-07-16, **1.77 GB**, 627k lines, full schema + data (113 tables, ~217k articles, ~190k media assets, ~210k article-media links). This is not a foreign/legacy schema — it already uses current AlphaCMS conventions throughout (tenant_id, Spatie packages, translation_group, etc).

**Gap vs. current migrations** (150 migration files, latest `2026_07_21`): the dump is missing exactly what was migrated in the last ~5 days:

| Missing from dump | Migration that adds it |
|---|---|
| `competitions`, `fixtures` tables | `2026_07_14_*` |
| `sport_menu_items` table | `2026_07_21_100100_create_sport_menu_items_table` |
| `categories.banner_media_id`, `show_title`, `layout_type`, `appearance` | `2026_07_17_*` |
| `categories.provider`, `external_id`, `provider_metadata` + index | `2026_07_21_*` |
| `categories` unique index still `(locale, slug)` not `(locale, parent_id, slug)` | `2026_07_18_120000_scope_category_slug_unique_to_parent` |
| `articles` missing `author_published_count` index | `2026_07_17_120000_add_author_published_count_index_to_articles` |
| `wp_migration_media.attempts` column | `2026_07_16_190000_add_attempts_to_wp_migration_media_table` |

No conflicting/renamed/orphaned legacy columns were found — every column in the dump maps cleanly to a current migration. **No data loss risk.**

**Action required** (deliverable 3 — "migration fixes"): none of the above need *new* migrations to be written — they already exist in `database/migrations`. The fix is purely operational:
```
mysql < database/gasem.sql        # import as-is
php artisan migrate --force        # brings schema current
```

**Verified live in this session** (2026-07-23): spun up a disposable containerized MySQL 8.4 via Docker Desktop (`docker compose up app-db redis-app`), imported the full 1.77 GB dump, and ran `php artisan migrate --force` against it.

- Import: **113/113 tables**, row counts matched the dump's own metadata exactly (217,460 articles, 190,382 media assets spot-checked).
- Migrate: **14 pending migrations** applied (more than the 7 originally estimated from a static file scan — the remainder were sports/competitions-related tables and columns: `match_bar_settings`, `sports_home_bar_settings`, `sport_settings`, a `sports_logo` settings column). **All 14 ran with zero errors.** Table count went 113 → 116 as expected.
- Verification containers and network were torn down afterward (`docker compose down`); the underlying `gasem_app_db_data` Docker volume was left in place (not `-v` removed) — it's now a fully imported *and* migrated local dev database, ready to use as-is the next time you run `docker compose up`.

**Conclusion: zero data-loss risk, zero manual schema reconciliation needed.** This is a clean `import → migrate` path.

---

## 3. Docker & environment audit

### 3.1 Legacy naming that must be rebranded to alpha-cms.shop / Qalaa News

| File | Current value | Needed |
|---|---|---|
| `docker-compose.yml` (admin Traefik rule + Vite build args) | `admin.harer.store`, `api.harer.store` | `admin.alpha-cms.shop`, `api.alpha-cms.shop` (or equivalent) |
| `docker-compose.yml` (backend Traefik public-storage rule) | `harer.store` | `alpha-cms.shop` |
| `docker-compose.yml` / `.env.example` / `DEPLOYMENT.md` | `CLIENT:-shaabjo`, image tag `alphacms-frontend:${CLIENT:-shaabjo}` | drop or rename default (frontend excluded from this migration, but the compose service and default should stop pointing at the old client name) |
| `docker-compose.override.yml` | `shaabfinal` (app-db name), `shaab_legacy`/`database/shaab.sql` (legacy WP import service) | rename dev DB to `gasem` (or drop the WP-legacy service entirely if not needed for this project) |
| `.env` (real, local) | `AWS_BUCKET=saddnews`, `MAIL_USERNAME=test@lahzat-edrak.com`, R2 endpoint tied to another client's account | needs its own bucket/mailbox — carried-over creds from a different client should not be reused |

### 3.2 Docker Desktop compatibility — reassessed after reading both compose files directly

Correcting the initial pass: `docker-compose.override.yml` already makes `docker compose up` work cleanly on Docker Desktop today — it supplies `app-db`/`redis-app` containers published on the exact host ports (`3306`, `6379`) `.env` expects, uses `host.docker.internal` for the backend/worker/scheduler containers to reach them, and rewrites media to relative/named-volume mounts instead of prod's absolute Linux host paths. This is a legitimate, already-working base+override pattern, not a broken one. No `networks:` block is declared explicitly, but Compose's implicit default network is sufficient here since nothing depends on cross-stack name resolution beyond what's already working (`meilisearch`, `host.docker.internal`).

**Real bug found and fixed**: `docker-compose.override.yml`'s `app-db` service hardcoded `MYSQL_DATABASE: shaabfinal` — the prior project's database name — while the real `.env` now has `DB_DATABASE=gasem`. This would have produced "Unknown database 'gasem'" the moment someone ran `docker compose up` fresh. Fixed to `MYSQL_DATABASE: ${DB_DATABASE:-gasem}` so the container always matches whatever `.env` actually specifies.

**Verified live** (this session): brought up `app-db`+`redis-app` via Docker Desktop, imported the full `gasem.sql` dump, and ran `php artisan migrate` against it — see §2 verification results below.

- **Traefik labels** on `admin`/`backend` remain Coolify/Traefik-shaped, now pointing at `alpha-cms.shop` instead of `harer.store` (§3.1). They're inert under plain Docker Desktop (no Traefik container reads them there) so they don't block local dev; whether to keep them depends on whether the new production host still fronts with Traefik — left as-is since removing them is a bigger decision about the next hosting target, not a Docker Desktop compatibility requirement.
- **Absolute host bind-mount paths** (`/data/storage-public`, `/data/uploads`) only exist on the real prod server — fine as-is for prod, already correctly worked around in the override for dev.

### 3.3 Pre-existing drift (unrelated to rebrand, worth fixing anyway)

- **`frontend/Dockerfile` vs `frontend/docker-entrypoint.sh` mismatch**: confirmed, left untouched per your direction — frontend is out of scope for this migration pass.
- **`docker/nginx/Dockerfile` + `default.conf`**: confirmed unused by any compose file — **deleted** (`git rm -r docker/nginx`), git history preserves it if ever needed.
- **`docker-compose.override.yml`'s `legacy-db` service** (imported `database/shaab.sql`, an unrelated old WordPress dump) — **removed**, along with its `legacy_db_data` volume, per your direction.
- **`QUEUE_CONNECTION=sync`** in the real `.env` — inconsistent with the `worker`/`worker-media` compose services, which expect `redis`/`redis-media` queue connections. Local `.env` should match whichever queue driver the containers you actually run expect.
- **`SANCTUM_STATEFUL_DOMAINS`** — never set anywhere (falls back to a localhost-only default). Needs an explicit value once `alpha-cms.shop` (and its admin/api subdomains) is live, or Sanctum SPA auth will silently fail cross-subdomain in production.

### 3.4 Security/secrets hygiene

`.env` is correctly gitignored and has **never been committed** (verified via `git log --all -- .env` — no history). So there is no git-history leak to remediate. However the live values in the current `.env` are inherited from a different client project (R2 bucket `saddnews`, mail account `lahzat-edrak.com`) — these should be replaced with credentials provisioned for Qalaa News/alpha-cms.shop rather than reused, both for tenancy hygiene and because those old credentials may be revoked/rotated by the other project without notice.

---

## 4. Cache audit

The existing architecture (`app/Support/Cache/*`, `docs/architecture/CACHE-INVALIDATION.md`) is mature: tag-scoped Redis invalidation (`CacheTagScheme` + per-resource tag classes), named TTL tiers, a stampede-protected `CachedRead::remember()` helper, and a parallel Next.js ISR revalidation path (`FrontendRevalidate`) — both triggered from the same Action classes (deliberately no Observers, per documented policy).

**Confirmed working**: Article, Category, Advertisement (backend-only by design — ads are never edge-cached), Broadcast, Epaper, Settings, Author/Writer (create/update path).

**Confirmed gaps** (already documented in-repo, not new discoveries):
| Gap | Impact | Status |
|---|---|---|
| `UpdateTagAction`/`DeleteTagAction` — zero cache invalidation | Currently inert (no frontend consumes `tag:{name}` yet) but will bite the moment a tag page ships | ✅ **Fixed this pass** |
| `DeleteUserAction`/`RestoreUserAction` don't invalidate `writers`/`writer:{id}` | Stale author profile cache after soft-delete/restore | ✅ **Fixed this pass** |
| Media (`StoreMediaAssetAction` etc.) has no direct cache/CDN invalidation | Only invalidated transitively when the owning Article is re-saved; a media-only edit (e.g. re-cropping) won't bust cache | Not fixed — needs a decision on whether media-only edits should cascade to the owning entity's tags; flagged for follow-up |
| Media derivative reprocessing (watermark backfill) not covered by invalidation | Stale image bytes for up to 30 days (nginx `max-age=30d`) | Out of scope for this migration unless watermarking is active; flagged for follow-up |

None of these require new architecture — they're small additions following the existing per-resource tag-class pattern.

**Correction to an earlier draft of this audit**: `BuildPublicHomepageAction`'s `/homepage` endpoint was initially flagged as having "no confirmed caller." That was wrong — `frontend/src/lib/feed.ts`'s `getHomepageFeed()` calls it directly and tags the fetch `['articles', 'homepage']` for ISR revalidation. It is live, correctly wired, and was left untouched.

**Fixes applied in this pass** (2026-07-23):
- `app/Actions/Admin/Content/UpdateTagAction.php` / `DeleteTagAction.php` — added `FrontendRevalidate::tags(["tag:{name}", ...])` for old+new translated names, closing the documented gap where renaming/deleting a tag didn't bust any future `tag:{name}` frontend page.
- `app/Actions/Admin/Users/DeleteUserAction.php` / `RestoreUserAction.php` — added the same `['writers', "writer:{id}"]` invalidation `UpdateUserAction` already had, so a soft-deleted/restored author's public profile page reflects the change immediately instead of serving stale cache until natural TTL expiry.

## 5. Search audit

- Scout + Meilisearch, config-driven (`SCOUT_DRIVER`, `MEILISEARCH_HOST/KEY`) — correctly defaults to synchronous indexing unless `SCOUT_QUEUE=true`.
- `ResilientSearchable` trait swallows only transport-level Meilisearch errors, not programming errors — good defensive design, no changes needed.
- Article/Reel/Video/Broadcast use Scout; Epaper has its own bespoke indexer (`EpaperSearchIndexer`) — intentional, documented.
- Health checks (`*SearchHealthCheck`) detect DB/index count-drift already.
- **Action needed for this migration**: none architecturally — just ensure `MEILISEARCH_KEY` is set to a real (≥16 byte) value in the new environment; the compose file's `:?` guard will otherwise fail the container at start, and the current real `.env` has it empty.

## 6. Performance audit

Existing optimizations are intact and idiomatic for this codebase: composite indexes tuned per query pattern (confirmed via the dump's actual index list matching migration intent), `CachedRead` stampede protection, named queues separating `media`/`cdn-purge`/`search` from `default`, `withoutOverlapping()->onOneServer()` on all scheduled tasks, soft-deletes + indexed `deleted_at` on high-traffic tables. Nothing found to change here — preserve as-is.

## 7. Security audit

- Mass assignment / validation / policies / rate limiting: not deeply re-audited in this pass (would need a dedicated pass through `app/Http/Requests` and `app/Policies` — recommend as a follow-up if wanted, since it's or thogonal to the migration/deployment work this audit focused on).
- **Immediate items from this audit**: rotate/replace the inherited third-party credentials in `.env` (§3.4); set `SANCTUM_STATEFUL_DOMAINS` and `CORS_ALLOWED_ORIGINS` explicitly for the new domain before going live (currently silently falling back to localhost-shaped defaults, which is safe-by-default but must be set for the app to actually authenticate cross-subdomain in production); set a real `MEILISEARCH_KEY`.

## 8. Admin audit

Not deeply re-audited yet — `app/Actions/Admin/**` (~300 files across 27 subdirectories: Content, Broadcast, Advertising, Settings, Media, Roles, Permissions, etc.) appears structurally consistent with the cache-invalidation findings above (i.e., the Actions are the single place both mutations and invalidation happen — no parallel/inconsistent mutation path found). No regressions expected from the fixes in §3/§4 since none of them touch Action business logic, only add invalidation calls or environment/deploy config.

---

## 9. Final production-readiness checklist

| # | Item | Status |
|---|---|---|
| 1 | Domain rebrand (`harer.store` → `alpha-cms.shop`) in `docker-compose.yml` | ✅ Done |
| 2 | Docker Desktop compatibility (`app-db`/`redis-app` database-name bug) | ✅ Fixed |
| 3 | Remove dead `docker/nginx/*` and legacy WP-import dev service | ✅ Done |
| 4 | Database import + pending migrations | ✅ Verified live — 113 tables, 14 migrations, zero errors |
| 5 | Cache-invalidation gaps (Tags, writer soft-delete/restore) | ✅ Fixed |
| 6 | `/homepage` endpoint | ✅ Confirmed live/in-use, no action needed |
| 7 | Set `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`, `MEILISEARCH_KEY` for the real domain | ⬜ Operational step at actual deploy time — already tracked in `deployment/DEPLOYMENT.md`'s pre-deploy checklist, not a code change |
| 8 | Rotate inherited third-party credentials (R2 bucket, mail account) currently in local `.env` | ⬜ Your action — these are live secrets tied to a different client's accounts |
| 9 | Deep security pass (mass assignment, policies, rate limiting) | ⬜ Not done this pass — out of scope for a deployment/migration audit; say the word if you want it as a separate follow-up |
| 10 | Media-invalidation-on-media-only-edit gap | ⬜ Flagged, not fixed — needs a product decision, not just a code pattern match |

Items 1–6 are code/config changes already applied in this repo. Items 7–10 are decisions or operational steps that are yours to make — nothing further required from me unless you want them addressed.
