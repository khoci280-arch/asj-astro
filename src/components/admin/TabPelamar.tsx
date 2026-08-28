/**
 * TabPelamar.tsx — Admin candidate database tab
 * Source: legacy/index.html page-admin → admin-pelamar
 * With modals: Input Manual, Laporan Bulanan, Toggle View
 */
import { useState, useEffect } from 'preact/hooks';
import InputManualModal from './InputManualModal.tsx';
import LaporanBulananModal from './LaporanBulananModal.tsx';

type Kandidat = {
  id: string;
  nama: string;
  wa: string;
  idLoker: string;
  tahapan: string;
  status: string;
  catatan: string;
  gender: string;
  usia: string;
  jft: string;
  isVIP?: boolean;
};

export default function TabPelamar() {
  const [kandidat, setKandidat] = useState<Kandidat[]>([]);
  const [allKandidat, setAllKandidat] = useState<Kandidat[]>([]);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterAge, setFilterAge] = useState('all');
  const [filterJft, setFilterJft] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [simpleView, setSimpleView] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchKandidat(); }, []);

  async function fetchKandidat() {
    try {
      const res = await fetch('/.netlify/functions/getAppData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAppData', args: ['admin'] }),
      });
      const data = await res.json();
      if (data.success) {
        const k = data.kandidat || [];
        setKandidat(k);
        setAllKandidat(data.allKandidat || k);
      }
    } catch (err) {
      console.error('[TabPelamar] Failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = kandidat.filter((k) => {
    const matchSearch = !search ||
      (k.nama || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.wa || '').includes(search) ||
      (k.idLoker || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.tahapan || '').toLowerCase().includes(search.toLowerCase());
    const matchGender = filterGender === 'all' || (k.gender || '').toLowerCase() === filterGender;
    const matchJft = filterJft === 'all' || (k.jft || '').toLowerCase().includes(filterJft);
    return matchSearch && matchGender && matchJft;
  });

  const shown = filtered.slice(0, (page + 1) * PAGE_SIZE);

  function exportCsv() {
    const headers = ['ID Kandidat', 'Nama Lengkap', 'WA', 'Job Dilamar', 'Tahapan', 'Status', 'Catatan'];
    const rows = filtered.map(k => [k.id, k.nama, k.wa, k.idLoker, k.tahapan, k.status, k.catatan]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kandidat.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleSave(newKand: Kandidat) {
    setKandidat(prev => [newKand, ...prev]);
  }

  return (
    <div>
      {/* Header with buttons */}
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-sky-900/50 pb-4 mb-4 gap-4">
        <h2 class="text-sky-400 font-bold text-lg"><i class="fas fa-users mr-2"></i> Database Pelamar</h2>
        <div class="flex flex-wrap gap-3 w-full md:w-auto">
          <div class="relative flex-1 md:w-64">
            <i class="fas fa-search absolute left-3 top-2.5 text-slate-300 text-sm"></i>
            <input type="text" value={search} onInput={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(0); }}
              placeholder="Find Nama, Code, Tahapan..."
              class="w-full pl-9 p-2 rounded-lg bg-black/40 border border-slate-700 text-sm text-white outline-none focus:border-sky-500 transition" />
          </div>
          <button onClick={() => setShowInputModal(true)} class="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold hover:bg-sky-500 shadow-lg transition whitespace-nowrap"><i class="fas fa-user-plus mr-1"></i> Input Manual</button>
          <button onClick={() => setSimpleView(!simpleView)} class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold shadow-lg transition whitespace-nowrap">
            <i class={`fas ${simpleView ? 'fa-table-list' : 'fa-table-cells-large'} mr-1`}></i> {simpleView ? 'Tampilan Lengkap' : 'Tampilan Sederhana'}
          </button>
          <button onClick={exportCsv} class="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg transition whitespace-nowrap"><i class="fas fa-file-csv mr-1"></i> Export CSV</button>
          <button onClick={() => setShowReportModal(true)} class="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg transition whitespace-nowrap"><i class="fas fa-chart-bar mr-1"></i> Laporan Bulanan</button>
        </div>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div class="flex items-center gap-2 text-sky-400 font-bold text-sm mr-2"><i class="fas fa-filter"></i> Filter:</div>
        <select value={filterGender} onChange={(e) => { setFilterGender((e.target as HTMLSelectElement).value); setPage(0); }}
          class="bg-black/40 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:border-sky-500 outline-none">
          <option value="all">Semua Gender</option><option value="l">Laki-laki (L)</option><option value="p">Perempuan (P)</option>
        </select>
        <select value={filterAge} onChange={(e) => { setFilterAge((e.target as HTMLSelectElement).value); setPage(0); }}
          class="bg-black/40 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:border-sky-500 outline-none">
          <option value="all">Semua Usia</option><option value="under20">&lt; 20</option><option value="20to25">20 - 25</option><option value="over25">&gt; 25</option>
        </select>
        <select value={filterJft} onChange={(e) => { setFilterJft((e.target as HTMLSelectElement).value); setPage(0); }}
          class="bg-black/40 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:border-sky-500 outline-none">
          <option value="all">Semua Level JFT</option><option value="a2">A2 / N4</option><option value="b1">B1 / N3</option>
        </select>
      </div>

      {loading ? (
        <div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-sky-400"></i><p class="text-slate-500 mt-2 text-sm">Memuat data pelamar...</p></div>
      ) : simpleView ? (
        /* Simple View — compact list */
        <div class="space-y-2">
          {shown.length === 0 ? (
            <p class="text-slate-500 text-sm text-center py-8">Belum ada pelamar.</p>
          ) : shown.map((k) => (
            <div key={k.id || k.wa} class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-white/5 transition">
              <div class="flex items-center gap-3">
                <span class="font-mono text-sky-300 font-bold text-xs">{k.id || k.wa}</span>
                <span class="font-bold text-white text-sm">{k.nama}{k.isVIP && ' 🏆'}</span>
                <span class="font-mono text-purple-300 text-xs">{k.idLoker}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">{k.tahapan}</span>
                <button class="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded text-xs"><i class="fab fa-whatsapp"></i></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Full View — table */
        <div class="overflow-x-auto rounded-xl border border-sla
te-800">
          <table class="w-full min-w-[900px] text-sm text-left whitespace-nowrap">
            <thead class="bg-slate-800 text-slate-300 text-sm uppercase border-b border-slate-700 tracking-wider">
              <tr>
                <th scope="col" class="p-4">ID Kandidat</th>
                <th scope="col" class="p-4">Nama Lengkap</th>
                <th scope="col" class="p-4">Job Dilamar</th>
                <th scope="col" class="p-4">Tahapan & Status</th>
                <th scope="col" class="p-4">Catatan Admin</th>
                <th scope="col" class="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              {shown.length === 0 ? (
                <tr><td colSpan={6} class="p-6 text-center text-slate-500">Belum ada pelamar.</td></tr>
              ) : shown.map((k) => (
                <tr key={k.id || k.wa} class="hover:bg-white/5 transition-all">
                  <td class="p-4 font-mono text-sky-300 font-bold text-xs">{k.id || k.wa || '-'}</td>
                  <td class="p-4 font-bold text-white">{k.nama || '-'}{k.isVIP && <span class="ml-1 text-amber-400 text-xs">🏆</span>}</td>
                  <td class="p-4"><span class="font-mono text-purple-300 text-xs">{k.idLoker || '-'}</span></td>
                  <td class="p-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">{k.tahapan || '-'}</span>
                    <span class="ml-1 text-xs text-slate-400">{k.status || '-'}</span>
                  </td>
                  <td class="p-4 text-xs text-slate-400 max-w-[200px] truncate" title={k.catatan || ''}>{k.catatan || '-'}</td>
                  <td class="p-4 text-center">
                    <div class="flex flex-wrap justify-center gap-1">
                      <button class="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs shadow transition"><i class="fas fa-clock"></i></button>
                      <button class="px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold shadow transition"><i class="fas fa-file-alt mr-1"></i> CV</button>
                      <button class="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow transition"><i class="fas fa-edit mr-1"></i> Edit</button>
                      <button class="px-2 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-bold shadow transition"><i class="fas fa-robot mr-1"></i> AI CV</button>
                      <button class="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs shadow transition"><i class="fab fa-whatsapp"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div class="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-sky-900/50 text-sm">
        <span class="text-slate-300 font-bold text-xs">{filtered.length} dari {allKandidat.length} kandidat</span>
        {shown.length < filtered.length && (
          <button onClick={() => setPage(p => p + 1)} class="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-500 transition shadow-lg"><i class="fas fa-chevron-down mr-1"></i> Muat Lebih Banyak</button>
        )}
      </div>

      {/* Modals */}
      <InputManualModal open={showInputModal} onClose={() => setShowInputModal(false)} onSave={handleSave} />
      <LaporanBulananModal open={showReportModal} onClose={() => setShowReportModal(false)} kandidat={filtered} />
    </div>
  );
}
