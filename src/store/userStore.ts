/**
 * userStore.ts — Global User State Store
 *
 * Thin wrapper over authReactive.ts that adds:
 * 1. Computed atoms: isAdmin, isKandidat, displayName
 * 2. Supabase auth integration: login, signUp, signOut
 * 3. onAuthStateChange listener that syncs Supabase → authStore
 * 4. initializeAuthListener() — call once at app boot
 *
 * Pattern: all 11 existing consumers already import from authReactive.ts
 * directly. This module adds Supabase-specific logic WITHOUT breaking them.
 * Components can choose to import from either module.
 *
 * Import path:
 *   import { useStore } from '@nanostores/preact';
 *   import { isAdmin, isKandidat } from '../store/userStore';
 *
 *   const admin = useStore(isAdmin);
 */
import { computed } from 'nanostores';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  authStore,
  loginAsAdmin,
  loginAsKandidat,
  logout as authLogout,
  type AuthState,
} from './authReactive';
import { showToast } from '../components/Toast';

// ─── Computed Atoms (derived from authStore) ──────────

/** True when user role is 'admin' */
export const isAdmin = computed(authStore, (state) => state.role === 'admin');

/** True when user role is 'kandidat' */
export const isKandidat = computed(authStore, (state) => state.role === 'kandidat');

/** Display name or 'Guest' */
export const displayName = computed(authStore, (state) => state.name || 'Guest');

/** Whether user is logged in (convenience alias) */
export const isLoggedIn = computed(authStore, (state) => state.isLoggedIn);

// ─── Supabase Auth Functions ─────────────────────────

/**
 * Login kandidat via Supabase phone auth.
 * Format: phone = "628xxxxxxxxxx" (E.164 or local format)
 *
 * On success: syncs session → authStore
 * On failure: shows toast error
 */
export async function loginKandidatSupabase(
  phone: string,
  password: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    showToast('Supabase belum dikonfigurasi', 'error');
    return false;
  }

  // Normalize phone: ensure starts with country code
  const normalizedPhone = normalizePhone(phone);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: normalizedPhone,
      password,
    });

    if (error) {
      showToast(error.message || 'Login gagal', 'error');
      return false;
    }

    if (data.session && data.user) {
      // Sync Supabase session → existing authStore
      const meta = data.user.user_metadata || {};
      const role = meta.role || 'kandidat';
      const name = meta.nama || meta.name || normalizedPhone;

      if (role === 'admin') {
        loginAsAdmin(name, data.session.access_token, data.session.refresh_token);
      } else {
        loginAsKandidat(name, normalizedPhone, data.session.access_token, data.session.refresh_token);
      }

      showToast(`Selamat datang, ${name}!`, 'success');
      return true;
    }

    return false;
  } catch (err: any) {
    showToast('Network error: ' + (err.message || 'Unknown'), 'error');
    return false;
  }
}

/**
 * Register kandidat via Supabase phone auth.
 * Creates new user with phone + password + metadata.
 */
export async function registerKandidatSupabase(
  nama: string,
  phone: string,
  password: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    showToast('Supabase belum dikonfigurasi', 'error');
    return false;
  }

  const normalizedPhone = normalizePhone(phone);

  try {
    const { data, error } = await supabase.auth.signUp({
      phone: normalizedPhone,
      password,
      options: {
        data: {
          nama,
          role: 'kandidat',
          wa: normalizedPhone,
        },
      },
    });

    if (error) {
      showToast(error.message || 'Registrasi gagal', 'error');
      return false;
    }

    if (data.user) {
      showToast('Berhasil! Silakan login.', 'success');
      return true;
    }

    return false;
  } catch (err: any) {
    showToast('Network error: ' + (err.message || 'Unknown'), 'error');
    return false;
  }
}

/**
 * Logout via Supabase + clear local auth state.
 */
export async function logoutSupabase(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // SignOut can fail if network is down — still clear local state
    }
  }
  authLogout();
}

// ─── Auth Listener (call once at boot) ────────────────

let listenerInitialized = false;

/**
 * Initialize Supabase auth listener.
 *
 * Call this ONCE at app boot:
 *   - In App.tsx useEffect
 *   - Or in BaseLayout.astro <script>
 *
 * What it does:
 * 1. Subscribes to supabase.auth.onAuthStateChange()
 * 2. On SIGNED_IN / TOKEN_REFRESHED: syncs session → authStore
 * 3. On SIGNED_OUT: clears authStore
 * 4. On initial session: restores state from Supabase (replaces manual localStorage check)
 *
 * Safe to call multiple times — idempotent via listenerInitialized flag.
 */
export function initializeAuthListener(): () => void {
  if (listenerInitialized) return () => {}; // already initialized
  if (!isSupabaseConfigured()) {
    console.warn('[UserStore] Supabase not configured — auth listener not started');
    return () => {};
  }

  listenerInitialized = true;
  console.log('[UserStore] Initializing Supabase auth listener');

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('[UserStore] Auth event:', event);

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED': {
          if (session?.user) {
            const user = session.user;
            const meta = user.user_metadata || {};
            const role = meta.role || 'kandidat';
            const name = meta.nama || meta.name || '';
            const phone = user.phone || '';

            if (role === 'admin') {
              loginAsAdmin(name, session.access_token, session.refresh_token);
            } else {
              loginAsKandidat(name, phone, session.access_token, session.refresh_token);
            }

            console.log('[UserStore] Session synced:', { role, name });
          }
          break;
        }

        case 'SIGNED_OUT': {
          console.log('[UserStore] Signed out — clearing auth state');
          authLogout();
          break;
        }

        case 'INITIAL_SESSION': {
          // First load — Supabase restored session from its own storage
          if (session?.user) {
            const user = session.user;
            const meta = user.user_metadata || {};
            const role = meta.role || 'kandidat';
            const name = meta.nama || meta.name || '';
            const phone = user.phone || '';

            // Only update if authStore is currently guest (avoid overwriting)
            const current = authStore.get();
            if (!current.isLoggedIn) {
              if (role === 'admin') {
                loginAsAdmin(name, session.access_token, session.refresh_token);
              } else {
                loginAsKandidat(name, phone, session.access_token, session.refresh_token);
              }
              console.log('[UserStore] Initial session restored:', { role, name });
            }
          }
          break;
        }

        default:
          break;
      }
    }
  );

  // Return cleanup function
  return () => {
    subscription.unsubscribe();
    listenerInitialized = false;
  };
}

// ─── Helpers ──────────────────────────────────────────

/**
 * Normalize phone number to Supabase E.164-ish format.
 * Input: "081234567890" or "6281234567890" or "+6281234567890"
 * Output: "6281234567890"
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');

  // Already has country code
  if (cleaned.startsWith('62') || cleaned.startsWith('81')) {
    return cleaned;
  }

  // Starts with 0 → replace with 62
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.slice(1);
  }

  // Starts with + → strip the +
  if (cleaned.startsWith('+')) {
    return cleaned.slice(1);
  }

  return cleaned;
}

// ─── Re-exports from authReactive (convenience) ──────

export {
  authStore,
  loginAsAdmin,
  loginAsKandidat,
  authLogout as logout,
  type AuthState,
};
