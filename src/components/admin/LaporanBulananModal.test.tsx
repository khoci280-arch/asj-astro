// ==========================================
// TESTS: LaporanBulananModal (A13 parity, 2026-09-05)
//
// Legacy ground truth: js/render/candidate.ts `showMonthlyReport()` →
// calls `getMonthlyReport` (backend aggregates ALL candidates) then renders
// per-loker cards with tahapan + status chips over a simple modal.
// Root bugs covered:
//   - The Astro modal NEVER called the backend: it aggregated the client-side
//     `kandidatList` store (only the currently loaded/filtered page), so the
//     report was incomplete and never matched legacy. Now api.secure('getMonthlyReport').
//   - totalCandidates + generatedAt header metadata and the empty state were
//     missing; the whole modal was hard-coded Indonesian (no i18n keys).
// ==========================================
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LaporanBulananModal from './LaporanBulananModal';
import { showToast } from '../Toast';

const { mockSecure } = vi.hoisted(() => ({ mockSecure: vi.fn() }));

vi.mock('../Toast', () => ({ showToast: vi.fn() }));

vi.mock('../../lib/apiClient', () => {
  const api = { secure: (...args: unknown[]) => mockSecure(...args), get: vi.fn() };
  return { api, default: api };
});

// Pass-through so copy assertions read the real key names (like other modal tests).
vi.mock('../../store/i18n', () => ({ t: (k: string) => k }));

// Minimal controllable nanostore-shaped mock for reportModalOpen.
const { openState } = vi.hoisted(() => {
  let value = false;
  const listeners = new Set<(v: boolean) => void>();
  return {
    openState: {
      get: () => value,
      set: (v: boolean) => {
        value = v;
        listeners.forEach((fn) => fn(v));
      },
      listen: (fn: (v: boolean) => void) => {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      },
      subscribe: (fn: (v: boolean) => void) => {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      },
      setKey: vi.fn(),
      reset: () => {
        value = false;
      },
    },
  };
});

vi.mock('../../store/adminStore', () => ({
  reportModalOpen: openState,
  closeReportModal: () => openState.set(false),
}));

const REPORT = {
  success: true,
  totalCandidates: 7,
  generatedAt: '2026-09-05T10:00:00.000Z',
  report: [
    {
      loker: 'TG658',
      total: 5,
      tahapan: { LIST: 3, TES: 2 },
      status: { OPEN: 4, CLOSE: 1 },
    },
    {
      loker: 'ASJ2',
      total: 2,
      tahapan: { BARU: 2 },
      status: { OPEN: 2 },
    },
  ],
};

describe('LaporanBulananModal (A13)', () => {
  beforeEach(() => {
    mockSecure.mockReset();
    mockSecure.mockResolvedValue(REPORT);
    vi.mocked(showToast).mockReset();
    openState.reset();
  });

  afterEach(() => {
    cleanup();
    openState.reset();
  });

  it('closed → renders nothing and never calls the backend', () => {
    render(<LaporanBulananModal />);
    expect(mockSecure).not.toHaveBeenCalled();
    expect(document.body.textContent || '').not.toContain('TG658');
  });

  it('open → calls api.secure(getMonthlyReport) and renders the server report', async () => {
    render(<LaporanBulananModal />);
    openState.set(true);
    await waitFor(() => expect(mockSecure).toHaveBeenCalledTimes(1));
    expect(mockSecure.mock.calls[0][0]).toBe('getMonthlyReport');
    // Title + total + generated date header (legacy admin.report_* copy keys).
    expect(screen.getByText('admin.report_title')).toBeTruthy();
    await screen.findByText(/admin\.report_total:/);
    expect(screen.getByText('2026-09-05')).toBeTruthy();
    // Per-loker cards with stage + status chips.
    expect(screen.getByText('TG658')).toBeTruthy();
    expect(screen.getByText('ASJ2')).toBeTruthy();
    expect(screen.getByText('LIST: 3')).toBeTruthy();
    expect(screen.getByText('TES: 2')).toBeTruthy();
    expect(screen.getByText('OPEN: 4')).toBeTruthy();
    // info toast announcement (legacy behaviour)
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('admin.report_title', 'info');
  });

  it('empty report → renders admin.report_empty', async () => {
    mockSecure.mockResolvedValue({
      success: true,
      totalCandidates: 0,
      generatedAt: '2026-09-05T10:00:00.000Z',
      report: [],
    });
    render(<LaporanBulananModal />);
    openState.set(true);
    await waitFor(() => expect(screen.getByText('admin.report_empty')).toBeTruthy());
  });

  it('server error → toast ui.toast_failed_prefix + real error, no cards', async () => {
    mockSecure.mockResolvedValue({ success: false, error: 'Gagal generate laporan: X' });
    render(<LaporanBulananModal />);
    openState.set(true);
    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith(
        'ui.toast_failed_prefix Gagal generate laporan: X',
        'error',
      ),
    );
    expect(screen.queryByText('admin.report_empty')).toBeNull();
    expect(document.body.textContent || '').not.toContain('TG658');
  });

  it('network failure → error toast (catch path)', async () => {
    mockSecure.mockRejectedValue(new Error('Network error'));
    render(<LaporanBulananModal />);
    openState.set(true);
    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith(
        'ui.toast_failed_prefix Network error',
        'error',
      ),
    );
  });

  it('close button → store closed', async () => {
    render(<LaporanBulananModal />);
    openState.set(true);
    await waitFor(() => expect(screen.getByText('TG658')).toBeTruthy());
    const headerClose = document.querySelector('h3 + button') as HTMLButtonElement;
    fireEvent.click(headerClose);
    expect(openState.get()).toBe(false);
  });
});
