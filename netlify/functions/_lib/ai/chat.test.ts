// ==========================================
// TESTS: ai/chat — normalizeBidang (pemilihan model wawancara per bidang SSW).
// Resolve bidang dari teks bebas (master/kandidat) ke BIDANG_INTERVIEW —
// salah map = kandidat dapat model wawancara bidang yang salah.
// ==========================================
import { describe, it, expect } from 'vitest';
import { normalizeBidang } from './chat';

// Known-word assertions: tests prove non-null by asserting it once (helper),
// mirroring how the callers treat matched bidang (BIDANG_DEFAULT fallback).
function must(raw: string): NonNullable<ReturnType<typeof normalizeBidang>> {
  const b = normalizeBidang(raw);
  expect(b).not.toBeNull();
  return b!;
}


describe('normalizeBidang — pilih model wawancara per bidang SSW', () => {
  it('7 bidang resmi dikenali (case-insensitive)', () => {
    expect(must('Kaigo').label).toBe('Kaigo (介護)');
    expect(must('KAIGO').label).toBe('Kaigo (介護)');
    expect(must('Shokuhin Seizou').label).toBe('Shokuhin Seizou (食品製造)');
    expect(must('Nougyou').label).toBe('Nougyou (農業)');
    expect(must('Kensetsu').label).toBe('Kensetsu (建設)');
    expect(must('Jidousha Seibi').label).toBe('Jidousha Seibi (自動車整備)');
    expect(must('Binbou').label).toBe('Binbou (ビルクリーニング)');
    expect(must('Sougou Service').label).toBe('Sougou Service (総合サービス)');
  });

  it('sinonim bahasa Indonesia/Inggris ikut terdeteksi', () => {
    expect(must('perawat lansia').label).toBe('Kaigo (介護)');
    expect(must('caregiver').label).toBe('Kaigo (介護)');
    expect(must('food manufacturing').label).toBe('Shokuhin Seizou (食品製造)');
    expect(must('pertanian').label).toBe('Nougyou (農業)');
    expect(must('konstruksi').label).toBe('Kensetsu (建設)');
    expect(must('otomotif').label).toBe('Jidousha Seibi (自動車整備)');
    expect(must('cleaning').label).toBe('Binbou (ビルクリーニング)');
    expect(must('hotel').label).toBe('Sougou Service (総合サービス)');
  });

  it('bidang tidak dikenal → null (caller pakai BIDANG_DEFAULT)', () => {
    expect(normalizeBidang('IT Programmer')).toBe(null);
    expect(normalizeBidang('')).toBe(null);
    expect(normalizeBidang(undefined)).toBe(null);
  });
});
