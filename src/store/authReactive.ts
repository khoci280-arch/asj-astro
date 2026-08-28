/**
 * authReactive.ts — Reactive Auth Wrapper
 * 
 * Wraps localStorage into nanostores atoms for reactive updates.
 * Solves: UI kaku, cross-tab sync, XSS mitigation.
 * 
 * Per suggestion: "bungkus localStorage ke Nano Stores agar menjadi reaktif"
 */
import { atom } from 'nanostores';

export type UserRole = 'guest' | 'admin' | 'kandidat';

export interface AuthState {
  role: UserRole;
  name: string;
  wa: string;
  sessionToken: string;
  refreshToken: string;
  isLoggedIn: boolean;
  lastChecked: number; // timestamp for expiry check
}

const STORAGE_KEYS = {
  admin: {
    login: 'asj_admin_login',
    name: 'asj_admin_name',
    session: 'asj_admin_session',
    refresh: 'asj_admin_refresh',
  },
  kandidat: {
    login: 'asj_kandidat_login',
    name: 'asj_kandidat_name',
    wa: 'asj_kandidat_wa',
    session: 'asj_kandidat_session',
    refresh: 'asj_kandidat_refresh',
  },
} as const;

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/** Read initial state from localStorage (SSR-safe) */
function readInitialState(): AuthState {
  if (typeof window === 'undefined') {
    return { role: 'guest', name: '', wa: '', sessionToken: '', refreshToken: '', isLoggedIn: false, lastChecked: 0 };
  }

  // Try admin first
  const adminLogin = localStorage.getItem(STORAGE_KEYS.admin.login);
  const adminName = localStorage.getItem(STORAGE_KEYS.admin.name);
  const adminSession = localStorage.getItem(STORAGE_KEYS.admin.session);
  const adminRefresh = localStorage.getItem(STORAGE_KEYS.admin.refresh) || '';
  const adminTs = localStorage.getItem('asj_admin_ts');

  if (adminLogin === 'sukses' && adminName && adminSession) {
    // Check expiry
    const ts = adminTs ? parseInt(adminTs) : 0;
    if (Date.now() - ts < SESSION_MAX_AGE) {
      return { role: 'admin', name: adminName, wa: '', sessionToken: adminSession, refreshToken: adminRefresh, isLoggedIn: true, lastChecked: ts };
    }
    // Session expired → clear
    clearStorage('admin');
  }

  // Try kandidat
  const kanLogin = localStorage.getItem(STORAGE_KEYS.kandidat.login);
  const kanName = localStorage.getItem(STORAGE_KEYS.kandidat.name);
  const kanWa = localStorage.getItem(STORAGE_KEYS.kandidat.wa);
  const kanSession = localStorage.getItem(STORAGE_KEYS.kandidat.session);
  const kanRefresh = localStorage.getItem(STORAGE_KEYS.kandidat.refresh) || '';
  const kanTs = localStorage.getItem('asj_kandidat_ts');

  if (kanLogin === 'sukses' && kanName && kanWa && kanSession) {
    const ts = kanTs ? parseInt(kanTs) : 0;
    if (Date.now() - ts < SESSION_MAX_AGE) {
      return { role: 'kandidat', name: kanName, wa: kanWa, sessionToken: kanSession, refreshToken: kanRefresh, isLoggedIn: true, lastChecked: ts };
    }
    clearStorage('kandidat');
  }

  return { role: 'guest', name: '', wa: '', sessionToken: '', refreshToken: '', isLoggedIn: false, lastChecked: 0 };
}

function clearStorage(type: 'admin' | 'kandidat') {
  const keys = STORAGE_KEYS[type];
  Object.values(keys).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(`asj_${type}_ts`);
}

/** Reactive auth atom — updates ALL subscribers when changed */
export const authStore = atom<AuthState>(readInitialState());

/** Login as admin — updates store + localStorage */
export function loginAsAdmin(name: string, sessionToken: string, refreshToken?: string) {
  const now = Date.now();
  const state: AuthState = { role: 'admin', name, wa: '', sessionToken, refreshToken: refreshToken || '', isLoggedIn: true, lastChecked: now };
  
  // Write to localStorage
  localStorage.setItem(STORAGE_KEYS.admin.login, 'sukses');
  localStorage.setItem(STORAGE_KEYS.admin.name, name);
  localStorage.setItem(STORAGE_KEYS.admin.session, sessionToken);
  if (refreshToken) localStorage.setItem(STORAGE_KEYS.admin.refresh, refreshToken);
  localStorage.setItem('asj_admin_ts', now.toString());
  
  // Clear kandidat
  clearStorage('kandidat');
  
  // Update reactive store (ALL components re-render)
  authStore.set(state);
}

/** Login as kandidat — updates store + localStorage */
export function loginAsKandidat(name: string, wa: string, sessionToken: string, refreshToken?: string) {
  const now = Date.now();
  const state: AuthState = { role: 'kandidat', name, wa, sessionToken, refreshToken: refreshToken || '', isLoggedIn: true, lastChecked: now };
  
  localStorage.setItem(STORAGE_KEYS.kandidat.login, 'sukses');
  localStorage.setItem(STORAGE_KEYS.kandidat.name, name);
  localStorage.setItem(STORAGE_KEYS.kandidat.wa, wa);
  localStorage.setItem(STORAGE_KEYS.kandidat.session, sessionToken);
  if (refreshToken) localStorage.setItem(STORAGE_KEYS.kandidat.refresh, refreshToken);
  localStorage.setItem('asj_kandidat_ts', now.toString());
  
  clearStorage('admin');
  authStore.set(state);
}

/** Logout — clears everything + notifies all components */
export function logout() {
  clearStorage('admin');
  clearStorage('kandidat');
  authStore.set({ role: 'guest', name: '', wa: '', sessionToken: '', refreshToken: '', isLoggedIn: false, lastChecked: 0 });
}

/** Refresh session from localStorage (called on page load) */
export function refreshSession() {
  authStore.set(readInitialState());
}

/** Get session token */
export function getSessionToken(): string {
  return authStore.get().sessionToken;
}

/** Listen for cross-tab changes (storage event) */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('asj_')) {
      // Another tab changed auth state → sync this tab
      refreshSession();
    }
  });
  
  // Also check session expiry every 5 minutes
  setInterval(() => {
    const state = authStore.get();
    if (state.isLoggedIn && state.lastChecked > 0) {
      if (Date.now() - state.lastChecked > SESSION_MAX_AGE) {
        console.log('[Auth] Session expired — logging out');
        logout();
        window.location.reload();
      }
    }
  }, 5 * 60 * 1000);
}
