/**
 * contexts/identity/service.ts — Auth business logic
 *
 * Pure business rules, no HTTP/Express/Netlify concerns.
 * Calls repository.ts for DB access, session.ts for tokens.
 *
 * PUBLIC INTERFACE (re-exported via index.ts):
 *   checkAdminMaster(pin) → { success, token? }
 *   checkAdminPersonal(name, pin) → { success, token? }
 *   refreshAdminSession(refreshToken) → { success, sessionToken? }
 *   loginKandidat(wa, password) → { success, token?, user? }
 *   refreshKandidatSession(refreshToken) → { success, sessionToken?, wa? }
 *   registerKandidat(nama, wa, password?, usia?) → { success }
 *   changePassword(wa, lama, baru) → { success }
 *   verifyToken(token) → TokenPayload | null
 *   requireRole(token, role) → { token } | { error }
 *   requireAdmin(token) → { token } | { error }
 *   isOwnerOrAdmin(token, wa) → boolean
 */

import bcrypt from 'bcryptjs';
import { normalizeWa } from '../../shared/wa-rules';
import * as session from '../../_lib/session';
import * as repo from './repository';
import { env } from '../../_lib/env';

// ── Admin auth ───────────────────────────────────────────────────────────────

/**
 * Get master PINs from env. Cached after first call.
 */
let _masterPins: string[] | null = null;
export function masterPins(): string[] {
  if (_masterPins) return _masterPins;
  const raw = [
    env('ADMIN_MASTER_PIN'),
    env('MASTER_PIN'),
    env('ADMIN_PIN'),
    env('PIN_KHOCI'),
    env('PIN_SACHOU'),
    env('PIN_AYOK'),
    env('PIN_KHOLIS'),
  ].filter(Boolean);
  _masterPins = [...new Set(raw)];
  return _masterPins;
}

export function checkAdminMaster(pin: string) {
  const pins = masterPins();
  if (!pins.includes(pin)) {
    return { success: false, message: 'PIN master salah.' };
  }
  const token = session.signToken({ role: 'admin', name: 'master', kind: 'session' });
  return { success: true, token };
}

export async function checkAdminPersonal(name: string, pin: string) {
  const admin = await repo.findAdminByName(name);
  if (!admin) return { success: false, message: 'Admin tidak ditemukan.' };
  // S6 fix: Only use bcrypt comparison — never plaintext.
  // Plaintext comparison is a timing side-channel and means plaintext credentials exist in DB.
  const pinMatch = await bcrypt.compare(pin, admin.pin);
  if (!pinMatch) return { success: false, message: 'PIN salah.' };
  const token = session.signToken({ role: 'admin', name: admin.name, kind: 'session' });
  return { success: true, token, user: admin.name };
}

export async function refreshAdminSession(refreshToken: string) {
  const t = session.verifyToken(refreshToken);
  if (!t || t.kind !== 'refresh' || t.role !== 'admin') {
    return { success: false, message: 'Refresh token tidak valid.' };
  }
  const newToken = session.signToken({ role: 'admin', name: t.name, kind: 'session' });
  return { success: true, sessionToken: newToken };
}

// ── Candidate auth ───────────────────────────────────────────────────────────

export async function loginKandidat(wa: string, password: string) {
  const cand = await repo.findCandidateForAuth(wa);
  if (!cand) return { success: false, message: 'Kandidat tidak ditemukan.' };
  const storedPass = String(cand.password_kandidat || '');
  if (!storedPass) return { success: false, message: 'Password belum diatur.' };
  // S6 fix: Only use bcrypt comparison — never plaintext.
  const ok = await bcrypt.compare(password, storedPass);
  if (!ok) return { success: false, message: 'Password salah.' };
  const token = session.signToken({ role: 'kandidat', wa: cand.no_wa, kind: 'session' });
  return { success: true, token, user: 'kandidat', wa: cand.no_wa, name: cand.nama_lengkap };
}

export async function refreshKandidatSession(refreshToken: string) {
  const t = session.verifyToken(refreshToken);
  if (!t || t.kind !== 'refresh' || t.role !== 'kandidat') {
    return { success: false, message: 'Refresh token tidak valid.' };
  }
  const newToken = session.signToken({ role: 'kandidat', wa: t.wa, kind: 'session' });
  return { success: true, sessionToken: newToken, wa: t.wa };
}

export async function registerKandidat(nama: string, wa: string, password?: string, usia?: number) {
  // Check if already registered
  const existing = await repo.findCandidateForAuth(wa);
  if (existing) return { success: false, message: 'Nomor WA sudah terdaftar.' };
  // S8 fix: Require explicit password — never default to phone digits.
  // Default passwords are trivially guessable and enumerable.
  if (!password || password.length < 4) {
    return { success: false, message: 'Password harus diisi minimal 4 karakter.' };
  }
  const pass = password;
  const hash = await bcrypt.hash(pass, 10);
  // Insert via Supabase
  const { supabaseJson } = await import('../../_lib/db/client');
  try {
    await supabaseJson('POST', 'database_candidate', {
      body: {
        nama_lengkap: nama,
        no_wa: wa,
        password_kandidat: hash,
        status_kandidat: 'BARU',
        tanggal_daftar: new Date().toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, message: 'Pendaftaran berhasil.' };
  } catch (e: unknown) {
    return { success: false, message: 'Gagal mendaftar: ' + ((e as Error).message || 'unknown') };
  }
}

export async function changePassword(wa: string, lama: string, baru: string) {
  const cand = await repo.findCandidateForAuth(wa);
  if (!cand) return { success: false, message: 'Kandidat tidak ditemukan.' };
  const storedPass = String(cand.password_kandidat || '');
  // S6 fix: Only use bcrypt comparison — never plaintext.
  const ok = await bcrypt.compare(lama, storedPass);
  if (!ok) return { success: false, message: 'Password lama salah.' };
  const hash = await bcrypt.hash(baru, 10);
  const { supabaseJson } = await import('../../_lib/db/client');
  try {
    await supabaseJson('PATCH', 'database_candidate', {
      query: { no_wa: 'eq.' + wa },
      body: { password_kandidat: hash, password_diubah: new Date().toISOString() },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, message: 'Gagal mengubah password: ' + ((e as Error).message || 'unknown') };
  }
}

// ── Token verification & guards ──────────────────────────────────────────────

export function verifyToken(token: string) {
  return session.verifyToken(token);
}

export function requireRole(sessionToken: string, role: string) {
  const t = session.verifyToken(sessionToken);
  if (!t || t.role !== role || t.kind === 'refresh') {
    return { error: { success: false, sessionInvalid: true, message: 'Sesi ' + role + ' tidak valid' } };
  }
  return { token: t };
}

export function requireAdmin(sessionToken: string) {
  return requireRole(sessionToken, 'admin');
}

export function isOwnerOrAdmin(sessionToken: string, wa: string) {
  const t = session.verifyToken(sessionToken);
  if (!t || t.kind === 'refresh') return false;
  if (t.role === 'admin') return true;
  if (t.role === 'kandidat' && normalizeWa(t.wa || '') === normalizeWa(wa)) return true;
  return false;
}
