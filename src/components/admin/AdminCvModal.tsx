/**
 * AdminCvModal.tsx — Digital CV preview (admin view)
 * Migrated from legacy/js/admin_modal/cv.ts bukaDigitalCV()
 * Features: candidate data, badges, job tags, edit cepat, photo, documents
 */
import { useState, useEffect } from 'preact/hooks';
import { t } from '../../store/i18n';
import DocumentPreviewModal from '../DocumentPreviewModal';

interface Candidate {
  idKandidat: string; nama: string; wa: string; gender: string; usia: string;
  tb: string; bb: string; pendidikan: string; jftText: string; sswText: string;
  pasPhoto: string; email: string; alamat: string; tahapan: string; status: string;
  catatanInt: string; catatanExt: string; idLoker: string;
  cvMiniProgress: number; cvMasterProgress: number;
  applications?: { code: string; cv: string; status: string; tahapan: string; }[];
  folderUrl?: string; ktpUrl?: string;
}

interface Props { candidate: Candidate; onClose: () => void; }

function CrownBadge({ progress }: { progress: number }) {
  if (progress >= 100) return <i class="fas fa-crown text-yellow-400 text-xl drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" title={t('ui.badge_gold')}></i>;
  if (progress >= 50) return <i class="fas fa-award text-slate-300 text-lg drop-shadow-[0_0_8px_rgba(203,213,225,0.8)]" title={t('ui.badge_silver')}></i>;
  return <i class="fas fa-medal text-orange-500 text-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" title={t('ui.badge_bronze')}></i>;
}

