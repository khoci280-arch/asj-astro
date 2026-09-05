// ==========================================
// TESTS: jobPhase.jobTutupUntukLamar (B04 parity, 2026-09-05)
//
// Legacy ground truth: js/01_public.ts jobTutupUntukLamar — the single
// source of truth used by BOTH the locator rows (render/public.ts) and the
// detail modal (bukaDetailLoker). Astro used to duplicate it twice with
// DIFFERENT open-stage lists:
//   - LokerDetailModal dropped LIST-CHECK/PENCARIAN/PENDAFTARAN/DAFTAR →
//     jobs still recruiting (tahapan PENCARIAN/DAFTAR/…) showed a disabled
//     "Lamar" button in the detail modal.
//   - LokerTable dropped LIST-CHECK only.
// Both now import this canonical rule; these pins lock the legacy-exact set.
// ==========================================
import { describe, it, expect } from 'vitest';
import { jobTutupUntukLamar } from './jobPhase';

const CLOSED_PHASES = [
  'CHECK KAIWA', 'KAIWA', 'MENDAN', 'MENSETSU', 'LOLOS', 'USER',
  'MCU', 'PARPOR', 'PASPOR', 'PASPORT', 'KONTRAK', 'COE', 'SISKOP',
  'E-ID', 'EID', 'VISA', 'FLIGHT', 'BERANGKAT', 'TERBANG', 'TIKET',
  'NAITEI', 'PEMBERKASAN', 'MEDICAL', 'MEDIKAL',
];

// Legacy-exact list of tahapan that still accept applications.
const OPEN_PHASES = [
  '', '-', 'LIST', 'LIST-CHECK', 'PENCARIAN', 'PENDAFTARAN',
  'OPEN', 'DAFTAR', 'MENUNGGU', 'REVIEW',
];

describe('jobTutupUntukLamar', () => {
  it('closes when the job is missing', () => {
    expect(jobTutupUntukLamar(null)).toBe(true);
    expect(jobTutupUntukLamar(undefined)).toBe(true);
  });

  it('closes whenever status contains CLOSE, regardless of tahapan', () => {
    expect(jobTutupUntukLamar({ status: 'CLOSE', tahapan: 'OPEN' })).toBe(true);
    expect(jobTutupUntukLamar({ status: 'Sudah CLOSE', tahapan: 'LIST' })).toBe(true);
    // Legacy checks status raw (no case folding): lowercase 'close' is NOT the
    // admin CLOSE flag and falls through to the tahapan rule → open.
    expect(jobTutupUntukLamar({ status: 'closed', tahapan: 'LIST' })).toBe(false);
  });

  it('keeps recruiting phases open (incl. the four the modal used to drop)', () => {
    for (const p of OPEN_PHASES) {
      expect(jobTutupUntukLamar({ status: 'OPEN', tahapan: p }), `tahapan '${p}'`).toBe(false);
    }
    // case/whitespace insensitive
    expect(jobTutupUntukLamar({ status: 'OPEN', tahapan: ' pencarian ' })).toBe(false);
    expect(jobTutupUntukLamar({ status: 'OPEN', tahapan: 'list-check' })).toBe(false);
    expect(jobTutupUntukLamar({ status: 'OPEN', tahapan: 'Daftar' })).toBe(false);
    // Unknown tahapan stays OPEN (legacy only closes on the known
    // selection/documentation stages — do not close on a typo or new stage).
    expect(jobTutupUntukLamar({ status: 'OPEN', tahapan: 'X' })).toBe(false);
  });

  it('closes once selection/documentation has started', () => {
    for (const p of CLOSED_PHASES) {
      expect(jobTutupUntukLamar({ status: 'OPEN', tahapan: p }), `tahapan '${p}'`).toBe(true);
    }
  });
});
