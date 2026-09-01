/**
 * apiClient.ts — Centralized API wrapper with auto-inject session token
 *
 * Routes actions to surface-specific Netlify functions via apiEndpoint.ts.
 * Unknown actions fall back to bridge-links (catch-all).
 *
 * Surface-specific routing enables concurrent scaling:
 * auth requests don't block AI processing, public reads don't contend with writes.
 */
import { authStore, logout } from '../store/authReactive';
import { supabase, isSupabaseConfigured } from './supabase';
import { showToast } from '../components/Toast';
import { getEndpoint } from './apiEndpoint';

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

const FALLBACK_ENDPOINT = '/.netlify/functions/bridge-links';

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
 */
async function getFreshToken(): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch { /* fall through */ }
  }
  return authStore.get().sessionToken;
}

/**
 * Core fetch wrapper — routes actions to surface-specific endpoints
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
    invalidateCache();
  }

  const { isLoggedIn } = authStore.get();
  const sessionToken = await getFreshToken();

  if (requireAuth && (!isLoggedIn || !sessionToken)) {
    showToast('Sesi tidak valid. Silakan login kembali.', 'error');
    logout();
    window.location.href = '/';
    throw new Error('No valid session');
  }

  // Route to surface-specific endpoint
  const endpoint = getEndpoint(action);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = 'Bearer ' + sessionToken;

  const body = JSON.stringify({ action, payload: args, sessionToken });

  try {
    let res = await fetch(endpoint, { method: 'POST', headers, body });

    // If surface endpoint returns 404, retry with bridge-links fallback
    if (res.status === 404 && endpoint !== FALLBACK_ENDPOINT) {
      res = await fetch(FALLBACK_ENDPOINT, { method: 'POST', headers, body });
    }

    if (!res.ok) {
      throw new Error('HTTP ' + res.status + ': ' + res.statusText);
    }

    const data: ApiResponse<T> = await res.json();

    if (data.sessionInvalid) {
      showToast('Sesi expired. Silakan login kembali.', 'error');
      logout();
      window.location.href = '/';
      throw new Error('Session expired');
    }

    if (CACHEABLE_READS.has(action)) {
      setCache(action, args, data);
    }
    return data as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'No valid session' || message === 'Session expired') throw err;
    showToast('Network error: ' + (message || 'Unknown'), 'error');
    throw err;
  }
}

/**
 * Convenience methods for common patterns
 */
export const api = {
  call: apiClient,
  get(action: string, args: unknown[] = []) {
    return apiClient(action, args, { requireAuth: false });
  },
  secure(action: string, args: unknown[] = []) {
    return apiClient(action, args, { requireAuth: true });
  },
};

export default api;
