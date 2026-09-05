// ==========================================
// TESTS: InterviewSimulatorModal (A16 parity, 2026-09-05)
//
// Legacy ground truth: #modal-interview (partials/modals-shared.html) +
// js/ai_copilot/interview.ts (bukaSimulatorInterview / mulaiWawancaraInterview
// / sendInterviewMessage / selesaikanWawancaraInterview /
// kirimHasilWawancaraKeAdmin / cobaParseJsonLoose).
//
// Root bugs covered: the interview simulator was never ported (CandidateDash
// "Latihan Interview" pointed at /ai-cv); processAiInterview on the surface
// was a background job and its handler dropped {wa, history} (backend — see
// service-a16.test.ts); VIP/KELAS gate and ALL copy were missing.
// ==========================================
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InterviewSimulatorModal, {
  canAccessInterview,
  parseJsonLooseChat,
  boldSegments,
  buildHasilSummaryText,
} from './InterviewSimulatorModal';
import { showToast } from '../Toast';

const { mockSecure } = vi.hoisted(() => ({ mockSecure: vi.fn() }));

vi.mock('../Toast', () => ({ showToast: vi.fn() }));

vi.mock('../../lib/apiClient', () => {
  const api = { secure: (...args: unknown[]) => mockSecure(...args), get: vi.fn() };
  return { api, default: api };
});

vi.mock('../../store/i18n', () => ({ t: (k: string) => k }));

const GREETING = 'Konnichiwa Budi-san! Pertama, tolong perkenalkan dirimu ya.';
const WA = '6281234567890';

function renderModal() {
  const onClose = vi.fn();
  render(<InterviewSimulatorModal wa={WA} nama="Budi" onClose={onClose} />);
  return { onClose };
}

