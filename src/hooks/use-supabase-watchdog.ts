'use client';

import { useEffect, useState } from 'react';
import { checkSupabaseConnection } from '@/lib/supabase';

const DEFAULT_WAIT_MS = 8000;

/**
 * Watches a loading flag. If loading persists past `waitMs`, probes the
 * Supabase health endpoint; returns true when the database is unreachable
 * (e.g., a paused free-tier project), so the UI can show a helpful note
 * instead of an endless loading state.
 *
 * The result is sticky — once unavailable is detected, it stays true until
 * the page is reloaded (the retry button does a full reload).
 */
export function useSupabaseWatchdog(loading: boolean, waitMs: number = DEFAULT_WAIT_MS): boolean {
  const [dbUnavailable, setDbUnavailable] = useState(false);

  useEffect(() => {
    if (!loading) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const reachable = await checkSupabaseConnection();
      if (!cancelled && !reachable) {
        setDbUnavailable(true);
      }
    }, waitMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, waitMs]);

  return dbUnavailable;
}
