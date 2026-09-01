# Code Review — asj-portal-v2

**Date:** 2026-09-01
**Scope:** `src/` (Astro + Preact frontend), `netlify/functions/` (backend), `shared/`
**Method:** Static review + runtime verification (TypeScript check, import graph resolution, isolated repro of suspected defects)

---

## Executive summary

The codebase is well-structured for its size — there is a genuine kernel
abstraction (timeouts, circuit breakers, rate limiting, structured logging with
PII hashing, a job queue), clean context boundaries, and zod validation at the
handler edge. That architecture is ahead of most projects at this stage.

However, **the backend is currently non-functional**. Two independent,
individually fatal defects landed in the most recent commit:

1. Every database call throws a `ReferenceError` (temporal dead zone in `kernel/http.ts`).
2. Fourteen import specifiers point at modules that do not exist.

These are not subtle. They are the kind of thing a single smoke test or a
typecheck over `netlify/` would have caught immediately — and the root cause of
them shipping is finding **C1**: `tsconfig.json` only includes `src/**/*`, so
**zero of the 116 backend TypeScript files are type-checked**. `npm run
typecheck` passes clean on a backend that cannot execute.

Below: 41 findings, ordered by severity.

---

## 🔴 BLOCKER — Fix before any deploy

### B1. Temporal dead zone: every DB call throws `ReferenceError`
**Location:** `netlify/functions/_lib/kernel/http.ts:116-121`
**Severity:** 🔴 Blocker · **Impact:** complete backend outage

```ts
if (dep === 'postgrest') {           // line 116 — `dep` declared at line 124
  const stmtTimeout = isRead ? '2000' : '3000';  // `isRead` declared at line 128
  ...
}
const startTime = Date.now();
const dep = detectDependency(url);   // line 124
const isRead = !init.method || ...;  // line 128
```

`dep` and `isRead` are `const` bindings read before their declaration → the
TDZ throws. Verified with an isolated repro of the exact statement ordering:

```
THREW: ReferenceError :: Cannot access 'dep' before initialization
```

`request()` is the single outbound HTTP path used by `supabaseJson()`
(`db/client.ts:52`), which backs *every* read and write in the application.
Nothing that touches Postgres works.

**Introduced by:** `4a76ccc feat(kernel): connection pool config, RLS
migration, statement_timeout` (today, 15:33) — the `statement_timeout` block was
inserted above the declarations it depends on.

**Fix:** move lines 116-121 to after line 128.

---

### B2. Fourteen unresolvable imports
**Severity:** 🔴 Blocker · **Impact:** document ingestion, candidate, and scheduled-job flows fail at runtime

Verified by walking the import graph and resolving every relative specifier:

| File | Missing module |
|---|---|
| `surfaces/docs.ts:13,17,21,25,33,37,41` | `_lib/actions-upload` |
| `surfaces/docs.ts:29` | `_lib/actions-master` |
| `surfaces/docs.ts:45` | `_lib/actions-download` |
| `surfaces/candidates.ts:13` | `_lib/actions-candidate` |
| `sweep-queue.ts:44` | `_lib/actions-ingest` |
| `sweep-queue.ts:51` | `_lib/actions-wa` |
| `ingest.js:2` | `_lib/actions-ingest` |
| `share-data.js:11` | `_lib/actions-share` |

`_lib/` contains only `actions-auth.ts` and `actions-job-status.ts`. The others
do not exist. Because most are reached via `await import(...)` inside handlers,
they fail **per-request** rather than at cold start — 10 of 13 document actions
(`submitApply`, `simpanBerkasTahapan`, `downloadJobDocs`, …) are dead, and the
2-minute `sweep-queue` cron fails on every tick.

Note the trap: `actions-master.test.ts` *passes* (18 tests) but imports from
`contexts/master-data`, not from the missing `actions-master`. Green tests here
are misleading.

---

### B3. `netlify.toml` redirects to a function that does not exist
**Location:** `netlify.toml` (15 `[[redirects]]` blocks)
**Severity:** 🔴 Blocker

All legacy aliases rewrite to `/.netlify/functions/handlers`. There is no
`handlers.ts` or `handlers.js` in `netlify/functions/`. Every one of these
endpoints 404s:

`auth`, `candidates`, `jobs`, `mail`, `master`, `schedule`, `config`,
`register`, `wa`, `ai`, `ingest`, `upload`, `share-data`, `get-app-data`

