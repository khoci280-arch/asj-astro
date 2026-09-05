// ==========================================
// TESTS: RincianBiayaModal (A12 parity, 2026-09-05)
//
// Legacy ground truth: partials/modals-shared.html #modal-rincian-builder +
// js/13_rincian_builder.ts (openRincianBuilder/rbSerialize/rbSeedFromText/
// rbSavePreset/rbUnsavePreset). The Astro add-job tab rendered "Buka Editor
// Rincian" as a DEAD button and never sent rincian_biaya; the edit-job modal
// had no total/rincian fields. Root bugs pinned here:
//   - serialize/parse are round-trip stable in the exact text format the
//     public job-detail popup (LokerDetailModal.parseRincianBiaya) reads
//   - modal seeds from existing text + default tahapan rows
//   - preset collection loaded via api.secure(getRincianPresets), favorites
//     saved/removed via save/deleteRincianPreset
//   - apply returns total + serialized rincian text
// ==========================================
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RincianBiayaModal, {
  rincianSerialize,
  parseRincianState,
  rincianSummary,
  fmtNominal,
  DEFAULT_TAHAPAN_ROWS,
  type RincianState,
} from './RincianBiayaModal';
import { showToast } from '../Toast';

const { mockSecure } = vi.hoisted(() => ({ mockSecure: vi.fn() }));

vi.mock('../Toast', () => ({ showToast: vi.fn() }));

vi.mock('../../lib/apiClient', () => ({
  api: { secure: (...args: unknown[]) => mockSecure(...args) },
}));

const st = (): RincianState => ({
  total: '25 JT',
  rows: [
    { nama: 'TTD KONTRAK', nominal: '6 jt' },
    { nama: 'COE (CERTIFICATE OF ELIGIBILITY) TERBIT', nominal: '' },
  ],
  sel: { include: ['TIKET PESAWAT', 'VISA (SUBSIDI 1JT)'], exclude: [], benefit: [], persyaratan: [] },
  catatan: 'REFUND BILA KAISHA BATAL.',
});

describe('RincianBiayaModal pure helpers (A12)', () => {
  it('rincianSerialize outputs the legacy text format', () => {
    const text = rincianSerialize(st());
    expect(text).toContain('TOTAL BIAYA: 25 JT');
    expect(text).toContain('TAHAPAN PEMBAYARAN');
    expect(text).toContain('1. TTD KONTRAK : 6 jt');
    expect(text).toContain('2. COE (CERTIFICATE OF ELIGIBILITY) TERBIT');
    expect(text).toContain('INCLUDE');
    expect(text).toContain('• TIKET PESAWAT');
    expect(text).toContain('CATATAN');
    expect(text).toContain('REFUND BILA KAISHA BATAL.');
    expect(text).not.toContain('\n\n\n');
  });

  it('parse → serialize round-trip keeps total/rows/sel/catatan', () => {
    const orig = st();
    const parsed = parseRincianState(rincianSerialize(orig));
    expect(parsed.total).toBe('25 JT');
    expect(parsed.rows).toEqual(orig.rows);
    expect(parsed.sel.include).toEqual(['TIKET PESAWAT', 'VISA (SUBSIDI 1JT)']);
    expect(parsed.catatan).toBe('REFUND BILA KAISHA BATAL.');
    expect(rincianSerialize(parsed)).toBe(rincianSerialize(orig));
  });

  it('fmtNominal strips non-digits and formats thousands', () => {
    expect(fmtNominal('6000000')).toBe('6.000.000');
    expect(fmtNominal('abc123')).toBe('123');
    expect(fmtNominal('0')).toBe('');
  });

  it('rincianSummary counts sections (legacy rbSummaryHtml parity)', () => {
    const s = rincianSummary(st());
    expect(s).toContain('✅');
    expect(s).toContain('Total 25 JT');
    expect(s).toContain('2 tahapan');
    expect(s).toContain('Include 2');
    expect(rincianSummary(parseRincianState(''))).toContain('Klik untuk isi rincian biaya');
  });
});

