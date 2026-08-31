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


/** SWR-lite cache — sessionStorage with TTL (matching legacy api-client.ts) */
const READ_CACHE_TTL_MS = 30 * 1000; // 30 seconds freshness
const CACHEABLE_READS = new Set([
  'getAppData', 'cekDataPelamar', 'getMasterDataByWa',
  'getDrafCvMaster', 'getShareData', 'getJobsPublic',
  'getJadwalList', 'getConfigDropdown', 'getWaTemplates',
  'getAgendaAdmin', 'getApplicantDetail',
]);

function getCacheKey(action: string, args: unknown[]): string {
  return 'asj_cache_' + action + ':' + JSON.stringify(args || []);
}
function getCached(action: string, args: unknown[]): unknown | null {
  try {
    const hitStr = sessionStorage.getItem(getCacheKey(action, args));
    if (hitStr) {
      const hit = JSON.parse(hitStr);
      if (Date.now() - hit.at < READ_CACHE_TTL_MS) return hit.value;
      sessionStorage.removeItem(getCacheKey(action, args));
    }
  } catch {}
  return null;
}
function setCache(action: string, args: unknown[], value: unknown): void {
  try {
    sessionStorage.setItem(getCacheKey(action, args), JSON.stringify({ at: Date.now(), value }));
  } catch {}
}
function invalidateCache(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('asj_cache_')) sessionStorage.removeItem(key);
    }
  } catch {}
}
/** Single backend endpoint — all actions dispatched through bridge-links */
const API_ENDPOINT = '/.netlify/functions/bridge-links';

interface ApiResponse<T = any> {
  success: boolean;
  sessionInvalid?: boolean;
  error?: string;
  message?: string;
  data?: T;
  [key: string]: unknown;
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
  args: unknown[] = [],
  options: { requireAuth?: boolean } = {}
): Promise<T> {
  const { requireAuth = true } = options;

  // SWR-lite: return cached result for read-only actions
  if (CACHEABLE_READS.has(action)) {
    const cached = getCached(action, args);
    if (cached) return cached as T;
  } else {
    // Mutation -> invalidate all read cache
    invalidateCache();
  }

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
      body: JSON.stringify({ action, payload: args, sessionToken }),
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

    // Cache successful read responses
    if (CACHEABLE_READS.has(action)) {
      setCache(action, args, data);
    }
    return data as T;
  } catch (err: unknown) {
    // Network error
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'No valid session' || message === 'Session expired') {
      throw err;
    }
    showToast('Network error: ' + (message || 'Unknown'), 'error');
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
  get(action: string, args: unknown[] = []) {
    return apiClient(action, args, { requireAuth: false });
  },

  /** Require auth for protected actions */
  secure(action: string, args: unknown[] = []) {
    return apiClient(action, args, { requireAuth: true });
  },
};

export default api;