This also breaks the client's own fallback path (`apiClient.ts:116` retries 404s
against `bridge-links`), and `adminStore.ts:120,155` calls
`/.netlify/functions/get-app-data` directly.

---

### B4. Race condition — per-request state stashed on `globalThis`
**Location:** `netlify-wrapper-surface.ts:80-89`, `netlify-wrapper.ts:57-60`
**Severity:** 🔴 Blocker · **Impact:** cross-request contamination

```ts
(globalThis as Record<string, unknown>).__requestId = requestId;
(globalThis as Record<string, unknown>).__traceparent = traceparent;
```

A warm Netlify instance serves concurrent requests. Request A sets `__requestId`,
awaits I/O, request B overwrites it, then A resumes and reads B's value.
Idempotency keys are mis-attributed — meaning a mutation can be deduplicated
against, or replay the dedup record of, an unrelated concurrent request.

**Fix:** `kernel/log.ts` already has `AsyncLocalStorage` (`runWithContext`).
These three values belong in that store, not on `globalThis`. The handler
already wraps execution in `runWithContext` — the plumbing exists.

---

### B5. Job queue claims are not atomic (despite the docstring)
**Location:** `netlify/functions/_lib/kernel/job-queue.ts:93-145`
**Severity:** 🔴 Blocker · **Impact:** duplicate execution, lost jobs

The header claims "at-least-once job execution via Postgres SKIP LOCKED". No
`SKIP LOCKED` exists. `claimJob()` is a plain `SELECT` followed by a `PATCH`:

```ts
const rows = await supabaseJson('GET', TABLE, {...limit: '1'});  // SELECT
...
await supabaseJson('PATCH', TABLE, {...body: {status: 'running'}}); // UPDATE
```

Two concurrent sweeps both select the same job and both execute it. For
`kirimTawaranMassal` that means **duplicate WhatsApp sends to candidates**; for
AI jobs, duplicate spend. This is the exact failure mode the module was written
to prevent.

Three further defects in the same function:

- **Retry backoff is inverted** (line 110):
  `if (job.run_after > now && job.status !== 'failed') return null;`
  A *failed* job whose `run_after` is in the future skips the guard and is
  claimed immediately. Since results are ordered `run_after.asc`, failed jobs
  are retried in a tight loop, burning through `max_attempts` in seconds.
- **Head-of-line blocking:** a single pending job with a future `run_after`
  returns `null`, and `sweepQueue` does `if (!job) break;` — one scheduled job
  stalls the entire queue.
- **Orphaned jobs:** `locked_until` is written but never read. `claimJob` only
  selects `status in (pending,failed)`, so a job whose worker dies stays
  `running` forever. There is no visibility-timeout reclaim.

**Fix:** a single atomic RPC (`UPDATE ... WHERE status='pending' ... FOR UPDATE
SKIP LOCKED LIMIT 1 RETURNING *`), plus a reclaim sweep for `running` jobs past
`locked_until`.

---

### B6. Rate limiter is a non-atomic read-modify-write
**Location:** `netlify/functions/_lib/kernel/rate-limit.ts:102-155`
**Severity:** 🔴 Blocker (security) · **Impact:** rate limits not enforced

```ts
const row = await readCounter(key);          // GET
...
await upsertCounter({ ...row, count: newCount });  // POST upsert
```

Lost updates: N concurrent requests all read `count=0` and all write `count=1`.
The effective limit under concurrency is unbounded, not `limit`. This limiter
guards `LOGIN_ACTIONS` (`handlers.ts:83-96`) and drives account lockout
(`rateLimit.fail`), so brute-force protection is materially weaker than
configured.

**Fix:** atomic increment via a Postgres function
(`UPDATE rate_counters SET count = count + 1 WHERE ... RETURNING count`), which
also removes a full round trip per check.

---

### B7. Unbounded recursion: dependency-call logging re-enters itself
**Location:** `netlify/functions/_lib/kernel/http.ts:157-168, 335-359`
**Severity:** 🔴 Blocker · **Impact:** request amplification during an outage

On any failure, `request()` calls `logDependencyCall(...)` *unconditionally*.
`logDependencyCall` calls `supabaseJson()`, which calls `request()` — which
fails again and calls `logDependencyCall` again. Every failing request spawns an
unbounded async chain of further failing requests. When PostgREST is down, this
is a self-sustaining fork bomb: the outage that most needs the breaker to
fail-fast instead generates maximum load.

