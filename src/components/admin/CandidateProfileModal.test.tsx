import { render, screen, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CandidateProfileModal from './CandidateProfileModal';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../store/authReactive', () => ({
  authStore: { get: () => ({ sessionToken: 'test-token' }) },
}));

vi.mock('../../lib/apiEndpoint', () => ({
  getEndpoint: (key: string) => `/.netlify/functions/${key}`,
}));

vi.mock('../../store/i18n', () => ({ t: (k: string) => k }));

describe('CandidateProfileModal', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: {
          nama: 'Budi Santoso',
          wa: '6281234567890',
          gender: 'LAKI-LAKI',
          usia: '25',
          jft: 'A2',
          tahapan: 'CHECK KAIWA',
          applications: [{ code: 'TG658ASJ', tahapan: 'CHECK KAIWA', status: 'REVIEW', tanggal: '2026-09-01' }],
          schedules: [],
          documents: [],
        },
      }),
    });
  });

  it('renders candidate name after data loads', async () => {
    render(
      <CandidateProfileModal wa="6281234567890" nama="Budi Santoso" isOpen={true} onClose={() => {}} />
    );
    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeTruthy();
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CandidateProfileModal wa="6281234567890" nama="Budi Santoso" isOpen={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows all four tabs after data loads', async () => {
    render(
      <CandidateProfileModal wa="6281234567890" nama="Budi Santoso" isOpen={true} onClose={() => {}} />
    );
    await waitFor(() => {
      expect(screen.getByText('Riwayat')).toBeTruthy();
      expect(screen.getByText('Dokumen')).toBeTruthy();
      expect(screen.getByText('Jadwal')).toBeTruthy();
      expect(screen.getByText('Catatan')).toBeTruthy();
    });
  });

  it('calls getAppData API on open', async () => {
    render(
      <CandidateProfileModal wa="6281234567890" nama="Budi Santoso" isOpen={true} onClose={() => {}} />
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/getAppData',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('6281234567890'),
        })
      );
    });
  });
});
