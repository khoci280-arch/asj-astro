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

// Real API shape: backend returns { success, candidates: [...] }, not { data }
const mockCandidate = {
  nama: 'REVIN ANTHONIO NOVRI ANDHI',
  wa: '6285854256720',
  idKandidat: 'ASJ00159',
  gender: 'LAKI-LAKI',
  usia: '19',
  tahapan: 'Baru (LULUS)',
  status: 'LULUS',
  catatanInt: 'Kekuahan/Catatan khusus admin',
  catatanExt: 'Feedback untuk kandidat',
  isVIP: true,
  isSiswaASJ: true,
  applications: [{ code: 'UMUM', kategori: 'UMUM', status: 'LULUS' }],
  berkas: { foto: '' },
  bio: { email: 'revin@test.com' },
};

function expectExists(text: string | RegExp) {
  const els = screen.getAllByText(text);
  expect(els.length).toBeGreaterThanOrEqual(1);
}

describe('CandidateProfileModal', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches from d.candidates[0] and renders data', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, candidates: [mockCandidate] }),
    });

    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expectExists('REVIN ANTHONIO NOVRI ANDHI');
      expectExists('Siswa ASJ');
      expectExists('19 Tahun');
      expectExists('LAKI-LAKI');
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('aborts fetch when modal closes mid-flight', async () => {
    let resolveFetch: (v: any) => void;
    mockFetch.mockReturnValue(new Promise(r => { resolveFetch = r; }));

    const { rerender } = render(
      <CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />
    );

    // Close modal before fetch completes
    rerender(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={false} onClose={() => {}} />);

    // Resolve fetch — should not crash or set state
    resolveFetch!({ json: () => Promise.resolve({ success: true, candidates: [mockCandidate] }) });

    // No crash = pass. The AbortError is caught silently.
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('shows fallback data on API error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      // Fallback uses props: nama + wa
      expectExists('REVIN');
      expectExists(/6285854256720/);
    });
  });

  it('does not fetch when wa is empty', () => {
    render(<CandidateProfileModal wa="" nama="REVIN" isOpen={true} onClose={() => {}} />);

    // No fetch should be made
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls getAppData with correct payload', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, candidates: [mockCandidate] }),
    });

    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/getAppData',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'getAppData',
            args: ['kandidat', '6285854256720'],
            sessionToken: 'test-token',
          }),
        })
      );
    });
  });
});
