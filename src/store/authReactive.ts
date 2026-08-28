/**
 * authReactive.ts — Reactive Auth (Nanostores Persistent)
 *
 * Uses @nanostores/persistent for automatic localStorage sync.
 * Solves: UI kaku, cross-tab sync, XSS mitigation.
 *
 * Pattern: persistentAtom auto-reads/writes localStorage.
 * No manual localStorage.getItem/setItem needed.
 */
import { persistentAtom } from '@nanostores/persistent';

export type UserRole = 'guest' | 'admin' | 'kandidat';

export interface AuthState {
  role: UserRole;
  name: string;
  wa: string;
  sessionToken: string;
  refreshToken: string;
  isLoggedIn: boolean;
  lastChecked: number;
}

const DEFAULT_STATE: AuthState = {
  role: 'guest',
  name: '',
  wa: '',
  sessionToken: '',
  refreshToken: '',
  isLoggedIn: false,
  lastChecked: 0,
};

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/** Persistent auth store — auto-syncs with localStorage('asj_auth') */
export const authStore = persistentAtom<AuthState>('asj_auth', DEFAULT_STATE, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

/** Login as admin */
export function loginAsAdmin(name: string, sessionToken: string, refreshToken?: string) {
  const now = Date.now();
  authStore.set({
    role: 'admin',
    name,
    wa: '',
    sessionToken,
    refreshToken: refreshToken || '',
    isLoggedIn: true,
    lastChecked: now,
  });
}

/** Login as kandidat */
export function loginAsKandidat(name: string, wa: string, sessionToken: string, refreshToken?: string) {
  const now = Date.now();
  authStore.set({
    role: 'kandidat',
    name,
    wa,
    sessionToken,
    refreshToken: refreshToken || '',
    isLoggedIn: true,
    lastChecked: now,
  });
}

/** Logout — clears everything */
export function logout() {
  authStore.set(DEFAULT_STATE);
}

/** Refresh session — checks expiry */
export function refreshSession() {
  const state = authStore.get();
  if (state.isLoggedIn && state.lastChecked > 0) {
    if (Date.now() - state.lastChecked > SESSION_MAX_AGE) {
      console.log('[Auth] Session expired — logging out');
      logout();
    }
  }
}

/** Get session token */
export function getSessionToken(): string {
  return authStore.get().sessionToken;
}

/** Listen for cross-tab changes */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'asj_auth') {
      refreshSession();
    }
  });

  // Check session expiry every 5 minutes
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
