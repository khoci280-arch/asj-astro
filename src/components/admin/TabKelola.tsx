/**
 * TabKelola.tsx — Admin loker management tab
 * Source: legacy/index.html page-admin → admin-kelola
 */
import { useState, useEffect } from 'preact/hooks';

type Loker = {
  code: string;
  pekerjaan: string;
  status: string;
  kategori: string;
  gender: string;
  lokasi: string;
  kuota: string;
  keterangan: string;
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  URGENT: 'bg-red-500/20 text-red-400 border-red-500/40',
  CLOSE: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

export default function TabKelola() {
  const [loker, setLoker] = useState<Loker[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLoker(); }, []);

  async function fetchLoker() {
    try {
      const res = await fetch('/.netlify/functions/getAppData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAppData', args: ['admin'] }),
      });
      const data = await res.json();
      if (data.success && data.jobs) {
        setLoker(data.jobs);
      }
    } catch (err) {
      console.error('[TabKelola] Failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = loker.filter((j) =>
    !search || (j.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.pekerjaan || '').toLowerCase().includes(search.toLowerCase())
  );

  function getBadge(status: string) {
    return STATUS_BADGE[(status || '').toUpperCase()] || STATUS_BADGE.CLOSE;
  }

  return (
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-red-400 font-bold text-lg"><i class="fas fa-globe mr-2"></i> Loker Publik</h2>
        <div class="relative w-72">
          <i class="fas fa-search absolute left-3 top-2.5 text-slate-300 text-sm"></i>
          <input
            type="text"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari Kode / Pekerjaan..."
            class="w-full pl-9 p-2 rounded-lg bg-black/40 border border-slate-700 text-sm text-white outline-none focus:border-red-500 transition"
          />
        </div>
      </div>

      {loading ? (
        <div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-red-400"></i><p class="text-slate-500 mt-2 text-sm">Memuat data loker...</p></div>
      ) : (
        <div class="overflow-x-auto rounded-xl border border-slate-800">
          <table class="w-full min-w-[800px] text-sm text-left whitespace-nowrap">
            <thead class="bg-slate-800 text-slate-300 text-sm uppercase border-b border-slate-700 tracking-wider">
              <tr>
                <th scope="col" class="p-4">ID Code</th>
                <th scope="col" class="p-4">Pekerjaan</th>
                <th scope="col" class="p-4 text-center">Status</th>
                <th scope="col" class="p-4 text-center">Aksi</th>
                <th scope="col" class="p-4 text-center">Hapus</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} class="p-6 text-center text-slate-500">Tidak ada loker ditemukan.</td></tr>
              ) : filtered.map((j) => (
                <tr key={j.code} class="hover:bg-white/5 transition-all">
                  <td class="p-4 font-mono text-red-300 font-bold">{j.code}</td>
                  <td class="p-4 font-bold text-white">{j.pekerjaan}</td>
                  <td class="p-4 text-center">
                    <span class={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBadge(j.status)}`}>{j.status}</span>
                  </td>
                  <td class="p-4 text-center">
                    <div class="flex flex-wrap justify-center gap-2">
                      <button class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-full text-[10px] text-white font-bold shadow transition">OPEN</button>
                      <button class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded-full text-[10px] text-white font-bold shadow transition">CLOSE</button>
                      <button class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-[10px] font-bold shadow transition"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                  </td>
                  <td class="p-4 text-center">
                    <button class="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-all mx-auto"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p class="text-xs text-slate-500 mt-3">{filtered.length} loker</p>
    </div>
  );
}
