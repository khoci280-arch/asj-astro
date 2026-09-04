# 🔒 Security Audit Report — 2026-09-03

## Executive Summary

**Overall Security Status: GOOD** ✅

All 15 database tables have RLS enabled and are protected from anonymous access. The backend implements proper client selection (anon/user/service-role) with least-privilege access.

---

## 1. RLS (Row Level Security) Audit

### ✅ All Tables Protected

| Table | Anon Access | RLS Status | Risk Level |
|-------|-------------|------------|------------|
| database_candidate | ❌ Blocked | ✅ Enabled | LOW |
| master_database_candidate | ❌ Blocked | ✅ Enabled | LOW |
| database_asj_form | ❌ Blocked | ✅ Enabled | LOW |
| admin_credentials | ❌ Blocked | ✅ Enabled | LOW |
| sys_config | ❌ Blocked | ✅ Enabled | LOW |
| job_database | ❌ Blocked | ✅ Enabled | LOW |
| jadwal | ❌ Blocked | ✅ Enabled | LOW |
| tugas | ❌ Blocked | ✅ Enabled | LOW |
| wa_templates | ❌ Blocked | ✅ Enabled | LOW |
| fcm_tokens | ❌ Blocked | ✅ Enabled | LOW |
| pemberkasan_checklist | ❌ Blocked | ✅ Enabled | LOW |
| pendaftaran | ❌ Blocked | ✅ Enabled | LOW |
| riwayat_status | ❌ Blocked | ✅ Enabled | LOW |
| berkas_tahapan | ❌ Blocked | ✅ Enabled | LOW |
| form_upload_history | ❌ Blocked | ✅ Enabled | LOW |

### Finding
- **Anonymous users CANNOT read any table data**
- **All tables require authentication** (either user JWT or service-role)
- **No data leakage through direct table access**

---

## 2. Client Selection (Least Privilege)

### ✅ Properly Implemented

The backend uses three client types with least-privilege access:

```typescript
// netlify/functions/_lib/kernel/db.ts
anonClient()      → Public read-only (catalog, share view)
userClient(token) → Candidate-scoped reads/writes (RLS applies)
serviceClient(op) → Allow-listed operations only, logged
```

### Service-Role Allowlist

Only these operations use service-role (bypassing RLS):

| Operation | Reason |
|-----------|--------|
| registry.nextCandidateId | Needs cross-table MAX |
| documents.signUpload | Storage signing |
| configuration.migrate | Schema changes |

**All other operations use user JWT with RLS applied.**

---

## 3. IDOR (Insecure Direct Object Reference) Check

### ⚠️ Potential Risk — Admin Access

**Finding:** Service-role client can query any WA number.

**Context:** This is by design for admin operations, but creates risk if:
1. Admin endpoints don't validate requesting user's identity
2. Any endpoint allows access to other candidates' data without authorization

**Current Mitigation:**
- Admin login requires PIN + session token
- Session tokens are HMAC-signed with timing-safe comparison
- Rate limiting on login attempts

**Recommendation:**
- Add explicit authorization checks in candidate-scoped operations
- Verify `sessionToken.wa === requestedWA` for candidate operations
- Log all cross-candidate access attempts

---

## 4. Authentication Security

### ✅ Session Management

- HMAC-SHA256 with `timingSafeEqual`
- Length pre-check to prevent timing attacks
- Throws in production (no fallback to committed literal)

### ✅ Rate Limiting

- Login: 5/min/IP + 5min lockout after 10 fails
- Candidate login: 10/min/IP
- AI: 10/min/identity, 60/min/IP
- Admin CRUD: 120/min

### ⚠️ Known Issues (from CODE_REVIEW.md)

| Issue | Severity | Status |
|-------|----------|--------|
| C3: Unauthenticated PII endpoints | HIGH | NOT FIXED |
| C4: Missing auth on some endpoints | HIGH | Partially fixed (2026-09-04 pass — see below) |
| C5: IDOR on candidate data | MEDIUM | Mostly fixed (2026-09-04 pass — see below) |
| C6: Unprotected file uploads | HIGH | Fixed (2026-09-04 pass — URL allow-list, see below) |

**Post-audit pass (2026-09-04) — auth hardening on candidate-PII handlers:** the
all-registrants roster (`getDaftarSiswaBaru`) is now admin-only (a kandidat
session could previously enumerate every registrant's name/address); the
legacy/AI bridge minters (`generateLegacyMasterBridge`,
`generateAiFormBridge`) now require an admin session (they embed a
candidate's WA + nama — the public `generateFormBridge` apply prefill stays
public); the draft-CV answer (`getDrafCvMaster`) now verifies the session and
enforces owner-or-admin BEFORE the DB read (the anonymous "limited identity"
fallback — nama/tgl-lahir for any guessed WA — is removed); and smart
ingestion (`processUploadDoc`) rejects a kandidat whose document names another
WA (payload `wa` pre-download AND extracted `no_wa` post-extraction), closing
a cross-candidate master-row write. Regression tests:
`netlify/functions/contexts/service-auth.test.ts`. C3 (remaining public
endpoints) stays open.

**Post-audit pass 2 (2026-09-04) — C6 upload URL allow-listing:** every
client-supplied document URL is now validated through ONE exported gate
`_lib/storage.isAllowedDocumentUrl` (https-only + host allow-list: Supabase
storage subdomains, Cloudinary, GCS, plus the SUPABASE_URL host and env
`ALLOWED_DOCUMENT_HOSTS` for ops). It was already applied at the master-data
write path (`resolveFileUrl`); it is now enforced at every other acceptance
point: public apply (`handleSubmitApply` — photo/CV/JFT/SSW + extraFiles),
admin candidate-save (`handleSimpanKandidatDanUpload`), berkas-tahapan
(`handleSimpanBerkasTahapan`), revisi upload (`handleSimpanRevisiKandidat` —
which also gained a session-WA ownership check it was missing), smart
ingestion (`processUploadDoc` — previously only scheme-checked, so arbitrary
https hosts incl. internal networks were downloadable), and the admin ZIP
export (`download.ts` only fetches allow-listed stored URLs). Rejections fire
before any DB write/download; placeholder values ('-') still pass. Tests:
`_lib/storage.test.ts` (unit allow-list) + `contexts/service-auth.test.ts`
(DB-free handler regressions). Legacy rows on unlisted hosts are skipped by
the ZIP export like fetch failures.

---

## 5. Recommendations

### Immediate (Before Production)

1. **Fix C3** — Add authentication to the remaining public endpoints that access PII
2. **Add authorization checks** — Verify user identity matches requested data
3. **Audit RLS policies** — Ensure policies properly restrict by user identity
4. **Enable CORS restrictions** — Restrict to known domains only

### Short-term (Week 1)

1. **Add logging** — Log all cross-candidate access attempts
2. **Implement audit trail** — Track who accessed what data when
3. **Test rate limiting** — Verify it works in multi-instance Netlify

### Long-term (Month 1)

1. **Penetration testing** — Professional security audit
2. **Bug bounty program** — incentivize external security researchers
3. **SOC 2 compliance** — if handling sensitive data at scale

---

## 6. Conclusion

**The database layer is well-protected with RLS.** The main risks are in the application layer (missing auth on some endpoints). These are fixable with targeted changes to the backend handlers.

**Security Score: 7/10**

- ✅ Database: 10/10 (RLS enabled, all tables protected)
- ✅ Authentication: 8/10 (HMAC sessions, rate limiting)
- ⚠️ Authorization: 5/10 (some IDOR risks)
- ⚠️ Endpoint security: 6/10 (missing auth on some endpoints)
