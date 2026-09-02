# 📋 TODO List — ASJ Portal v2 (Astro)

**Last updated:** 2026-09-03
**Progress:** ~80% feature complete, ~60% production ready

---

## 🔴 CRITICAL — Harus Selesai Sebelum Produksi

### Security
- [ ] Audit Supabase RLS policies — pastikan semua tabel punya policy yang benar
- [ ] Fix IDOR vulnerabilities (CODE_REVIEW C3-C6) — endpoint tanpa auth bisa akses PII
- [ ] Rotate SESSION_SECRET jika sudah dipakai di produksi
- [ ] Rate limiting test — pasti fungsi di Netlify multi-instance
- [ ] CORS headers check — pastikan hanya domain yang diizinkan

### Error Handling
- [ ] Tambah global error boundary di semua halaman
- [ ] Tambah error toast/notification untuk semua API calls yang gagal
- [ ] Handle Supabase connection timeout gracefully
- [ ] Add loading skeletons untuk semua halaman yang load data

### Environment
- [ ] Pastikan `.env.local` ada di Netlify dashboard (bukan di git!)
- [ ] Test cold start Netlify functions (< 3s target)
- [ ] Set NODE_ENV=production di Netlify

---

## 🟡 HIGH — Fitur Penting untuk Operasional

### Notifications
- [ ] Email notifications ke kandidat (apply, status update, reject)
- [ ] WhatsApp notification ke admin saat ada lamaran baru
- [ ] Schedule reminders (TabJadwal belum fungsional)

### Data Management
- [ ] Export Excel (bukan hanya CSV) untuk laporan
- [ ] Document preview di modal (PDF, images) — sekarang hanya download
- [ ] Bulk operations (select multiple → delete/change status)

### Admin Workflow
- [ ] TabJadwal — implementasi jadwal + reminder
- [ ] TabMail — implementasi inbox dengan status tracking
- [ ] TabConfig — lengkapi settings (Fonnte token, AI model, dll)

---

## 🟢 MEDIUM — Fitur yang Memperkaya UX

### Candidate Experience
- [ ] Real-time updates (Supabase realtime) — status berubah langsung update
- [ ] Push notifications untuk kandidat (status lamaran berubah)
- [ ] Candidate can upload documents directly from dashboard

### Admin Efficiency
- [ ] AI Interview simulator (legacy punya, Astro belum)
- [ ] Reject mail composer (legacy punya, Astro belum)
- [ ] Migration Drive modal (legacy punya, Astro belum)
- [ ] Batch WhatsApp blast dengan progress indicator

### UI/UX
- [ ] Dark mode toggle persistence (sudah ada, tapi belum test full)
- [ ] Mobile responsive audit — cek semua halaman di HP
- [ ] Accessibility audit (WCAG 2.1)

---

## 🔵 LOW — Nice-to-Have

### PWA
- [ ] Lengkapi PWA manifest (icon, theme color, dll)
- [ ] Test offline mode — apa yang bisa diakses tanpa internet?
- [ ] Background sync untuk pending operations

### Analytics
- [ ] PostHog events untuk user behavior tracking
- [ ] Dashboard analytics untuk admin (how many views, applies, etc)
- [ ] Error tracking (Sentry/LogRocket)

### Performance
- [ ] Image optimization (Cloudinary transforms)
- [ ] Bundle analysis — kurangi size JS
- [ ] Lighthouse audit — target 90+ score

---

## ✅ DONE (Recent Sessions)

### Architecture Implementation (Previously Completed)
- [x] Backend architecture — 15 surfaces, 14 contexts, 13 kernel files
- [x] DB timeout + circuit breaker (Phase 1)
- [x] Rate limiter (Postgres-backed)
- [x] Retry + jitter + bulkhead
- [x] Structured logging infrastructure
- [x] Frontend architecture — 9 pages, 12 modals

### 2026-09-03 Session
- [x] Fix getPath() deep traversal bug — [object Object] di CV
- [x] Wire modal triggers — PemberkasanModal, UndanganKelasModal
- [x] Add 80+ i18n translations untuk semua modal
- [x] Fix bottom nav tab switching (hashchange listener)
- [x] Rebuild EditCandidateModal (BB, catatan, VIP, upload)
- [x] Create ListKandidatModal (per-job candidate management)
- [x] Update all documentation (README + 22 docs)
- [x] Clean up .bak files dan debug artifacts

### 2026-09-02 Session
- [x] Fix admin login (missing env import)
- [x] Fix data loading pipeline (real Supabase DB)
- [x] Fix catatan save (dual API contract + service role)
- [x] Create MatchmakingModal (AI Headhunter)
- [x] Create UndanganKelasModal (WhatsApp group invite)
- [x] Create PemberkasanModal (document checklist)

---

## 📊 Stats

| Metric | Value |
|--------|-------|
| Pages | 9/9 ✅ |
| Admin Modals | 12/12 ✅ |
| Backend Surfaces | 15/15 ✅ |
| Backend Contexts | 14/14 ✅ |
| Kernel Files | 13/13 ✅ |
| Tests | 235/235 ✅ |
| Build Time | 3s ✅ |
| TypeScript Errors | 0 ✅ |
| Architecture | ✅ Fully implemented |
| Known Bugs | 5 (all low/medium) |
| Missing Features | ~15 (see above) |

---

## 🎯 Recommended Next Steps

### Week 1: Security + Production Readiness
1. Audit RLS policies (security blocking issue)
2. Add error boundaries (UX polish)
3. Test cold start performance
4. Fix known bugs
5. Verify env vars in Netlify production

### Week 2: Core Features
1. Email notifications
2. Schedule reminders
3. Document preview

### Week 3: Polish
1. Export Excel
2. Mobile responsive audit
3. Loading states

### Week 4: Production Deploy
1. Security audit final
2. Performance optimization
3. Deploy to production
4. Monitor for 1 week
