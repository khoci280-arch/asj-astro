/**
 * fileUtils.ts - File validation + image compression
 * Migrated from legacy/js/03_candidate.ts
 */

/** Max file size: 4MB */
export const MAX_FILE_MB = 4;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

/** Allowed file extensions */
export const ALLOWED_EXT: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  document: ['pdf', 'doc', 'docx'],
  all: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx'],
};

/** Validate file size */
export function checkFileSize(file: File): { ok: boolean; error?: string } {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal ${MAX_FILE_MB}MB.` };
  }
  return { ok: true };
}

/** Validate file extension */
export function checkFileExtension(file: File, category: keyof typeof ALLOWED_EXT = 'all'): { ok: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowed = ALLOWED_EXT[category] || ALLOWED_EXT.all;
  if (!allowed.includes(ext)) {
    return { ok: false, error: `Format file .${ext} tidak didukung. Gunakan: ${allowed.join(', ')}.` };
  }
  return { ok: true };
}

/** Validate file (size + extension combined) */
export function validateFile(file: File, category: keyof typeof ALLOWED_EXT = 'all'): { ok: boolean; error?: string } {
  const sizeCheck = checkFileSize(file);
  if (!sizeCheck.ok) return sizeCheck;
  const extCheck = checkFileExtension(file, category);
  if (!extCheck.ok) return extCheck;
  return { ok: true };
}

/**
 * Compress image using canvas
 * Migrated from legacy compressImage()
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File bukan gambar'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context tidak tersedia')); return; }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Gagal kompress gambar'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create file preview URL (revoke old one to prevent memory leak)
 */
export function createPreviewUrl(file: File): string | null {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file);
  }
  return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
