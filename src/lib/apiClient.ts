/**
 * apiClient.ts — Centralized API wrapper with auto-inject session token
 *
 * All backend requests go through bridge-links (single dispatcher).
 * Token is auto-read from nanostores and injected into Authorization header.
 *
 * Updated: routes ALL actions through /.netlify/functions/bridge-links
 * instead of per-action function URLs (which don't exist as separate functions).
 */
import { authStore, logout } from '../store/authReactive';
import { supabase, isSupabaseConfigured } from './supabase';
import { showToast } from '../components/Toast';

/** Single backend endpoint — all actions dispatched through bridge-links */
const API_ENDPOINT = '/.netlify/functions/bridge-links';

interface ApiResponse<T = any> {
  success: boolean;
  sessionInvalid?: boolean;
  error?: string;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Get the freshest session token — checks Supabase first if configured.
 * This ensures token is always up-to-date even if local storage is stale.
 */
async function getFreshToken(): Promise<string> {
  // Try Supabase session first (most up-to-date)
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return session.access_token;
      }
    } catch {
      // Fall through to local store
    }
  }

  // Fallback to local store
  return authStore.get().sessionToken;
}

/**
 * Core fetch wrapper — sends all actions to bridge-links dispatcher
 */
export async function apiClient<T = ApiResponse>(
  action: string,
  args: any[] = [],
  options: { requireAuth?: boolean } = {}
): Promise<T> {
  const { requireAuth = true } = options;

  // Read token from nanostores (reactive, always fresh)
  const { isLoggedIn } = authStore.get();
  const sessionToken = await getFreshToken();

  // Guard: require auth but no token
  if (requireAuth && (!isLoggedIn || !sessionToken)) {
    showToast('Sesi tidak valid. Silakan login kembali.', 'error');
    logout();
    window.location.href = '/';
    throw new Error('No valid session');
  }

  // Build request — all actions go through bridge-links with action in body
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Auto-inject session token
  if (sessionToken) {
    headers['Authorization'] = 'Bearer ' + sessionToken;
  }

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, args, sessionToken }),
    });

    if (!res.ok) {
      throw new Error('HTTP ' + res.status + ': ' + res.statusText);
    }

    const data: ApiResponse<T> = await res.json();

    // Handle session invalid (backend returns 200 + sessionInvalid: true)
    if (data.sessionInvalid) {
      showToast('Sesi expired. Silakan login kembali.', 'error');
      logout();
      window.location.href = '/';
      throw new Error('Session expired');
    }

    return data as T;
  } catch (err: any) {
    // Network error
    if (err.message === 'No valid session' || err.message === 'Session expired') {
      throw err;
    }
    showToast('Network error: ' + (err.message || 'Unknown'), 'error');
    throw err;
  }
}

/**
 * Convenience methods for common patterns
 */
export const api = {
  /** Call any backend action */
  call: apiClient,

  /** Get with optional auth (for public data) */
  get(action: string, args: any[] = []) {
    return apiClient(action, args, { requireAuth: false });
  },

  /** Require auth for protected actions */
  secure(action: string, args: any[] = []) {
    return apiClient(action, args, { requireAuth: true });
  },
};

export default api;
