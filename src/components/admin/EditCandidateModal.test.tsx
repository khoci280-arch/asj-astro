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

const mockCandidate = {
  wa: '6285854256720',
  nama: 'REVIN ANTHONIO NOVRI ANDHI',
  gender: 'LAKI-LAKI',
  usia: '19',
  tmplahir: 'Jakarta',
  tgllahir: '2005-01-15',
  fisik: '170',
  pendidikan: 'SMA',
  jft: 'A2',
  ssw: 'Perawat',
  tahapan: 'LIST',
  status: 'Aktif',
  isVIP: false,
  isSiswaASJ: false,
};

describe('EditCandidateModal', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(showToast).mockReset();
  });

  afterEach(() => cleanup());

  it('renders all editable fields from candidate data', () => {
    render(<EditCandidateModal candidate={mockCandidate} isOpen={true} onClose={() => {}} />);

    expect(screen.getAllByText(/REVIN ANTHONIO/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue('LAKI-LAKI')).toBeTruthy();
    expect(screen.getByDisplayValue('19')).toBeTruthy();
    expect(screen.getByDisplayValue('Jakarta')).toBeTruthy();
    expect(screen.getByDisplayValue('LIST')).toBeTruthy();
    expect(screen.getByDisplayValue('Aktif')).toBeTruthy();
    expect(screen.getByDisplayValue('A2')).toBeTruthy();
    expect(screen.getByDisplayValue('Perawat')).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <EditCandidateModal candidate={mockCandidate} isOpen={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('saves via updateKandidatSuper on submit', async () => {
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
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('updateKandidatSuper') })
      );
      expect(onClose).toHaveBeenCalled();
    });
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
