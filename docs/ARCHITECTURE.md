# ASJ Astro — Architecture Deep Dive

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Astro | SSG/SSR routing, BaseLayout, build engine |
| Islands | Preact + `client:load` | Interactive UI (forms, modals, toast) |
| State | Nanostores + persistent | Reactive global state + localStorage sync |
| Validation | Zod | TypeScript schema validation |
| API | apiClient.ts (HMAC) | Centralized fetch wrapper with auth injection |
| PWA | sw.js + manifest | Anti-cache service worker |
| Build | Vite (Astro built-in) | ESM/TS compilation |
| Deploy | netlify.toml | Cache-Control headers |

## Directory Structure

```
asj-astro/
├── src/
│   ├── components/
│   │   ├── App.tsx              # Preact root (Header + LoginModal + Toast)
│   │   ├── LoginModal.tsx       # Auth forms (login/register/admin)
│   │   ├── AuthGuard.tsx        # Route protection (not yet used)
│   │   ├── Toast.tsx            # Notification system
│   │   ├── Header.tsx           # Responsive header (nav + auth buttons)
│   │   ├── BottomNav.astro      # Mobile bottom nav (admin + kandidat)
│   │   ├── Footer.astro         # Social links + copyright
│   │   ├── admin/
│   │   │   ├── AdminPanel.tsx   # Admin root (sidebar + tabs)
│   │   │   ├── TabKelola.tsx    # Loker management table
│   │   │   ├── TabPelamar.tsx   # Candidate database + modals
│   │   │   ├── InputManualModal.tsx    # Manual candidate input
│   │   │   └── LaporanBulananModal.tsx # Monthly report
│   │   ├── candidate/
│   │   │   └── CandidateDash.tsx # Candidate dashboard
│   │   └── public/
│   │       ├── LokerTable.tsx    # Public jobs table + filters
│   │       └── LayananSection.astro # Static layanan cards
│   ├── store/
│   │   ├── authReactive.ts      # Persistent auth (nanostores)
│   │   └── adminStore.ts        # Admin reactive state
│   ├── lib/
│   │   ├── apiClient.ts         # HMAC fetch wrapper
│   │   ├── auth.ts              # Login/logout API calls
│   │   └── schemas.ts           # Zod validation schemas
│   ├── layouts/
│   │   └── BaseLayout.astro     # HTML shell + SW registration
│   ├── pages/
│   │   ├── index.astro          # Landing page
│   │   ├── admin.astro          # Admin panel
│   │   ├── candidate.astro      # Candidate dashboard
│   │   └── public.astro         # Public loker + layanan
│   └── styles/
│       └── global.css           # Tailwind + custom styles
├── public/
│   ├── sw.js                    # Anti-cache service worker
│   └── manifest.webmanifest     # PWA manifest
├── legacy/                      # Full legacy codebase (untouched)
├── netlify.toml                 # Cache-Control headers
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies
```

## Pages

### 1. Index (`/`)
- **Component**: `App.tsx` (Header + LoginModal + Toast)
- **Content**: Landing page with hero, features, CTA
- **Auth**: Guest only (redirects to admin/candidate if logged in)
- **Mobile**: BottomNav hidden (guest mode)

### 2. Admin (`/admin`)
- **Component**: `AdminPanel.tsx` (8 tabs)
- **Tabs**: Kelola, DB Job, Tambah, Pelamar, Jadwal, Mail, WA, Config
- **Auth**: Admin only (redirects to `/` if not admin)
- **Mobile**: BottomNav visible (admin mode)
- **Store**: `adminStore.ts` (reactive kandidat list + modals)

### 3. Candidate (`/candidate`)
- **Component**: `CandidateDash.tsx`
- **Content**: CV progress, status, action buttons
- **Auth**: Kandidat only (redirects to `/` if not kandidat)
- **Mobile**: BottomNav visible (kandidat mode)

### 4. Public (`/public`)
- **Component**: `LokerTable.tsx` + `LayananSection.astro`
- **Content**: Job listings + layanan cards
- **Auth**: Guest (no auth required)
- **Mobile**: BottomNav hidden (guest mode)

## State Management

### Auth Store (`authReactive.ts`)
```typescript
// Uses @nanostores/persistent for auto localStorage sync
authStore = persistentAtom<AuthState>('asj_auth', DEFAULT_STATE);

// Functions
loginAsAdmin(name, token)    // → authStore.set({...})
loginAsKandidat(name, wa, token) // → authStore.set({...})
logout()                     // → authStore.set(DEFAULT_STATE)
refreshSession()             // → checks expiry, auto-logout
```

### Admin Store (`adminStore.ts`)
```typescript
// Reactive state for admin panel
inputModalOpen = atom(false)
kandidatList = atom<Kandidat[]>([])
adminSearch = atom('')
// ... etc

// Functions
openInputModal()    // → inputModalOpen.set(true)
addKandidat(k)      // → kandidatList.set([k, ...])
fetchKandidatFromAPI() // → fetches from backend
```

## Responsive Design

### Breakpoints
- `sm:` — 640px (small phones)
- `md:` — 768px (tablets)
- `lg:` — 1024px (desktop)

### Mobile (default)
- BottomNav visible (admin/kandidat mode)
- Sidebar hidden (toggle with Menu button)
- Tables scroll horizontally
- Modals full-width with max-h-[90vh]

### Desktop (`md:` and above)
- BottomNav hidden
- Sidebar visible (admin mode)
- Tables full-width
- Modals centered with max-w-lg

## API Flow

```
Component → apiClient.ts → Backend (Netlify Functions)
              ↓
         Injects HMAC token from authStore
              ↓
         Handles sessionInvalid → logout()
              ↓
         Returns JSON response
```

## Build & Deploy

```bash
# Local dev
npm run dev

# Production build
npm run build

# Preview production
npx serve dist
```

### netlify.toml Cache Strategy
- HTML: no-cache (always fresh)
- SW: no-cache (always fresh)
- Assets: immutable (1 year cache)
