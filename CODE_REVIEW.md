# ASJ Portal v2 — Codebase Review

**Reviewed:** 2026-08-31 · branch `main` @ `cea555b`
**Scope:** `src/`, `netlify/functions/_lib/`, `netlify/functions/*.js|cjs`, `shared/`, `public/`
**Not reviewed:** `legacy/` (36.5k lines, pre-Astro migration), `node_modules/`, `dist/`

---

## 1. Verdict

The architecture is sound — a clean static Astro shell with Preact islands, a single
action-registry dispatcher on the backend, and shared WA-normalisation logic between
front and back. Someone clearly knew what they were doing.

But the **safety net is off**, and **the backend trusts the client far too much**.
Build passes, tests pass — yet neither is actually checking what you think it is.

| Check | Command | Result |
|-------|---------|--------|
| Production build | `npm run build` | ✅ PASS — 9 pages, 11s |
| Tests (as configured) | `npx vitest run` | ✅ 30/30 pass |
| Tests (all files) | 15 files | ❌ **4 failed** / 96 |
| Type check | `npx tsc --noEmit` | ❌ **50 errors — type checking is dead** |

**Size:** `src/` 68 files / 10.5k lines · `_lib/` 51 files / 11.5k lines · `legacy/` 223 files / 36.5k lines (should be deleted or moved out)

---

## 2. CRITICAL — fix these first

### C1. Type checking is completely disabled — `src/types/api.ts`
The file is corrupted (looks like a bad edit or merge):

```
1: */
2: * Shared TypeScript types for API responses and domain models
6: ~// ── APResponse Evelope ── |
8: nexport interface ApiOk
13: nexport interface ApiErr
```

`npx tsc --noEmit` emits **50 syntax errors, all in this one file**. TypeScript skips
semantic analysis when syntax errors exist, so **not one other file in `src/` is
type-checked**. Your `"extends": "astro/tsconfigs/strict"` does nothing.

This is why C2 slipped through. The file is also never imported (only referenced in a
comment at `src/components/public/LokerTable.tsx:13`) — so **deleting it costs nothing
and restores type checking for the whole frontend.**

### C2. The admin panel has no real protection
- `src/pages/admin.astro:10-15` renders `<AdminPanel client:only="preact" />` with no guard.
- `src/components/AuthGuard.tsx` exists (52 lines, proper `requiredRole` check at :36) but is **imported nowhere**. It is dead code.
- `output: 'server'` is commented out in `astro.config.mjs:6` → `/admin` is a **static HTML file served to everyone**.
- The only gate is `src/store/authReactive.ts:38` — a `persistentAtom` in localStorage.

Anyone can open DevTools and run:
```js
localStorage.setItem('asj_auth', JSON.stringify({role:'admin', isLoggedIn:true, lastChecked:Date.now()}))
```
…and the admin panel renders. The *data* is still safe (Netlify functions verify the
token server-side), but the entire UI, admin copy, and every internal label are public.

### C3. Unauthenticated signed-upload URLs, with path traversal
`netlify/functions/_lib/actions-upload.ts:87` `handleGetUploadUrls` — **no session check
at all**, then calls `storageRequest('POST','object/upload/sign/'+bucket()+'/'+path)` at
:109 using the **service-role key**.

`folder` is client-supplied and only stripped of leading/trailing slashes (`:91`), so
`../` survives into the object path (`:106`).

> Any anonymous caller gets a 120-second write token for an arbitrary path in your
> document bucket. Combined with `Access-Control-Allow-Origin: *`, any web page on the
> internet can overwrite any candidate's KTP / passport / photo.

### C4. Unauthenticated PII lookups
- `_lib/actions-upload.ts:160` `handleCekDataPelamar(wa)` — no auth. Returns nama, gender,
  usia, tinggi/berat, email, and `pasPhoto` / `jftUrl` / `sswUrl` document URLs (`:275-288`).
- `_lib/actions-register.ts:11-24` `handleGetDaftarSiswaBaru` — no auth, dumps 500 rows of
  names + full addresses.

> Two endpoints, no credentials required, that harvest your entire candidate PII database.

