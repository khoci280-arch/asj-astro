// ==========================================
// TESTS: A09 parity crosscheck (2026-09-05) — CV Mini (CvMiniModal)
//
// Legacy ground truth (khoci921): partials/modals-shared.html #modal-cv-mini
// + js/03_candidate.ts bukaModalCvMini()/prosesSimpanCvMini() → action
// simpanUpdateMaster, which legacy routes to the SAME handler as
// submitMasterForm (actions-master.ts handleSimpanUpdateMaster =
// handleSubmitMasterForm). Astro maps it identically (contexts/master-data
// index.ts alias). The handler was already contract-faithful, so the A09 root
// bugs lived client-side (no session token sent / no prefill / free-text
// pendidikan / photo key `photo` dropped — MASTER_FILE_COLUMNS wants
// `photoFile` → pas_photo). These tests pin the DB-free guard of the endpoint
// the modal calls, before any DB/network read, same pattern as service-a08.
// ==========================================
import { describe, it, expect } from 'vitest';
import { signToken } from '../_lib/session';
import { handleSimpanUpdateMaster, handleSubmitMasterForm } from './master-data';

const CV_MINI_PAYLOAD = [{
  wa: '6281234567890',
  nama: 'KANDIDAT A',
  gender: 'LAKI-LAKI',
  usia: '22',
  tb: '170',
  bb: '60',
  pendidikan: 'SMA',
  jft_text: 'A2',
  ssw_text: 'Perawat',
}];
const asRec = (p: Promise<unknown>): Promise<Record<string, unknown>> => p as Promise<Record<string, unknown>>;

describe('A09 — simpanUpdateMaster (alias submitMasterForm): guard sebelum DB', () => {
  it('alias simpanUpdateMaster === handleSubmitMasterForm (kontrak legacy)', () => {
    expect(handleSimpanUpdateMaster).toBe(handleSubmitMasterForm);
  });

  it('anonymous → sessionInvalid (raw fetch CV-mini dulu selalu kena ini)', async () => {
    const r = await asRec(handleSubmitMasterForm(CV_MINI_PAYLOAD, ''));
    expect(r.sessionInvalid).toBe(true);
    expect(r.success).toBe(false);
  });

  it('refresh-kind token ditolak sebelum DB (guard isOwnerOrAdmin menolak kind refresh)', async () => {
    const rt = signToken({ role: 'kandidat', wa: '6281234567890', kind: 'refresh' });
    const r = await asRec(handleSubmitMasterForm(CV_MINI_PAYLOAD, rt));
    expect(r.success).toBe(false);
    expect(String(r.error || '')).toContain('Akses ditolak');
  });

  it('kandidat lain (IDOR) → Akses ditolak sebelum DB', async () => {
    const otherTok = signToken({ role: 'kandidat', wa: '6289999999999', kind: 'session' });
    const r = await asRec(handleSubmitMasterForm(CV_MINI_PAYLOAD, otherTok));
    expect(r.sessionInvalid).toBeUndefined();
    expect(r.success).toBe(false);
    expect(String(r.error || '')).toContain('Akses ditolak');
  });

  it('WA kosong → ditolak dengan pesan WA wajib', async () => {
    const ownTok = signToken({ role: 'kandidat', wa: '6281234567890', kind: 'session' });
    const r = await asRec(handleSubmitMasterForm([{ ...CV_MINI_PAYLOAD[0], wa: '' }], ownTok));
    expect(r.success).toBe(false);
    expect(String(r.message || '')).toContain('WA wajib');
  });
});
