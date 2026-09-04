import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EditCandidateModal from './EditCandidateModal';
import { showToast } from '../Toast';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../store/authReactive', () => ({
  authStore: { get: () => ({ sessionToken: 'test-token' }) },
}));

vi.mock('../../lib/apiEndpoint', () => ({
  getEndpoint: (key: string) => `/.netlify/functions/${key}`,
}));

vi.mock('../Toast', () => ({
  showToast: vi.fn(),
}));

// Row shape = mapCandidate ter-dekorasi (getCandidatesPage): field flat
// camelCase (tempatLahir/tglLahir/tb/bb/jftText/sswText) + catatanInt (tag
// VIP/KELAS) + catatanExt — bukan nama lama (tmplahir/fisik/jft-url).
const mockCandidate = {
  wa: '6285854256720',
  nama: 'REVIN ANTHONIO NOVRI ANDHI',
  gender: 'LAKI-LAKI',
  usia: '19',
  tempatLahir: 'Jakarta',
  tglLahir: '',
  tb: '170',
  bb: '65',
  pendidikan: 'SMA',
  jftText: 'A2',
  sswText: 'Perawat',
  tahapan: 'LIST',
  status: 'Aktif',
  catatanInt: '[KELAS G] Catatan internal admin',
  catatanExt: 'Feedback untuk kandidat',
  isVIP: false,
  isSiswaASJ: true,
};

describe('EditCandidateModal', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(showToast).mockReset();
  });

  afterEach(() => cleanup());

  it('renders all editable fields from the decorated row', () => {
    render(<EditCandidateModal candidate={mockCandidate} isOpen={true} onClose={() => {}} />);

    expect(screen.getAllByText(/REVIN ANTHONIO/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue('LAKI-LAKI')).toBeTruthy();
    expect(screen.getByDisplayValue('19')).toBeTruthy();
    expect(screen.getByDisplayValue('Jakarta')).toBeTruthy();
    expect(screen.getByDisplayValue('170')).toBeTruthy();
    expect(screen.getByDisplayValue('65')).toBeTruthy();
    expect(screen.getByDisplayValue('SMA')).toBeTruthy();
    expect(screen.getByDisplayValue('LIST')).toBeTruthy();
    expect(screen.getByDisplayValue('Aktif')).toBeTruthy();
    expect(screen.getByDisplayValue('A2')).toBeTruthy();
    expect(screen.getByDisplayValue('Perawat')).toBeTruthy();
    // Catatan external terisi dari catatanExt (bukan catatan_admin).
    expect(screen.getByDisplayValue('Feedback untuk kandidat')).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <EditCandidateModal candidate={mockCandidate} isOpen={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('saves via updateKandidatSuper with pendidikan/catatanExt/isVip in one call', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    const onClose = vi.fn();
    const { container } = render(
      <EditCandidateModal candidate={mockCandidate} isOpen={true} onClose={onClose} />
    );

    const saveBtn = container.querySelector('button.bg-sky-600') as HTMLButtonElement;
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/updateKandidatSuper',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('updateKandidatSuper'),
        })
      );
      const bodyArg = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      const arg = bodyArg.args[0];
      expect(arg.pendidikan).toBe('SMA');
      expect(arg.catatanExt).toBe('Feedback untuk kandidat');
      expect(arg.isVip).toBe(false);
      expect(arg.tempatLahir).toBe('Jakarta');
      // Satu panggilan saja — catatan tidak disimpan lewat action terpisah.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('seeds VIP state from the [VIP] tag in catatan internal', () => {
    render(
      <EditCandidateModal
        candidate={{ ...mockCandidate, catatanInt: '[VIP] [KELAS G] note' }}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('[VIP] Aktif')).toBeTruthy();
  });

  it('shows error toast on API failure', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ success: false, error: 'Kandidat tidak ditemukan.' }) });
    const { container } = render(
      <EditCandidateModal candidate={mockCandidate} isOpen={true} onClose={() => {}} />
    );

    const saveBtn = container.querySelector('button.bg-sky-600') as HTMLButtonElement;
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Kandidat tidak ditemukan.', 'error');
    });
  });

  it('calls onClose when Tutup is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <EditCandidateModal candidate={mockCandidate} isOpen={true} onClose={onClose} />
    );

    const closeBtn = container.querySelector('button.bg-slate-700') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