export default function AdminCvModal({ candidate: c, onClose }: Props) {
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [catatanInt, setCatatanInt] = useState(c.catatanInt || '');
  const [catatanExt, setCatatanExt] = useState(c.catatanExt || '');

  const pMini = c.cvMiniProgress || 0;
  const pMaster = c.cvMasterProgress || 0;
  const isVIP = (c.catatanInt || '').includes('[VIP]');
  const kelasMatch = (c.catatanInt || '').match(/\[(?:KELAS\s*([A-Z0-9]+)|(?![VIP])([A-Z0-9]+))\]/i);
  const namaKelas = kelasMatch ? (kelasMatch[1] || kelasMatch[2]) : '';

  // Job tags from applications
  const jobTags = c.idLoker && c.idLoker !== '-'
    ? c.idLoker.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-2 md:p-6" onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div class="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <h3 class="text-sm font-bold text-white"><i class="fas fa-id-card mr-2 text-sky-400"></i>{t('ui.asj_dossier')}</h3>
          <div class="flex items-center gap-2">
            <button onClick={() => setEditMode(!editMode)} class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"><i class="fas fa-edit mr-1"></i>{editMode ? 'Selesai' : t('ui.edit_quick_cv')}</button>
            <button onClick={onClose} class="text-slate-400 hover:text-white p-1"><i class="fas fa-times text-xl"></i></button>
          </div>
        </div>

        <div class="p-5 space-y-4">
          {/* Photo + Name + Badges */}
          <div class="flex items-start gap-4">
            {c.pasPhoto && c.pasPhoto !== '-' ? (
              <img src={c.pasPhoto} class="w-20 h-28 object-cover rounded-xl border border-slate-600 shadow-lg flex-shrink-0" alt={c.nama} onClick={() => setPreviewDoc({ url: c.pasPhoto, title: 'Foto - ' + c.nama })} />
            ) : (
              <div class="w-20 h-28 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0"><i class="fas fa-user text-3xl text-slate-600"></i></div>
            )}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-lg font-black text-white uppercase">{c.nama || '-'}</h3>
                <span class="inline-flex items-center gap-1.5">
                  <CrownBadge progress={pMini} />
                  {pMaster >= 100 && <CrownBadge progress={100} />}
                  {isVIP && <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo-removebg-preview.webp" class="w-6 h-6 rounded-full border border-emerald-500/50" alt="VIP" />}
                  {namaKelas && <span class="px-2 py-0.5 bg-indigo-900/60 text-indigo-300 border border-indigo-500/50 rounded text-[9px] font-bold"><i class="fas fa-users mr-1"></i>{namaKelas}</span>}
                </span>
              </div>
              <p class="text-sky-400 font-mono text-xs mt-1">ID: {c.idKandidat || '-'}</p>
              <div class="flex flex-wrap gap-1.5 mt-2">
                {jobTags.map(job => (
                  <span class="px-2 py-0.5 bg-pink-900/30 text-pink-300 border border-pink-700/50 rounded text-[10px] font-bold"><i class="fas fa-briefcase mr-1"></i>{job}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Data Fields */}
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div><span class="text-slate-500">WA</span><p class="text-white font-bold">{c.wa || '-'}</p></div>
            <div><span class="text-slate-500">Gender</span><p class="text-white font-bold">{c.gender || '-'}</p></div>
            <div><span class="text-slate-500">Usia</span><p class="text-white font-bold">{c.usia || '-'} tahun</p></div>
            <div><span class="text-slate-500">TB/BB</span><p class="text-white font-bold">{c.tb || '-'} / {c.bb || '-'}</p></div>
            <div><span class="text-slate-500">Pendidikan</span><p class="text-white font-bold">{c.pendidikan || '-'}</p></div>
            <div><span class="text-slate-500">JFT</span><p class="text-white font-bold">{c.jftText || '-'}</p></div>
            <div><span class="text-slate-500">SSW</span><p class="text-white font-bold">{c.sswText || '-'}</p></div>
            <div><span class="text-slate-500">Status</span><p class="text-white font-bold">{c.tahapan || '-'}</p></div>
            <div class="col-span-2"><span class="text-slate-500">Email</span><p class="text-white font-bold">{c.email || '-'}</p></div>
            <div class="col-span-2"><span class="text-slate-500">Alamat</span><p class="text-white font-bold">{c.alamat || '-'}</p></div>
          </div>

          {/* Progress */}
          <div class="bg-black/40 rounded-xl p-3 border border-slate-700">
            <div class="flex justify-between text-xs mb-1"><span class="text-sky-400 font-bold">CV Mini</span><span class="text-sky-400">{pMini}%</span></div>
            <div class="w-full bg-slate-800 rounded-full h-1.5 mb-2"><div class="bg-sky-500 h-1.5 rounded-full" style={`width:${pMini}%`}></div></div>
            <div class="flex justify-between text-xs mb-1"><span class="text-emerald-400 font-bold">CV Master</span><span class="text-emerald-400">{pMaster}%</span></div>
            <div class="w-full bg-slate-800 rounded-full h-1.5"><div class="bg-emerald-500 h-1.5 rounded-full" style={`width:${pMaster}%`}></div></div>
          </div>

          {/* Documents */}
          <div class="flex flex-wrap gap-2">
            {c.pasPhoto && c.pasPhoto !== '-' && <button onClick={() => setPreviewDoc({ url: c.pasPhoto, title: 'Foto' })} class="px-3 py-1.5 bg-sky-900/50 text-sky-300 border border-sky-500/50 rounded-lg text-[10px] font-bold hover:bg-sky-800 transition"><i class="fas fa-image mr-1"></i>Foto</button>}
            {c.ktpUrl && c.ktpUrl !== '-' && <button onClick={() => setPreviewDoc({ url: c.ktpUrl, title: 'KTP' })} class="px-3 py-1.5 bg-amber-900/50 text-amber-300 border border-amber-500/50 rounded-lg text-[10px] font-bold hover:bg-amber-800 transition"><i class="fas fa-id-card mr-1"></i>KTP</button>}
            {c.folderUrl && c.folderUrl !== '-' && <a href={c.folderUrl} target="_blank" class="px-3 py-1.5 bg-emerald-900/50 text-emerald-300 border border-eme
