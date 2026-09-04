import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { describe, it, expect, vi, afterEach } from 'vitest';
import UndanganKelasModal, { parseDaftarOrtu, parseVarianPesan } from './UndanganKelasModal';

vi.mock('../../store/i18n', () => ({ t: (k: string) => k }));
vi.mock('../Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ default: { call: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('parseDaftarOrtu — A06 parity (legacy normalizeWaInput)', () => {
  it('accepts 08xx and bare 8xx by normalizing to 628xx', () => {
    const { list, invalid } = parseDaftarOrtu(
      ['Ibu Sari|081234567890', 'Pak Andi|812345678901', 'Budi 6281234567890'].join('\n'),
    );
    expect(invalid).toBe(0);
    expect(list).toHaveLength(3);
    expect(list[0].wa).toBe('6281234567890');
    expect(list[1].wa).toBe('62812345678901');
    expect(list[2].wa).toBe('6281234567890');
  });

  it('fixes the 6208 typo like the shared normalizeWa rule', () => {
    const { list, invalid } = parseDaftarOrtu('Dewi|6208123456789');
    expect(invalid).toBe(0);
    expect(list[0].wa).toBe('628123456789');
  });

  it('accepts tab / semicolon separators and trailing digits without separator', () => {
    const { list, invalid } = parseDaftarOrtu('Sari\t081234567890\nCitra;6281234567890\nEka 6281234567890');
    expect(invalid).toBe(0);
    expect(list).toHaveLength(3);
  });

  it('drops invalid rows (no digits / short WA) and counts them', () => {
    const { list, invalid } = parseDaftarOrtu('Orang tanpa nomor\nGagal|12345\nNana|6281234567890');
    expect(invalid).toBe(2);
    expect(list).toHaveLength(1);
    expect(list[0].wa).toBe('6281234567890');
  });

  it('ignores blank lines', () => {
    const { list, invalid } = parseDaftarOrtu('\n\nBudi|6281234567890\n\n');
    expect(invalid).toBe(0);
    expect(list).toHaveLength(1);
  });
});

describe('parseVarianPesan — A06 parity', () => {
  it('splits template variants on --- lines and trims', () => {
    const v = parseVarianPesan('Pesan A\n\n---\n\n  Pesan B  ');
    expect(v).toEqual(['Pesan A', 'Pesan B']);
  });

  it('returns empty when template is empty or only separators', () => {
    expect(parseVarianPesan('')).toEqual([]);
    expect(parseVarianPesan('---\n---')).toEqual([]);
  });
});

describe('UndanganKelasModal — A06 render', () => {
  it('renders form and live preview replacing {nama} and {link_grup}', async () => {
    render(<UndanganKelasModal isOpen={true} onClose={vi.fn()} />);
    // Dua textarea: [0] daftar orang tua, [1] template pesan.
    const textareas = document.querySelectorAll('textarea') as unknown as HTMLTextAreaElement[];
    const link = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(textareas.length).toBeGreaterThanOrEqual(2);
    fireEvent.input(textareas[0], { target: { value: 'Budi|081234567890' } });
    fireEvent.input(link, { target: { value: 'https://chat.whatsapp.com/ABC' } });
    expect(screen.getByText(/Wali dari Budi/)).toBeTruthy();
    expect(screen.getByText(/https:\/\/chat\.whatsapp\.com\/ABC/)).toBeTruthy();
    // Jumlah penerima ter-render (key i18n identity).
    expect(screen.getByText('ui.list_preview_n')).toBeTruthy();
  });
});
