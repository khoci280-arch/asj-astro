/**
 * CandidateDash.tsx — Candidate dashboard matching legacy 100%
 * Source: legacy/index.html page-kandidat (lines 840-1039)
 * Features: Student Card, tahapan pipeline, badge system, pemberkasan, all modals
 */
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { authStore } from '../../store/authReactive';
import { t } from '../../store/i18n';
import ChangePasswordModal from '../ChangePasswordModal';
import CvMiniModal from '../CvMiniModal';
import DocumentPreviewModal from '../DocumentPreviewModal';
import WAPintarModal from '../WAPintarModal';
import ESignatureModal from '../ESignatureModal';

type Riwayat = { jobCode: string; tahapan: string; status: string; tanggal: string; kategori?: string; };
type CandidateData = {
  nama: string; wa: string; job: string; tahapan: string; status: string;
  isVIP: boolean; kelas?: string; idKandidat?: string;
  cvMiniProgress: number; cvMasterProgress: number;
  riwayat: Riwayat[];
  jadwal: { id: string; nama: string; waktu: string; lokasi: string; link: string; }[];
  catatan: string; catatanExt?: string;
  berkasProgress: number; berkasTotal: number;
  berkasList: { name: string; done: boolean; }[];
  needRevision: boolean; revisionNote: string;
  applications?: { code: string; cv: string; status: string; tahapan: string; }[];
};

function statusBadgeClass(status: string) {
  const s = (status || '').toUpperCase();
  if (s.includes('MENUNGGU') || s.includes('BARU') || s.includes('PENDING'))
    return 'bg-amber-900/40 text-amber-400 border-amber-500/30';
  if (s.includes('REVIEW') || s.includes('DIBACA') || s.includes('PROSES'))
    return 'bg-sky-900/40 text-sky-400 border-sky-500/30';
  if (s.includes('LULUS') || s.includes('APPROVE') || s.includes('LOLOS'))
    return 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30';
  if (s.includes('GAGAL') || s.includes('REJECT') || s.includes('TOLAK'))
    return 'bg-red-900/40 text-red-400 border-red-500/30';
  return 'bg-slate-800 text-slate-300 border-slate-600';
}

function statusIcon(status: string) {
  const s = (status || '').toUpperCase();
  if (s.includes('MENUNGGU') || s.includes('BARU') || s.includes('PENDING')) return 'fa-clock';
  if (s.includes('REVIEW') || s.includes('DIBACA') || s.includes('PROSES')) return 'fa-user-check';
  if (s.includes('LULUS') || s.includes('APPROVE') || s.includes('LOLOS')) return 'fa-check-circle';
  if (s.includes('GAGAL') || s.includes('REJECT') || s.includes('TOLAK')) return 'fa-times-circle';
  return 'fa-info-circle';
}

function statusText(status: string) {
  const s = (status || '').toUpperCase();
  if (s.includes('MENUNGGU') || s.includes('BARU') || s.includes('PENDING')) return t('form.txt_menunggu_review');
  if (s.includes('REVIEW') || s.includes('DIBACA') || s.includes('PROSES')) return t('form.txt_review_admin');
  if (s.includes('LULUS') || s.includes('APPROVE') || s.includes('LOLOS')) return t('form.txt_lamaran_lulus');
  if (s.includes('GAGAL') || s.includes('REJECT') || s.includes('TOLAK')) return t('form.txt_lamaran_gagal');
  return t('form.txt_diproses');
}

// Tahapan pipeline steps
const TAHAPAN_STEPS = ['PENDAFTARAN', 'CHECK KAIWA', 'MENDAN', 'LOLOS USER', 'MCU', 'PEMBERKASAN', 'NAITEI', 'COE', 'VISA', 'FLIGHT'];
function tahapanStepIndex(tahapan: string) {
  const t = (tahapan || '').toUpperCase();
  for (let i = 0; i < TAHAPAN_STEPS.length; i++) {
    if (t.includes(TAHAPAN_STEPS[i])) return i;
  }
  return 0;
}