The `catch {}` inside `logDependencyCall` only swallows its *own* rejection; the
recursion happens one level deeper.

**Fix:** skip logging entirely when `dep === 'postgrest'`, or gate on a
re-entrancy flag from `AsyncLocalStorage`.

---

## 🔴 BLOCKER (added 18:47) — discovered while assessing production readiness

These were found *after* the first pass, in files not covered by the initial
review. They are the single biggest obstacle to a production deploy.

### B8. `userClient()` mints a database credential from an **unverified** token
**Location:** `netlify/functions/_lib/kernel/db.ts:108-136`
**Severity:** 🔴 Blocker (auth bypass / cross-tenant data access)

```ts
try {
  const parts = sessionToken.split('.');
  if (parts.length === 2) {
    const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const supabaseJwt = createSupabaseJwt({
      role: claims.role || 'authenticated',
      wa:   claims.wa,
      name: claims.name,
    });
    ...
```

The session token is **decoded but never verified**. `kernel/db.ts` imports only
`crypto`, `env`, and `log` — there is no `import { verifyToken }` and no call to
it. `session.verifyToken()` (which is what validates the HMAC) never runs on
this path.

An attacker can therefore hand-craft `base64url('{"role":"admin","wa":"628…"}')`
+ any garbage suffix, and this function will mint a **genuinely valid** Supabase
JWT carrying a `wa` claim of the attacker's choosing. Under the RLS policies in
`2026-09-01-phase8-rls.sql`, that JWT authorises reading and writing that
candidate's rows — i.e. any candidate's data, by guessing or enumerating a
phone number.

The action dispatcher's `requireAdmin` / `requireRole` (`handlers.ts:47-49`) is
the only thing currently standing in front of this, and it holds only because
those checks happen to run first in today's call order. The credential-minting
function itself has no integrity check — it is one refactor away from a direct
breach.

**Fix:** call `session.verifyToken(sessionToken)` and bail to `anonClient()` on
`null`. Never derive a DB credential from unauthenticated input.

### B9. Missing `SUPABASE_JWT_SECRET` silently degrades RLS to "see nothing"
**Location:** `netlify/functions/_lib/kernel/db.ts:49-55, 127-135`
**Severity:** 🔴 Blocker (silent data loss)

```ts
const secret = env('SUPABASE_JWT_SECRET');
if (!secret) { log.debug('supabase_jwt.no_secret', ...); return ''; }
```

`createSupabaseJwt` returns `''`, which is falsy, so `userClient` falls through
to `return { ...anon }` at line 135. The caller receives a client labelled
`'anon'` and cannot tell the difference.

With `2026-09-01-phase8-rls.sql` applied, every one of the ~68 operations not on
the `SERVICE_ROLE_ALLOWLIST` (which contains only 6 entries) then runs as anon
under:

```sql
USING (no_wa = COALESCE(current_setting('request.jwt.claims', true)::json->>'wa', ''))
```

`request.jwt.claims` is unset for anon → `COALESCE(NULL, '')` → `no_wa = ''` →
**every read returns zero rows and every write is silently rejected.** No error
surfaces; the UI just looks empty.

**Fix:** fail loudly at startup if `SUPABASE_JWT_SECRET` is unset while RLS
policies are active; add a startup assertion that a known row is visible.

### B10. Rate-limit migration documents an atomic increment the code never implemented
**Location:** `netlify/migrations/2026-09-01-rate-counters.sql:8-11` vs `kernel/rate-limit.ts:102-155`
**Severity:** 🔴 Blocker

The migration states:

> ATOMIC INCREMENT: Use upsert with on_conflict to atomically increment the
> counter. PostgreSQL's INSERT ... ON CONFLICT UPDATE is atomic — no race
> condition.

The code does `SELECT` → compute `count + 1` in JS → write the absolute value.
That is exactly the race the comment claims is avoided (see B6). The schema is
correct (`bucket text PRIMARY KEY` supports `on_conflict`); the implementation
does not use it. Fix with `count = rate_counters.count + 1` in an
`ON CONFLICT DO UPDATE`, or a Postgres function.

---

## 🟠 HIGH — Security

### S1. Stored XSS via AI chat output
**Location:** `src/components/forms/AiCvForm.tsx:208`
**Severity:** 🟠 High

