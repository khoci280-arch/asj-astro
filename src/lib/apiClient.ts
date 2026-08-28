/**
 * apiClient.ts — Centralized API wrapper with auto-inject HMAC token
 * Per PDF Fase 7: "Create reusable apiClient.ts wrapper using native fetch"
 *
 * All backend requests MUST go through this client.
 * Token is auto-read from nanostores and injected into Authorization header.
 */
import { authStore, logout } from '../store/authReactive';
import { showToast } from '../components/Toast';

const API_BASE = '/.netlify/functions';

interface ApiResponse<T = any> {
  success: boolean;
  sessionInvalid?: boolean;
  error?: string;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Core fetch wrapper — injects HMAC token automatically
 */
export async function apiClient<T = ApiResponse>(
  action: string,
  args: any[] = [],
  options: { requireAuth?: boolean } = {}
): Promise<T> {
  const { requireAuth = true } = options;

  // Read token from nanostores (reactive, always fresh)
  const { sessionToken, isLoggedIn } = authStore.get();

  // Guard: require auth but no token
  if (requireAuth && (!isLoggedIn || !sessionToken)) {
    showToast('Sesi tidak valid. Silakan login kembali.', 'error');
    logout();
    window.location.href = '/';
    throw new Error('No valid session');
  }

  // Build request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Auto-inject HMAC token
  if (sessionToken) {
    headers['Authorization'] = 'Bearer ' + sessionToken;
  }

  try {
    const res = await fetch(API_BASE + '/' + action, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, args }),
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
