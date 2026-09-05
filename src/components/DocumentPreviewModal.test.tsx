// ==========================================
// TESTS: DocumentPreviewModal (B03 parity, 2026-09-05)
//
// Legacy ground truth: js/init/preview.ts previewFileInFrame() +
// js/03_candidate.ts bukaPreviewDokumen() — satu pintu preview inline:
//   image/PDF -> native/gview iframe, Office -> MS Office viewer,
//   unsupported (zip/dll) -> pesan + tombol Unduh (anti auto-download),
//   Drive folder link -> window.open tab fallback.
// Root bugs pinned here:
//   - seluruh chrome hard-coded (loading/error/fallback/unduh) → t() keys
//     (id+jp; preview_loading/preview_unavailable jp ditambah dll)
//   - Drive folder URL (tak bisa di-preview) harus fallback ke tab baru
//     (parity bukaPreviewDokumen), bukan iframe kosong
// ==========================================
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DocumentPreviewModal, { isDriveFolder } from './DocumentPreviewModal';

vi.mock('../store/i18n', () => ({ t: (k: string) => k }));

const openSpy = vi.fn();
vi.stubGlobal('open', openSpy);

const baseProps = { url: '', title: 'Dokumen', onClose: vi.fn() };

function renderAt(url: string, extra: Record<string, unknown> = {}) {
  return render(<DocumentPreviewModal {...baseProps} url={url} onClose={vi.fn()} {...extra} />);
}

describe('DocumentPreviewModal (B03)', () => {
  beforeEach(() => {
    openSpy.mockReset();
  });
  afterEach(() => cleanup());

  it('isDriveFolder: link folder Google Drive terdeteksi', () => {
    expect(isDriveFolder('https://drive.google.com/drive/folders/1AbC')).toBe(true);
    expect(isDriveFolder('https://drive.google.com/file/d/1AbC/view')).toBe(false);
  });

  it('drive folder → buka tab baru + tutup modal (parity bukaPreviewDokumen)', () => {
    const onClose = vi.fn();
    render(<DocumentPreviewModal url="https://drive.google.com/drive/folders/1AbC" title="Folder" onClose={onClose} />);
    expect(openSpy).toHaveBeenCalledWith('https://drive.google.com/drive/folders/1AbC', '_blank', 'noopener');
    expect(onClose).toHaveBeenCalled();
  });

  it('gambar → img src + loading via key', async () => {
    renderAt('https://res.cloudinary.com/x/image/upload/foto.jpg');
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('foto.jpg');
    // chrome via t() keys (regresi hard-coded "Memuat pratinjau...")
    expect(screen.getByText('ui.preview_loading')).toBeTruthy();
    fireEvent.load(img);
    await waitFor(() => expect(screen.queryByText('ui.preview_loading')).toBeNull());
  });

  it('PDF → Google Docs Viewer wrapper (parity preview.ts FIX 2026-08-19)', () => {
    renderAt('https://x.supabase.co/storage/ktp.pdf');
    const frame = document.querySelector('iframe') as HTMLIFrameElement;
    expect(frame.src).toContain('https://docs.google.com/gview?url=');
    expect(frame.src).toContain(encodeURIComponent('https://x.supabase.co/storage/ktp.pdf'));
  });

  it('Office (docx) → MS Office viewer + fallback timer', () => {
    renderAt('https://x.supabase.co/storage/kontrak.docx');
    const frame = document.querySelector('iframe') as HTMLIFrameElement;
    expect(frame.src).toContain('https://view.officeapps.live.com/op/embed.aspx?src=');
  });

  it('tipe tak dikenal (.zip) → pesan via key + tombol Unduh (anti auto-download)', () => {
    renderAt('https://x.supabase.co/storage/berkas.zip');
    expect(screen.getAllByText(/ui\.preview_unavailable/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ui.preview_unavailable_hint').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ui.download').length).toBeGreaterThanOrEqual(1);
  });

  it('previewOnly → catatan admin-only, tanpa tombol unduh', () => {
    renderAt('https://x.supabase.co/storage/berkas.zip', { previewOnly: true });
    expect(screen.getAllByText('ui.preview_admin_only_download').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText('ui.download').length).toBe(0);
  });

  it('gagal load → error via key + unduh tersedia', async () => {
    renderAt('https://res.cloudinary.com/x/image/upload/foto.jpg');
    const img = screen.getByRole('img') as HTMLImageElement;
    fireEvent.error(img);
    await waitFor(() => expect(screen.getByText('ui.preview_load_failed')).toBeTruthy());
    expect(screen.getByText('ui.download')).toBeTruthy();
  });
});