```tsx
dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }}
```

`msg.text` is raw Gemini/Grok output. Only `**bold**` is transformed; every
other HTML tag passes through untouched. The model is fed user-controlled text,
so a candidate can prompt-inject `<img src=x onerror=...>` and have it execute
in an **admin's** browser when the transcript is viewed.

Combined with S2 (tokens in `localStorage`) and S3 (no token expiry), this is a
clean path to full admin account takeover.

**Fix:** escape first, then apply the bold transform to the escaped string — or
render with a component instead of `innerHTML`.

### S2. Session tokens in `localStorage`, no expiry, revocable only by secret rotation
**Location:** `src/store/authReactive.ts:38`, `netlify/functions/_lib/session.ts:9`

Tokens live in `localStorage` (readable by any script on the origin). The
`authReactive.ts` header claims "XSS mitigation" while doing the opposite.

The signed payload is `{ role, wa?, name?, kind? }` — **no `iat`, no `exp`**.
A token, once issued, is valid forever, and because sessions are stateless there
is no revocation short of rotating `SESSION_SECRET` (which logs out every user).

**Fix:** add `exp` and validate it in `verifyToken`; keep the access token in
memory and hold only a refresh token in storage; add server-side revocation.

### S3. HMAC secret falls back to the admin password
**Location:** `netlify/functions/_lib/session.ts:19-24`

```ts
env('SESSION_SECRET') || env('ADMIN_PASSWORD') || env('ASJ_ADMIN_PASSWORD')
  || env('ADMIN_MASTER_PIN') || env('PIN_KHOCI') || ''
```

Deriving the signing key from the admin password means anyone who knows the
password can forge a token with **any** `role` — no need to know the PINs at
all. It also couples two secrets: rotating the password invalidates all
sessions.

**Fix:** require a dedicated `SESSION_SECRET`; drop the password fallbacks.

### S4. Attribute-injection XSS via unescaped photo URL
**Location:** `src/components/admin/RirekishoBuilder.tsx:205` (rendered at `:223`)

```ts
const foto = photo ? "<img src=\"" + photo + "\" style=...>" : "...";
```

Every other value in this builder goes through `E()` (`esc()`, line 116).
`photo` does not. A value containing `"` breaks out of the attribute, and the
result is rendered with `dangerouslySetInnerHTML`. `photo` traces back to
`d.uploads?.photo`, which per S5 can be an arbitrary attacker-supplied URL.

**Fix:** `E(photo)` and validate the scheme (`https:` only).

### S5. Arbitrary external URLs accepted as uploaded documents
**Location:** `netlify/functions/_lib/storage.ts:157-162`

```ts
if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) return value.trim();
```

No host allow-list. A candidate can submit `https://attacker.example/x` as
their ID photo; it is persisted and later rendered in the admin panel and in the
rirekisho (S4). Also enables tracking/injected-content vectors.

### S6. Plaintext credential comparison, non-constant-time
**Location:** `netlify/functions/contexts/identity/service.ts:60, 82, 127`

```ts
const ok = storedPass === password || (await bcrypt.compare(password, storedPass));
const pinMatch = admin.pin === pin || (await bcrypt.compare(pin, admin.pin));
```

Plaintext comparison is tried *first*, meaning plaintext credentials exist in
the database, and `===` on secrets is a timing side channel. The bcrypt branch
is correct — the plaintext fallback is the problem.

**Fix:** remove the plaintext branches; migrate legacy rows to bcrypt.

### S7. Privilege escalation via self-writable `user_metadata.role`
**Location:** `src/store/userStore.ts:80, 199, 225`

```ts
const role = meta.role || 'kandidat';
if (role === 'admin') loginAsAdmin(...)
```

Supabase `user_metadata` is editable by the user. Setting
`user_metadata.role = 'admin'` grants admin UI state client-side. If any
server path also trusts this claim, it is a full escalation.

**Fix:** derive role server-side from a trusted table (or a custom JWT claim
set by a privileged process); never from user-writable metadata.

### S8. Weak default password
**Location:** `netlify/functions/contexts/identity/service.ts:102`

`const pass = password || wa.slice(-4);` — accounts created without an explicit
password get the last 4 digits of their phone number, which is trivially
guessable and enumerable.

### S9. CORS wildcard on all API responses
**Location:** `netlify/functions/_lib/netlify-wrapper-surface.ts:108`