describe('RincianBiayaModal (A12)', () => {
  beforeEach(() => {
    mockSecure.mockReset();
    mockSecure.mockResolvedValue({ success: true });
    vi.mocked(showToast).mockReset();
  });

  afterEach(() => cleanup());

  it('renders null when closed', () => {
    const { container } = render(
      <RincianBiayaModal open={false} onApply={() => {}} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('loads DB presets via getRincianPresets + seeds default tahapan rows', async () => {
    mockSecure.mockResolvedValueOnce({
      success: true,
      presets: { include: [{ id: '1', item: 'TIKET PESAWAT' }], exclude: [], benefit: [], persyaratan: [] },
    });
    render(<RincianBiayaModal open initialTotal="25 JT" initialRincian="" onApply={() => {}} onClose={() => {}} />);
    await waitFor(() =>
      expect(mockSecure).toHaveBeenCalledWith('getRincianPresets', []),
    );
    await waitFor(() => expect(screen.getByText('TIKET PESAWAT')).toBeTruthy());
    // Default permanent tahapan rows (TTD KONTRAK + COE) auto-seeded.
    const nameInputs = Array.from(
      document.querySelectorAll('input'),
    ).filter((i) => (i as HTMLInputElement).value === 'TTD KONTRAK');
    expect(nameInputs.length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('25 JT')).toBeTruthy();
  });

  it('seed dari rincian teks: rows + selected chips + catatan dipulihkan', async () => {
    const seed =
      'TOTAL BIAYA: 30 JT\n\nTAHAPAN PEMBAYARAN\n1. TTD KONTRAK : 10 jt\n\nINCLUDE\n• TIKET PESAWAT\n\nCATATAN\nBEBAS DICICIL';
    mockSecure.mockResolvedValueOnce({ success: true, presets: {} });
    render(
      <RincianBiayaModal open initialTotal="" initialRincian={seed} onApply={() => {}} onClose={() => {}} />,
    );
    await waitFor(() => expect(screen.getByText('TIKET PESAWAT')).toBeTruthy());
    // TTD KONTRAK tahapan restored with its nominal.
    const rowInput = Array.from(document.querySelectorAll('input')).find(
      (i) => (i as HTMLInputElement).value === 'TTD KONTRAK',
    );
    expect(rowInput).toBeTruthy();
    expect(screen.getByDisplayValue('BEBAS DICICIL')).toBeTruthy();
  });

  it('favorite save/delete memanggil save/deleteRincianPreset + update star', async () => {
    mockSecure
      .mockResolvedValueOnce({
        success: true,
        presets: { include: [], exclude: [], benefit: [], persyaratan: [] },
      })
      .mockResolvedValueOnce({ success: true, id: 9 })
      .mockResolvedValueOnce({ success: true });
    render(<RincianBiayaModal open initialRincian="" onApply={() => {}} onClose={() => {}} />);
    // Fallback default presets shown after empty collection.
    await waitFor(() => expect(screen.getByText('TIKET PESAWAT')).toBeTruthy());
    const chip = screen.getByText('TIKET PESAWAT').closest('button') as HTMLButtonElement;
    expect(chip.textContent).toContain('☆');
    const star = chip.querySelector('span') as HTMLSpanElement;
    fireEvent.click(star);
    await waitFor(() =>
      expect(mockSecure).toHaveBeenCalledWith('saveRincianPreset', [
        { kategori: 'include', item: 'TIKET PESAWAT' },
      ]),
    );
    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('TIKET PESAWAT').closest('button')?.textContent).toContain('★'));
    // Remove favorite → deleteRincianPreset with the id.
    const star2 = (screen.getByText('TIKET PESAWAT').closest('button') as HTMLButtonElement).querySelector('span') as HTMLSpanElement;
    fireEvent.click(star2);
    await waitFor(() =>
      expect(mockSecure).toHaveBeenCalledWith('deleteRincianPreset', [{ id: '9' }]),
    );
  });

  it('custom item + chip on → preview & apply serialize termasuk item', async () => {
    const apply = vi.fn();
    mockSecure.mockResolvedValueOnce({
      success: true,
      presets: { include: [{ id: '1', item: 'TIKET PESAWAT' }], exclude: [], benefit: [], persyaratan: [] },
    });
    render(<RincianBiayaModal open initialRincian="" onApply={apply} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('TIKET PESAWAT')).toBeTruthy());
    // Turn the preset chip on.
    fireEvent.click(screen.getByText('TIKET PESAWAT').closest('button') as HTMLButtonElement);
    // Add custom include item.
    const custom = screen.getAllByPlaceholderText('Item custom…')[0];
    fireEvent.input(custom, { target: { value: 'ASURANSI' } });
    const plus = (custom.parentElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    fireEvent.click(plus);
    await waitFor(() => expect(screen.getByText('ASURANSI')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /SIMPAN RINCIAN/ }));
    expect(apply).toHaveBeenCalledTimes(1);
    const [total, rincian] = apply.mock.calls[0] as [string, string];
    expect(rincian).toContain('INCLUDE');
    expect(rincian).toContain('• TIKET PESAWAT');
    expect(rincian).toContain('• ASURANSI');
    expect(typeof total).toBe('string');
  });

  it('initialTotal alone (tanpa rincian) tersimpan sebagai TOTAL BIAYA', async () => {
    const apply = vi.fn();
    mockSecure.mockResolvedValueOnce({ success: true, presets: {} });
    render(<RincianBiayaModal open initialTotal="25 JT" initialRincian="" onApply={apply} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByDisplayValue('25 JT')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /SIMPAN RINCIAN/ }));
    const [, rincian] = apply.mock.calls[0] as [string, string];
    expect(rincian).toContain('TOTAL BIAYA: 25 JT');
    expect(DEFAULT_TAHAPAN_ROWS.length).toBe(2);
  });
});
