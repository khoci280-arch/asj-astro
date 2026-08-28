/**
 * LokerTable.tsx — Public job listing table with status filters
 * Source: legacy/index.html page-public → public-loker-section
 * Preact island — interactive (filters + data fetch)
 */
import { useState, useEffect } from 'preact/hooks';

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

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/.netlify/functions/getAppData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAppData', args: ['public'] }),
      });
      const data = await res.json();
      if (data.success && data.jobs) {
        setJobs(data.jobs);
      }
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
      {/* Filter bar */}
      <div class="flex flex-wrap justify-between items-center p-4 rounded-xl border border-slate-700 shadow-lg mb-6 gap-4 bg-slate-900 transition-colors">
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-300 mr-1 uppercase tracking-widest">
            <i class="fas fa-filter"></i> Filter
          </span>
          {['ALL', 'OPEN', 'URGENT', 'CLOSE'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              class={`${FILTER_BTN} ${
                filter === f
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f === 'ALL' ? 'Semua' : f === 'OPEN' ? 'Buka' : f === 'URGENT' ? 'Urgent' : 'Tutup'}
            </button>
          ))}
        </div>
        <span class="text-xs text-slate-500 font-bold">{filtered.length} lowongan</span>
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
              <tr>
                <td colSpan={5} class="p-8 text-center text-slate-500">
                  <i class="fas fa-spinner fa-spin mr-2"></i> Memuat data lowongan...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} class="p-8 text-center text-slate-500">
                  <i class="fas fa-inbox mr-2"></i> Tidak ada lowongan ditemukan.
                </td>
              </tr>
            ) : (
              filtered.map((job, i) => (
                <tr key={job.code || i} class="hover:bg-white/5 transition-colors">
                  <td class="p-4 text-center">
                    <span class="font-mono font-black text-sky-400 text-xs bg-sky-900/30 px-2 py-1 rounded-md border border-sky-500/30">
                      {job.code || '-'}
                    </span>
                  </td>
                  <td class="p-4">
                    <div class="font-bold text-white">{job.pekerjaan || '-'}</div>
                    {job.kategori && (
                      <div class="text-xs text-slate-500 mt-0.5">{job.kategori}</div>
                    )}
                  </td>
                  <td class="p-4 text-center">
                    <span class={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusClass(job.status)}`}>
                      {job.status || 'CLOSE'}
                    </span>
                  </td>
                  <td class="p-4">
                    <div class="text-slate-300 text-xs max-w-[300px] truncate" title={job.keterangan || ''}>
                      {job.keterangan || '-'}
                    </div>
                    {job.gender && (
                      <div class="text-xs text-slate-500 mt-0.5">
                        <i class="fas fa-user mr-1"></i>{job.gender}
                      </div>
                    )}
                  </td>
                  <td class="p-4 text-center">
                    {(job.status || '').toUpperCase() === 'CLOSE' ? (
                      <span class="text-xs text-slate-500 font-bold">Ditutup</span>
                    ) : (
                      <button
                        onClick={() => openWhatsApp(job)}
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg inline-flex items-center gap-1"
                      >
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
    </div>
  );
}