`Access-Control-Allow-Origin: *` is attached to every response, including
authenticated ones. Any website can call these endpoints and read responses.
Restrict to the application origin.

### S10. No request size limit; unbounded base64 buffering
**Location:** `netlify-wrapper-surface.ts:53` (`JSON.parse(event.body)`),
`storage.ts:39` (`b64ToBuffer`)

Bodies are parsed and base64 payloads fully buffered with no cap. Large uploads
translate directly into memory pressure inside the function.

### S11. API keys in URL query strings
**Location:** `netlify/functions/_lib/ai/providers.ts:36-38`

`?key=${key}` puts the Gemini key into upstream access logs and any error
reporting that captures URLs. Use the `x-goog-api-key` header instead.

---

## 🟡 MEDIUM — Performance & correctness

### P1. Sequential AI model fallback far exceeds the function budget
**Location:** `netlify/functions/_lib/ai/providers.ts:135-146`
3 models × 7 s timeout, then Grok at 10 s = **up to 31 s**. Netlify's
synchronous limit is 10 s. Under a slow or failing provider the request 502s
after burning the full budget.
**Fix:** bound total latency; race candidates with `Promise.any` rather than
chaining, and cut per-model timeouts so the worst case fits the budget.

### P2. Raw `fetch` bypasses the entire resilience layer
**Location:** `storage.ts:15` (`storageRequest`), `db/client.ts:132` (`supabasePaged`)

Neither has a timeout, circuit breaker, or bulkhead slot — the exact failure
`kernel/http.ts` was built to prevent. A hung Storage call consumes the whole
invocation. Route both through `request()`.

### P3. `findTable()` sequential table probing with full row fetches
**Location:** `db/client.ts:152-164`

Loops candidate table names, each doing `select=*` with `limit: 300`, just to
test existence. N sequential round trips transferring up to 300 full rows each.
Use `HEAD` (or `select=<pk>&limit=1`), and stop on first success.

### P4. N+1 deletes in idempotency cleanup
**Location:** `job-queue.ts:206-230`

Up to 100 sequential `DELETE` HTTP calls per invocation (~4 s at 39 ms RTT).
Batch into a single `DELETE ... WHERE created_at < cutoff`. Also `deleted++`
counts attempts, not successes.

### P5. Client cache is fully invalidated on every write
**Location:** `src/lib/apiClient.ts:91`

Any non-cacheable action calls `invalidateCache()`, which wipes **every**
`asj_cache_*` key. One unrelated mutation discards all cached reads. Invalidate
by prefix/key.

### P6. Stale-cache race in `apiClient`
**Location:** `src/lib/apiClient.ts:87-92, 132-134`

A read misses cache → a concurrent write completes and calls
`invalidateCache()` → the read finishes and calls `setCache()`, **re-caching
data that is already stale** for the full 30 s TTL. Add in-flight dedup and
re-check a write-generation counter before caching.

### P7. Token fetched from Supabase on every API call
**Location:** `src/lib/apiClient.ts:66-74`

`getFreshToken()` awaits `supabase.auth.getSession()` on every request with no
caching — an extra round trip on the hot path. Cache with a short TTL and
refresh near expiry.

### P8. Unbounded in-memory Maps
- `rate-limit.ts:206` `memBuckets` — never evicted, keyed by attacker-influenced keys.
- `cache.ts:8` (legacy) — `MAX_ENTRIES = 50` is enforced, but eviction is FIFO
  by insertion order despite LRU naming; hot entries get evicted.
- `surfaces/index.ts:137` `surfaceCache` — bounded in practice, but keyed by
  `loader.toString()` (below).

### P9. Both i18n locales bundled eagerly
`src/store/i18n.ts` is 1,345 lines and 56 KB in the built bundle, imported by 28
modules. Both `id` and `jp` ship to every page. Lazy-load the inactive locale.

### P10. Full dataset shipped to the client
`src/store/adminStore.ts:117-136` loads all candidates into
`allKandidatList` and filters client-side; `PAGE_SIZE = 20` paginates only the
view. Also bypasses `apiClient` (no auth check, no error surface, no
cancellation), so concurrent fetches race with last-write-wins.

### P11. `bumpGeneration()` invalidates a key format that is never produced
**Location:** `kernel/cache.ts:143-147` vs `:155-157`

