// ==========================================
// TESTS: RirekishoBuilder (A10 parity, 2026-09-05)
//
// Astro padanan legacy renderCVAjaib (js/10_cv_rirekisho.ts + 10b_cv_builders)
// yang membuka preview CV Rirekisho dari tombol "Preview Desain CV" kandidat
// (bukaPreviewCV) dan tombol CV admin. Root bugs A10 yang dikunci di sini:
//   - tombol kandidat lama membuka DocumentPreviewModal dengan URL KOSONG
//     (tidak ada yang ditampilkan) — kini membuka RirekishoBuilder
//   - foto: legacy pakai uploads.photo master, fallback pasPhoto baris
//     kandidat (ALL_CANDIDATES); builder lama cuma uploads.photo → fallback
//     baru via prop fotoFallback (TabPelamar / CandidateDash meneruskan row)
//   - loading copy hard-coded "Loading..." → t('ui.loading')
// Tanggal rirekisho diformat via helpers_cv (di-test terpisah di helpers_cv.test).
// ==========================================
import { render, screen, cleanup, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RirekishoBuilder from './RirekishoBuilder';
import * as auth from '../../store/authReactive';

const { mockDraft } = vi.hoisted(() => ({ mockDraft: vi.fn() }));

vi.mock('../../lib/apiClient', () => {
  const fn: any = (...args: unknown[]) => mockDraft(...args);
  fn.call = fn;
  return { default: fn };
});

vi.mock('../../store/authReactive', () => {
  let role = 'kandidat';
  return {
    __setRole: (r: string) => { role = r; },
    authStore: {
      get: () => ({
        role, name: role === 'admin' ? 'AGUS' : 'KANDIDAT A',
        wa: '6281234567890', sessionToken: 'tok-1', refreshToken: '',
        isLoggedIn: true, lastChecked: 0,
      }),
      set: () => {},
      listen: () => () => {},
    },
    logout: vi.fn(),
  };
});

const draft = {
  id_kandidat: 'ASJ00123',
  AIDATAJSON: '',
  uploads: { photo: '' },
  identitas: {
    nama_lengkap: 'KANDIDAT A',
    gender: 'LAKI-LAKI',
    tgl_lahir: '1995-08-14',
  },
  pendidikan: [{ tingkat: 'SMA', tahun_masuk: '2010-04', tahun_lulus: '2013-03' }],
  pekerjaan: [],
  keluarga: [],
};

const setRole = (r: string) => (auth as any).__setRole(r);

describe('RirekishoBuilder (A10)', () => {
  beforeEach(() => {
    mockDraft.mockReset();
    mockDraft.mockResolvedValue(draft);
    setRole('kandidat');
  });

  afterEach(() => cleanup());

  it('kandidat: preview CV (bukaPreviewCV) — MODE PREVIEW tanpa tombol cetak, data & tanggal Jepang dirender', async () => {
    const { container } = render(
      <RirekishoBuilder waTarget="6281234567890" isOpen={true} onClose={() => {}} />,
    );
    expect(screen.getByText('Memuat...')).toBeTruthy();
    await waitFor(() => expect(mockDraft).toHaveBeenCalledWith('getDrafCvMaster', ['6281234567890']));
    await waitFor(() => expect(container.innerHTML).toContain('実習生経歴書'));
    expect(container.innerHTML).toContain('DAFTAR RIWAYAT HIDUP');
    expect(container.innerHTML).toContain('KANDIDAT A');
    // Tanggal lahir diformat YYYY年MM月DD日 (parity legacy renderCVAjaib).
    expect(container.innerHTML).toContain('1995年08月14日');
    // Bulan masuk pendidikan → 2010年4月
    expect(container.innerHTML).toContain('2010年4月');
    expect(container.innerHTML).toContain('MODE PREVIEW');
    expect(container.innerHTML).not.toContain('Cetak Rirekisho');
  });

  it('admin: tombol Cetak Rirekisho / Simpan PDF dirender (tombol hanya utk admin)', async () => {
    setRole('admin');
    const { container } = render(
      <RirekishoBuilder waTarget="6281234567890" isOpen={true} onClose={() => {}} />,
    );
    await waitFor(() => expect(container.innerHTML).toContain('実習生経歴書'));
    expect(container.innerHTML).toContain('Cetak Rirekisho');
    expect(container.innerHTML).toContain('Simpan PDF');
    expect(container.innerHTML).not.toContain('MODE PREVIEW');
  });

  it('error dari getDrafCvMaster → pesan asli server tampil', async () => {
    mockDraft.mockResolvedValue({ error: 'Data Master belum ada untuk KANDIDAT A (6281234567890). Isi Form Master dulu.' });
    render(<RirekishoBuilder waTarget="6281234567890" isOpen={true} onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText(/Data Master belum ada untuk KANDIDAT A/)).toBeTruthy(),
    );
  });

  it('foto: uploads.photo master kosong + fotoFallback row → img pakai fallback', async () => {
    const { container } = render(
      <RirekishoBuilder waTarget="6281234567890" isOpen={true} onClose={() => {}} fotoFallback="https://cdn.example/asj/pas-photo.jpg" />,
    );
    await waitFor(() => expect(container.innerHTML).toContain('実習生経歴書'));
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/asj/pas-photo.jpg');
  });

  it('foto: uploads.photo master ada → dipakai (fallback tidak mengalahkan master)', async () => {
    mockDraft.mockResolvedValue({ ...draft, uploads: { photo: 'https://cdn.example/master/foto.jpg' } });
    const { container } = render(
      <RirekishoBuilder waTarget="6281234567890" isOpen={true} onClose={() => {}} fotoFallback="https://cdn.example/asj/pas-photo.jpg" />,
    );
    await waitFor(() => expect(container.innerHTML).toContain('実習生経歴書'));
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/master/foto.jpg');
  });

  it('isOpen=false → tidak render apa pun', () => {
    const { container } = render(
      <RirekishoBuilder waTarget="6281234567890" isOpen={false} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
    expect(mockDraft).not.toHaveBeenCalled();
  });
});
