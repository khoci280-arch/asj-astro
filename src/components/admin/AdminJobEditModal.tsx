/**
 * AdminJobEditModal.tsx — Edit loker full (admin)
 * Migrated from legacy admin_modal/job.ts + render/admin.ts editLokerFull()
 */
import { useState } from 'preact/hooks';
import { t } from '../../store/i18n';
import type { Job } from '../../types/api';
import Icon from '../ui/Icon';
import { useOverlay } from '../ui/useOverlay';
import { getEndpoint } from '../../lib/apiEndpoint';

// Job type imported from shared types
interface Props { job: Job; onClose: () => void; onSave?: (data: Job) => void; }

export default function AdminJobEditModal({ job, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    pekerjaan: job.pekerjaan || '', status: job.status || 'OPEN',
    kategori: job.kategori || '', kuota: job.kuota || '',
    gender: job.gender || '', lokasi: job.lokasi || '',
    syRat: job.syRat || '', keterangan: job.keterangan || '',
  });
  const [loading, setLoading] = useState(false);
  /** Update single field in edit form */
  const upd = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(getEndpoint('editLokerFull'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editLokerFull', args: [{ ...form, code: job.code, updated_at: job.updated_at }] }),
      });
      const data = await res.json();
      if (data.success) { onSave?.(form as any); onClose(); }
      else { console.error(data.error); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const { containerRef, onBackdropClick } = useOverlay({ open: true, onClose });

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4" ref={containerRef} onClick={onBackdropClick}>
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div class="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <h3 class="text-sm font-bold text-white"><Icon name="edit" class="mr-2 text-red-400" />{t('ui.modal_edit_job_title')}</h3>
          <button onClick={onClose} class="text-slate-400 hover:text-white p-1"><Icon name="times" class="text-xl" /></button>
        </div>
        <div class="p-5 space-y-3">
          <div class="text-xs text-slate-500 mb-2">Kode: <span class="text-sky-400 font-mono font-bold">{job.code}</span></div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">{t('admin.form_job_name')}</label><input value={form.pekerjaan} onInput={e => upd('pekerjaan', (e.target as HTMLInputElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none focus:border-red-500" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-xs font-bold text-slate-400 mb-1">Status</label><select value={form.status} onChange={e => upd('status', (e.target as HTMLSelectElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none"><option value="OPEN">OPEN</option><option value="URGENT">URGENT</option><option value="CLOSE">CLOSE</option></select></div>
            <div><label class="block text-xs font-bold text-slate-400 mb-1">{t('admin.form_quota_short')}</label><input value={form.kuota} onInput={e => upd('kuota', (e.target as HTMLInputElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none" placeholder="3" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-xs font-bold text-slate-400 mb-1">Gender</label><select value={form.gender} onChange={e => upd('gender', (e.target as HTMLSelectElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none"><option value="LAKI-LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option><option value="">Semua</option></select></div>
            <div><label class="block text-xs font-bold text-slate-400 mb-1">Kategori</label><input value={form.kategori} onInput={e => upd('kategori', (e.target as HTMLInputElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none" placeholder="🏭 MANUFAKTUR" /></div>
          </div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">{t('admin.form_location_short')}</label><input value={form.lokasi} onInput={e => upd('lokasi', (e.target as HTMLInputElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none" placeholder="Tokyo, Jepang" /></div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">{t('admin.form_req_short')}</label><textarea value={form.syRat} onInput={e => upd('syRat', (e.target as HTMLTextAreaElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none resize-none h-16" placeholder="Usia 18-30, Minimal SMA..." /></div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">{t('admin.form_note_short')}</label><textarea value={form.keterangan} onInput={e => upd('keterangan', (e.target as HTMLTextAreaElement).value)} class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none resize-none h-16" placeholder="Keterangan publik..." /></div>
          <button onClick={handleSave} disabled={loading} class="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 transition">
            {loading ? 'Menyimpan...' : t('ui.save_publish')}
          </button>
        </div>
      </div>
    </div>
  );
}