`genKey()` emits `` `${namespace}:v${gen}:${qualifier}` `` but
`bumpGeneration()` calls `l1.invalidatePrefix(\`gen:${gen - 1}:\`)`. The prefix
matches nothing. It works by accident only because new keys use the new
generation; the explicit invalidation is dead code and gives a false sense of
correctness.

### P12. `DEPENDENCY_CONFIGS` is exported but never used
**Location:** `kernel/resilience.ts:334-340`

The `CircuitBreaker` singleton (`:236`) is constructed with default options and
never consults this table. The tuned thresholds — gemini 3, fonnte 3, fcm 10 —
are silently ignored; every dependency uses threshold 5 / window 30 s /
cooldown 15 s. fonnte's 60 s cooldown in particular never applies.

### P13. Two duplicate, divergent resilience implementations
`kernel/resilience.ts` (`breaker`, `bulkhead`) and inline copies in
`kernel/http.ts` (`breakers`, `bulkheadInflight`, lines 262-326) maintain
**separate state**. `db/client.ts` calls the resilience breaker *and* then
`request()` consults the inline one — every PostgREST failure is counted twice
against two independent thresholds, and the two bulkheads stack (8 + 8 = 16
effective concurrency, double the documented `POOL_CONFIG.connectionsPerInstance`).

### P14. `detectDependency()` classifies Supabase Storage calls as `postgrest`
**Location:** `kernel/http.ts:248-256`

`url.includes('supabase')` is tested before `url.includes('storage')`, and
Storage URLs are `https://<project>.supabase.co/storage/v1/...`. The `storage`
branch is unreachable for real Storage traffic.

### P15. Retry decisions parsed from error message strings
**Location:** `resilience.ts:58`, `http.ts:189-199`

`error.message.match(/HTTP (\d{3})/)` decides retryability. Any change to
upstream error formatting silently disables retries. `HttpError` already carries
a typed `status` — match on that.

### P16. Timer leak on bulkhead/breaker rejection
**Location:** `kernel/http.ts:99-100, 132-137`

`acquireBulkhead()` and `checkBreaker()` throw **outside** the `try` block, so
`clearTimeout(timer)` never runs on those paths. Each rejected request leaks a
pending timer.

### P17. `run_after` compared as strings across two timestamp formats
**Location:** `job-queue.ts:95, 110`

`job.run_after > now` compares a Postgres `timestamptz` (microseconds,
`+00:00` offset) against `toISOString()` (milliseconds, `Z` suffix)
lexicographically. The formats differ, so ordering is not guaranteed. Parse to
epoch millis.

### P18. Errors returned with HTTP 200
**Location:** `netlify-wrapper-surface.ts:114`

Failures are `{ success: false, message }` with status 200. This defeats the
client's 404-based endpoint fallback (`apiClient.ts:115`) and any
transport-level error handling or monitoring.

### P19. Query-string payload is not parsed
**Location:** `netlify-wrapper-surface.ts:60`, `netlify-wrapper.ts:51`

`body.payload = q.payload` assigns a **string**. Handlers then do `payload[0]`,
which yields the first character. Any GET-invoked action is silently corrupted.

### P20. `setInterval` in module scope is never cleared
**Location:** `src/store/authReactive.ts:102-111`

Registered once at module evaluation with no teardown. Repeated evaluation (HMR,
island remount) accumulates intervals; the 5-minute expiry timer also calls
`window.location.reload()`, which can discard unsaved form input.

### P21. `persistentAtom` `decode` has no error handling
**Location:** `src/store/authReactive.ts:38-41`, `i18n.ts:8`

`decode: JSON.parse` — a corrupt or hand-edited `localStorage` value throws
during **module initialization**, taking down the app with no recovery path.
Wrap in try/catch and fall back to defaults.

### P22. Session lifetime measured from login, not activity
**Location:** `src/store/authReactive.ts:84`

`lastChecked` is set at login and never refreshed, so sessions die 24 h after
login regardless of use — and the client's notion of expiry is entirely
disconnected from the server's (which has none, per S2).

### P23. `initializeAuthListener()` returns a no-op cleanup when already initialized
**Location:** `src/store/userStore.ts:180`

```ts
if (listenerInitialized) return () => {};
```

A second caller gets a cleanup function that does nothing, so unmounting that
component leaks the subscription. Return the original unsubscribe instead.

### P24. `surfaceCache` keyed by function source text
**Location:** `surfaces/index.ts:153`

