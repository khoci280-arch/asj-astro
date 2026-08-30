/**
 * AdminShareModal.tsx — Share loker config (admin)
 * Migrated from legacy render/admin.ts share modal
 */
import { useState } from 'preact/hooks';
import { t } from '../../store/i18n';

// Job type imported from shared types
interface Props { job: Job; onClose: () => void; }

export default function AdminShareModal({ job, onClose }: Props) {
  const [docs, setDocs] = useState({ cv: true, jft: false, ssw: false, all: false });
  const [template, setTemplate] = useState('');
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share?job=${encodeURIComponent(job.code)}` : '';

  const toggleDoc = (key: keyof typeof docs) => setDocs(prev => ({ ...prev, [key]: !prev[key] }));

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => showToast(t('toast.link_copied'), 'success'));
  };

  const copyWA = () => {
    const msg = `${job.pekerjaan}\n\nLihat detail loker:\n${shareUrl}\n\n${template}`;
    navigator.clipboard.writeText(msg).then(() => showToast(t('toast.wa_copied'), 'success'));
  };

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div class="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 class="text-sm font-bold text-white"><i class="fas fa-share-alt mr-2 text-pink-400"></i>{t('ui.share_modal_title')}</h3>
          <button onClick={onClose} class="text-slate-400 hover:text-white p-1"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="p-5 space-y-4">
          <div class="text-xs text-slate-400">Loker: <span class="text-pink-400 font-bold">{job.code}</span> — {job.pekerjaan}</div>

          {/* Doc selection */}
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase mb-2 block">{t('ui.share_card_title')}</label>
            <div class="space-y-2">
              {([['cv', 'CV'], ['jft', 'Sertif JFT'], ['ssw', 'Sertif SSW'], ['all', 'Semua file folder']] as const).map(([key, label]) => (
                <label key={key} class="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input type="checkbox" checked={docs[key]} onChange={() => toggleDoc(key)} class="accent-pink-500 w-4 h-4" /> {label}
                </label>
              ))}
            </div>
          </div>

          {/* Share link */}
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t('ui.share_link_view')}</label>
            <div class="flex gap-2">
              <input value={shareUrl} readonly class="flex-1 p-2 rounded-lg bg-black/60 border border-slate-700 text-xs text-sky-400 font-mono outline-none" />
              <button onClick={copyLink} class="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"><i class="fas fa-copy"></i></button>
            </div>
          </div>

          {/* WA template */}
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t('ui.share_template_label')}</label>
            <textarea value={template} onInput={e => setTemplate((e.target as HTMLTextAreaElement).value)} rows={3} class="w-full p-2 rounded-lg bg-black/60 border border-slate-700 text-xs text-white outline-none resize-none" placeholder="Pesan tambahan untuk TSK..." />
          </div>

          <div class="flex gap-2">
            <button onClick={copyWA} class="flex-1 py-2.5 bg-[#25D366] hover:bg-[#1fbd5b] text-white rounded-xl text-xs font-bold transition"><i class="fab fa-whatsapp mr-1"></i>{t('ui.share_copas_wa')}</button>
            <a href={shareUrl} target="_blank" class="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold text-center transition"><i class="fas fa-external-link-alt mr-1"></i>{t('ui.share_open_view')}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
