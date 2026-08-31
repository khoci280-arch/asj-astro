# Database Optimization — Overview

## What was done

Continued database optimization from the previous session. The previous session created an index cleanup migration (dropping 13 redundant indexes). This session focused on **application-layer query optimization** — fixing N+1 queries, replacing `SELECT *` with column projections, and eliminating full-table scans.

## Key optimizations

1. **N+1 FCM token lookup** — Batch-loaded all tokens in one query instead of per-WA loop
2. **SELECT * elimination** — Created column projections (`CAND_MAP_COLS`, `JOB_MAP_COLS`) for all targeted queries
3. **N+1 Storage folder listing** — Parallelized `listStorageFolder()` calls in share-data
4. **Full-table scan elimination** — Replaced `SELECT * limit 500` + JS `.find()` with targeted `WHERE` queries
5. **Supporting index migration** — Created indexes for the new query patterns

## Files changed

- `netlify/functions/_lib/actions-schedule.ts` — N+1 fix + 3 targeted query replacements
- `netlify/functions/_lib/db/candidates.ts` — Column projection + 4 function optimizations
- `netlify/functions/_lib/db/forms.ts` — Light projection in `findFormsByWa`
- `netlify/functions/_lib/db/jobs.ts` — Column projection in `findJobByCodeFiltered`
- `netlify/functions/_lib/actions-share.ts` — Parallel Storage folder listing
- `netlify/migrations/2026-09-01-optimize-query-indexes.sql` — New supporting indexes
- `docs/db-optimization-2026-09-01.md` — Detailed documentation

## TypeScript type-check: PASS (no errors)

---

# Backend Architecture Redesign — Overview

## What was done

Produced a target backend architecture for the ASJ Portal v2 refactor:
`docs/BACKEND_ARCHITECTURE_2026-09-01.md` (~15 sections, grounded in measurements
from `docs/DB_PERFORMANCE_AUDIT.md` rather than generic best practice).

## Key decisions

1. **Rejected microservices.** The database is 14 MB with 225 candidate rows and
   the slowest query is 1.8 ms, while a network round-trip is 39.2 ms. Round-trips
   are 99.7 % of end-to-end latency, so every added service hop multiplies the
   only real cost. Target is a **modular monolith with enforced boundaries**.
2. **24 function bundles → 8 narrow surfaces.** All 24 entry points are currently
   the same ~331 KB bundle (7.9 MB total) that loads `mammoth`, `pdf-parse` and
   `xlsx` even for `ping`.
3. **12 bounded contexts** with a `dependency-cruiser` CI gate: no context may
   query another context's tables; only `repository.ts` files may name a table.
4. **Shared kernel** for timeouts, retry-with-jitter, circuit breaker, bulkhead,
   structured logging and cache — the DB transport currently has **no timeout and
   no retry at all**, which means one hung query consumes the whole 10 s budget.
5. **CDN as the shared cache instead of Redis.** `stale-if-error=86400` keeps the
   public job board alive through a full Supabase outage.
6. **Postgres `job_queue`** for at-least-once async work with SKIP LOCKED claiming
   and a dead-letter state — replaces Kafka at this scale.
7. **Rate limiter moves to Postgres**; the in-process `Map` is trivially bypassable
   across Netlify instances.
8. **Least-privilege DB clients** (anon / user-JWT with RLS / service-role
   allow-list) to convert the IDOR class of bugs into DB-blocked bugs.

## Migration path

6 phases, strangler-fig, wire contract (`{ action, payload, sessionToken }`)
unchanged so `apiClient.ts` is untouched until the last phase. Phase 0 (safety
net: restore type checking, un-silence 13 test suites, write characterisation
tests) is a hard prerequisite — nothing else is safe without it.

## Follow-ups

- The 5 highest-priority items are in §15 of the document; the first three are
  each under a day of work.
- `CODE_REVIEW.md` C3–C6 (unauthenticated PII endpoints, IDOR sites) are live
  security bugs and outrank the refactor.
- One unknown remains: RTT from a Netlify function to Supabase (measured 39.2 ms
  locally). Logging it in `db/client.ts` determines whether Phase 1 saves 78 ms
  or 400 ms.
