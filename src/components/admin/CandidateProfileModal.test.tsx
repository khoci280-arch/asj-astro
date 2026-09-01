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

const mockCandidateData = {
  nama: 'REVIN ANTHONIO NOVRI ANDHI',
  wa: '6285854256720',
  idKandidat: 'ASJ00159',
  gender: 'LAKI-LAKI',
  usia: '19',
  tahapan: 'Baru (LULUS)',
  status: 'LULUS',
  catatanInternal: 'Kekuahan/Catatan khusus admin',
  catatanExternal: 'Feedback untuk kandidat',
  isVIP: true,
  applications: [
    { code: 'UMUM', kategori: 'UMUM', status: 'LULUS', tahapan: 'LIST', timestamp: '2026-09-01', nama: 'REVIN' },
  ],
  berkas: { foto: '' },
  bio: {},
};

// Helper: find at least 1 matching element (handles double-render)
function expectExists(text: string | RegExp) {
  const els = typeof text === 'string' ? screen.getAllByText(text) : screen.getAllByText(text);
  expect(els.length).toBeGreaterThanOrEqual(1);
}

describe('CandidateProfileModal', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockCandidateData }),
    });
  });

  it('renders candidate name and VIP badge', async () => {
    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);
    await waitFor(() => {
      expectExists('REVIN ANTHONIO NOVRI ANDHI');
      expectExists('VIP');
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders biodata: gender, usia', async () => {
    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);
    await waitFor(() => {
      expectExists('Gender');
      expectExists('19 Tahun');
    });
  });

  it('renders job applications', async () => {
    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);
    await waitFor(() => {
      expectExists('UMUM');
      expectExists('LULUS');
    });
  });

  it('renders catatan internal and external', async () => {
    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);
    await waitFor(() => {
      expectExists('Catatan Internal (Private)');
      expectExists('Catatan External (Kandidat)');
    });
  });

  it('renders edit and download buttons', async () => {
    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);
    await waitFor(() => {
      expectExists(/Edit Data Cepat/);
      expectExists(/Download Full Biodata/);
    });
  });

  it('calls getAppData API on open', async () => {
    render(<CandidateProfileModal wa="6285854256720" nama="REVIN" isOpen={true} onClose={() => {}} />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/getAppData',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('6285854256720') })
      );
    });
  });
});
