/**
 * ShareView.tsx - Candidate Viewer (share.html)
 * Source: legacy/share.html (1:1 match)
 * Features: grid cards, filters, doc preview, selection bar, lang toggle
 */
import { useState, useEffect, useRef } from 'preact/hooks';
import { apiClient } from '../../lib/apiClient';

interface Candidate {
  id: string; nama: string; gender: string; usia: number;
  tb: number; bb: number; pendidikan: string; alamat: string;
  wa: string; photo: string; email: string;
  cvUrl?: string; rirekishoUrl?: string; jftUrl?: string; sswUrl?: string;
  ktpUrl?: string; kkUrl?: string; ijazahUrl?: string;
  jftLevel?: string; jftScore?: number; sswLevel?: string; sswScore?: number;
  Tahapan?: string; status?: string;
}

interface JobInfo {
  code: string; title: string; bidang: string; location: string;
  tahapan: string; kuota: number;
}

export default function ShareView() {
  const code = new URLSearchParams(window.location.search).get('code') || '';
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'id' | 'jp'>('id');
  const [filterGender, setFilterGender] = useState('all');
  const [filterAge, setFilterAge] = useState('all');
  const [filterJft, setFilterJft] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ url: string; title: string; type: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [code]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/.netlify/functions/share-view?code=${code}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setJob(data.job);
      setCandidates(data.candidates || []);
    } catch (e) {
      setError((e as Error).message || 'Access Denied or Not Found');
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => setLang(prev => prev === 'id' ? 'jp' : 'id');

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitSelection = () => {
    if (selected.size === 0) return;
    const selectedCandidates = candidates.filter(c => selected.has(c.id));
    const text = selectedCandidates.map((c, i) =>
      `${i + 1}. ${c.nama} (${c.gender === 'LAKI-LAKI' ? 'L' : 'P'}, ${c.usia}th) - WA: ${c.wa}`
    ).join('%0A');
    const msg = `Pilihan Kandidat untuk ${job?.code || code}:%0A${text}`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const openPreview = (url: string, title: string) => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    const type = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'image' : 'iframe';
    setPreview({ url, title, type });
  };

  const closePreview = () => setPreview(null);

  const filtered = candidates.filter(c => {
    if (filterGender === 'l' && c.gender !== 'LAKI-LAKI') return false;
    if (filterGender === 'p' && c.gender !== 'PEREMPUAN') return false;
    if (filterAge === 'under20' && c.usia >= 20) return false;
    if (filterAge === '20to25' && (c.usia < 20 || c.usia > 25)) return false;
    if (filterAge === 'over25' && c.usia <= 25) return false;
    if (filterJft === 'a2' && c.jftLevel !== 'A2') return false;
    if (filterJft === 'b1' && c.jftLevel !== 'B1') return false;
    return true;
  });

  const t = (idKey: string, jpKey: string) => lang === 'jp' ? jpKey : idKey;

  return (
    <div class="min-h-screen bg-slate-950 overflow-x-hidden text-slate-100 relative selection:bg-pink-500/30">
      {/* Ambient BG */}
      <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[130px]"></div>
      </div>

      {/* Header */}
      <header class="sticky top-0 z-50 bg-slate-900/[.97] border-b border-slate-700/50 shadow-2xl">
        <div class="max-w-7xl mx-auto px-3 md:px-8 py-3 md:py-4 flex flex-wrap md:flex-nowrap justify-between items-center gap-2 md:gap-4">
          <div class="flex items-center gap-3 md:gap-4 min-w-0">
            <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo-removebg-preview.webp" alt="ASJ Logo" class="w-10 h-10 md:w-14 md:h-14 object-contain" />
            <div class="min-w-0">
              <h1 class="text-sm sm:text-lg md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-white leading-tight truncate">PT AMANAH SAKURA JAPAN</h1>
              <p class="text-[9px] md:text-xs font-bold text-pink-300 tracking-[0.2em] uppercase mt-0.5">
                <i class="fas fa-lock mr-1 text-[8px] opacity-70"></i> Secure Candidate Viewer
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
            <button onClick={toggleLang} class="px-2.5 py-1.5 md:px-3 bg-slate-800/80 border border-slate-600/50 rounded-lg text-[11px] md:text-xs font-bold flex items-center gap-1.5 shrink-0">
              <i class="fas fa-language text-pink-400"></i>
              <span class={lang === 'id' ? 'text-pink-400 font-black' : 'text-slate-500'}>ID</span>
              <span class="text-slate-500">|</span>
              <span class={lang === 'jp' ? 'text-pink-400 font-black' : 'text-slate-500'}>JP</span>
            </button>
            {job && (
              <div class="text-right flex flex-col items-end">
                <div class="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 border border-slate-600/50 rounded-full mb-1">
                  <span class="relative flex h-1.5 w-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                  <span class="text-[8px] md:text-[9px] font-bold text-slate-300 tracking-widest uppercase">{job.code}</span>
                </div>
                <h2 class="text-[11px] sm:text-sm md:text-base font-bold text-white uppercase tracking-wide truncate max-w-full">{job.title}</h2>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main class="max-w-7xl mx-auto px-4 md:px-8 py-10 relative z-10">
        {/* Loading */}
        {loading && (
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 animate-[fadeIn_0.8s_ease-out]">
            {[1,2,3].map(i => (
              <div key={i} class="bg-slate-900/[.97] border border-slate-700/50 rounded-2xl p-4 md:p-5">
                <div class="flex gap-3 md:gap-4">
                  <div class="w-[72px] h-[96px] md:w-[84px] md:h-[112px] bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded-lg"></div>
                  <div class="flex-1 space-y-3 py-1">
                    <div class="h-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded w-3/4"></div>
                    <div class="h-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded w-1/2"></div>
                    <div class="h-8 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-[loading_1.5s_infinite] rounded w-full mt-4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div class="text-center py-20 animate-[fadeIn_0.8s_ease-out]">
            <div class="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <i class="fas fa-exclamation-triangle text-4xl text-rose-500"></i>
            </div>
            <h2 class="text-xl font-bold text-white mb-2">Access Denied or Not Found</h2>
            <p class="text-slate-400 text-sm">{error}</p>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && candidates.length > 0 && (
          <div class="mb-6 flex flex-wrap items-center gap-2 md:gap-3 p-3 md:p-4 bg-slate-900/[.97] rounded-xl border border-slate-700/50 animate-[fadeIn_0.8s_ease-out] shadow-lg">
            <div class="flex items-center gap-2 mr-1"><i class="fas fa-filter text-pink-400"></i><span class="text-xs md:text-sm font-bold text-slate-200">Filter:</span></div>
            <select value={filterGender} onChange={(e) => setFilterGender((e.target as HTMLSelectElement).value)}
              class="flex-1 sm:flex-none min-w-[120px] bg-slate-800/80 border border-slate-600 text-slate-200 text-[11px] md:text-xs font-bold rounded-lg px-2 md:px-3 py-2 focus:outline-none focus:border-pink-500 cursor-pointer">
              <option value="all">Semua Gender</option>
              <option value="l">Laki-laki (L)</option>
              <option value="p">Perempuan (P)</option>
            </select>
            <select value={filterAge} onChange={(e) => setFilterAge((e.target as HTMLSelectElement).value)}
              class="flex-1 sm:flex-none min-w-[100px] bg-slate-800/80 border border-slate-600 text-slate-200 text-[11px] md:text-xs font-bold rounded-lg px-2 md:px-3 py-2 focus:outline-none focus:border-pink-500 cursor-pointer">
              <option value="all">Semua Usia</option>
              <option value="under20">&lt; 20</option>
              <option value="20to25">20 - 25</option>
              <option value="over25">&gt; 25</option>
            </select>
            <select value={filterJft} onChange={(e) => setFilterJft((e.target as HTMLSelectElement).value)}
              class="flex-1 sm:flex-none min-w-[130px] bg-slate-800/80 border border-slate-600 text-slate-200 text-[11px] md:text-xs font-bold rounded-lg px-2 md:px-3 py-2 focus:outline-none focus:border-pink-500 cursor-pointer">
              <option value="all">Semua Level JFT</option>
              <option value="a2">A2 / N4</option>
              <option value="b1">B1 / N3</option>
            </select>
          </div>
        )}

        {/* Candidates Grid */}
        {!loading && !error && filtered.length > 0 && (
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 animate-[fadeIn_0.8s_ease-out] pb-24">
            {filtered.map(c => (
              <div key={c.id} class={`bg-slate-900/[.97] border rounded-2xl p-4 md:p-5 transition-all hover:shadow-pink-500/10 hover:border-pink-500/30 ${selected.has(c.id) ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,.15)]' : 'border-slate-700/50'}`}>
                <div class="flex gap-3 md:gap-4">
                  <img src={c.photo || 'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/default-avatar.png'} alt={c.nama}
                    class="w-[72px] h-[96px] md:w-[84px] md:h-[112px] rounded-lg object-cover border border-slate-700/50 shrink-0" />
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm md:text-base font-bold text-white truncate">{c.nama}</h3>
                    <p class="text-[10px] md:text-xs text-slate-400 mt-0.5">{c.gender === 'LAKI-LAKI' ? 'Laki-laki' : 'Perempuan'} · {c.usia}th · {c.tb}cm</p>
                    <p class="text-[10px] md:text-xs text-slate-500 mt-0.5">{c.pendidikan}</p>
                    {c.jftLevel && <p class="text-[10px] text-sky-400 mt-1 font-bold">JFT: {c.jftLevel} ({c.jftScore || '-'})</p>}
                    {c.sswLevel && <p class="text-[10px] text-emerald-400 mt-0.5 font-bold">SSW: {c.sswLevel} ({c.sswScore || '-'})</p>}
                    {c.Tahapan && <p class="text-[10px] text-amber-400 mt-1 font-bold">Status: {c.Tahapan}</p>}
                    {/* Document buttons */}
                    <div class="flex flex-wrap gap-1.5 mt-2">
                      {c.cvUrl && <button onClick={() => openPreview(c.cvUrl!, 'CV ' + c.nama)} class="px-2 py-1 bg-amber-600/20 text-amber-400 text-[9px] md:text-[10px] font-bold rounded-md border border-amber-500/30 hover:bg-amber-600/40 transition">CV</button>}
                      {c.rirekishoUrl && <button onClick={() => openPreview(c.rirekishoUrl!, 'Rirekisho ' + c.nama)} class="px-2 py-1 bg-sky-600/20 text-sky-400 text-[9px] md:text-[10px] font-bold rounded-md border border-sky-500/30 hover:bg-sky-600/40 transition">Rirekisho</button>}
                      {c.jftUrl && <button onClick={() => openPreview(c.jftUrl!, 'JFT ' + c.nama)} class="px-2 py-1 bg-sky-600/20 text-sky-400 text-[9px] md:text-[10px] font-bold rounded-md border border-sky-500/30 hover:bg-sky-600/40 transition">JFT</button>}
                      {c.sswUrl && <button onClick={() => openPreview(c.sswUrl!, 'SSW ' + c.nama)} class="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-[9px] md:text-[10px] font-bold rounded-md border border-emerald-500/30 hover:bg-emerald-600/40 transition">SSW</button>}
                      {c.ktpUrl && <button onClick={() => openPreview(c.ktpUrl!, 'KTP ' + c.nama)} class="px-2 py-1 bg-slate-600/20 text-slate-400 text-[9px] md:text-[10px] font-bold rounded-md border border-slate-500/30 hover:bg-slate-600/40 transition">KTP</button>}
                      {c.kkUrl && <button onClick={() => openPreview(c.kkUrl!, 'KK ' + c.nama)} class="px-2 py-1 bg-slate-600/20 text-slate-400 text-[9px] md:text-[10px] font-bold rounded-md border border-slate-500/30 hover:bg-slate-600/40 transition">KK</button>}
                      {c.ijazahUrl && <button onClick={() => openPreview(c.ijazahUrl!, 'Ijazah ' + c.nama)} class="px-2 py-1 bg-slate-600/20 text-slate-400 text-[9px] md:text-[10px] font-bold rounded-md border border-slate-500/30 hover:bg-slate-600/40 transition">Ijazah</button>}
                    </div>
                  </div>
                </div>
                {/* Select checkbox */}
                <div class="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                      class="w-4 h-4 accent-pink-500 rounded" />
                    <span class="text-[10px] md:text-xs text-slate-400 font-bold">Pilih</span>
                  </label>
                  <a href={`https://wa.me/${c.wa}`} target="_blank" rel="noopener"
                    class="px-3 py-1 bg-emerald-600/20 text-emerald-400 text-[10px] md:text-xs font-bold rounded-lg border border-emerald-500/30 hover:bg-emerald-600/40 transition flex items-center gap-1">
                    <i class="fab fa-whatsapp"></i> WA
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && candidates.length === 0 && (
          <div class="text-center py-20 animate-[fadeIn_0.8s_ease-out]">
            <div class="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
              <i class="fas fa-folder-open text-4xl text-slate-500"></i>
            </div>
            <h2 class="text-xl font-bold text-white mb-2">Belum Ada Kandidat</h2>
            <p class="text-slate-400 text-sm">Kandidat untuk job ini akan muncul di sini.</p>
          </div>
        )}
      </main>

      {/* Selection Bar */}
      {selected.size > 0 && (
        <div class="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-[90] flex justify-center">
          <div class="bg-slate-900/95 border-t border-x border-pink-500/50 rounded-t-2xl px-6 py-4 flex items-center justify-between gap-4 md:gap-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] min-w-[320px] max-w-2xl w-full">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 md:w-12 md:h-12 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-400 border border-pink-500/30">
                <i class="fas fa-check-double md:text-lg"></i>
              </div>
              <div class="flex items-end gap-2">
                <span class="text-xl md:text-2xl font-black text-white leading-none">{selected.size}</span>
                <span class="text-[10px] md:text-xs font-bold text-pink-300 uppercase tracking-wider mb-0.5">Kandidat Terpilih</span>
              </div>
            </div>
            <button onClick={submitSelection} class="px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg hover:shadow-pink-500/25 transition-all flex items-center gap-2">
              <i class="fab fa-whatsapp text-lg"></i> Kirim Pilihan
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col p-2 sm:p-4 md:p-8">
          <div class="flex justify-between items-center gap-2 mb-2 md:mb-4 text-white w-full max-w-5xl mx-auto">
            <h3 class="font-bold text-sm md:text-xl truncate min-w-0">{preview.title}</h3>
            <div class="flex gap-2 md:gap-4 shrink-0">
              <a href={preview.url} target="_blank" download class="px-3 py-1.5 md:px-4 md:py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-bold text-xs md:text-sm shadow flex items-center gap-1.5">
                <i class="fas fa-download"></i><span class="hidden sm:inline">Download</span>
              </a>
              <button onClick={closePreview} class="px-3 py-1.5 md:px-4 md:py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-bold text-xs md:text-sm shadow flex items-center gap-1.5">
                <i class="fas fa-times"></i> <span class="hidden sm:inline">Tutup</span>
              </button>
            </div>
          </div>
          <div class="flex-1 w-full max-w-5xl mx-auto bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center min-h-0">
            {preview.type === 'image' ? (
              <img src={preview.url} class="max-w-full max-h-full object-contain" alt={preview.title} />
            ) : (
              <iframe src={preview.url} class="w-full h-full border-0 bg-white" title={preview.title} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
