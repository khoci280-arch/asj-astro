/**
 * uploadGuard.ts — File validation (format + size)
 * Ported from legacy/js/upload-guard.ts
 * Mirrors legacy cekUploadFile() logic
 */

/** Allowed extensions parsed from an `accept` attribute string */
function extFromAccept(accept: string): string[] {
  const acc = (accept || '').toLowerCase();
  let out: string[] = [];
  if (acc.includes('image/*')) {
    out = out.concat(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
  }
  acc.split(',').forEach(a => {
    const ext = a.trim().replace(/^\./, '');
    if (ext && !out.includes(ext)) out.push(ext);
  });
  return out;
}

/** Human-readable format list: ".pdf, .jpg atau .png" */
function formatAllowed(exts: string[]): string {
  if (!exts.length) return '';
  return exts.map(e => '.' + e).join(', ').replace(/, ([^,]*)$/, ' atau $1');
}

/**
 * Validate a file against accept format + max size.
 * Returns { valid: boolean; error?: string }
 */
export function validateFile(
  file: File,
  opts?: { accept?: string; maxMb?: number }
): { valid: boolean; error?: string } {
  if (!file) return { valid: true };

  const maxMb = opts?.maxMb ?? 5;

  // 1) FORMAT CHECK
  const allowed = extFromAccept(opts?.accept || '');
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
  if (allowed.length && !allowed.includes(ext)) {
    return {
      valid: false,
      error: `Format ${file.name} tidak diizinkan. Gunakan: ${formatAllowed(allowed)}.`
    };
  }

  // 2) SIZE CHECK
  if (file.size > maxMb * 1024 * 1024) {
    return {
      valid: false,
      error: `File ${file.name} terlalu besar (maksimal ${maxMb} MB).`
    };
  }

  return { valid: true };
}