function CrownBadge({ progress }: { progress: number }) {
  if (progress >= 100) return <span class="text-lg" title={t("candidate.badge_gold_title")}>👑</span>;
  if (progress >= 50) return <span class="text-lg" title="CV Mini Lengkap (Silver)">🥈</span>;
  if (progress > 0) return <span class="text-lg" title={t("candidate.badge_bronze_title")}>🥉</span>;
  return null;
}

export default function CandidateDash() {
  const user = useStore(authStore);
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCvMiniModal, setShowCvMiniModal] = useState(false);
  const [showESign, setShowESign] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState("");
  const [docPreviewTitle, setDocPreviewTitle] = useState("");
  const [selectedLoker, setSelectedLoker] = useState<string | null>(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const wa = user.wa || JSON.parse(localStorage.getItem('asj_kandidat_session') || '{}').wa;
      if (!wa) { window.location.href = '/'; return; }
      const token = user.sessionToken || '';
      const res = await fetch('/.netlify/functions/bridge-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAppData', args: ['kandidat'], sessionToken: token }),
      });
      const result = await res.json();
      if (result.success) {
        const d = result.kandidatData || {};
        setData({
          nama: d.nama || user.name || 'Kandidat', wa,
          job: d.job || '-', tahapan: d.tahapan || '-', status: d.status || '-',
          isVIP: d.isVIP || false, kelas: d.kelas || '', idKandidat: d.idKandidat || '',
          cvMiniProgress: d.cvMiniProgress || 0, cvMasterProgress: d.cvMasterProgress || 0,
          riwayat: d.riwayat || [], jadwal: d.jadwal || [],
          catatan: d.catatan || '', catatanExt: d.catatanExt || '',
          berkasProgress: d.berkasProgress || 0, berkasTotal: d.berkasTotal || 17,
          berkasList: d.berkasList || [],
          needRevision: d.needRevision || false, revisionNote: d.revisionNote || '',
          applications: d.applications || [],
        });
      }
    } catch (e) { console.error('[CandidateDash]', e); }
    finally { setLoading(false); }
  }

  if (loading) return <div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-emerald-400 mb-4"></i><p class="text-slate-400">{t('ui.loading')}</p></div>;
    async function handleSaveSignature(dataUrl: string) {
    try {
      const res = await fetch('/.netlify/functions/bridge-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveSignature', args: [user?.wa, dataUrl] }),
      });
      const r = await res.json();
      if (r.success) { showToast('Tanda tangan tersimpan!', 'success'); }
      else { showToast(r.error || 'Gagal menyimpan', 'error'); }
    } catch { showToast('Error menyimpan tanda tangan', 'error'); }
    setShowESign(false);
  }

