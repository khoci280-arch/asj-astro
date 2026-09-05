/**
 * jobPhase.ts — Canonical "can this job still accept applications?" rule.
 *
 * Ported VERBATIM from legacy js/01_public.ts jobTutupUntukLamar (single
 * source of truth in legacy — used by both the public locator rows
 * render/public.ts and the detail modal bukaDetailLoker).
 *
 * Field rule (2026-09-05, B04 parity):
 *   - status CLOSE → always closed.
 *   - tahapan in the pre-selection set (empty / LIST / LIST-CHECK /
 *     PENCARIAN / PENDAFTARAN / OPEN / DAFTAR / MENUNGGU / REVIEW) → open.
 *   - tahapan where selection/documentation has started (KAIWA → FLIGHT,
 *     pemberkasan, medical, …) → closed, even if the status column was not
 *     updated by the admin.
 *
 * NOTE: LokerDetailModal once dropped LIST-CHECK/PENCARIAN/PENDAFTARAN/DAFTAR
 * from the open set (jobs still recruiting showed a disabled "Lamar" button)
 * and LokerTable dropped LIST-CHECK. Both now import this single rule.
 */

interface JobLike {
  status?: string | null;
  tahapan?: string | null;
}

export function jobTutupUntukLamar(j: JobLike | null | undefined): boolean {
  if (!j) return true;
  if (String(j.status || '').includes('CLOSE')) return true;
  const t = String(j.tahapan || '')
    .toUpperCase()
    .trim();
  if (
    !t ||
    t === '-' ||
    t === 'LIST' ||
    t === 'LIST-CHECK' ||
    t === 'PENCARIAN' ||
    t === 'PENDAFTARAN' ||
    t === 'OPEN' ||
    t === 'DAFTAR' ||
    t === 'MENUNGGU' ||
    t === 'REVIEW'
  ) {
    return false;
  }
  // Tahapan yang berarti seleksi/pendokumenan sudah berjalan → tutup lamar.
  return /KAIWA|MENDAN|MENSETSU|LOLOS|USER|MCU|PARPOR|PASPOR|PASPORT|KONTRAK|COE|SISKOP|E-?ID|VISA|FLIGHT|BERANGKAT|TERBANG|TIKET|NAITEI|PEMBERKASAN|MEDICAL|MEDIKAL/i.test(
    t,
  );
}
