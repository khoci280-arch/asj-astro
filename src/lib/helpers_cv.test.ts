// ==========================================
// TESTS: helpers_cv — rirekisho date/format + riwayat merge (A10 parity)
//
// The CV preview (legacy renderCVAjaib / Astro RirekishoBuilder) formats all
// Japanese dates through these pure helpers. These tests pin the legacy
// formatting contract: tahun saja → `YYYY年`; tahun-bulan (YYYY-MM / YYYY/M)
// → `YYYY年M月`; tanggal lahir → `YYYY年MM月DD日` (built in the component);
// array master + AI digabung union + dedupe; semua nilai di-escape HTML.
// ==========================================
import { describe, it, expect } from 'vitest';
import { getPath, isGood, makeV, fmtMonthYearJp, mergeArrRiwayat, esc } from './helpers_cv';

describe('fmtMonthYearJp — format tahun/bulan gaya Jepang (rirekisho)', () => {
  it('hanya tahun → YYYY年', () => {
    expect(fmtMonthYearJp('2024')).toBe('2024年');
  });

  it('tahun-bulan (YYYY-MM, YYYY/M, YYYY-M) → YYYY年M月', () => {
    expect(fmtMonthYearJp('2018-02')).toBe('2018年2月');
    expect(fmtMonthYearJp('2018/2')).toBe('2018年2月');
    expect(fmtMonthYearJp('2020-12-01')).toBe('2020年12月');
  });

  it('kosong / "-" / tidak dikenal → "" / teks asli', () => {
    expect(fmtMonthYearJp('')).toBe('');
    expect(fmtMonthYearJp('-')).toBe('');
    expect(fmtMonthYearJp('sekarang')).toBe('sekarang');
  });
});

describe('mergeArrRiwayat — gabung master + AI dengan dedupe (A10)', () => {
  const keyOf = (e: Record<string, unknown>) => String(e.nama || '');
  it('union dua sumber, duplikat dibuang', () => {
    const out = mergeArrRiwayat(
      [{ nama: 'A', usia: '10' }, { nama: 'B' }],
      [{ nama: 'B' }, { nama: 'C' }],
      keyOf,
    );
    expect(out.map((e) => e.nama)).toEqual(['A', 'B', 'C']);
  });

  it('menerima string JSON / null / bukan array', () => {
    expect(mergeArrRiwayat('[{"nama":"X"}]', null, keyOf).map((e) => e.nama)).toEqual(['X']);
    expect(mergeArrRiwayat(null, '{}', keyOf)).toEqual([]);
  });
});

describe('esc — escape HTML semua nilai kandidat sebelum masuk template A4', () => {
  it('& < > " \' di-escape', () => {
    expect(esc(`<b onclick="x">A&B'`)).toBe('&lt;b onclick=&quot;x&quot;&gt;A&amp;B&#39;');
  });
});

describe('getPath/makeV — pencarian nilai nested + fallback flat legacy', () => {
  const d = { identitas: { nama_lengkap: 'KANDIDAT A', tgl_lahir: '1995-08-14' }, WA: '6281' };
  it('getPath menembus titik', () => {
    expect(getPath(d, 'identitas.nama_lengkap')).toBe('KANDIDAT A');
  });
  it('makeV: key bertitik → nested; key flat → property langsung', () => {
    const v = makeV(d, {});
    expect(v('identitas.nama_lengkap')).toBe('KANDIDAT A');
    expect(v('identitas.tgl_lahir')).toBe('1995-08-14');
  });
  it('isGood menolak kosong / "-"', () => {
    expect(isGood('')).toBe(false);
    expect(isGood('-')).toBe(false);
    expect(isGood('A')).toBe(true);
  });
});
