import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, render, screen, waitFor } from '@testing-library/react';
import { useSupabaseWatchdog } from '@/hooks/use-supabase-watchdog';
import { DatabaseUnavailable } from '@/components/database-unavailable';

vi.mock('@/lib/supabase', () => ({
  checkSupabaseConnection: vi.fn(),
}));

const mockCheck = vi.mocked(await import('@/lib/supabase')).checkSupabaseConnection;

describe('useSupabaseWatchdog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports unavailable when loading persists and database is unreachable', async () => {
    mockCheck.mockResolvedValue(false);

    const { result } = renderHook(() => useSupabaseWatchdog(true, 20));

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(mockCheck).toHaveBeenCalled();
  });

  it('stays available when database is reachable', async () => {
    mockCheck.mockResolvedValue(true);

    const { result } = renderHook(() => useSupabaseWatchdog(true, 20));

    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalled();
    });
    expect(result.current).toBe(false);
  });

  it('does not probe when loading finishes quickly', async () => {
    mockCheck.mockResolvedValue(false);

    const { result, rerender } = renderHook(
      ({ loading }) => useSupabaseWatchdog(loading, 50),
      { initialProps: { loading: true } }
    );

    // Loading finishes before the watchdog fires
    rerender({ loading: false });
    await new Promise((r) => setTimeout(r, 80));

    expect(mockCheck).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });
});

describe('DatabaseUnavailable', () => {
  it('renders the note with a retry button', () => {
    render(<DatabaseUnavailable />);

    expect(screen.getByText('Database is unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/The database may be paused due to inactivity/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
