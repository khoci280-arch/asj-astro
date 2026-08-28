/**
 * auth.ts — Authentication API calls + session management
 * Migrated from legacy/js/04_auth.ts
 * 
 * Handles: login, register, password change, session validation.
 * All API calls go through the Netlify functions backend.
 */
import { loginAsAdmin, loginAsKandidat, logout as storeLogout, getSessionToken } from '../store/userStore';

const API_BASE = '/.netlify/functions';

/** Call a Netlify function */
export async function callAPI(action: string, args: any[] = []): Promise<any> {
  const res = await fetch(`${API_BASE}/bridge-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Register new kandidat */
export async function registerKandidat(nama: string, wa: string): Promise<{ success: boolean; error?: string }> {
  const res = await callAPI('daftarKandidat', [nama, wa]);
  return res;
}

/** Login as kandidat */
export async function loginKandidat(wa: string, password: string): Promise<{ success: boolean; nama?: string; error?: string }> {
  const res = await callAPI('loginKandidat', [wa, password]);
  if (res.success && res.nama && res.wa) {
    loginAsKandidat(res.nama, res.wa, res.sessionToken || '', res.refreshToken || '');
  }
  return res;
}

/** Login as admin (step 1: master PIN) */
export async function checkAdminMaster(pin: string): Promise<{ success: boolean; error?: string }> {
  const sessionToken = getSessionToken() || Date.now().toString(36) + Math.random().toString(36).substr(2);
  const res = await callAPI('checkAdminMaster', [pin, sessionToken]);
  return res;
}

/** Login as admin (step 2: personal PIN) */
export async function loginAdmin(name: string, pin: string): Promise<{ success: boolean; error?: string }> {
  const sessionToken = getSessionToken() || Date.now().toString(36) + Math.random().toString(36).substr(2);
  const res = await callAPI('checkAdminPersonal', [name, pin, sessionToken]);
  if (res.success) {
    loginAsAdmin(name, res.sessionToken || sessionToken, res.refreshToken || '');
  }
  return res;
}

/** Change kandidat password */
export async function changePassword(wa: string, oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
  const res = await callAPI('gantiPasswordKandidat', [wa, oldPass, newPass]);
  return res;
}

/** Logout */
export function logout(): void {
  storeLogout();
  // Reset page to guest view
  window.location.reload();
}

/** Validate WA number format */
export function normalizeWa(input: string): string {
  let wa = input.replace(/\D/g, '');
  if (wa.startsWith('0')) wa = '62' + wa.slice(1);
  if (!wa.startsWith('62')) wa = '62' + wa;
  return wa;
}

export function isValidWa(wa: string): boolean {
  const normalized = normalizeWa(wa);
  return /^62\d{10,13}$/.test(normalized);
}