describe('InterviewSimulatorModal pure helpers (A16)', () => {
  it('canAccessInterview: [VIP] / [KELAS x] unlock; other tags do not (legacy tightening)', () => {
    expect(canAccessInterview('[VIP] catatan')).toBe(true);
    expect(canAccessInterview('[KELAS G] murid')).toBe(true);
    expect(canAccessInterview('[MCU] medis')).toBe(false);
    expect(canAccessInterview('[VISA]')).toBe(false);
    expect(canAccessInterview('')).toBe(false);
    expect(canAccessInterview(undefined)).toBe(false);
  });
  it('parseJsonLooseChat: code fence, brace extraction, plain JSON, garbage → null', () => {
    expect(parseJsonLooseChat('```json\n{"score":8}\n```')).toEqual({ score: 8 });
    expect(parseJsonLooseChat('teks dulu {"score":8,"nilai":"A"} sisa')).toEqual({
      score: 8,
      nilai: 'A',
    });
    expect(parseJsonLooseChat('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLooseChat('tidak ada json')).toBeNull();
  });
  it('boldSegments splits **bold** pairs (odd = bold)', () => {
    const segs = boldSegments('📊 **Hasil** x **y**');
    expect(segs.map((s) => s.text)).toEqual(['📊 ', 'Hasil', ' x ', 'y', '']);
    expect(segs.filter((s) => s.bold).map((s) => s.text)).toEqual(['Hasil', 'y']);
  });
  it('buildHasilSummaryText: score/nilai/field count/rekomendasi/sent state', () => {
    const ok = buildHasilSummaryText(
      {
        score: 8,
        nilai: 'A',
        biodata: { nama: 'Budi', hobi: 'baca' },
        rekomendasi: 'latihan kaiwa',
      },
      true,
    );
    // (t() = identity di test ini, jadi nilai placeholder tidak ter-substitusi;
    // kontrak render aktual dijamin guard kamus i18n. Di sini kita pin bentuk
    // dinamis: score/nilai literal + kunci-kunci teks tetap.)
    expect(ok).toContain('ui.iv_res_title');
    expect(ok).toContain('8/10');
    expect(ok).toContain(' (A)');
    expect(ok).toContain('latihan kaiwa');
    expect(ok).toContain('ui.iv_res_sent_ok');
    const fail = buildHasilSummaryText({ score: undefined, biodata: null }, false);
    expect(fail).toContain('-');
    expect(fail).toContain('ui.iv_res_sent_fail');
  });
});

describe('InterviewSimulatorModal (A16)', () => {
  beforeEach(() => {
    mockSecure.mockReset();
    mockSecure.mockResolvedValue({ reply: GREETING });
    vi.mocked(showToast).mockReset();
  });
  afterEach(() => cleanup());

  it('header shows subtitle key + greeting turn hits processAiInterview with empty history', async () => {
    renderModal();
    expect(screen.getByText('ui.interview_sim')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText(GREETING)).toBeTruthy(),
    );
    expect(mockSecure).toHaveBeenCalledTimes(1);
    const [action, args] = mockSecure.mock.calls[0] as [string, Record<string, unknown>[]];
    expect(action).toBe('processAiInterview');
    expect((args[0] as Record<string, unknown>).wa).toBe(WA);
    expect((args[0] as Record<string, unknown>).candidateName).toBe('Budi');
    expect((args[0] as Record<string, unknown>).history).toEqual([]);
  });

  it('typing indicator (ui.iv_typing) shows while the greeting is in flight', async () => {
    let release!: (v: unknown) => void;
    mockSecure.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );
    renderModal();
    expect(await screen.findByText('ui.iv_typing')).toBeTruthy();
    release({ reply: 'Halo!' });
    await waitFor(() => expect(screen.getByText('Halo!')).toBeTruthy());
  });

  it('send via Enter: user bubble + next turn carries assistant greeting + user message', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(GREETING)).toBeTruthy());
    mockSecure.mockResolvedValueOnce({ reply: 'Nama kamu Budi ya? Senang bertemu!' });
    const ta = screen.getByPlaceholderText('admin.interview_ph') as HTMLTextAreaElement;
    fireEvent.input(ta, { target: { value: 'Nama saya Budi' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Nama saya Budi')).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByText('Nama kamu Budi ya? Senang bertemu!')).toBeTruthy(),
    );
    const sendCall = mockSecure.mock.calls[1] as [string, Record<string, unknown>[]];
    expect(sendCall[0]).toBe('processAiInterview');
    const history = sendCall[1][0].history as { role: string; content: string }[];
    expect(history.length).toBe(2);
    expect(history[0].role).toBe('assistant');
    expect(history[1]).toEqual({ role: 'user', content: 'Nama saya Budi' });
  });

  it('===HASIL=== marker: chat part + parsed JSON → simpanHasilWawancara + summary bubble', async () => {
    const hasil = { score: 9, nilai: 'A', biodata: { nama: 'Budi' }, rekomendasi: 'bagus' };
    const reply =
      'Doumo arigatou gozaimasu Budi-san! ===HASIL===' + JSON.stringify(hasil);
    // Greeting (first call) returns the HASIL-marked reply; the subsequent
    // simpanHasilWawancara call resolves success.
    mockSecure.mockResolvedValueOnce({ reply });
    mockSecure.mockResolvedValue({ success: true });
    renderModal();
    await waitFor(() =>
      expect(mockSecure).toHaveBeenCalledWith('simpanHasilWawancara', [{ wa: WA, hasil }]),
    );
    await waitFor(() => expect(screen.getByText(/Doumo arigatou gozaimasu/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/ui.iv_res_sent_ok/)).toBeTruthy());
    expect(screen.getByText(/9\/10/)).toBeTruthy();
  });

  it('Selesai & Kirim Hasil → selesaikanWawancara with transcript, summary + success toast', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(GREETING)).toBeTruthy());
    mockSecure.mockResolvedValueOnce({
      success: true,
      hasil: { score: 8, nilai: 'B', biodata: { nama: 'Budi' }, rekomendasi: 'x' },
    });
    mockSecure.mockResolvedValueOnce({ success: true }); // simpanHasilWawancara
    fireEvent.click(screen.getByText('ui.ai_interview_done_text'));
    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('ui.ai_interview_sent', 'success'),
    );
    const doneCall = mockSecure.mock.calls.find(
      (c) => (c as unknown[])[0] === 'selesaikanWawancara',
    ) as [string, Record<string, unknown>[]];
    expect(doneCall).toBeTruthy();
    const history = doneCall[1][0].history as { role: string }[];
    expect(history.length).toBeGreaterThanOrEqual(1);
    await waitFor(() => expect(screen.getByText(/ui.iv_res_sent_ok/)).toBeTruthy());
  });

  it('selesaikan gagal → bubble ⚠️ summary error via ui.iv_err_summarize, no toast', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(GREETING)).toBeTruthy());
    mockSecure.mockResolvedValueOnce({ success: false, error: 'AI sibuk' });
    fireEvent.click(screen.getByText('ui.ai_interview_done_text'));
    await waitFor(() => expect(screen.getByText('ui.iv_err_summarize')).toBeTruthy());
    expect(vi.mocked(showToast)).not.toHaveBeenCalledWith('ui.ai_interview_sent', 'success');
  });

  it('network error on a send → disconnect bubble (ui.iv_err_disconnect)', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(GREETING)).toBeTruthy());
    mockSecure.mockRejectedValueOnce(new Error('Network'));
    const ta = screen.getByPlaceholderText('admin.interview_ph') as HTMLTextAreaElement;
    fireEvent.input(ta, { target: { value: 'halo' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('ui.iv_err_disconnect')).toBeTruthy());
  });

  it('greeting API failure → fallback greeting (ui.iv_greet_fallback)', async () => {
    mockSecure.mockRejectedValueOnce(new Error('Network'));
    renderModal();
    await waitFor(() => expect(screen.getByText('ui.iv_greet_fallback')).toBeTruthy());
  });

  it('close button → onClose', async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(screen.getByText(GREETING)).toBeTruthy());
    fireEvent.click(screen.getByLabelText('public.close'));
    expect(onClose).toHaveBeenCalled();
  });
});