if (!data) return <div class="text-center py-12"><p class="text-slate-400">{t('ui.toast_data_not_found')}</p><a href="/" class="mt-4 inline-block px-6 py-3 bg-emerald-600 text-white rounded-full font-bold">{t('button.back')}</a></div>;

  const overallProgress = Math.round((data.cvMiniProgress + data.cvMasterProgress) / 2);
  const crown = overallProgress >= 100 ? 'gold' : overallProgress >= 50 ? 'silver' : overallProgress > 0 ? 'bronze' : 'none';

  // Filter riwayat by selected loker
  const filteredRiwayat = selectedLoker
    ? data.riwayat.filter(r => r.jobCode === selectedLoker)
    : data.riwayat;
  const sortedRiwayat = [...filteredRiwayat].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  const uniqueLokers = [...new Set(data.riwayat.map(r => r.jobCode).filter(Boolean))];

  return (
    <div class="pb-16">
      <div class="glass-panel p-5 sm:p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-4xl mx-auto relative overflow-hidden">
        <i class="fas fa-id-card text-5xl md:text-6xl text-emerald-400 mb-4 md:mb-6 drop-shadow-xl"></i>
        <h2 class="text-2xl md:text-3xl font-black text-white mb-3">{t('candidate.welcome')}, {data.nama}! <CrownBadge progress={overallProgress} /></h2>
        <div class="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-3 md:px-8 md:py-4 bg-black/40 border border-emerald-500/30 rounded-full text-sm text-slate-300 mb-5 md:mb-6 shadow-inner w-full md:w-auto">
          <span>{t('candidate.job_applied')}</span> <span class="font-black text-emerald-400">{data.job}</span>
          <span class="text-slate-500">|</span>
          <span>{t('candidate.stage')}</span> <span class="font-black text-sky-400">{data.tahapan}</span> ({data.status})
        </div>

        {/* ── DIGITAL STUDENT CARD (VIP only) ── */}
        {data.isVIP && data.idKandidat && (
          <div class="max-w-sm mx-auto mb-8 perspective-1000 relative group">
            <div class="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-600 rounded-[2rem] blur opacity-25 group-hover:opacity-60 transition duration-1000"></div>
            <div class="relative w-full h-56 md:h-64 bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-[2rem] p-6 shadow-2xl flex flex-col justify-between overflow-hidden text-left transform transition-transform duration-500 hover:scale-105">
              <div class="absolute -right-10 -top-10 text-slate-800/50 text-[10rem] opacity-20 transform rotate-12 pointer-events-none"><i class="fas fa-sun"></i></div>
              <div class="flex justify-between items-start z-10">
                <div class="flex items-center gap-3">
                  <div class="w-11 h-11 bg-white rounded-full shadow-lg overflow-hidden flex items-center justify-center border border-slate-600">
                    <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo-removebg-preview.webp" alt="Logo ASJ" class="w-full h-full object-cover scale-110" />
                  </div>
                  <div>
                    <h3 class="text-white font-black text-sm tracking-widest">{t('ui.student_id')}</h3>
                    <p class="text-amber-400 text-[9px] font-bold uppercase tracking-[0.2em]">{data.kelas || t('ui.vip_member')}</p>
                  </div>
                </div>
                <i class="fas fa-check-circle text-emerald-400 text-xl shadow-[0_0_10px_rgba(118,185,0,0.5)] rounded-full"></i>
              </div>
              <div class="flex justify-between items-center mt-auto z-10">
                <div>
                  <p class="text-slate-300 text-[9px] uppercase font-bold mb-0.5">{t('ui.student_name')}</p>
                  <p class="text-white font-black text-sm tracking-wide leading-tight break-words line-clamp-2 max-w-[170px]">{data.nama}</p>
                  <p class="text-slate-300 text-[9px] uppercase font-bold mt-3 mb-0.5">{t('ui.reg_id')}</p>
                  <p class="text-sky-300 font-mono text-sm font-bold">{data.idKandidat}</p>
                </div>
                <div class="bg-white p-2 rounded-xl shadow-lg border-2 border-slate-200">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.idKandidat || '')}`} alt="QR Code" class="w-20 h-20 md:w-24 md:h-24 object-contain" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CV Progress ── */}
        <div class="max-w-xl mx-auto mb-6 md:mb-8 bg-black/40 border border-slate-700 p-4 md:p-5 rounded-2xl text-left shadow-lg">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-slate-300"><i class="fas fa-id-badge text-sky-400 mr-1"></i> {t('ui.cv_mini_basic')}</span>
            <span class="text-sm font-bold text-sky-400">{data.cvMiniProgress}%</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2.5 mb-4 shadow-inner">
            <div class="bg-gradient-to-r from-sky-600 to-sky-400 h-2.5 rounded-full transition-[width] duration-1000" style={`width:${data.cvMiniProgress}%`}></div>
          </div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-slate-300"><i class="fas fa-file-signature text-emerald-400 mr-1"></i> {t('ui.cv_master_detail')}</span>
            <span class="text-sm font-bold text-emerald-400">{data.cvMasterProgress}%</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2.5 shadow-inner">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2.5 rounded-full transition-[width] duration-1000" style={`width:${data.cvMasterProgress}%`}></div>
          </div>
          <p class="text-xs text-slate-300 mt-4 italic text-center font-bold">{crown === 'gold' ? t('ui.profile_100') : crown === 'silver' ? t('ui.profile_silver_next') : t('ui.profile_incomplete')} <i class="fas fa-medal"></i></p>
        </div>

        {/* ── Jadwal Panel ── */}
        {data.jadwal.length > 0 && (
          <div class="mb-6 md:mb-8 max-w-xl mx-auto bg-gradient-to-r from-amber-950 to-rose-950 border border-amber-500/40 p-5 rounded-[2rem] text-left shadow-xl relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-amber-500/10 text-7xl"><i class="fas fa-calendar-alt"></i></div>
            <h3 class="relative z-10 text-lg font-black text-amber-400 mb-4"><i class="fas fa-calendar-check mr-2 text-rose-400 animate-pulse"></i> {t('ui.your_schedule')}</h3>
            <div class="relative z-10 space-y-3">
              {data.jadwal.map((j, i) => (
                <div key={i} class="bg-black/30 border border-amber-900/50 rounded-xl p-4">
                  <div class="flex justify-between"><span class="font-bold text-white text-sm">{j.nama}</span><span class="text-[10px] text-amber-400 font-mono">{j.waktu}</span></div>
                  <p class="text-xs text-slate-400 mt-1"><i class="fas fa-map-marker-alt mr-1"></i>{j.lokasi}</p>
                  {j.link && <a href={j.link} target="_blank" class="text-[10px] text-sky-400 underline mt-1 inline-block">{t('ui.open_link')}</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Catatan Admin ── */}
        {data.catatan && (
          <div class="mb-8 max-w-xl mx-auto bg-sky-900/20 border border-sky-500/30 p-5 rounded-2xl text-center shadow-lg">
            <p class="text-xs text-sky-400 font-bold uppercase mb-2"><i class="fas fa-envelope-open-text mr-1"></i> {t('ui.admin_eval_msg')}</p>
            <p class="text-sm text-slate-200 italic">"{data.catatan}"</p>
          </div>
        )}

        {/* ── Digital CV button ── */}
        <div class="mb-6 md:mb-8 flex justify-center">
          <button class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full font-bold shadow-lg hover:scale-105 transition text-sm"><i class="fas fa-user-circle mr-2 text-sky-400"></i> {t('button.view_cv')}</button>
        </div>

        {/* ── Status Lamaran Terkini (with tahapan pipeline) ── */}
        <div class="mb-6 md:mb-8 bg-gradient-to-r from-sky-950 to-indigo-950 border border-sky-500/30 p-5 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden text-left">
          <div class="absolute -right-6 -top-10 text-sky-500/10 text-[10rem]"><i class="fas fa-rocket"></i></div>
          <div class="relative z-10">
            <h3 class="text-xl font-black text-sky-300 mb-2"><i class="fas fa-bolt mr-2 text-amber-400"></i> {t('ui.app_status_latest')}</h3>
            <p class="text-sm text-slate-300 mb-5">{t('ui.cv_type_hint')}</p>
            <div class="mt-6 p-1 rounded-[1.5rem] bg-gradient-to-r from-sky-500/30 to-emerald-500/30 border border-slate-700/50 shadow-xl">
              <div class="bg-[#0f172a] rounded-[1.3rem] p-5 md:p-7">
                <h3 class="text-sm md:text-base font-black text-white mb-4 uppercase"><i class="fas fa-satellite-dish mr-2 text-sky-400 animate-pulse"></i> {t('ui.app_status_latest')}</h3>
                {/* Loker pills */}
                {uniqueLokers.length > 1 && (
                  <div class="flex flex-wrap gap-1.5 mb-3">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider self-center">{t('ui.pilih_loker')}</span>
                    {uniqueLokers.map(code => (
                      <button onClick={() => setSelectedLoker(selectedLoker === code ? null : code)}
                        class={`px-2.5 py-1 rounded-full border text-[10px] font-black transition ${selectedLoker === code ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-emerald-500/60'}`}>
                        {code}
                      </button>
                    ))}
                  </div>
                )}
                <div class="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {sortedRiwayat.length === 0 ? (
                    <p class="text-slate-500 text-sm text-center py-4">{t('ui.not_applied_general')}</p>
                  ) : sortedRiwayat.map((r, i) => {
                    const stepIdx = tahapanStepIndex(r.tahapan || r.status);
                    const progressPct = Math.round(((stepIdx + 1) / TAHAPAN_STEPS.length) * 100);
                    return (
                      <div key={i} class="flex flex-col p-4 rounded-2xl border border-slate-700/50 bg-black/60 hover:bg-black/80 transition-all shadow-lg mb-3 overflow-hidden">
                        <div class="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-1">
                          <div class="min-w-0">
                            <div class="text-sm font-black text-white tracking-wide"><i class="fas fa-building text-slate-500 mr-2"></i>{r.jobCode || '-'} <span class="text-[9px] px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded ml-2 font-normal">{(r.tanggal || '').substring(0, 10)}</span></div>
                            {r.kategori && <div class="text-[11px] text-slate-400 mt-1"><i class="fas fa-tag mr-1 text-sky-500/70"></i> {r.kategori}</div>}
                          </div>
                          <span class={`inline-flex items-start gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] md:text-xs font-bold max-w-full break-words text-left shadow-sm ${statusBadgeClass(r.status)}`}>
                            <i class={`fas ${statusIcon(r.status)} mt-0.5 flex-shrink-0`}></i> {statusText(r.status)}
                          </span>
                        </div>
                        {/* Tahapan pipeline */}
                        <div class="mt-3">
                          <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><i class="fas fa-route mr-1 text-sky-400"></i> {t('form.txt_tahapan_saat_ini')}</span>
                            <span class="text-[10px] font-black text-emerald-400"><i class="fas fa-map-pin"></i> {TAHAPAN_STEPS[stepIdx] || r.tahapan}</span>
                          </div>
                          <div class="w-full bg-slate-800 rounded-full h-1.5 border border-slate-700/50">
                            <div class="bg-gradient-to-r from-emerald-600 to-sky-500 h-1.5 rounded-full transition-all duration-1000" style={`width:${progressPct}%`}></div>
                          </div>
                          <div class="flex flex-wrap justify-between gap-x-2 gap-y-1 mt-1.5">
                            {TAHAPAN_STEPS.map((nm, si) => {
                              const done = si < stepIdx;
                              const active = si === stepIdx;
                              return <span key={si} class={`flex items-center gap-1 text-[9px] font-bold whitespace-nowrap ${done ? 'text-emerald-400' : active ? 'text-amber-400' : 'text-slate-500'}`}><i class={`fas ${done ? 'fa-check-circle' : 'fa-circle'} flex-shrink-0`}></i> {nm}</span>;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Action buttons grid */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              <button onClick={() => setShowCvMiniModal(true)} class="w-full px-3 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold shadow-[0_0_15px_rgba(118,185,0,0.5)] hover:-translate-y-1 transition"><i class="fas fa-user-edit mr-1.5"></i> {t('ui.update_cv_mini')}</button>
              <a href="/ai-cv" class="w-full px-3 py-3 bg-violet-600 hover:bg-violet-500 border border-violet-400/50 text-white rounded-full text-sm font-bold shadow-[0_0_15px_rgba(124,58,237,0.5)] hover:-translate-y-1 transition text-center"><i class="fas fa-microphone-alt mr-1.5"></i> {t('ui.interview_practice')}</a>
              <button onClick={() => setShowESign(true)} class="w-full px-3 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-sm font-bold shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:-translate-y-1 transition"><i class="fas fa-signature mr-1.5"></i> {t('ui.esign_naitei')}</button>
              <a href="/ai-cv" class="w-full px-3 py-3 bg-amber-600 hover:bg-amber-500 border border-amber-400/50 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition text-center"><i class="fas fa-robot mr-1.5"></i> AI CV Master Assistant</a>
              <a href="/master" class="w-full px-3 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition text-center"><i class="fas fa-clipboard-list mr-1.5 text-sky-400"></i> {t('ui.master_full_form')}</a>
              <button onClick={() => { setDocPreviewUrl(user?.cvUrl || ''); setDocPreviewTitle('CV Preview'); setShowDocPreview(true); }} class="w-full px-3 py-3 bg-slate-200 hover:bg-white text-slate-900 rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-file-alt mr-1.5 text-red-600"></i> Preview Desain CV</button>
              <button onClick={() => setShowPasswordModal(true)} class="w-full px-3 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-key mr-1.5"></i> {t('ui.change_password')}</button>
            </div>
          </div>
        </div>
        {data.needRevision && (
          <div class="bg-red-950 border border-red-500/40 rounded-[2rem] p-5 mb-6 md:mb-8 text-left">
            <h3 class="text-red-400 font-bold mb-2 text-lg"><i class="fas fa-exclamation-triangle mr-2"></i> {t('candidate.doc_revise_title')}</h3>
            <p class="text-sm text-slate-300 mb-5">{data.revisionNote || t('candidate.doc_revise_desc')}</p>
            <input type="file" accept=".pdf,.xls,.xlsx,.jpg,.png" class="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:font-bold file:bg-red-600/20 file:text-red-300 hover:file:bg-red-600/40 cursor-pointer mb-4 transition-colors" />
            <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.jpg,.jpeg,.png'; input.onchange = async (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; showToast('Mengupload ' + file.name + '...', 'info'); /* TODO: upload to Supabase storage */ }; input.click(); }} class="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold shadow-lg transition-colors"><i class="fas fa-upload mr-2"></i>{t('button.upload_revise')}</button>
          </div>
        )}

        {/* ── Pemberkasan Progress ── */}
        {data.berkasTotal > 0 && (
          <div class="mb-8 max-w-xl mx-auto">
            <div class="bg-black/60 border border-emerald-500/30 rounded-[2rem] p-5 mb-4 text-left">
              <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h4 class="text-sm font-black text-emerald-400 uppercase tracking-widest"><i class="fas fa-tasks mr-1.5"></i> {t('ui.berkas_progress')}</h4>
                <span class="text-lg font-black text-white">{Math.round(data.berkasProgress)}%</span>
              </div>
              <div class="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div class="h-full bg-gradient-to-r from-emerald-600 to-sky-500 rounded-full transition-[width] duration-500" style={`width:${data.berkasProgress}%`}></div>
              </div>
              <div class="flex flex-wrap items-center gap-2 mb-4">
                <span class="text-xs font-bold text-white">{data.berkasList.filter(b => b.done).length}/{data.berkasTotal} dokumen</span>
              </div>
              <div class="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {data.berkasList.map((b, i) => (
                  <div key={i} class={`flex items-center gap-2 text-xs px-2 py-1 rounded ${b.done ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <i class={`fas ${b.done ? 'fa-check-circle' : 'fa-circle'}`}></i> {b.name}
                  </div>
                ))}
              </div>
            </div>
            <button class="w-full py-4 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-[1.5rem] font-black shadow-[0_0_20px_rgba(90,141,0,0.4)] hover:-translate-y-1 transition text-sm md:text-base border border-emerald-400/30 text-center">
              <i class="fas fa-folder-open mr-2"></i>{t('ui.complete_berkas_biodata')}
            </button>
            <p class="text-sm text-emerald-400 mt-3 font-bold animate-pulse text-center"><i class="fas fa-info-circle mr-1"></i> {t('ui.berkas_stage_hint')}</p>
          </div>
        )}

        <a href="/public" class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold shadow-lg hover:scale-105 transition text-sm inline-block">{t('button.view_public_jobs')}</a>
      </div>

      {/* ── Modals ── */}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showCvMiniModal && <CvMiniModal onClose={() => setShowCvMiniModal(false)} />}
      {showDocPreview && <DocumentPreviewModal url={docPreviewUrl} title={docPreviewTitle} onClose={() => setShowDocPreview(false)} />}
      {showESign && <ESignatureModal onSave={handleSaveSignature} onClose={() => setShowESign(false)} />}
    </div>
  );
}
