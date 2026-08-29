/**
 * shared/wa-rules.ts — Aturan normalisasi & validasi nomor WhatsApp Indonesia
 * Satu sumber kebenaran: dipakai frontend (auth) DAN backend (auth, kandidat, mail, upload).
 */

/**
 * Normalisasi nomor WhatsApp ke format 628xxxxxxxxxxxx (tanpa spasi/tanda baca).
 * Input: "081234567890", "+62 812-3456-7890", "6281234567890", dll.
 * Output: "6281234567890" (12-13 digit, selalu diawali 628).
 */
export function normalizeWa(raw: string): string {
  let s = String(raw || '').replace(/[^0-9]/g, '');
  // Hilangkan leading 0 → ganti dengan 62
  if (s.startsWith('0')) s = '62' + s.slice(1);
  // Hilangkan leading 620 → sudah 62
  if (s.startsWith('620')) s = '62' + s.slice(3);
  // Pastikan diawali 628
  if (!s.startsWith('628')) return '';
  return s;
}

/**
 * Normalisasi gender ke format standar: LAKI-LAKI atau PEREMPUAN.
 */
export function normalizeGender(raw: string): string {
  const s = String(raw || '').toLowerCase().trim();
  if (/^(laki|laki-laki|laki2|male|cowok|pria|l)$/i.test(s)) return 'LAKI-LAKI';
  if (/^(perempuan|wanita|cewek|female|pr|p)$/i.test(s)) return 'PEREMPUAN';
  return '';
}

/**
 * Validasi format nomor WA Indonesia: harus 628xxxx, total 12-13 digit.
 */
export function isValidWaFormat(wa: string): boolean {
  return /^628\d{10,11}$/.test(wa);
}
