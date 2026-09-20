import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.');
}

try {
  new URL(supabaseUrl);
} catch (e) {
  throw new Error(`Invalid Supabase URL: ${supabaseUrl}. Please check your .env.local file.`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

/**
 * Check whether the Supabase project is reachable.
 *
 * Free-tier Supabase projects are paused after ~1 week of inactivity; requests
 * then hang or fail, leaving the app stuck on a loading screen. This probes the
 * lightweight auth health endpoint with a hard timeout so callers can show a
 * helpful message instead of loading forever.
 */
export async function checkSupabaseConnection(timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      // The module-level guard above ensures the key exists; TS narrowing
      // does not flow into function bodies, hence the assertion.
      headers: { apikey: supabaseAnonKey as string },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    // Network error, DNS failure, or timeout — project is unreachable/paused
    return false;
  } finally {
    clearTimeout(timer);
  }
}
