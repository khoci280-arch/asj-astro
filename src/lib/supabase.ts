/**
 * supabase.ts — Supabase Client Singleton
 *
 * Creates a single Supabase client instance shared across the app.
 * Uses Astro PUBLIC_ env vars (exposed to client-side via import.meta.env).
 *
 * This client handles:
 * - Authentication (signIn, signUp, signOut, onAuthStateChange)
 * - Realtime subscriptions (future)
 * - Storage (file uploads — already used via CDN URLs)
 *
 * Pattern: singleton module export — import { supabase } from '@/lib/supabase'
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY in environment. ' +
    'Auth features will be disabled. Copy .env.example to .env and fill in values.'
  );
}

/**
 * Supabase client — safe to import anywhere.
 * If env vars are missing, client is created with empty strings
 * (API calls will fail gracefully with errors, no crash).
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key'
);

/**
 * Helper: check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
