/**
 * CandidateDash.tsx — Candidate dashboard with CV progress, status, actions
 * Source: legacy/index.html page-kandidat (lines 840-1039)
 *
 * Updated: integrated ChangePasswordModal + CvMiniModal
 */
import { useState, useEffect } from 'preact/hooks';
import ChangePasswordModal from '../ChangePasswordModal';
import CvMiniModal from '../CvMiniModal';

type Riwayat = {
  jobCode: string;
  tahapan: string;
  status: string;
  tanggal: string;
};

type CandidateData = {
  nama: string;
  wa: string;
  job: string;
  tahapan: string;
  status: string;
  isVIP: boolean;
  cvMiniProgress: number;
  cvMasterProgress: number;
  riwayat: Riwayat[];
  jadwal: { id: string; nama: string; waktu: string; lokasi: string; link: string; }[];
  catatan: string;
  berkasProgress: number;
  berkasTotal: number;
  berkasList: { name: string; done: boolean; }[];
  needRevision: boolean;
  revisionNote: string;
};

export default function CandidateDash() {
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCvMiniModal, setShowCvMiniModal] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const session = JSON.parse(localStorage.getItem('asj_kandidat_session') || '{}');
      if (!session.wa) { window.location.href = '/'; return; }
      const res = await fetch('/.netlify/functions/getAppData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAppData', args: ['kandidat'] }),
      });
      const result = await res.json();
      if (result.success) {
        const d = result.kandidatData || {};
        setData({
          nama: d.nama || session.name || 'Kandidat',
          wa: session.wa, job: d.job || '-',
          tahapan: d.tahapan || '-', status: d.status || '-',
          isVIP: d.isVIP || false,
          cvMiniProgress: d.cvMiniProgress || 0,
          cvMasterProgress: d.cvMasterProgress || 0,
          riwayat: d.riwayat || [],
          jadwal: d.jadwal || [],
          catatan: d.catatan || "",
          berkasProgress: d.berkasProgress || 0,
          berkasTotal: d.berkasTotal || 17,
          berkasList: d.berkasList || [],
          needRevision: d.needRevision || false,
          revisionNote: d.revisionNote || "",
        });
      }
    } catch (e) { console.error('[CandidateDash]', e); }
    finally { setLoading(false); }
  }

  if (loading) return <div class="text-center py-12"><i class="fas fa-spinner fa-spin text-3xl text-emerald-400 mb-4"></i><p class="text-slate-400">Memuat dashboard...</p></div>;
  if (!data) return <div class="text-center py-12"><p class="text-slate-400">Data tidak ditemukan.</p><a href="/" class="mt-4 inline-block px-6 py-3 bg-emerald-600 text-white rounded-full font-bold">Kembali</a></div>;

  return (
    <>
      <div class="glass-panel p-5 sm:p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-4xl mx-auto relative overflow-hidden">
        <i class="fas fa-id-card text-5xl md:text-6xl text-emerald-400 mb-4 md:mb-6 drop-shadow-xl"></i>
        <h2 class="text-2xl md:text-3xl font-black text-white mb-3">Selamat Datang, {data.nama}!</h2>
        <div class="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-3 md:px-8 md:py-4 bg-black/40 border border-emerald-500/30 rounded-full text-sm text-slate-300 mb-5 md:mb-6 shadow-inner w-full md:w-auto">
          <span>Job Dilamar:</span> <span class="font-black text-emerald-400">{data.job}</span>
          <span class="text-slate-500">|</span>
          <span>Tahapan:</span> <span class="font-black text-sky-400">{data.tahapan}</span> ({data.status})
        </div>

        {/* Jadwal Panel */}
        {data.jadwal.length > 0 && (
          <div class="mb-6 md:mb-8 max-w-xl mx-auto bg-gradient-to-r from-amber-950 to-rose-950 border border-amber-500/40 p-5 rounded-[2rem] text-left shadow-xl relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-amber-500/10 text-7xl"><i class="fas fa-calendar-alt"></i></div>
            <h3 class="relative z-10 text-lg font-black text-amber-400 mb-4"><i class="fas fa-calendar-check mr-2 text-rose-400 animate-pulse"></i> JADWAL ANDA</h3>
            <div class="relative z-10 space-y-3">
              {data.jadwal.map((j, i) => (<div key={i} class="bg-black/30 border border-amber-900/50 rounded-xl p-4"><div class="flex justify-between"><span class="font-bold text-white text-sm">{j.nama}</span><span class="text-[10px] text-amber-400 font-mono">{j.waktu}</span></div><p class="text-xs text-slate-400 mt-1"><i class="fas fa-map-marker-alt mr-1"></i>{j.lokasi}</p></div>))}
            </div>
          </div>
        )}

        {/* Catatan Admin */}
        {data.catatan && (<div class="mb-8 max-w-xl mx-auto bg-sky-900/20 border border-sky-500/30 p-5 rounded-2xl text-center shadow-lg"><p class="text-xs text-sky-400 font-bold uppercase mb-2"><i class="fas fa-envelope-open-text mr-1"></i> Pesan dari Admin:</p><p class="text-sm text-slate-200 italic">"{data.catatan}"</p></div>)}

        {/* CV Progress */}
        <div class="max-w-xl mx-auto mb-6 md:mb-8 bg-black/40 border border-slate-700 p-4 md:p-5 rounded-2xl text-left shadow-lg">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-slate-300"><i class="fas fa-id-badge text-sky-400 mr-1"></i> CV Mini</span>
            <span class="text-sm font-bold text-sky-400">{data.cvMiniProgress}%</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2.5 mb-4 shadow-inner">
            <div class="bg-gradient-to-r from-sky-600 to-sky-400 h-2.5 rounded-full transition-[width] duration-1000" style={`width:${data.cvMiniProgress}%`}></div>
          </div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-slate-300"><i class="fas fa-file-signature text-emerald-400 mr-1"></i> CV Master</span>
            <span class="text-sm font-bold text-emerald-400">{data.cvMasterProgress}%</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2.5 shadow-inner">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2.5 rounded-full transition-[width] duration-1000" style={`width:${data.cvMasterProgress}%`}></div>
          </div>
          <p class="text-xs text-slate-300 mt-4 italic text-center font-bold">Lengkapi profil hingga 100% untuk Mahkota Perak! <i class="fas fa-medal"></i></p>
        </div>

        <div class="mb-6 md:mb-8 flex justify-center">
          <button class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full font-bold shadow-lg hover:scale-105 transition text-sm"><i class="fas fa-user-circle mr-2 text-sky-400"></i> Lihat Profil Digital CV Saya</button>
        </div>

        {/* Status Lamaran Terkini */}
        <div class="mb-6 md:mb-8 bg-gradient-to-r from-sky-950 to-indigo-950 border border-sky-500/30 p-5 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden text-left">
          <div class="absolute -right-6 -top-10 text-sky-500/10 text-[10rem]"><i class="fas fa-rocket"></i></div>
          <div class="relative z-10">
            <h3 class="text-xl font-black text-sky-300 mb-2"><i class="fas fa-bolt mr-2 text-amber-400"></i> UPDATE PROFIL</h3>
            <p class="text-sm text-slate-300 mb-5">Gunakan <b>CV Mini</b> untuk profil singkat. <b>CV Master</b> untuk format lengkap.</p>
            <div class="mt-6 p-1 rounded-[1.5rem] bg-gradient-to-r from-sky-500/30 to-emerald-500/30 border border-slate-700/50 shadow-xl">
              <div class="bg-[#0f172a] rounded-[1.3rem] p-5 md:p-7">
                <h3 class="text-sm md:text-base font-black text-white mb-4 uppercase"><i class="fas fa-satellite-dish mr-2 text-sky-400 animate-pulse"></i> Status Lamaran Terkini</h3>
                <div class="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {data.riwayat.length === 0 ? (
                    <p class="text-slate-500 text-sm text-center py-4">Belum ada lamaran aktif.</p>
                  ) : data.riwayat.map((r, i) => (
                    <div key={i} class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <div class="flex justify-between items-start">
                        <span class="font-mono text-sky-400 text-xs bg-sky-900/30 px-2 py-1 rounded-md border border-sky-500/30">{r.jobCode}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">{r.status}</span>
                      </div>
                      <p class="text-sm text-white mt-2 font-bold">{r.tahapan}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              <button onClick={() => setShowCvMiniModal(true)} class="w-full px-3 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-user-edit mr-1.5"></i> Update CV Mini</button>
              <button class="w-full px-3 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-microphone-alt mr-1.5"></i> Latihan Interview</button>
              <button class="w-full px-3 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-signature mr-1.5"></i> E-Sign &amp; Naitei</button>
              <button class="w-full px-3 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-robot mr-1.5"></i> AI CV Master</button>
              <button class="w-full px-3 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-clipboard-list mr-1.5 text-sky-400"></i> Form Master</button>
              <button class="w-full px-3 py-3 bg-slate-200 hover:bg-white text-slate-900 rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-file-alt mr-1.5 text-red-600"></i> Preview CV</button>
              <button onClick={() => setShowPasswordModal(true)} class="w-full px-3 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-full text-sm font-bold shadow-lg hover:-translate-y-1 transition"><i class="fas fa-key mr-1.5"></i> Ganti Password</button>
            </div>
          </div>
        </div>

        {/* Area Revisi Dokumen */}
        {data.needRevision && (<div class="bg-red-950 border border-red-500/40 rounded-[2rem] p-5 mb-6 md:mb-8 text-left"><h3 class="text-red-400 font-bold mb-2 text-lg"><i class="fas fa-exclamation-triangle mr-2"></i> Dokumen Perlu Direvisi</h3><p class="text-sm text-slate-300 mb-5">{data.revisionNote || "Silakan perbaiki dan upload ulang."}</p><button class="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold shadow-lg">Upload File Revisi</button></div>)}

        {/* Pemberkasan Progress */}
        {data.berkasTotal > 0 && (<div class="mb-8 max-w-xl mx-auto"><div class="bg-black/60 border border-emerald-500/30 rounded-[2rem] p-5 mb-4 text-left"><div class="flex items-center justify-between mb-3"><h4 class="text-sm font-black text-emerald-400 uppercase"><i class="fas fa-tasks mr-1.5"></i> Progres Pemberkasan</h4><span class="text-lg font-black text-white">{data.berkasProgress}%</span></div><div class="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3"><div class="h-full bg-gradient-to-r from-emerald-600 to-sky-500 rounded-full transition-[width] duration-500" style={"width:" + data.berkasProgress + "%"}></div></div><div class="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">{data.berkasList.map((b, i) => (<div key={i} class={"flex items-center gap-2 text-xs px-2 py-1 rounded " + (b.done ? "text-emerald-400" : "text-slate-500")}><i class={"fas " + (b.done ? "fa-check-circle" : "fa-circle")}></i> {b.name}</div>))}</div></div><button class="w-full py-4 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-[1.5rem] font-black shadow-lg hover:-translate-y-1 transition text-sm border border-emerald-400/30"><i class="fas fa-folder-open mr-2"></i> LENGKAPI PEMBERKASAN & BIODATA</button></div>)}
        <a href="/public" class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold shadow-lg hover:scale-105 transition text-sm inline-block">Lihat Lowongan Kerja Publik</a>
      </div>

      {/* Modals */}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showCvMiniModal && <CvMiniModal onClose={() => setShowCvMiniModal(false)} />}
    </>
  );
}