`const surfaceKey = loader.toString();` — relying on `Function.prototype.toString`
for identity. Actions mapping to the same surface produce identical source and
correctly share a cache entry today, but the behaviour depends on bundler
output (minification, renaming). Key on an explicit surface name.

### P25. `supabaseUpsert` detects missing indexes by substring match
**Location:** `db/client.ts:113`

`String(e.message).includes('42P10')`. If PostgREST's error body omits the
SQLSTATE, the fallback insert never runs and the request fails outright.

### P26. `withRetry` uses inverted `idempotent` default
**Location:** `resilience.ts:78`, `http.ts:213`

`idempotent` defaults to `true`, and `callWithProtection` defaults
`opts.retry?.idempotent ?? true`. Every call is treated as retryable unless
explicitly opted out — the unsafe direction. Writes should have to opt *in*.

---

## 🔵 LOW / Nits

- **`cache.getOrSet` has no in-flight dedup** (`kernel/cache.ts:166`) — concurrent misses all execute `fn()`, a classic thundering herd on cold cache.
- **Negative caching stores `null` with a redundant second expiry** (`kernel/cache.ts:94-105`) — `expiresAt` and `negativeExpiry` are set to the same value; the field adds nothing.
- **Gemini history is unbounded** (`providers.ts:129`) — client-supplied array forwarded verbatim; no cap on length or tokens. Cost amplification.
- **`hapusJenisVarian` lists 300 objects before every upload** (`storage.ts:111`) — an extra list + delete round trip per file.
- **`console.log` of auth events** (`userStore.ts:191, 209, 237`) ships to production browser consoles.
- **`SURFACE_HANDLERS` Proxy returns a new function per access** (`surfaces/index.ts:179`) — `SURFACE_HANDLERS.foo !== SURFACE_HANDLERS.foo`.
- **`normalizePhone`** (`userStore.ts:267`) does not strip a leading `+` before the country-code check; works today but is order-dependent.
- **24 `addEventListener` vs 12 `removeEventListener`** across `src/` — worth auditing for leaks.
- **`requestId`** (`netlify-wrapper-surface.ts:87`) is `Date.now() + Math.random()` — adequate, but `crypto.randomUUID()` is clearer.

---

## C1. Process gap — the backend is not type-checked

**Location:** `tsconfig.json`

```json
"include": ["src/**/*"]
```

`netlify/functions/` contains 116 TypeScript files — the entire backend — and is
excluded. `npm run typecheck` reports zero errors on a backend where every DB
call throws a `ReferenceError`. TypeScript flags B1 as
*"Block-scoped variable 'dep' used before its declaration"*; it simply never ran.

**Recommended, in order:**

1. Add `netlify/functions/**/*` to `tsconfig.json` `include` (expect a backlog;
   triage rather than blanket-`any` it).
2. Add a smoke test that boots one handler and performs one real DB read — this
   alone catches B1, B2, and B3.
3. Add a build step that fails on unresolvable relative imports (the script used
   for this review is ~20 lines).
4. Wire `npm run boundary` (already configured via dependency-cruiser) into CI —
   it is defined but does not appear to run in any pipeline.

---

## What the codebase does well

Worth naming, because these are real and should be preserved through the fixes:

- **`kernel/http.ts` centralisation** is the right instinct — one place for
  timeouts, budgets, and error taxonomy. The design is sound; only the
  statement ordering is broken.
- **Structured logging with PII hashing** (`kernel/log.ts`) — hashing `no_wa`,
  `nik`, and tokens before they reach logs, plus `AsyncLocalStorage` for request
  correlation, is genuinely good practice.
- **Zod validation at the handler boundary** (`kernel/validate.ts`) — validates
  the positional payload array, throws a typed `AppError` with a 400. Correct
  pattern.
- **`supabaseUpsert` with `on_conflict`** and the `42P10` fallback is a
  thoughtful answer to a real migration-ordering problem.
- **Surface-per-function decomposition** with lazy loading — measurably reduces
  cold-start scope; the reasoning is documented in `surfaces/index.ts`.
- **`RirekishoBuilder`** escapes essentially every interpolated value via `E()`.
  One missed value (S4) in an otherwise careful implementation.

The architecture is ahead of the verification around it. Closing the
typecheck/smoke-test gap is the highest-leverage change on this list — it would
have caught every blocker here before commit.

---

## Production readiness — verdict

