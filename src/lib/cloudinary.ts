/**
 * cloudinary.ts — Direct unsigned upload ke Cloudinary
 * Ported from legacy/js/cloudinary.ts
 * Cloud: ybzzbw9i, Preset: asjportal
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || '' || 'ybzzbw9i';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET || '' || 'asjportal';

export function cloudinaryEndpoint(): string {
  return 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(CLOUDINARY_CLOUD_NAME) + '/upload';
}

/**
 * Upload file ke Cloudinary (unsigned, retry 3x dengan backoff).
 * Returns secure_url (HTTPS).
 */
export async function uploadToCloudinary(
  file: File,
  opts?: { uploadPreset?: string; endpoint?: string },
  maxRetries = 3
): Promise<string> {
  if (!file) throw new Error('Tidak ada file untuk diupload ke Cloudinary.');
  const preset = opts?.uploadPreset || CLOUDINARY_UPLOAD_PRESET;
  const endpoint = opts?.endpoint || cloudinaryEndpoint();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: fd,
        signal: controller?.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        let detail = '';
        try {
          const j = await res.json();
          detail = j?.error?.message || '';
        } catch { /* not JSON */ }

        const errMsg = 'Upload Cloudinary gagal (HTTP ' + res.status + ')' + (detail ? ': ' + detail : '');

        // 4xx = client error → fatal
        if (res.status >= 400 && res.status < 500) throw new Error(errMsg);

        // 5xx = server error → retry
        if (res.status >= 500) {
          lastError = new Error(errMsg);
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            continue;
          }
        }
      }

      const data = await res.json();
      if (!data?.secure_url) throw new Error('Cloudinary tidak mengembalikan secure_url.');
      return data.secure_url;
    } catch (e: any) {
      if (timeoutId) clearTimeout(timeoutId);

      if (e.name === 'AbortError' || e.message?.includes('network')) {
        lastError = new Error('Upload Cloudinary timeout: ' + e.message);
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
      } else {
        throw e;
      }
    }
  }

  throw lastError || new Error('Upload Cloudinary gagal setelah ' + maxRetries + ' percobaan');
}

/**
 * UploadCollectionError — gagal meng-upload salah satu file dalam uploadMany.
 * key = file-key di map (caller memakai label-nya utk toast, kontrak lama).
 */
export class UploadCollectionError extends Error {
  readonly key: string;
  constructor(key: string, message: string) {
    super(message);
    this.name = 'UploadCollectionError';
    this.key = key;
  }
}

/**
 * Upload banyak file sekaligus: iterate map (file-key → payload-key), upload
 * tiap file yang ADA ke Cloudinary, kumpulkan URL dgn payload-key. File yang
 * tidak ada dilewati; error pertama membatalkan sisa upload dan melempar
 * UploadCollectionError (message = pesan asli) — caller memutuskan toast/path
 * error (kontrak per form dipertahankan byte-identical).
 *
 * Map dipegang terpusat di src/lib/documentColumns.ts.
 */
export async function uploadMany(
  files: Record<string, File | null | undefined>,
  map: Record<string, string>,
  upload: (file: File) => Promise<string> = uploadToCloudinary
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const [stateKey, payloadKey] of Object.entries(map)) {
    const file = files[stateKey];
    if (!file) continue;
    try {
      urls[payloadKey] = await upload(file);
    } catch (e: any) {
      throw new UploadCollectionError(stateKey, (e && e.message) || String(e));
    }
  }
  return urls;
}
