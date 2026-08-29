# index.astro + admin.astro + public.astro - Deep Analysis

> Halaman utama yang memakai App.tsx (header + nav + login).

## 1. Component Tree

```
index.astro / public.astro:
  BaseLayout.astro -> App.tsx + LokerTable.tsx + LayananSection.astro + Toast + Footer

admin.astro:
  BaseLayout.astro -> App.tsx + AdminPanel.tsx (8 tabs) + Toast + Footer
  TabKelola, TabDbJob, TabTambah, TabPelamar, TabJadwal, TabMail, TabWA, TabConfig
```

## 2. State: Nanostores (authReactive, i18n, adminStore, userStore)

## 3. Backend: get-app-data, bridge-links (50+ actions), candidates, jobs, config, whatsapp, schedule-reminders, ai-chat

## 4. i18n: 600+ keys (ui.*, admin.*, form.mf_*, apply.*, siswa.*, login.*, toast.*, share.*, public.*)
