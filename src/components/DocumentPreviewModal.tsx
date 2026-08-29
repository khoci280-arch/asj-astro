/**
 * DocumentPreviewModal.tsx - Universal document preview modal
 * Migrated from legacy/js/03_candidate.ts bukaPreviewDokumen()
 * Handles: images, PDFs, Excel/CSV, PPTX, Office docs, fallback
 */
import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

function isImage(url: string): boolean {
  return /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(url);
}

function isPdf(url: string): boolean {
  return /\.pdf(\?.*)?$/i.test(url);
}

function isExcel(url: string): boolean {
  return /\.(csv|xls|xlsx|xlsm)(\?.*)?$/i.test(url);
}

function isPptx(url: string): boolean {
  return /\.pptx(\?.*)?$/i.test(url);
}

function isOffice(url: string): boolean {
  return /\.(doc|docx|ppt|pptx|odt|ods|odp)(\?.*)?$/i.test(url);
}

function getOfficeViewerUrl(url: string): string {
  return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url);
}

export default function DocumentPreviewModal({ url, title, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLoad = () => setLoading(false);
  const handleError = () => { setLoading(false); setError(true); };

  const renderContent = () => {
    if (isImage(url)) {
      return (
        <div class="flex items-center justify-center h-full overflow-auto">
          <img
            src={url}
            alt={title}
            class="max-w-full max-h-full object-contain rounded-lg"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    }

    if (isPdf(url)) {
      return (
        <iframe
          ref={iframeRef}
          src={url}
          class="w-full h-full border-0 rounded-lg"
          onLoad={handleLoad}
          onError={handleError}
          title={title}
        />
      );
    }

    if (isExcel(url)) {
      return (
        <iframe
          ref={iframeRef}
          src={url}
          class="w-full h-full border-0 rounded-lg"
          onLoad={handleLoad}
          onError={handleError}
          title={title}
        />
      );
    }

    if (isOffice(url)) {
      return (
        <iframe
          ref={iframeRef}
          src={getOfficeViewerUrl(url)}
          class="w-full h-full border-0 rounded-lg"
          onLoad={handleLoad}
          onError={handleError}
          title={title}
        />
      );
    }

    if (isPptx(url)) {
      return (
        <div class="flex items-center justify-center h-full">
          <div class="text-center space-y-4">
            <i class="fas fa-file-powerpoint text-5xl text-orange-400"></i>
            <p class="text-sm text-slate-300">Preview PPTX tidak tersedia di browser</p>
            <a href={url} target="_blank" rel="noopener"
               class="inline-block px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm transition">
              <i class="fas fa-download mr-2"></i>Unduh File
            </a>
          </div>
        </div>
      );
    }

    // Fallback: unsupported file type
    return (
      <div class="flex items-center justify-center h-full">
        <div class="text-center space-y-4">
          <i class="fas fa-file text-5xl text-slate-400"></i>
          <p class="text-sm text-slate-300 font-bold">Tidak bisa dipratinjau</p>
          <p class="text-xs text-slate-500">Tipe file ini tidak bisa ditampilkan di preview browser</p>
          <a href={url} target="_blank" rel="noopener"
             class="inline-block px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm transition">
            <i class="fas fa-download mr-2"></i>Unduh File
          </a>
        </div>
      </div>
    );
  };

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex flex-col p-2 md:p-6"
         onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <h3 class="text-sm font-bold text-white truncate flex-1">
            <i class="fas fa-file-alt mr-2 text-sky-400"></i>{title}
          </h3>
          <div class="flex items-center gap-2 ml-3">
            <a href={url} target="_blank" rel="noopener"
               class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"
               title="Unduh">
              <i class="fas fa-download"></i>
            </a>
            <button onClick={onClose}
                    class="text-slate-400 hover:text-white transition p-1">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        {/* Content */}
        <div class="flex-1 relative bg-black/50 m-2 rounded-xl overflow-hidden">
          {loading && !error && (
            <div class="absolute inset-0 flex items-center justify-center z-10">
              <div class="text-center space-y-2">
                <i class="fas fa-spinner fa-spin text-2xl text-sky-400"></i>
                <p class="text-xs text-slate-400">Memuat pratinjau...</p>
              </div>
            </div>
          )}
          {error ? (
            <div class="flex items-center justify-center h-full">
              <div class="text-center space-y-3">
                <i class="fas fa-exclamation-triangle text-4xl text-amber-400"></i>
                <p class="text-sm text-slate-300 font-bold">Gagal memuat pratinjau</p>
                <a href={url} target="_blank" rel="noopener"
                   class="inline-block px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm transition">
                  <i class="fas fa-download mr-2"></i>Unduh File
                </a>
              </div>
            </div>
          ) : renderContent()}
        </div>
      </div>
    </div>
  );
}
