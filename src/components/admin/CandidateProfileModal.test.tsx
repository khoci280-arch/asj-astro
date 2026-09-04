import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CandidateProfileModal from './CandidateProfileModal';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../store/authReactive', () => ({
  authStore: { get: () => ({ sessionToken: 'test-token' }) },
}));

vi.mock('../../lib/apiEndpoint', () => ({
  getEndpoint: (key: string) => `/.netlify/functions/${key}`,
}));

// Real API shape (getCandidatesPage / mapCandidate): decorated row with flat
// legacy fields + berkas/bio/applications, exactly like the row TabPelamar
// passes into the modal through the showCandidateHistory event.
const mockCandidate = {
  nama: 'REVIN ANTHONIO NOVRI ANDHI',
  wa: '6285854256720',
  idKandidat: 'ASJ00159',
  gender: 'LAKI-LAKI',
  usia: '19',
  tb: '175',
  bb: '70',
  tahapan: 'Baru (LULUS)',
  status: 'LULUS',
  catatanInt: '[KELAS G] Kekuatan/Catatan khusus admin',
  catatanExt: 'Feedback untuk kandidat',
  isSiswaASJ: true,
  jftText: 'A2',
  sswText: 'SSW',
  applications: [{ code: 'UMUM', kategori: 'UMUM', status: 'LULUS' }],
  berkas: { ktp: 'https://x.supabase.co/ktp.pdf' },
  bio: { tmplahir: 'Ponorogo', tgllahir: '2007-01-01', email: 'revin@test.com', alamat: 'Jl. Test 1' },
};

function expectExists(text: string | RegExp) {
  const els = screen.getAllByText(text);
  expect(els.length).toBeGreaterThanOrEqual(1);
}

describe('CandidateProfileModal', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders from the passed decorated candidate row without any fetch', async () => {
    render(
      <CandidateProfileModal
        wa={mockCandidate.wa}
        nama="REVIN"
        candidate={mockCandidate}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expectExists('REVIN ANTHONIO NOVRI ANDHI');
    expectExists('Siswa ASJ');
    expectExists('19 Tahun');
    expectExists('LAKI-LAKI');
    expectExists('175 / 70');
    expectExists('A2');
    expectExists('LULUS');
    // Data comes from the row — no network call at all.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('falls back to getExistingCandidateJsonByWa when no row is passed', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockCandidate }),
    });

    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expectExists('REVIN ANTHONIO NOVRI ANDHI');
      expectExists('Siswa ASJ');
      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/getExistingCandidateJsonByWa',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'getExistingCandidateJsonByWa',
            args: ['6285854256720'],
            sessionToken: 'test-token',
          }),
        })
      );
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
    resolveFetch!({ json: () => Promise.resolve({ success: true, data: mockCandidate }) });

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

  it('does not fetch when wa is empty and no row is passed', () => {
    render(<CandidateProfileModal wa="" nama="REVIN" isOpen={true} onClose={() => {}} />);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('saves catatan internal/external + VIP tag via updateCatatanKandidat', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ success: true }) });

    const changed: string[] = [];
    const onChanged = (e: Event) => changed.push((e as CustomEvent).detail?.wa || '');
    window.addEventListener('candidates-changed', onChanged);

    render(
      <CandidateProfileModal
        wa={mockCandidate.wa}
        nama="REVIN"
        candidate={mockCandidate}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Seed row has no [VIP] → toggle it on, then save.
    fireEvent.click(screen.getByText('☐ Tandai VIP'));
    fireEvent.click(screen.getByText('Simpan Evaluasi Catatan'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/updateCatatanKandidat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'updateCatatanKandidat',
            args: [
              {
                wa: mockCandidate.wa,
                // VIP prefix added; raw textarea content kept as-is.
                catatanInternal: '[VIP] [KELAS G] Kekuatan/Catatan khusus admin',
                catatanExternal: mockCandidate.catatanExt,
              },
            ],
            sessionToken: 'test-token',
          }),
        })
      );
    });

    await waitFor(() => {
      // Row refresh signal dispatched so TabPelamar refetches.
      expect(changed).toContain(mockCandidate.wa);
    });
    window.removeEventListener('candidates-changed', onChanged);
  });
});
