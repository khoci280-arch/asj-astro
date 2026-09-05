// ==========================================
// TESTS: B01 parity crosscheck (2026-09-05) — Login kandidat/admin
//
// Legacy ground truth: js/04_auth.ts prosesLoginKandidat / prosesLoginMaster /
// prosesLoginPersonal + shared/wa-rules.ts.
//
// B01 root bugs (client side, pinned server contract here):
//  1. LoginModal mengirim [pin, token-klien] (pola legacy) padahal kernel
//     z.tuple ARITY EKSAK → checkAdminMaster/checkAdminPersonal selalu gagal
//     validasi → login admin MATI. Kontrak yang benar: [pin] / [name, pin].
//  2. Klien tidak menormalisasi WA; regex klien rusak (/^8d{10,12}$/).
//     Kontrak surface: login/daftar menerima input mentah (08xx/8xx) dan
//     menormalkan ke kanonik sebelum identity dipanggil.
// ==========================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AUTH_ACTIONS } from '../surfaces/auth';

const { identityMock } = vi.hoisted(() => ({
  identityMock: {
    checkAdminMaster: vi.fn(),
    checkAdminPersonal: vi.fn(),
    loginKandidat: vi.fn(),
    registerKandidat: vi.fn(),
  },
}));

vi.mock('../contexts/identity', () => identityMock);

const asRec = (p: Promise<unknown>): Promise<Record<string, unknown>> =>
  p as Promise<Record<string, unknown>>;

describe('B01 — auth surface contract (arity eksak + normalisasi WA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identityMock.checkAdminMaster.mockResolvedValue({ success: true, token: 't' });
    identityMock.checkAdminPersonal.mockResolvedValue({ success: true, token: 't' });
    identityMock.loginKandidat.mockResolvedValue({ success: true, token: 't' });
    identityMock.registerKandidat.mockResolvedValue({ success: true });
  });

  it('checkAdminMaster: payload [pin] saja — arg ekstra (pola legacy) DITOLAK validasi', async () => {
    // Kontrak benar
    await asRec(AUTH_ACTIONS.checkAdminMaster(['1234']));
    expect(identityMock.checkAdminMaster).toHaveBeenCalledWith('1234');

    // Pola lama LoginModal ([pin, token-klien]) → validasi arity gagal
    await expect(
      asRec(AUTH_ACTIONS.checkAdminMaster(['1234', 'abc123'])),
    ).rejects.toThrow(/Array must contain at most 1 element/i);
    expect(identityMock.checkAdminMaster).toHaveBeenCalledTimes(1);
  });

  it('checkAdminPersonal: payload [name, pin] — arg ekstra ditolak', async () => {
    await asRec(AUTH_ACTIONS.checkAdminPersonal(['KHOCI', '4321']));
    expect(identityMock.checkAdminPersonal).toHaveBeenCalledWith('KHOCI', '4321');

    await expect(
      asRec(AUTH_ACTIONS.checkAdminPersonal(['KHOCI', '4321', 'xyz'])),
    ).rejects.toThrow(/Array must contain at most 2 element/i);
    expect(identityMock.checkAdminPersonal).toHaveBeenCalledTimes(1);
  });

  it('loginKandidat: input 08xx/8xx dinormalkan ke 628 kanonik sebelum identity', async () => {
    await asRec(AUTH_ACTIONS.loginKandidat(['081234567890', '7890']));
    expect(identityMock.loginKandidat).toHaveBeenCalledWith('6281234567890', '7890');

    await asRec(AUTH_ACTIONS.loginKandidat(['81234567890', '7890']));
    expect(identityMock.loginKandidat).toHaveBeenCalledWith('6281234567890', '7890');
  });

  it('daftarKandidat: 3-arg (pola LoginModal) diterima — bukan lagi arity-4 tuple mati', async () => {
    await asRec(AUTH_ACTIONS.daftarKandidat(['Budi', '081234567890', '7890']));
    expect(identityMock.registerKandidat).toHaveBeenCalledWith('Budi', '6281234567890', '7890', undefined);
  });

  it('daftarKandidat: 2-arg legacy (nama + WA) tetap diterima, password default undefined', async () => {
    await asRec(AUTH_ACTIONS.daftarKandidat(['Budi', '81234567890']));
    expect(identityMock.registerKandidat).toHaveBeenCalledWith('Budi', '6281234567890', undefined, undefined);
  });

  it('daftarKandidat: 4-arg dengan usia tetap valid (contract lama)', async () => {
    await asRec(AUTH_ACTIONS.daftarKandidat(['Budi', '6281234567890', '7890', 24]));
    expect(identityMock.registerKandidat).toHaveBeenCalledWith('Budi', '6281234567890', '7890', 24);
  });
});