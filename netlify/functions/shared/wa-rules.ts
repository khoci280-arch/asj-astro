/**
 * shared/wa-rules.ts — Aturan normalisasi & validasi nomor WhatsApp
 * Satu sumber kebenaran: dipakai backend (auth, kandidat, mail, upload).
 *
 * Mendukung:
 *   Indonesia: 08xx -> 628xx (12-15 digit total)
 *   Jepang:    0xx -> 81xx   (10-15 digit total)
 */

/** Indonesia: 628 + 9-12 digits = 12-15 total */
export const WA_MIN_DIGITS = 9;
export const WA_MAX_DIGITS = 12;

/** Japan: 81 + 8-12 digits = 10-15 total */
export const JP_MIN_DIGITS = 8;
export const JP_MAX_DIGITS = 12;

/**
 * Normalisasi nomor WhatsApp ke format internasional.
 *
 * Indonesia -> 628xxxxxxxxxxxx (12-15 digit)
 * Jepang    -> 81xxxxxxxxxxxx (10-15 digit)
 */
export function normalizeWa(raw: unknown): string {
  let s = String(raw || '').replace(/[^0-9]/g, '');
  if (!s) return '';

  // 0 prefix: 08xx -> 628xx (Indo), 090/070 -> 81 90/70 (JP)
  if (s.startsWith('0')) {
    const second = s.charAt(1);
    if (second === '8') {
      s = '62' + s.slice(1);
    } else if (second === '9' || second === '7') {
      s = '81' + s.slice(1);
    } else if (s.length >= 12) {
      s = '62' + s.slice(1);
    } else {
      return '';
    }
  }

  // 6208 typo -> 628
  if (s.startsWith('620') && s.charAt(3) === '8') {
    s = '62' + s.slice(3);
  }

  // Already canonical: 628... -> Indonesia
  if (s.startsWith('628')) return s;

  // Already canonical: 81 + valid JP digit -> Japan
  if (s.startsWith('81') && /[890]/.test(s.charAt(2))) return s;

  // Bare 81 prefix: ambiguous
  if (s.startsWith('81')) {
    const third = s.charAt(2);
    if (third === '0' || third === '7' || third === '8' || third === '9') {
      if (s.length >= 12) return '62' + s; // Indonesia
      return s; // Japan
    }
    return '62' + s; // Indonesia
  }

  // Bare 8 prefix (no country code) -> Indonesia: 8xx -> 628xx
  if (s.startsWith('8') && s.length >= 10) {
    return '62' + s;
  }

  return '';
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
 * Validasi format nomor WA: Indonesia (628xx, 12-15 digit) atau Jepang (81xx, 10-15 digit).
 */
export function isValidWaFormat(wa: string): boolean {
  const n = normalizeWa(wa);
  if (!n) return false;

  // Indonesia: 628 + 9-12 digits = 12-15 total
  if (n.startsWith('628')) {
    const afterPrefix = n.slice(3);
    return afterPrefix.length >= WA_MIN_DIGITS && afterPrefix.length <= WA_MAX_DIGITS;
  }

  // Japan: 81 + 8-12 digits = 10-15 total
  if (n.startsWith('81')) {
    const afterPrefix = n.slice(2);
    return afterPrefix.length >= JP_MIN_DIGITS && afterPrefix.length <= JP_MAX_DIGITS;
  }

  return false;
}
