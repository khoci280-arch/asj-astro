/**
 * supabase-server.ts — Server-side Supabase Client (Astro SSR)
 *
 * Uses @supabase/ssr for cookie-based auth in Netlify Serverless Functions.
 * Import this ONLY in .astro frontmatter (server-side).
 *
 * Pattern:
 *   import { supabaseServer } from '../lib/supabase-server';
 *   const { data, error } = await supabaseServer(Astro).from('table').select('*');
 */
import { createClient, type SupabaseClient } from '@supabase/ssr';
import type { AstroGlobal } from 'astro';

/**
 * Create a Supabase client for server-side usage (SSR).
 * Reads auth tokens from cookies set by the client-side Supabase.
 *
 * @param astro - The Astro global object (provides request.cookies)
 * @returns SupabaseClient configured for server-side auth
 */
export function supabaseServer(astro: AstroGlobal): SupabaseClient {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL || '',
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return astro.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            astro.cookies.set(name, value, options);
          } catch {
            // Cookie setting may fail in some SSR contexts
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            astro.cookies.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase client for service-level operations (no user auth needed).
 * Uses the service role key for admin operations.
 */
export function supabaseServiceRole(): SupabaseClient {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL || '',
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
  );
}
