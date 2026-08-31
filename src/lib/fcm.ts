/**
 * fcm.ts — Firebase Cloud Messaging client for Astro/Preact
 * 
 * Loads Firebase SDK from CDN (lazy) — no build-time dependency.
 * Mirrors legacy js/fcm-client.ts exactly.
 */

function getFcmConfig() {
  // Config from PUBLIC_ env vars (Astro) with hardcoded fallbacks
  const g = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
  return {
    apiKey: g?.PUBLIC_FIREBASE_API_KEY || 'AIzaSyDQVyjXmiF1M5bnwJciIptZTWn8RcnyViE',
    projectId: g?.PUBLIC_FIREBASE_PROJECT_ID || 'khoci-7a81c',
    messagingSenderId: g?.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1090676733378',
    appId: g?.PUBLIC_FIREBASE_APP_ID || '1:1090676733378:web:3c0aa57a7ef133fc34925b',
  };
}

let messaging: unknown = null;

/** Firebase app instance (loaded from CDN) */
interface FirebaseCompat {
  apps: unknown[];
  initializeApp: (config: Record<string, string>) => void;
  messaging: () => unknown;
}

/**
 * Initialize Firebase App & Messaging.
 * Called asynchronously when PWA loads.
 */
export async function initFCM(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[FCM] Browser does not support Push Notification.');
    return;
  }

  try {
    const w = window as unknown as Record<string, unknown>;
    if (!w.firebase) {
      // Firebase CDN imports — these set window.firebase as a side effect
      await (globalThis as any).__firebase_import_app || ((globalThis as any).__firebase_import_app = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js'));
      await (globalThis as any).__firebase_import_msg || ((globalThis as any).__firebase_import_msg = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js'));
    }

    const fb = w.firebase as FirebaseCompat;
    const apps = fb.apps || [];
    if (!apps.length) {
      fb.initializeApp(getFcmConfig());
    }

    messaging = fb.messaging();

    // Capture notifications when app is in foreground
    const m = messaging as Record<string, unknown>;
    (m.onMessage as (cb: (payload: Record<string, unknown>) => void) => void)((payload) => {
      console.log('[FCM] Foreground message:', payload);
      const data = (payload.data || {}) as Record<string, string>;
      const notif = (payload.notification || {}) as Record<string, string>;
      const title = data.title || notif.title || 'Notifikasi Baru';
      const body = data.body || notif.body || '';
      if (typeof window !== 'undefined' && typeof (window as unknown as Record<string, unknown>).showToast === 'function') {
        ((window as unknown as Record<string, unknown>).showToast as (msg: string, type: string) => void)(`${title}: ${body}`, 'info');
      }
    });

    console.log('[FCM] Firebase Messaging initialized.');
  } catch (err) {
    console.error('[FCM] Init failed:', err);
  }
}

/**
 * Request notification permission and register FCM token with backend.
 * @param userId - The logged-in user's ID (admin or kandidat WA)
 */
export async function requestNotificationPermission(userId: string): Promise<void> {
  if (!messaging) await initFCM();
  if (!messaging) return;

  try {
    if (await Notification.requestPermission() !== 'granted') {
      console.warn('[FCM] Notification permission denied.');
      return;
    }

    // Wait for Service Worker registration
    let reg = navigator.serviceWorker.getRegistration();
    for (let i = 0; i < 10 && !(await reg); i++) {
      await new Promise(r => setTimeout(r, 500));
      reg = navigator.serviceWorker.getRegistration();
    }

    const registration = await reg;
    if (!registration) {
      console.warn('[FCM] Service Worker not registered — skipping token.');
      return;
    }

    const m = messaging as Record<string, unknown>;
    const getToken = m.getToken as (opts: { serviceWorkerRegistration: ServiceWorkerRegistration }) => Promise<string>;
    const token = await getToken({ serviceWorkerRegistration: registration });

    if (token) {
      console.log('[FCM] Token obtained:', token);
      // Register token with backend via apiClient
      const { apiClient } = await import('./apiClient');
      await apiClient('registerFcmToken', [userId, token, navigator.userAgent]);
      console.log('[FCM] Token registered with backend.');
    } else {
      console.warn('[FCM] Failed to get registration token.');
    }
  } catch (err) {
    console.error('[FCM] Permission request failed:', err);
  }
}
