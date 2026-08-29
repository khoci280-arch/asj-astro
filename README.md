# ASJ Portal v2

**Astro + Preact + Supabase** — Portal rekrutmen kerja ke Jepang

## 🔗 Links

| Resource | URL |
|----------|-----|
| **GitHub** | https://github.com/khoci280-arch/asj-astro |
| **Live Site** | https://incredible-starship-054a78.netlify.app |
| **Supabase** | https://supabase.com/dashboard/project/bimqyugdhiuxcqltjjnt |
| **Netlify** | https://app.netlify.com/projects/incredible-starship-054a78 |

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5.x (SSG) |
| UI | Preact + `client:load` islands |
| State | Nanostores + persistent |
| Auth | Supabase Auth (phone + password) |
| Validation | Zod schemas |
| CSS | Tailwind CSS v4 |
| PWA | Service Worker + manifest |
| Deploy | Netlify (zip upload or GitHub auto-deploy) |

## 📦 Quick Start

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Edit .env with your Supabase credentials

# Development
npm run dev

# Production build
npm run build

# Preview production
npx serve dist
```

## 🌐 Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `PUBLIC_SUPABASE_URL` | Client | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anonymous key |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service role key (admin) |

## 🚢 Deployment

### Option A: Manual Deploy (current)
```bash
npm run build
# Zip the dist folder
powershell -Command "Compress-Archive -Path 'dist\*' -DestinationPath 'deploy.zip'"
# Upload to Netlify via API
curl -X POST "https://api.netlify.com/api/v1/sites/SITE_ID/deploys" \
  -H "Authorization: Bearer NETLIFY_TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary @deploy.zip
```

### Option B: GitHub Auto-Deploy (recommended)
1. Go to Netlify Dashboard → Site → Build & deploy
2. Click "Link site to Git" → Select GitHub
3. Choose `khoci280-arch/asj-astro`
4. Set environment variables in Netlify Dashboard
5. Every push to `main` triggers a build

## 📁 Project Structure

```
src/
├── components/          # Preact islands
│   ├── App.tsx          # Root (Header + LoginModal + Toast)
│   ├── LoginModal.tsx   # Auth forms (Supabase)
│   ├── admin/           # Admin panel (8 tabs)
│   ├── candidate/       # Candidate dashboard
│   ├── forms/           # Form wizards (Apply, AI CV, etc.)
│   └── public/          # Public loker + layanan
├── store/               # Nanostores
│   ├── authReactive.ts  # Persistent auth state
│   ├── userStore.ts     # Supabase auth integration
│   └── adminStore.ts    # Admin reactive state
├── lib/                 # Utilities
│   ├── supabase.ts      # Supabase client singleton
│   ├── apiClient.ts     # API wrapper with auth
│   └── schemas.ts       # Zod validation
├── pages/               # Astro pages (9 routes)
├── layouts/             # BaseLayout.astro
└── styles/              # global.css (Tailwind)
```

## 🧪 Testing

```bash
# Unit tests (30 tests)
npx vitest run

# E2E tests (Supabase integration)
BASE_URL=http://localhost:4323 node e2e/test-supabase-auth.mjs
BASE_URL=http://localhost:4323 node e2e/test-admin.mjs
BASE_URL=http://localhost:4323 node e2e/test-public.mjs
```

## 📝 Changelog

See `CHANGELOG2.md` for commit history.

## 📄 License

Private — PT Amanah Sakura Japan
