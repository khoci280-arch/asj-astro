/**
 * userStore.ts — Single Source of Truth for auth state
 * Migrated from legacy/js/init/state.ts + 04_auth.ts
 * 
 * Uses nanostores for reactive state management.
 * All components can `useStore(userStore)` to reactively read auth state.
 */
import { atom, computed } from 'nanostores';

export type UserRole = 'guest' | 'admin' | 'kandidat';

export interface UserState {
  role: UserRole;
  name: string;
  wa: string;
  sessionToken: string;
  refreshToken: string;
  isLoggedIn: boolean;
}

/** Auth state atom */
export const userStore = atom<UserState>({
  role: 'guest',
  name: '',
  wa: '',
  sessionToken: '',
  refreshToken: '',
  isLoggedIn: false,
});

/** Computed: is admin? */
export const isAdmin = computed(userStore, ($user) => $user.role === 'admin');

/** Computed: is kandidat? */
export const isKandidat = computed(userStore, ($user) => $user.role === 'kandidat');

/** Computed: display name */
export const displayName = computed(userStore, ($user) => $user.name || 'Guest');

/** Set user as admin */
export function loginAsAdmin(name: string, sessionToken: string, refreshToken?: string) {
  userStore.set({
    role: 'admin',
    name,
    wa: '',
    sessionToken,
    refreshToken: refreshToken || '',
    isLoggedIn: true,
  });
  // Persist to localStorage for session recovery
  localStorage.setItem('asj_admin_login', 'sukses');
  localStorage.setItem('asj_admin_name', name);
  localStorage.setItem('asj_admin_session', sessionToken);
  if (refreshToken) localStorage.setItem('asj_admin_refresh', refreshToken);
}

/** Set user as kandidat */
export function loginAsKandidat(name: string, wa: string, sessionToken: string, refreshToken?: string) {
  userStore.set({
    role: 'kandidat',
    name,
    wa,
    sessionToken,
    refreshToken: refreshToken || '',
    isLoggedIn: true,
  });
  // Persist to localStorage
  localStorage.setItem('asj_kandidat_login', 'sukses');
  localStorage.setItem('asj_kandidat_name', name);
  localStorage.setItem('asj_kandidat_wa', wa);
  localStorage.setItem('asj_kandidat_session', sessionToken);
  if (refreshToken) localStorage.setItem('asj_kandidat_refresh', refreshToken);
}

/** Logout — clear all auth state */
export function logout() {
  userStore.set({
    role: 'guest',
    name: '',
    wa: '',
    sessionToken: '',
    refreshToken: '',
    isLoggedIn: false,
  });
  // Clear localStorage
  localStorage.removeItem('asj_admin_login');
  localStorage.removeItem('asj_admin_name');
  localStorage.removeItem('asj_admin_session');
  localStorage.removeItem('asj_admin_refresh');
  localStorage.removeItem('asj_kandidat_login');
  localStorage.removeItem('asj_kandidat_name');
  localStorage.removeItem('asj_kandidat_wa');
  localStorage.removeItem('asj_kandidat_session');
  localStorage.removeItem('asj_kandidat_refresh');
}

/** Restore session from localStorage (called on app boot) */
export function restoreSession(): boolean {
  // Try admin session first
  const adminLogin = localStorage.getItem('asj_admin_login');
  const adminName = localStorage.getItem('asj_admin_name');
  const adminSession = localStorage.getItem('asj_admin_session');
  const adminRefresh = localStorage.getItem('asj_admin_refresh') || '';
  
  if (adminLogin === 'sukses' && adminName && adminSession) {
    loginAsAdmin(adminName, adminSession, adminRefresh);
    return true;
  }
  
  // Try kandidat session
  const kandidatLogin = localStorage.getItem('asj_kandidat_login');
  const kandidatName = localStorage.getItem('asj_kandidat_name');
  const kandidatWa = localStorage.getItem('asj_kandidat_wa');
  const kandidatSession = localStorage.getItem('asj_kandidat_session');
  const kandidatRefresh = localStorage.getItem('asj_kandidat_refresh') || '';
  
  if (kandidatLogin === 'sukses' && kandidatName && kandidatWa && kandidatSession) {
    loginAsKandidat(kandidatName, kandidatWa, kandidatSession, kandidatRefresh);
    return true;
  }
  
  return false;
}

/** Get current session token */
export function getSessionToken(): string {
  return userStore.get().sessionToken;
}

/** Get current user role */
export function getUserRole(): UserRole {
  return userStore.get().role;
}
