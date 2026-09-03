// ==========================================
// TESTS: contexts/identity/service — session refresh + token guards.
// Relocated from the retired _lib/actions-auth dispatcher suite (2026-09-04):
// surfaces/auth delegates refresh + guard logic to contexts/identity now, so
// the coverage follows the logic. Assertions follow identity's live contract
// ({ success:false, message } on rejection, kind:'session' on re-issued
// tokens), not the legacy { sessionInvalid:true } shape.
// ==========================================
import { describe, it, expect } from 'vitest';
import { refreshAdminSession, refreshKandidatSession, requireRole, requireAdmin, isOwnerOrAdmin } from './service';
import { signToken, verifyToken } from '../../_lib/session';

describe('refreshKandidatSession — pemulihan sesi kandidat diam-diam', () => {
  it('refresh token kandidat yang sah → sessionToken baru + wa', async () => {
    const rt = signToken({ role: 'kandidat', wa: '6281234567890', kind: 'refresh' });
    const res = await refreshKandidatSession(rt);
    if (!res.success) throw new Error('expected refresh success: ' + res.message);
    expect(res.wa).toBe('6281234567890');
    const t = verifyToken(res.sessionToken);
    expect(t && t.role).toBe('kandidat');
    expect(t && t.wa).toBe('6281234567890');
    expect(t && t.kind).toBe('session'); // token sesi biasa, bukan refresh
  });

  it('menolak token non-refresh (sesi biasa / role lain / rusak)', async () => {
    const st = signToken({ role: 'kandidat', wa: '6281234567890' });
    expect((await refreshKandidatSession(st)).success).toBe(false);
    const adm = signToken({ role: 'admin', name: 'AGUS', kind: 'refresh' });
    expect((await refreshKandidatSession(adm)).success).toBe(false);
    expect((await refreshKandidatSession('bogus.token')).success).toBe(false);
    expect((await refreshKandidatSession('')).success).toBe(false);
  });

  it('refresh token TIDAK bisa dipakai sebagai sesi aksi lain (guard kind)', () => {
    // requireRole & isOwnerOrAdmin harus menolak token kind 'refresh'.
    const rt = signToken({ role: 'kandidat', wa: '6281234567890', kind: 'refresh' });
    const guarded = requireRole(rt, 'kandidat');
    expect('error' in guarded && guarded.error).toBeTruthy();
    expect(isOwnerOrAdmin(rt, '6281234567890')).toBe(false);
    const rtAdm = signToken({ role: 'admin', name: 'AGUS', kind: 'refresh' });
    const guardedAdm = requireAdmin(rtAdm);
    expect('error' in guardedAdm && guardedAdm.error).toBeTruthy();
  });
});

describe('refreshAdminSession — pemulihan sesi admin diam-diam', () => {
  it('refresh token admin yang sah → sessionToken baru (nama di payload)', async () => {
    const rt = signToken({ role: 'admin', name: 'AGUS', kind: 'refresh' });
    const res = await refreshAdminSession(rt);
    if (!res.success) throw new Error('expected refresh success: ' + res.message);
    const t = verifyToken(res.sessionToken);
    expect(t && t.role).toBe('admin');
    expect(t && t.name).toBe('AGUS');
    expect(t && t.kind).toBe('session');
  });

  it('menolak token non-refresh (sesi biasa / role lain / rusak)', async () => {
    const st = signToken({ role: 'admin', name: 'AGUS' });
    expect((await refreshAdminSession(st)).success).toBe(false);
    const kand = signToken({ role: 'kandidat', wa: '6281234567890', kind: 'refresh' });
    expect((await refreshAdminSession(kand)).success).toBe(false);
    expect((await refreshAdminSession('bogus.token')).success).toBe(false);
    expect((await refreshAdminSession('')).success).toBe(false);
  });
});