### C5. IDOR — any candidate can read/write any other candidate's record
`_lib/actions-master.ts:707-713` checks `requireRole(sessionToken,'kandidat')` and then
looks up `payload[0].wa` with **no ownership comparison**. Returns NIK, passport, furigana,
full family data.

Same missing check on the write paths:
- `_lib/actions-master.ts:917-926` `handleSubmitMasterForm`
- `_lib/ai/cv.ts:204-218` `handleSubmitDataAsj` — note `const guard = kandidatGuard;` at :219 is **assigned and never used**
- `_lib/ai/cv.ts:482-487` `handleSimpanDataTtdNaitei` — **forges another candidate's e-signature**

The correct pattern already exists (`_lib/actions-upload.ts:763-767`, `_lib/actions-auth.ts:261`).
It's just applied inconsistently.

### C6. Session signing secret falls back to a value committed in the repo
`_lib/session.ts:12-22`:
```js
env('SESSION_SECRET') || env('ADMIN_PASSWORD') || env('ADMIN_MASTER_PIN') ||
env('PIN_KHOCI') || 'asj-portal-local-secret'   // ← in the repo
```
If `SESSION_SECRET` is unset, anyone with a copy of this repo can forge a stateless bearer
token with `{role:'admin'}` and own every admin endpoint.

---

## 3. HIGH

### H1. Phone-number validation is broken — 4 tests failing, nobody noticed
`shared/wa-rules.ts` is the shared source of truth, and it's wrong:

```js
export function normalizeWa(raw) {
  let s = String(raw||'').replace(/[^0-9]/g,'');
  if (s.startsWith('0')) s = '62' + s.slice(1);
  if (s.startsWith('620')) s = '62' + s.slice(3);
  if (!s.startsWith('628')) return '';      // ← bare '812...' returns ''
  return s;
}
export function isValidWaFormat(wa) {
  return /^628\d{10,11}$/.test(wa);         // ← demands 13-14 digits
}
```

Two real defects:
1. **`normalizeWa('81234567890')` returns `''`** — a bare `8xx` number (extremely common) silently vanishes.
2. **The regex contradicts its own error message.** `actions-auth.ts:125` tells the user
   *"format 08xx atau 628xx (**12-13 digit**)"* but `/^628\d{10,11}$/` requires **13-14**.
   Every legitimate 12-digit number (`628` + 9) is **rejected at login and registration**.

Fix:
```js
if (s.startsWith('8')) s = '62' + s;                 // before the 628 check
export function isValidWaFormat(wa) {
  return /^628\d{9,12}$/.test(normalizeWa(wa));      // normalise first, allow 12-15
}
```

### H2. 13 of your 15 test files never run
`vitest.config.ts:9` → `include: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.test.{ts,tsx}']`

All 13 backend suites under `netlify/functions/_lib/` are **silently excluded**. Running
them manually: **92 passed, 4 failed, 1 file broken** (the 4 failures are H1; the broken
file is H3).

### H3. `action-registry.test.ts` can never pass
It does `readdirSync('js')` at :20 — a directory that only existed in the pre-Astro
layout. Fails instantly with `ENOENT: no such file or directory, scandir '.../js'`.

### H4. AI endpoints reachable without a session
`_lib/ai/chat.ts:155` only enforces `requireRole` when `flow === 'master'` (:161). Pass
any other `flow` value and the guard is skipped entirely. `handleProcessSiswaAIChat` at
:283 doesn't take a `sessionToken` parameter at all. → Free Gemini quota burn / cost DoS.

### H5. SSRF in document ingestion
`_lib/actions-ingest.ts:239` accepts any `http(s)://` URL and `downloadFile` fetches it
with no host allowlist (`:135-136`). Reachable by any valid admin *or* candidate token
(`:223`). → `169.254.169.254` and internal-service probing from inside the function runtime.

### H6. Rate limiting is theatre
`_lib/rate-limit.ts:19` is an in-memory `Map`. Netlify runs many concurrent instances and
recycles them constantly — each keeps its own buckets. Coverage is also thin: `submitApply`,
`submitDaftarSiswa`, `handleCheckAndSendAgendaReminders` (no `requireRole`, sends FCM), and
`registerFcmToken` are all unprotected.

