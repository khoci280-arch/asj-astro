/**
 * shareDocs.ts — Doc-type classification for the TSK share viewer cards.
 *
 * Ported from legacy js/pages/share.ts renderGrid (EXTRA_TYPE_ALIAS /
 * EXTRA_TYPE_TOKENS / docTypeOf / extra-button label logic) so the Astro
 * viewer shows the SAME per-document buttons legacy did: main CV/JFT/SSW
 * buttons from file_cv/jft/ssw, plus one button per extra folder file
 * (SIM/KTP/ijazah/…) labelled like legacy ("CV <loker>" for std names, the
 * raw type otherwise), deduped 1-type-per-button.
 */
const TYPE_ALIAS: Record<string, string> = {
  CVFILE: 'CV',
  FILE_CV: 'CV',
  CV_REVISI: 'CV',
  PHOTOFILE: 'FOTO',
  PAS_PHOTO: 'FOTO',
  PASSPHOTO: 'FOTO',
  FOTO: 'FOTO',
  PHOTO: 'FOTO',
  JFTFILE: 'JFT',
  SSWFILE: 'SSW',
  KARTU_KELUARGA: 'KK',
};

const TYPE_TOKENS = [
  'PAS_PHOTO', 'PHOTOFILE', 'KARTU_KELUARGA', 'CVFILE', 'FILE_CV', 'CV_REVISI',
  'JFTFILE', 'SSWFILE', 'PASSPHOTO', 'PASSPORT', 'IJAZAH', 'KTP', 'KK', 'CV',
  'JFT', 'SSW', 'FOTO', 'PHOTO',
];

export function shareDocTypeOf(name: string): string {
  const base = String(name || '').replace(/\.[a-z0-9]+$/i, '');
  const up = base.toUpperCase();
  // Step 1: long token (>3 chars) as substring — FILE_CV, CV_REVISI, …
  for (const tk of TYPE_TOKENS) {
    if (tk.length > 3 && up.includes(tk)) return TYPE_ALIAS[tk] || tk;
  }
  // Step 2: uppercase prefix — KK, KTP, IJAZAH, …
  const m = base.match(/^[A-Z]+/);
  const prefix = m ? m[0] : null;
  if (prefix && TYPE_ALIAS[prefix]) return TYPE_ALIAS[prefix];
  if (prefix && prefix.length >= 2) return prefix;
  // Step 3: legacy pattern "1. X_CV.xlsx" — token anywhere in the name.
  for (const tk of TYPE_TOKENS) {
    if (tk.length >= 2 && up.includes(tk)) return TYPE_ALIAS[tk] || tk;
  }
  return up;
}

/** Button label for an extra doc — parity legacy renderGrid extraBtns. */
export function shareExtraDocLabel(name: string): string {
  const type = shareDocTypeOf(name);
  const raw = String(name)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_\d{10,}$/g, '')
    .toUpperCase()
    .trim();
  const stdCv = raw.match(/^NAMA_?(.+?)CV$/);
  let label = stdCv
    ? 'CV ' + stdCv[1].replace(/_/g, ' ').trim()
    : type === raw
      ? raw.replace(/_/g, ' ').trim()
      : type;
  if (!label) label = 'FILE';
  return label.slice(0, 16);
}
