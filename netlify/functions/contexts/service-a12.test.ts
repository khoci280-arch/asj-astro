// ==========================================
// TESTS: A12 parity crosscheck (2026-09-05) — Rincian Biaya builder
// (RincianBiayaModal ↔ legacy #modal-rincian-builder / js/13_rincian_builder.ts)
//
// The builder calls the config-surface preset endpoints
// getRincianPresets / saveRincianPreset / deleteRincianPreset (they existed
// on the Astro backend but were never invoked by any UI) and the job endpoints
// simpanJobBaru / editLokerFull to persist total_biaya + rincian_biaya.
// These tests pin the DB-free guard + payload validation of the preset
// endpoints so the modal can never reach a DB read with a bad session.
// ==========================================
import { describe, it, expect } from 'vitest';
import { signToken } from '../_lib/session';
import {
  handleGetRincianPresets,
  handleSaveRincianPreset,
  handleDeleteRincianPreset,
} from './configuration';

const asRec = (p: Promise<unknown>): Promise<Record<string, unknown>> =>
  p as Promise<Record<string, unknown>>;

describe('A12 — rincian preset endpoints (RincianBiayaModal): guard sebelum DB', () => {
  it('anonymous → sessionInvalid pada get/save/delete', async () => {
    const g = await asRec(handleGetRincianPresets(''));
    const s = await asRec(handleSaveRincianPreset([{ kategori: 'include', item: 'X' }], ''));
    const d = await asRec(handleDeleteRincianPreset([{ id: '1' }], ''));
    for (const r of [g, s, d]) {
      expect(r.success).toBe(false);
      expect(r.sessionInvalid).toBe(true);
    }
  });

  it('kandidat token → ditolak (config data admin-only)', async () => {
    const k = signToken({ role: 'kandidat', wa: '6281234567890', kind: 'session' });
    const g = await asRec(handleGetRincianPresets(k));
    const s = await asRec(handleSaveRincianPreset([{ kategori: 'include', item: 'X' }], k));
    expect(g.sessionInvalid).toBe(true);
    expect(s.sessionInvalid).toBe(true);
  });

  it('refresh-kind admin token → ditolak sebelum DB', async () => {
    const rt = signToken({ role: 'admin', name: 'Kepala', kind: 'refresh' });
    const g = await asRec(handleGetRincianPresets(rt));
    expect(g.success).toBe(false);
    expect(g.sessionInvalid).toBe(true);
  });

  it('admin session + save tanpa kategori/item → error validasi (bukan DB)', async () => {
    const a = signToken({ role: 'admin', name: 'Kepala', kind: 'session' });
    const r = await asRec(handleSaveRincianPreset([{ kategori: '', item: '' }], a));
    expect(r.success).toBe(false);
    expect(String(r.error || '')).toContain('Kategori dan item wajib diisi');
  });

  it('admin session + delete tanpa id → error ID (bukan DB)', async () => {
    const a = signToken({ role: 'admin', name: 'Kepala', kind: 'session' });
    const r = await asRec(handleDeleteRincianPreset([{}], a));
    expect(r.success).toBe(false);
    expect(String(r.error || '')).toContain('ID preset tidak ditemukan');
  });
});