### H7. Zero server-side input validation
`zod` is in `package.json` but is **never imported anywhere under `netlify/`** (used only in
`src/lib/schemas.ts`). Raw request JSON is destructured and written straight to PostgREST
(`actions-register.ts:47-64`, `actions-candidate.ts:53-67`, `actions-job.ts`).

### H8. Service-role key for every query
`db/client.ts:21` prefers `SUPABASE_SERVICE_ROLE_KEY` for all ~60 actions. RLS is bypassed
everywhere; there is no per-request user-scoped client. This turns every ownership bug
above from "blocked by RLS" into "full DB access".

### H9. Broken login state — `auth.token` vs `sessionToken`
`src/store/authReactive.ts:19` defines `sessionToken`, but `src/components/forms/MasterFullForm.tsx:87`
reads `auth.token` (doesn't exist). Worse, `:96` does a **partial atom write**:
```js
authStore.set({ token: d.token, wa: gateWa, user: d.user || 'kandidat' })
```
This replaces the whole atom and never sets `isLoggedIn` / `role` / `lastChecked`.
→ After logging in through that path the app is *still* logged out (`apiClient.ts:108`
throws) and the gate at :87 never auto-unlocks. Same field name used at
`AiCvForm.tsx:148`, `ApplyFullForm.tsx:156`, `SiswaBaruForm.tsx:143`.

### H10. FCM push registration always fails
`src/lib/fcm.ts:94` does `const { callAPI } = await import('./apiClient')` — but `apiClient.ts`
exports `apiClient`, `api`, `default`. **No `callAPI`.** The `TypeError` is swallowed by the
catch at :100, so push notifications have never worked and you'd never know.

### H11. XSS sinks
- `src/components/forms/AiCvForm.tsx:196` — renders AI output via `dangerouslySetInnerHTML` after only a `**bold**`→`<b>` regex.
- `src/components/admin/RirekishoBuilder.tsx:223` — injects HTML string-built at :204-208 including `d.uploads.photo` (a candidate-supplied URL) spliced into `<img src="...">`.

### H12. CORS wide open
`_lib/netlify-wrapper.ts:43` sets `Access-Control-Allow-Origin: *` on every response.

---

## 4. MEDIUM — housekeeping

| # | Issue | Location |
|---|-------|----------|
| M1 | **24 byte-identical `.js`/`.cjs` pairs** (verified with `diff`). Both are valid entry points and `netlify.toml` excludes neither extension → you may be deploying ~44 functions instead of 22, paying double cold starts. | `netlify/functions/*.js` + `*.cjs` |
| M2 | **167,849 lines of build output committed to git and NOT gitignored** (20 files tracked). This is most of the repo's 180k-line "backend". | `netlify/functions/.netlify-built/` |
| M3 | DB error text returned to clients — leaks table/column/constraint names. (No stack traces leak; that part is handled.) | `db/client.ts:54`, `actions-auth.ts:159,248,301`, `actions-candidate.ts:30,101,135`, `share-data.js:26` |
| M4 | Unrestricted file upload — no size cap; `.svg` → `image/svg+xml` stored in a **public** bucket. | `storage.ts:135`, `:58` |
| M5 | `getAppConfig` is fail-closed: guard receives the payload instead of the token, so it always returns `sessionInvalid`. | `actions-diagnostics.ts:19` |
| M6 | `AdminPanel.tsx:110,124` — `class="... space-y-2 style={{ maxHeight: ... }}"` — the `style` object is swallowed into the class string. `MAX_HEIGHT` does nothing. | `AdminPanel.tsx:35-38,110,124` |
| M7 | Dead code: `AuthGuard.tsx`, `Header.tsx`, `BottomNav.astro`, `types/api.ts`, `supabase-server.ts` (2 exports), `useDraft.ts`, `refreshSession`, `isKandidat`… ~12 unused exports. | various |
| M8 | `BottomNav.tsx` (live, i18n-aware) vs `BottomNav.astro` (73 lines, unconsumed migration leftover with inline `onclick` + localStorage logic at :57-72). | `src/components/` |
| M9 | 19 `: any` / `as any`. Worst: `AdminAiCopilot.tsx:116,118,158`; `DocumentPreviewModal.tsx:26,27,45,87`; `apiClient.ts:169,174`. Zero `@ts-ignore` (good). | various |
| M10 | `apiClient.ts:10` imports the **local** `logout`, not `logoutSupabase` → a server-invalidated session clears localStorage without revoking the Supabase session. | `userStore.ts:290` vs `:149` |
| M11 | ~70 hardcoded Indonesian strings still bypass the i18n layer (e.g. `TabConfig.tsx:69`, `TabWA.tsx:59`, `InputManualModal.tsx:139`). | various |
| M12 | `netlify.toml` rewrites `/admin` → `/index.html` (200) while `/admin/index.html` also exists. Fragile; relies on Netlify's file-shadowing order. | `netlify.toml` |
| M13 | Untracked junk: `.agents/`, `.freebuff/` (with logs). Neither is gitignored. | repo root |
| M14 | Hardcoded Firebase config (`fcm.ts:9-12`, project `khoci-7a81c`) and Cloudinary preset (`cloudinary.ts:7-8`). Public-by-design, but hard-binds prod to one project — move to env. | `src/lib/` |
| M15 | `supabase-server.ts:57` falls back `SERVICE_ROLE_KEY \|\| PUBLIC_ANON_KEY` — silently downgrades a privileged client instead of failing loudly. | `src/lib/supabase-server.ts:57` |

---

## 5. What's genuinely well done

- **Single action-registry dispatcher** (`handlers.ts:162-168`) with a contract test — one choke point for logging and error handling, and no raw stack traces ever reach clients.
- **`requireRole` / `isOwnerOrAdmin` centralised** (`actions-auth.ts:308-335`), including a deliberate `kind === 'refresh'` rejection so refresh tokens can't act as session tokens. The *design* is right — C5 is a coverage gap, not a design flaw.
- **`shared/wa-rules.ts`** shared by frontend and backend — one normalization point, which avoids the classic format-mismatch auth bypass. (It just has a bug — H1.)
- **`apiClient.ts`** — the best-organised file in `src/`: single dispatcher, SWR-lite sessionStorage cache with 30s TTL, blanket invalidation on mutation, centralised `sessionInvalid` handling.
- **`cloudinary.ts`** — real retry/backoff with a 30s `AbortController` timeout and correct 4xx-fatal vs 5xx-retry discrimination.
- **i18n layer** (`i18n.ts:1328-1330`) — `t()` falls back `lang → id → key`, never renders a raw key.
- **Timing-safe HMAC verify** with a length check before `timingSafeEqual` (`session.ts:41`), bcrypt for candidate passwords.

---

## 6. Suggested order of work

**Today (1-2h, all low-risk):**
1. Delete `src/types/api.ts` → restores type checking across `src/`. Then fix whatever the newly-live compiler reveals.
2. Fix `shared/wa-rules.ts` (H1) — 3-line change, unblocks real users who can't log in.
3. Add `netlify/functions/**` to `vitest.config.ts` `include`; delete or repair `action-registry.test.ts`.
4. Gitignore + `git rm --cached` `netlify/functions/.netlify-built/`, `.agents/`, `.freebuff/`.
5. Delete the 24 duplicate `.cjs` files (keep `.js`), or exclude `.cjs` in `netlify.toml`.

**This week (needs care, some are breaking):**
6. Add ownership checks to the 4 IDOR sites (C5) — copy the pattern from `actions-upload.ts:763-767`.
7. Add a session check to `handleGetUploadUrls`, `handleCekDataPelamar`, `handleGetDaftarSiswaBaru` (C3, C4).
8. Set `SESSION_SECRET` in Netlify, and make `session.ts` **throw** instead of falling back to the committed literal (C6).
9. Introduce zod validation at the handler boundary (H7) — start with the 4 IDOR endpoints.
10. Fix `auth.token` → `sessionToken` + the partial atom write (H9).
11. Move the admin panel behind a real server-side check, or accept that the UI is public and treat it as such (C2).

**Backlog:**
12. Replace the in-memory rate limiter with Supabase/Upstash-backed counters (H6).
13. Host allowlist for ingestion (H5); require session on AI endpoints (H4).
14. Delete `legacy/` or move it to a separate archive branch — 36.5k lines of noise in every search.
15. Sanitise the two `dangerouslySetInnerHTML` sinks (H11).
