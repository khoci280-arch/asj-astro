// ==========================================
// TESTS: B06 parity (2026-09-05) — per-job share token gate
//
// Legacy ground truth: js/pages/share.ts fetched '/api/share-data?job=CODE'
// with NO token — anyone who guessed/enumerated a job code could read a whole
// job's candidate dossiers. Per LEGACY_PARITY_REFERENCE §5 P1 (and the B06
// checklist row) the viewer is now gated: updateDokumenShare /
// getShareTokenForJob mint a STABLE per-job token (sys_config), and
// handleShareData rejects bare ?job= or wrong-token requests.
//
// DB-free: service.ts's repository import is mocked; only the gate decision
// + delegation shape are exercised.
// ==========================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  findJob: vi.fn(),
  findCand: vi.fn(),
  getTok: vi.fn(),
  findJobsAll: vi.fn(),
}));

vi.mock('../../_lib/db/shareTokens', () => ({
  getShareTokenForJob: m.getTok,
  ensureShareTokenForJob: vi.fn(async () => 'minted'),
}));

vi.mock('./repository', () => ({
  hasBackend: () => true,
  demo: {},
  normalizeWa: (s: unknown) => String(s || ''),
  pick: (_row: any, keys: string[]) => {
    for (const k of keys) if (_row?.[k] !== undefined && _row[k] !== null) return _row[k];
    return undefined;
  },
  toText: (v: unknown) => (v === undefined || v === null ? '' : String(v)),
  mapCandidate: (r: unknown) => r,
  stripRaw: (x: unknown) => x,
  loadCandidatesUnik: async () => ({ rows: [] }),
  loadSchedules: async () => [],
  loadTugas: async () => [],
  loadWaTemplates: async () => [],
  loadPublicBase: async () => ({ jobs: [], dropdowns: {}, assets: null, pengumuman: '', notFound: false }),
  findFormsByWaList: async () => [],
  findFormsByWa: async () => [],
  findFormsLight: async () => [],
  findForms: async () => [],
  parseDocs: () => [],
  findCandidateByWaFiltered: async () => null,
  findCandidates: async () => ({ rows: [] }),
  attachApplications: async (rows: unknown) => rows,
  attachBerkasBio: async (rows: unknown) => rows,
  findJobByCodeFiltered: m.findJob,
  findCandidatesByJobFiltered: m.findCand,
  findJobs: m.findJobsAll,
  listStorageFolder: async () => [],
  BERKAS_COLUMNS: [],
  supabaseJson: async () => [],
  docTypeOf: (n: string) => String(n || '').replace(/\.[a-z0-9]+$/i, '').toUpperCase(),
  docAge: () => 0,
  mapForm: (r: unknown) => r,
  supabaseUrl: () => 'https://x.supabase.co',
}));

import { handleShareData } from './service';

const JOB_ROW = { code_job: 'TG658', pekerjaan: 'Perawat Jepang', dokumen_share: 'CV,JFT,SSW' };

describe('B06 — handleShareData per-job token gate', () => {
  beforeEach(() => {
    m.findJob.mockReset();
    m.findCand.mockReset();
    m.getTok.mockReset();
    m.findJobsAll.mockReset();
    m.findJob.mockResolvedValue(JOB_ROW);
    m.findCand.mockResolvedValue([]);
    m.findJobsAll.mockResolvedValue({ rows: [] });
  });

  it('rejects when the job has NO minted token (share never enabled)', async () => {
    m.getTok.mockResolvedValue(null);
    const out = await handleShareData('TG658', 'anything');
    expect(out.error).toContain('belum diaktifkan');
    expect(m.findCand).not.toHaveBeenCalled();
  });

  it('rejects a bare ?job= link (no token) even when a token exists', async () => {
    m.getTok.mockResolvedValue('tok-abc');
    const out = await handleShareData('TG658');
    expect(out.error).toContain('tidak valid');
    expect(m.findCand).not.toHaveBeenCalled();
  });

  it('rejects a wrong token', async () => {
    m.getTok.mockResolvedValue('tok-abc');
    const out = await handleShareData('TG658', 'tok-wrong');
    expect(out.error).toContain('tidak valid');
    expect(m.findCand).not.toHaveBeenCalled();
  });

  it('serves job + candidates only for the correct token (stable)', async () => {
    m.getTok.mockResolvedValue('tok-abc');
    const out = (await handleShareData('TG658', 'tok-abc')) as {
      error?: string; job?: { code?: string; name?: string }; candidates?: unknown[];
    };
    expect(out.error).toBeUndefined();
    expect(out.job?.code).toBe('TG658');
    expect(out.job?.name).toBe('Perawat Jepang');
    expect(Array.isArray(out.candidates)).toBe(true);
  });

  it('unknown job code still errors before the token check', async () => {
    m.findJob.mockResolvedValue(undefined);
    m.findJobsAll.mockResolvedValue({ rows: [] });
    const out = await handleShareData('TG999', 'tok-abc');
    expect(out.error).toContain('Kode job tidak ditemukan');
  });
});
