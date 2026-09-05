// ==========================================
// TESTS: shareDocs (B06 parity, 2026-09-05)
//
// Legacy ground truth: js/pages/share.ts renderGrid EXTRA_TYPE_ALIAS /
// EXTRA_TYPE_TOKENS / docTypeOf / extra-button label logic — the share viewer
// shows one button per extra folder doc, deduped by type, with legacy labels.
// ==========================================
import { describe, it, expect } from 'vitest';
import { shareDocTypeOf, shareExtraDocLabel } from './shareDocs';

describe('shareDocTypeOf (legacy front-end parity)', () => {
  it('prefix tokens with timestamp → main/alias types', () => {
    expect(shareDocTypeOf('KK_1786683312223.pdf')).toBe('KK');
    expect(shareDocTypeOf('KTP_1786700397069.pdf')).toBe('KTP');
    expect(shareDocTypeOf('CVFILE_1786683307401.xlsx')).toBe('CV');
    expect(shareDocTypeOf('PHOTOFILE_1786676876946.jpg')).toBe('FOTO');
    expect(shareDocTypeOf('KARTU_KELUARGA_1.pdf')).toBe('KK');
  });

  it('legacy "1. NAME_CV.xlsx" naming → CV', () => {
    expect(shareDocTypeOf('1. MUHAMAD SATORI_CV.xlsx')).toBe('CV');
    expect(shareDocTypeOf('1._SUNARTO_CV.xlsx')).toBe('CV');
  });

  it('JFT / SSW / PAS_PHOTO suffixes and nama_* names', () => {
    expect(shareDocTypeOf('1._X_JFT.pdf')).toBe('JFT');
    expect(shareDocTypeOf('1._X_SSW.pdf')).toBe('SSW');
    expect(shareDocTypeOf('1._X_PAS_PHOTO.jpg')).toBe('FOTO');
    expect(shareDocTypeOf('nama_jft.pdf')).toBe('JFT');
    expect(shareDocTypeOf('nama_ssw.pdf')).toBe('SSW');
    expect(shareDocTypeOf('PASSPORT_1786506019053.pdf')).toBe('PASSPORT');
    expect(shareDocTypeOf('IJAZAH_SD_1786544972324.png')).toBe('IJAZAH');
  });
});

describe('shareExtraDocLabel (legacy renderGrid label)', () => {
  it('keeps the raw type for standard files', () => {
    expect(shareExtraDocLabel('KTP_1786700397069.pdf')).toBe('KTP');
    expect(shareExtraDocLabel('IJAZAH_SMA_1.pdf')).toBe('IJAZAH');
  });

  it('NAMA_<loker>CV → "CV <loker>"', () => {
    expect(shareExtraDocLabel('NAMA_TG583ASJCV.pdf')).toBe('CV TG583ASJ');
  });

  it('caps the label at 16 chars', () => {
    expect(shareExtraDocLabel('SUPERLONG_LABEL_AB.pdf').length).toBeLessThanOrEqual(16);
  });
});
