# FASE 3: Nano Stores + Auth — DEEP Analysis

## Status: ✅ COMPLETE

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/store/userStore.ts` | 105 | Auth state atom (role, name, wa, session) |
| `src/store/appState.ts` | 75 | Global app state (jobs, candidates, filters) |
| `src/lib/auth.ts` | 75 | API calls + session management |

## Architecture

```
src/store/
├── userStore.ts    ← Auth state (nanostores atom)
│   ├── userStore   ← Main atom: { role, name, wa, session, isLoggedIn }
│   ├── isAdmin     ← Computed: role === 'admin'
│   ├── isKandidat  ← Computed: role === 'kandidat'
│   ├── displayName ← Computed: name || 'Guest'
│   ├── loginAsAdmin()
│   ├── loginAsKandidat()
│   ├── logout()
│   └── restoreSession()
└── appState.ts     ← App state (nanostores atoms)
    ├── allJobs, allCandidates, allForm, etc.
    ├── filters (dbSortType, mailFilterStatus, etc.)
    ├── pagination (limitPub, limitAdm, etc.)
    └── resetAppState()

src/lib/
└── auth.ts         ← API layer
    ├── callAPI()        ← Netlify function caller
    ├── registerKandidat()
    ├── loginKandidat()
    ├── loginAdmin()
    ├── checkAdminMaster()
    ├── changePassword()
    ├── logout()
    ├── normalizeWa()
    └── isValidWa()
```

## Session Flow

```
Page Load → BaseLayout.astro <script>
  └→ Check localStorage (asj_admin_login / asj_kandidat_login)
  └→ If found: show correct nav mode (admin/kandidat)
  └→ If not: show guest nav (login/register buttons)

Login (Preact component) → auth.ts
  └→ callAPI('loginKandidat', [wa, pass])
  └→ On success: userStore.set({ role: 'kandidat', ... })
  └→ Persist to localStorage for session recovery

Logout → userStore.logout()
  └→ Clear localStorage
  └→ Reset to guest state
  └→ Reload page
```

## Compatibility with Legacy

| Legacy Pattern | New Pattern | Status |
|----------------|-------------|--------|
| `window.isAdmin = true` | `userStore.set({ role: 'admin' })` | ✅ |
| `localStorage.getItem('asj_admin_login')` | `restoreSession()` | ✅ |
| `bridgeState()` pattern | nanostores atoms | ✅ |
| `registerSeamAliases()` | Direct imports | ✅ |

## Migration Notes

1. **No Supabase Auth** — Legacy uses localStorage-based sessions (HMAC tokens from backend)
2. **No onAuthStateChange** — Session is checked on page load, not real-time
3. **Nav mode toggle** — Preserved via DOM manipulation in BaseLayout.astro script
4. **Preact components** — Will use `useStore(userStore)` in Fase 4

## Next (Fase 4)

- Create Preact components for Login, Register, Admin Dashboard
- Use `client:load` directive to mount interactive islands
- Connect to nanostores for reactive UI updates
