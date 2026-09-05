// ==========================================
// TESTS: WAPintarModal (B02 parity, 2026-09-05)
//
// Legacy ground truth: js/08_wa_pintar.js bukaModalWaPintar/terapkanTemplateWa/
// kirimWaPintar (#modal-wa-pintar). Root bugs pinned here:
//   - the modal was never reachable from admin rows (TabPelamar's WA button was
//     a bare wa.me link) — trigger ported in TabPelamar.tsx
//   - all chrome/toasts hard-coded → t() keys (id+jp, values from legacy locales)
//   - template placeholder apply <<NAMA>>/<<JOB>> and wa.me open must match
//     legacy terapkanTemplateWa/kirimWaPintar exactly
// ==========================================
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WAPintarModal from './WAPintarModal';
import { showToast } from './Toast';

vi.mock('./Toast', () => ({ showToast: vi.fn() }));
vi.mock('../store/i18n', () => ({ t: (k: string) => k }));

const openSpy = vi.fn();
vi.stubGlobal('open', openSpy);

const TEMPLATES = [
  { id: 'WA1', nama: 'Jadwal Interview', isi: 'Konnichiwa <<NAMA>>, jadwal interview <<JOB>> besok' },
  { id: 'WA2', nama: 'Lolos', isi: 'Selamat <<NAMA>>!' },
];

const props = {
  candidateName: 'Budi',
  candidateJob: 'SSW-1',
  phone: '6281234567890',
  templates: TEMPLATES,
  onClose: vi.fn(),
};

describe('WAPintarModal (B02)', () => {
  beforeEach(() => {
    openSpy.mockReset();
    vi.mocked(showToast).mockReset();
    vi.mocked(props.onClose).mockReset();
  });
  afterEach(() => cleanup());

  it('chrome rendered via t() keys (regresi hard-coded copy)', () => {
    render(<WAPintarModal {...props} />);
    expect(screen.getByText('ui.wa_pintar')).toBeTruthy();
    expect(screen.getByText('ui.kandidat_tujuan')).toBeTruthy();
    expect(screen.getByText('ui.pilih_template_pesan')).toBeTruthy();
    expect(screen.getByText('ui.isi_pesan_custom')).toBeTruthy();
    expect(screen.getByText('ui.manual_or_template')).toBeTruthy();
    expect(screen.getByText('ui.wa_open_send')).toBeTruthy();
  });

  const textarea = () => screen.getByPlaceholderText('ui.ketik_pesan_ph') as HTMLTextAreaElement;

  it('pilih template → placeholder <<NAMA>>/<<JOB>> diganti (parity terapkanTemplateWa)', () => {
    render(<WAPintarModal {...props} />);
    const sel = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'WA1' } });
    expect(textarea().value).toBe('Konnichiwa Budi, jadwal interview SSW-1 besok');
  });

  it('select kosong → textarea dikosongkan (parity terapkanTemplateWa empty)', () => {
    render(<WAPintarModal {...props} />);
    const sel = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'WA1' } });
    fireEvent.change(sel, { target: { value: '' } });
    expect(textarea().value).toBe('');
  });

  it('kirim: phone kosong → toast ui.toast_wa_invalid_cand2, tanpa open (parity kirimWaPintar)', () => {
    render(<WAPintarModal {...props} phone="" />);
    fireEvent.click(screen.getByText('ui.wa_open_send'));
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('ui.toast_wa_invalid_cand2', 'error');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('kirim: pesan kosong → toast ui.toast_msg_empty, tanpa open', () => {
    render(<WAPintarModal {...props} />);
    fireEvent.click(screen.getByText('ui.wa_open_send'));
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('ui.toast_msg_empty', 'error');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('kirim: wa.me terbuka dgn pesan ter-encode + modal ditutup', () => {
    render(<WAPintarModal {...props} />);
    const sel = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'WA2' } });
    fireEvent.click(screen.getByText('ui.wa_open_send'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://wa.me/6281234567890?text=' + encodeURIComponent('Selamat Budi!'),
      '_blank',
    );
    expect(vi.mocked(props.onClose)).toHaveBeenCalled();
  });
});