// ==========================================
// TESTS: A11 parity crosscheck (2026-09-05) — Admin AI Copilot (AdminAiCopilot)
//
// Legacy ground truth (khoci921): partials/modals-shared.html #modal-admin-ai
// + js/ai_copilot/{admin,parse,results}.ts → callAPI actions
// processAdminAIChat / parseDokumenBiodata / generateWawancaraModel /
// getHasilWawancara / submitMasterForm.
//
// A11 root bugs:
//  1. The chat modal collected messages into state but never rendered them.
//  2. Every action used a raw fetch without a session token, so the surface
//     guard always answered sessionInvalid.
//  3. parseDokumenBiodata was routed by surfaces/ingest.ts to an 'ingest.parse'
//     background job whose sweep-queue worker was NOT_IMPL — the real sync
//     handler in _lib/ai/classify.ts (guard → Gemini → { wa, data,
//     fieldCount, fileName, namaSekarang, riwayat }) was orphaned. The parse
//     step silently never ran.
//  4. Legacy parse is two-step (parse → submitMasterForm); the Astro modal
//     only called the first step and discarded the extracted data.
//
// These tests pin the DB-free contract of the restored routing: the ingest
// surface now calls the real sync handler (no {status:'accepted'} enqueue
// response), and its admin guard rejects anon/wrong-role/refresh tokens
// before any DB/network read.
// ==========================================
import { describe, it, expect } from 'vitest';
import { signToken } from '../_lib/session';
import { INGEST_ACTIONS } from '../surfaces/ingest';

const asRec = (p: Promise<unknown>): Promise<Record<string, unknown>> =>
  p as Promise<Record<string, unknown>>;

const FILE_PAYLOAD = [
  {
    file: {
      name: 'cv.pdf',
      mimeType: 'application/pdf',
      data: 'aGVsbG8=',
    },
  },
];

describe('A11 — parseDokumenBiodata (Admin AI copilot upload): real handler via surface', () => {
  it('surface exposes parseDokumenBiodata as a function (no job/enqueue shape)', () => {
    expect(typeof INGEST_ACTIONS.parseDokumenBiodata).toBe('function');
  });

  it('anonymous → sessionInvalid before DB (raw fetch without token always hit this)', async () => {
    const r = await asRec(INGEST_ACTIONS.parseDokumenBiodata(FILE_PAYLOAD, ''));
    expect(r.success).toBe(false);
    expect(r.sessionInvalid).toBe(true);
  });

  it('kandidat session token → ditolak (admin-only feature)', async () => {
    const k = signToken({ role: 'kandidat', wa: '6281234567890', kind: 'session' });
    const r = await asRec(INGEST_ACTIONS.parseDokumenBiodata(FILE_PAYLOAD, k));
    expect(r.success).toBe(false);
    expect(r.sessionInvalid).toBe(true);
  });

  it('refresh-kind admin token → ditolak sebelum DB', async () => {
    const rt = signToken({ role: 'admin', name: 'Kepala', kind: 'refresh' });
    const r = await asRec(INGEST_ACTIONS.parseDokumenBiodata(FILE_PAYLOAD, rt));
    expect(r.success).toBe(false);
    expect(r.sessionInvalid).toBe(true);
  });

  it('admin session → guard lolos, validasi file dijalankan (sync, bukan 202/jobId)', async () => {
    const adminTok = signToken({ role: 'admin', name: 'Kepala', kind: 'session' });
    // No file at all: handler responds synchronously with its file validation
    // error — NOT an {status:'accepted', jobId} enqueue response.
    const r = await asRec(INGEST_ACTIONS.parseDokumenBiodata([{}], adminTok));
    expect(r.status).toBeUndefined();
    expect(r.success).toBe(false);
    expect(String(r.error || '')).toContain('File belum dipilih');
  });

  it('admin session + format tidak didukung → error format (parity mime guard)', async () => {
    const adminTok = signToken({ role: 'admin', name: 'Kepala', kind: 'session' });
    const r = await asRec(
      INGEST_ACTIONS.parseDokumenBiodata(
        [{ file: { name: 'cv.xyz', mimeType: 'application/x-foo', data: 'aGVsbG8=' } }],
        adminTok,
      ),
    );
    expect(r.success).toBe(false);
    expect(String(r.error || '')).toContain('Format tidak didukung');
  });
});