**Question:** if all 44 findings above are fixed, can this ship?

**Answer: not on that basis alone.** Fixing the findings removes the known
blockers; it does not establish that the system works. Three separate reasons:

### 1. The backend has never executed in its current state

B1 (`kernel/http.ts:116-121`) throws on the **first** statement of every
database call. Since commit `4a76ccc` was pushed, *no* backend code path has
successfully reached Postgres. Everything downstream of that throw — every
handler, repository, and context — is code that has never run in this
configuration.

Fixing B1 does not produce a working system. It produces a system that gets one
step further and hits whatever is behind it. Expect a sequence of discoveries,
not a single fix.

### 2. This review was not exhaustive

Coverage, measured: roughly 25 of 99 backend source files were read in depth.
The two worst findings (B8, B9) were discovered only when the production
question prompted a look at `kernel/db.ts` and the RLS migration — **files not
examined in the first pass**. Other unread areas: the 12 `contexts/*`
repositories and services, `ai/chat.ts`, `fcm-server.ts`, `event-handlers.ts`,
and most of `src/components/admin/`.

Assume the same density of defects holds in the unread remainder.

### 3. Verification infrastructure does not exist

| Signal | Value |
|---|---|
| CI pipeline | **none** (no `.github/workflows`) |
| Backend source files | 99 |
| Backend test files | 18 |
| Tests for `kernel/http.ts` | **0** |
| Tests for `kernel/job-queue.ts` | **0** |
| Tests for `kernel/validate.ts` | **0** |
| Backend files type-checked | **0** (`tsconfig` excludes `netlify/`) |

The two modules carrying the most severe defects have **zero tests**. There is
no automated gate of any kind between a commit and production.

### What production-ready would actually require

1. **Fix B1–B10.** (~1 day)
2. **Add `netlify/functions/**/*` to `tsconfig.json`** and clear the resulting
   backlog — this is what catches this entire class before commit.
3. **One end-to-end smoke test**: boot a handler, write a row, read it back,
   delete it. Against a real database. This alone would have caught B1, B2, and
   B3.
4. **Verify the five `2026-09-01-*.sql` migrations are applied** in the target
   project. The kernel modules hard-depend on `job_queue`, `rate_counters`,
   `dependency_calls`, and `idempotency_keys`; if any is missing, that subsystem
   fails at runtime.
5. **Confirm `SUPABASE_JWT_SECRET` is set** in the Netlify environment before
   enabling the RLS migration — otherwise B9 turns into silent, total data
   invisibility with no error message.
6. **Decide intentionally about RLS.** Enabling `2026-09-01-phase8-rls.sql`
   moves ~68 operations from service-role to user/anon scope. That is the right
   direction, but it is a behavioural change to every action at once, gated on a
   JWT-minting helper that currently skips signature verification (B8). Ship
   B8's fix first, then RLS, then verify one real user-scoped read.
7. **Manual pass over the critical journeys**: candidate registers → applies →
   uploads documents; admin logs in → reviews → approves; WA notification sends.

**Realistic path:** blockers fixed and smoke-tested → deploy to a staging
Netlify deploy preview pointed at a Supabase branch → manual journey pass →
production behind the existing CDN cache. The database is small (14 MB, 225
candidates), so a full copy for staging is cheap and fast.

The architecture is sound and the fixes are mostly small. What is missing is
not design — it is the verification layer that tells you a change works.

---

## Suggested fix order

| # | Action | Effort |
|---|---|---|
| 1 | Reorder `kernel/http.ts:116-121` below line 128 | 1 min |
| 2 | Add `netlify/functions/**/*` to `tsconfig` include | 5 min |
| 3 | Restore or remove the 14 missing `actions-*` modules | — |
| 4 | Fix or delete the 15 `netlify.toml` redirects to `/handlers` | 30 min |
| 5 | Move per-request state from `globalThis` to `AsyncLocalStorage` | 30 min |
| 6 | Break the logging recursion (skip self-dependency) | 15 min |
| 7 | Escape `photo` in `RirekishoBuilder`; escape AI output in `AiCvForm` | 30 min |
| 8 | Add `exp` to session tokens; require a dedicated `SESSION_SECRET` | 2 h |
| 9 | Atomic job claim (RPC + `SKIP LOCKED`) and atomic rate-limit increment | 3 h |
| 10 | Consolidate the two breaker/bulkhead implementations | 2 h |
