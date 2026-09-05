// ==========================================
// TESTS: ChangePasswordModal (A08 parity, 2026-09-05)
//
// Legacy ground truth: partials/modals-shared.html #modal-ganti-pass +
// js/04_auth.ts prosesGantiPasswordKandidat(). Root bugs covered:
//   - session token now goes through apiClient (raw fetch sent none → the
//     surface always answered 'Akses ditolak.')
//   - validation is legacy-exact (isi semua → cocok → baru 6-20 tanpa spasi)
//   - server failures surface data.message (old code read data.error, which
//     the Astro backend never emits → generic wrong-password toast)
//   - all copy via t('changepass.*')
// ==========================================
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChangePasswordModal from './ChangePasswordModal';
import { showToast } from './Toast';

const { mockSecure } = vi.hoisted(() => ({ mockSecure: vi.fn() }));

vi.mock('./Toast', () => ({ showToast: vi.fn() }));

vi.mock('../lib/apiClient', () => ({
  api: { secure: (...args: unknown[]) => mockSecure(...args) },
}));

vi.mock('../store/authReactive', () => {
  const listeners = new Set<() => void>();
  const state = {
    role: 'kandidat', name: 'KANDIDAT', wa: '6281234567890',
    sessionToken: 'tok-1', refreshToken: '', isLoggedIn: true, lastChecked: 0,
  };
  return {
    authStore: {
      get: () => state,
      set: () => {},
      listen: (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    },
    logout: vi.fn(),
  };
});

const WA = '6281234567890';
const passwordInputs = () => document.querySelectorAll('input[type="password"]');

describe('ChangePasswordModal (A08)', () => {
  beforeEach(() => {
    mockSecure.mockReset();
    mockSecure.mockResolvedValue({ success: true });
    vi.mocked(showToast).mockReset();
  });

  afterEach(() => cleanup());

  it('renders legacy copy via t() (title, labels, hint 6-20/no-space, submit)', () => {
    render(<ChangePasswordModal onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Ganti Password' })).toBeTruthy();
    expect(screen.getByText('Password Lama')).toBeTruthy();
    expect(screen.getByText('Password Baru')).toBeTruthy();
    expect(screen.getByText('Konfirmasi Password Baru')).toBeTruthy();
    expect(screen.getByText(/Password baru 6-20 karakter, tanpa spasi/)).toBeTruthy();
    expect(passwordInputs().length).toBe(3);
  });

  it('field kosong → toast error.fill_all, tanpa panggilan API', async () => {
    render(<ChangePasswordModal onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Password' }));
    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledWith('Semua field wajib diisi!', 'error'));
    expect(mockSecure).not.toHaveBeenCalled();
  });

  it('konfirmasi tidak cocok → toast error.password_mismatch', async () => {
    render(<ChangePasswordModal onClose={() => {}} />);
    const [old, nw, conf] = passwordInputs();
    fireEvent.input(old, { target: { value: 'lama1234' } });
    fireEvent.input(nw, { target: { value: 'baru1234' } });
    fireEvent.input(conf, { target: { value: 'baru9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Password' }));
    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledWith('Password baru tidak cocok!', 'error'));
    expect(mockSecure).not.toHaveBeenCalled();
  });

  it('baru <6, >20, atau mengandung spasi → toast hint legacy, tanpa API', async () => {
    for (const bad of ['12345', '123456789012345678901', '123 456']) {
      cleanup();
      vi.mocked(showToast).mockReset();
      render(<ChangePasswordModal onClose={() => {}} />);
      const [old, nw, conf] = passwordInputs();
      fireEvent.input(old, { target: { value: 'lama1234' } });
      fireEvent.input(nw, { target: { value: bad } });
      fireEvent.input(conf, { target: { value: bad } });
      fireEvent.click(screen.getByRole('button', { name: 'Ganti Password' }));
      await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledWith(
        expect.stringMatching(/6-20 karakter, tanpa spasi/), 'error',
      ));
      expect(mockSecure).not.toHaveBeenCalled();
    }
  });

  it('berhasil → api.secure(gantiPasswordKandidat, [wa, lama, baru]) + toast sukses + onClose', async () => {
    const onClose = vi.fn();
    render(<ChangePasswordModal onClose={onClose} />);
    const [old, nw, conf] = passwordInputs();
    fireEvent.input(old, { target: { value: 'lama1234' } });
    fireEvent.input(nw, { target: { value: 'baru-2026!' } });
    fireEvent.input(conf, { target: { value: 'baru-2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Password' }));
    await waitFor(() => expect(mockSecure).toHaveBeenCalledWith('gantiPasswordKandidat', [WA, 'lama1234', 'baru-2026!']));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      'Password berhasil diganti! Gunakan password baru saat login berikutnya.', 'success',
    );
  });

  it('server menolak → pesan asli server (data.message) tampil, bukan fallback generik', async () => {
    mockSecure.mockResolvedValue({ success: false, message: 'Password lama salah.' });
    render(<ChangePasswordModal onClose={() => {}} />);
    const [old, nw, conf] = passwordInputs();
    fireEvent.input(old, { target: { value: 'lama-salah' } });
    fireEvent.input(nw, { target: { value: 'baru-2026!' } });
    fireEvent.input(conf, { target: { value: 'baru-2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Password' }));
    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledWith('Password lama salah.', 'error'));
  });
});
