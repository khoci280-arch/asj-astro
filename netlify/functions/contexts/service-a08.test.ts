// ==========================================
// TESTS: A08 parity crosscheck (2026-09-05) — ChangePasswordModal root
//
// Legacy ground truth (khoci921): partials/modals-shared.html #modal-ganti-pass
// + js/04_auth.ts prosesGantiPasswordKandidat() + netlify/functions/_lib/
// actions-auth.ts handleGantiPasswordKandidat().
//
// Root bugs found & locked here:
//   1. Astro changePassword wrote `password_diubah: <ISO timestamp>` into a
//      live BOOLEAN column (legacy writes `true`; Astro row-types.ts agrees:
//      password_diubah?: boolean). PostgREST rejects the whole PATCH, so a
//      candidate could never change a password on Astro.
//   2. Surface guard was isOwnerOrAdmin → admins could change candidate
//      passwords; legacy is candidate-owner-ONLY and answers sessionInvalid
//      before any DB read.
//   3. Server schema reused passwordField (min 4) for `baru`; legacy requires
//      6–20 karakter tanpa spasi.
// Every assertion below is DB-free (no network), same pattern as service-a02.
// ==========================================
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { schemas } from '../_lib/kernel/validate';
import { signToken } from '../_lib/session';
import { buildPasswordPatch } from './identity/service';
import { AUTH_ACTIONS } from '../surfaces/auth';

const WA = '6281234567890';
const WA2 = '6289999999999';
const asRec = (p: Promise<unknown>): Promise<Record<string, unknown>> => p as Promise<Record<string, unknown>>;

describe('A08 — gantiPasswordKandidat guard: candidate-owner-only (legacy parity)', () => {
  const act = (args: unknown[], token?: string) =>
    asRec(AUTH_ACTIONS.gantiPasswordKandidat(args, token || ''));

  it('anonymous caller → sessionInvalid before any DB read/write', async () => {
    const r = await act([WA, 'oldpass1', 'newpass1']);
    expect(r.sessionInvalid).toBe(true);
    expect(r.success).toBe(false);
  });

  it('admin session is rejected — admin must NOT change a candidate password', async () => {
    const adminTok = signToken({ role: 'admin', name: 'AGUS', kind: 'session' });
    const r = await act([WA, 'oldpass1', 'newpass1'], adminTok);
    expect(r.sessionInvalid).toBe(true);
  });

  it('another candidate (IDOR attempt) is rejected', async () => {
    const otherTok = signToken({ role: 'kandidat', wa: WA2, kind: 'session' });
    const r = await act([WA, 'oldpass1', 'newpass1'], otherTok);
    expect(r.sessionInvalid).toBe(true);
  });

  it('refresh-kind token is rejected (guard kind)', async () => {
    const rt = signToken({ role: 'kandidat', wa: WA, kind: 'refresh' });
    const r = await act([WA, 'oldpass1', 'newpass1'], rt);
    expect(r.sessionInvalid).toBe(true);
  });
});

describe('A08 — schemas.gantiPassword: `baru` 6-20 karakter tanpa spasi', () => {
  const ok = (baru: string) => schemas.gantiPassword.safeParse([WA, 'oldpass1', baru]).success;

  it('6..20 karakter tanpa spasi diterima', () => {
    expect(ok('123456')).toBe(true);
    expect(ok('a'.repeat(20))).toBe(true);
    expect(ok('Pass-kuat-2026!')).toBe(true);
  });

  it('5 karakter, 21 karakter, atau mengandung spasi ditolak (rule legacy)', () => {
    expect(ok('12345')).toBe(false);
    expect(ok('a'.repeat(21))).toBe(false);
    expect(ok('123 456')).toBe(false);
  });
});

describe('A08 — changePassword PATCH body: password_diubah boolean true', () => {
  it('password lama salah → error tanpa body', async () => {
    const oldHash = await bcrypt.hash('lama-benar-1', 4);
    const r = await buildPasswordPatch(oldHash, 'lama-salah', 'baru-12345');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('Password lama salah.');
  });

  it('password lama benar → body { password_kandidat: hash, password_diubah: true }', async () => {
    const oldHash = await bcrypt.hash('lama-benar-1', 4);
    const r = await buildPasswordPatch(oldHash, 'lama-benar-1', 'baru-12345');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Regression inti: kolom live boolean — menulis timestamp string merusak PATCH.
    expect(r.body.password_diubah).toBe(true);
    expect(typeof r.body.password_diubah).toBe('boolean');
    expect(r.body.password_kandidat.startsWith('$2')).toBe(true);
    expect(await bcrypt.compare('baru-12345', r.body.password_kandidat)).toBe(true);
  });
});
