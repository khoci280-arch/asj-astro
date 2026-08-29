/**
 * LokerTable.tsx — Public job listing table with status filters
 * Source: legacy/index.html page-public → public-loker-section
 * Preact island — interactive (filters + data fetch + theme toggle + cek siswa modal)
 */
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { langStore, t } from '../../store/i18n';
import { SkeletonTable } from '../Skeleton';
import LokerDetailModal from './LokerDetailModal';

type Job = {
  code: string;
  pekerjaan: string;
  status: string;
  keterangan: string;
  kategori: string;
  kuota: string;
  gender: string;
  lokasi: string;
  syarat: string;
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  URGENT: 'bg-red-500/20 text-red-400 border-red-500/40',
  CLOSE: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

const FILTER_BTN = 'px-4 py-2 rounded-lg text-sm font-bold shadow-md transition';

export default function LokerTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showCekModal, setShowCekModal] = useState(false);
  const [isDark, setIsDark] = useState(() => typeof document !== "undefined" ? !document.documentElement.classList.contains("light") : true);
  const [cekQuery, setCekQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const lang = useStore(langStore);

  useEffect(() => {
    fetchJobs();
    const onOpenCek = () => setShowCekModal(true);
    window.addEventListener('openCekSiswaModal', onOpenCek);
    return () => window.removeEventListener('openCekSiswaModal', onOpenCek);
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/.netlify/functions/get-app-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAppData', args: ['public'] }),
      });
      const data = await res.json();
      if (data.success && data.jobs) setJobs(data.jobs);
    } catch (err) {
      console.error('[LokerTable] Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'ALL'
    ? jobs
    : jobs.filter((j) => (j.status || '').toUpperCase() === filter);

  function getStatusClass(status: string) {
    return STATUS_COLORS[(status || '').toUpperCase()] || STATUS_COLORS.CLOSE;
  }

  function openWhatsApp(job: Job) {
    const text = encodeURIComponent(
      `Halo Admin ASJ, saya tertarik melamar posisi ${job.pekerjaan} (${job.code}). Mohon info lebih lanjut.`
    );
    window.open(`https://wa.me/6287889502004?text=${text}`, '_blank');
  }

  return (
    <div class="animate-fade-in">
      {/* Control bar: Theme toggle (left) + Filter buttons (right) — same as legacy */}
      <div class="flex flex-wrap justify-between items-center p-4 rounded-xl border shadow-lg mb-6 gap-4 transition-colors bg-slate-900 border-slate-700">
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-300 mr-1 uppercase tracking-widest"><i class="fas fa-paint-brush"></i> Tema</span>
          <button onClick={() => { document.documentElement.classList.toggle('light'); var isL = document.documentElement.classList.contains('light'); setIsDark(!isL); localStorage.setItem('asjTheme', isL ? 'light' : 'dark'); }} class="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/25 rounded-full text-xs font-bold transition-colors shadow-lg flex items-center gap-1.5">
            <i class={"fas " + (isDark ? "fa-moon" : "fa-sun")}></i> {isDark ? 'Dark' : 'Light'}
          </button>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-300 mr-2 uppercase tracking-widest">
            <i class="fas fa-filter"></i> Filter
          </span>
          {['ALL', 'OPEN', 'URGENT', 'CLOSE'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              class={`${FILTER_BTN} ${filter === f ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              {f === 'ALL' ? 'Semua' : f === 'OPEN' ? 'Buka' : f === 'URGENT' ? 'Urgent' : 'Tutup'}
            </button>
          ))}
          <span class="text-xs text-slate-500 font-bold ml-2">{filtered.length} {t('public.lowongan_count')}</span>
        </div>
      </div>

      {/* Table */}
      <div class="overflow-x-auto rounded-xl border border-slate-800 shadow-xl bg-slate-900 transition-colors duration-300">
        <table class="responsive-table w-full min-w-[900px] text-left text-sm whitespace-nowrap">
          <thead class="bg-slate-800 text-slate-200 text-sm uppercase tracking-wider font-bold border-b border-slate-700 transition-colors duration-300">
            <tr>
              <th scope="col" class="p-4 text-center w-32">Kode Job</th>
              <th scope="col" class="p-4">Nama Pekerjaan</th>
              <th scope="col" class="p-4 text-center">Status</th>
              <th scope="col" class="p-4">Persyaratan &amp; Ket.</th>
              <th scope="col" class="p-4 text-center w-48">Aksi Pelamar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 transition-colors duration-300">
            {loading ? (
              <tr><td colSpan={5} class="p-8 text-center text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i> {t('public.loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} class="p-8 text-center text-slate-500"><i class="fas fa-inbox mr-2"></i> {t('public.no_data')}</td></tr>
            ) : (
              filtered.map((job, i) => (
                <tr key={job.code || i} class="hover:bg-white/5 transition-colors">
                  <td class="p-4 text-center">
                    <span class="font-mono font-black text-sky-400 text-xs bg-sky-900/30 px-2 py-1 rounded-md border border-sky-500/30">{job.code || '-'}</span>
                  </td>
                  <td class="p-4">
                    <div class="font-bold text-white">{job.pekerjaan || '-'}</div>
                    {job.kategori && <div class="text-xs text-slate-500 mt-0.5">{job.kategori}</div>}
                  </td>
                  <td class="p-4 text-center">
                    <span class={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusClass(job.status)}`}>{job.status || 'CLOSE'}</span>
                  </td>
                  <td class="p-4">
                    <div class="text-slate-300 text-xs max-w-[300px] truncate" title={job.keterangan || ''}>{job.keterangan || '-'}</div>
                    {job.gender && <div class="text-xs text-slate-500 mt-0.5"><i class="fas fa-user mr-1"></i>{job.gender}</div>}
                  </td>
                  <td class="p-4 text-center">
                    {(job.status || '').toUpperCase() === 'CLOSE' ? (
                      <span class="text-xs text-slate-500 font-bold">{t('public.close')}</span>
                    ) : (
                      <button onClick={() => openWhatsApp(job)} class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg inline-flex items-center gap-1">
                        <i class="fab fa-whatsapp"></i> Lamar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Cek Data Siswa */}
      {showCekModal && (
        <div class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setShowCekModal(false)}>
          <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-bold text-white mb-4"><i class="fas fa-search mr-2 text-sky-400"></i> t('form.placeholder_search')</h3>
            <input type="text" value={cekQuery} onInput={(e) => setCekQuery((e.target as HTMLInputElement).value)} placeholder="Cari nama / NIS..." class="w-full p-3 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition mb-4" />
            <div class="text-xs text-slate-500 text-center py-4">Data akan dimuat dari backend.</div>
            <button onClick={() => setShowCekModal(false)} class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition">Tutup</button>
          </div>
        </div>
      )}
      {selectedJob && <LokerDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>

  );
}
