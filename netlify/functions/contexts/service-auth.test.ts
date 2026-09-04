// ==========================================
// TESTS: auth endpoint hardening (2026-09-04 pass)
//
// Closes the app-layer gaps the security audit (SECURITY_AUDIT_2026-09-03.md,
// findings C4/C5 + "add authorization checks" recommendation) recorded as
// open on candidate-PII paths:
//   - registration: the all-registrants roster is admin-only (a kandidat must
//     not enumerate other candidates' PII); legacy/ai bridge minting (embeds
//     WA + nama) is admin-only; the PUBLIC apply bridge stays public.
//   - master-data: the draft-CV answer requires a verified session and
//     owner-or-admin scope — the anonymous "limited identity" branch is gone.
//   - ingestion: a kandidat may only process documents that resolve to their
//     OWN WA (the parsed no_wa upserts into master_database_candidate).
// Every rejection below happens BEFORE any DB/network call, so the suite runs
// without env.
//
// The C6 upload-URL allow-list regressions live in
// contexts/service-upload-url.test.ts.
// ==========================================
import { describe, it, expect } from 'vitest';
import { signToken } from '../_lib/session';
import {
  handleGetDaftarSiswaBaru,
  handleGenerateFormBridge,
  handleGenerateLegacyMasterBridge,
  handleGenerateAiFormBridge,
} from './registration/service';
import { handleGetDrafCvMaster } from './master-data/service';
import { handleProcessUploadDoc } from './ingestion/service';

const admin = signToken({ role: 'admin', name: 'AGUS' });
const kandidatA = signToken({ role: 'kandidat', wa: '6281111111111' });

// Handler results are legacy unions of success/error shapes — tests read a
// few fields off them, so treat the answers as records.
const asRecord = (p: Promise<unknown>): Promise<Record<string, any>> => p as Promise<Record<string, any>>;

describe('registration — daftar siswa baru roster is admin-only', () => {
  it('anonymous and kandidat sessions are rejected (cross-candidate PII)', async () => {
    const anon = await asRecord(handleGetDaftarSiswaBaru([]));
    expect(anon.sessionInvalid).toBe(true);
    const kand = await asRecord(handleGetDaftarSiswaBaru([], kandidatA));
    expect(kand.sessionInvalid).toBe(true);
    expect(kand.data).toBeUndefined();
  });
  // (Admin acceptance of requireRole/verifyToken is covered DB-free by the
  // bridge tests below and by contexts/identity/service.test.ts — asserting
  // the admin roster path here would hit the real DB via the repository.)
});

describe('registration — bridge minting', () => {
  it('generateFormBridge stays public (job-apply prefill from the public page)', async () => {
    const res = await asRecord(handleGenerateFormBridge(['ENG-01', 'IT', '', '', '']));
    expect(res.formUrl).toContain('/apply-full.html?job=ENG-01');
  });

  it('legacy + AI bridges reject anonymous and kandidat callers (embed WA + nama)', async () => {
    const legacyAnon = await asRecord(handleGenerateLegacyMasterBridge(['6289999999999', 'BUDI']));
    expect(legacyAnon.sessionInvalid).toBe(true);
    expect(legacyAnon.formUrl).toBeUndefined();
    const legacyKand = await asRecord(handleGenerateLegacyMasterBridge(['6289999999999', 'BUDI'], kandidatA));
    expect(legacyKand.sessionInvalid).toBe(true);
    const aiAnon = await asRecord(handleGenerateAiFormBridge(['cv', 'JOB', 'IT', '6289999999999', 'BUDI']));
    expect(aiAnon.sessionInvalid).toBe(true);
    expect(aiAnon.formUrl).toBeUndefined();
  });

  it('an admin session may mint both bridges', async () => {
    const legacy = await asRecord(handleGenerateLegacyMasterBridge(['6289999999999', 'BUDI'], admin));
    expect(legacy.formUrl).toContain('/master-full.html?wa=6289999999999');
    expect(legacy.formUrl).toContain('nama=BUDI');
    const ai = await asRecord(handleGenerateAiFormBridge(['cv', 'JOB', 'IT', '6289999999999', 'BUDI'], admin));
    expect(ai.formUrl).toContain('/ai_form.html?flow=cv');
    expect(ai.formUrl).toContain('wa=6289999999999');
  });
});

describe('master-data — draft CV requires session + owner-or-admin', () => {
  it('anonymous callers are rejected before any DB access (no limited-PII fallback)', async () => {
    const res = await asRecord(handleGetDrafCvMaster(['6289999999999']));
    expect(res.sessionInvalid).toBe(true);
  });

  it('a kandidat may not read another WA’s draft', async () => {
    const res = await asRecord(handleGetDrafCvMaster(['6289999999999'], kandidatA));
    expect(res.sessionInvalid).toBeUndefined();
    expect(res.error).toContain('Akses ditolak');
    expect(res.identitas).toBeUndefined();
  });
  // (Admin acceptance is covered DB-free by the bridge tests and by
  // contexts/identity/service.test.ts — the admin path would hit the real DB.)
});

describe('ingestion — kandidat may only ingest their own WA', () => {
  it('payload naming another WA is rejected before download/extraction', async () => {
    const res = await asRecord(
      handleProcessUploadDoc(
        [{ fileUrl: 'https://example.com/cv.pdf', fileType: 'pdf', wa: '6289999999999' }],
        kandidatA,
      ),
    );
    expect(res.success).toBe(false);
    expect(String(res.error)).toContain('Akses ditolak');
  });

  it('anonymous callers are rejected', async () => {
    const res = await asRecord(handleProcessUploadDoc([{ fileUrl: 'https://example.com/cv.pdf', fileType: 'pdf' }]));
    expect(res.sessionInvalid).toBe(true);
  });
});
