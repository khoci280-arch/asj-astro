import { useState, useEffect } from 'preact/hooks';
import Icon from '../ui/Icon';
import { useOverlay } from '../ui/useOverlay';
import { getEndpoint } from '../../lib/apiEndpoint';
import { authStore } from '../../store/authReactive';
import { showToast } from '../Toast';

interface Candidate {
  wa: string;
  nama: string;
  gender?: string;
  usia?: string;
  tb?: string;
  bb?: string;
  pendidikan?: string;
  jft?: string;
  ssw?: string;
  tahapan?: string;
  status?: string;
  pasPhoto?: string;
  applications?: Array<{ code: string; status: string }>;
}

interface Job {
  code: string;
  pekerjaan: string;
  gender?: string;
  kuota?: string;
  lokasi?: string;
}

interface Props {
  job: Job;
  candidates: Candidate[];
  isOpen: boolean;
  onClose: () => void;
}

const GENDER_OPTIONS = [
  { value: 'ALL', label: 'Semua Gender' },
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

const PENDIDIKAN_OPTIONS = [
  { value: 0, label: 'Tidak Ada Syarat Pendidikan' },
  { value: 3, label: 'SMA / SMK Sederajat' },
  { value: 4, label: 'Diploma (D3 / D4)' },
  { value: 5, label: 'Sarjana (S1)' },
];

function getPendidikanScore(pendidikan: string): number {
  const t = String(pendidikan || '').toUpperCase();
  if (t.includes('S1') || t.includes('SARJANA')) return 5;
  if (t.includes('D3') || t.includes('D4') || t.includes('DIPLOMA')) return 4;
  if (t.includes('SMA') || t.includes('SMK') || t.includes('MA') || t.includes('SLTA')) return 3;
  if (t.includes('SMP') || t.includes('SD')) return 2;
  return 0;
}

export default function MatchmakingModal({ job, candidates, isOpen, onClose }: Props) {
  const [filters, setFilters] = useState({
    gender: job.gender?.toUpperCase().includes('LAKI') ? 'L' : job.gender?.toUpperCase().includes('PEREMPUAN') ? 'P' : 'ALL',
    usiaMin: '',
    usiaMax: '',
    tbMin: '',
    bbMax: '',
    pendidikan: 0,
    keyword: '',
    jft: false,
    ssw: false,
  });
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const { containerRef, onBackdropClick } = useOverlay({ open: isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      setFilters({
        gender: job.gender?.toUpperCase().includes('LAKI') ? 'L' : job.gender?.toUpperCase().includes('PEREMPUAN') ? 'P' : 'ALL',
        usiaMin: '',
        usiaMax: '',
        tbMin: '',
        bbMax: '',
        pendidikan: 0,
        keyword: '',
        jft: false,
        ssw: false,
      });
      setResults([]);
    }
  }, [isOpen, job]);

  const setFilter = (key: string, value: string | number | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const runMatchmaking = () => {
    setSearching(true);
    
    setTimeout(() => {
      const filtered = candidates.filter(c => {
        // Rule 1: Status harus AKTIF
        if (c.status?.toUpperCase() !== 'AKTIF') return false;
        
        // Rule 2: Gender
        if (filters.gender !== 'ALL') {
          const cGender = String(c.gender || '').toUpperCase();
          if (filters.gender === 'L' && (cGender.includes('PEREMPUAN') || cGender === 'P' || cGender.includes('WANITA'))) return false;
          if (filters.gender === 'P' && (cGender.includes('LAKI') || cGender === 'L' || cGender.includes('PRIA'))) return false;
        }
        
        // Rule 3: Usia
        const cUsia = parseInt(String(c.usia || '').replace(/\D/g, '')) || 0;
        const min = parseInt(filters.usiaMin) || 0;
        const max = parseInt(filters.usiaMax) || 99;
        if (cUsia > 0 && (cUsia < min || cUsia > max)) return false;
        
        // Rule 4: Tinggi Badan
        const cTb = parseInt(String(c.tb || '').replace(/\D/g, '')) || 0;
        const tbMin = parseInt(filters.tbMin) || 0;
        if (tbMin > 0 && cTb > 0 && cTb < tbMin) return false;
        
        // Rule 5: Berat Badan
        const cBb = parseInt(String(c.bb || '').replace(/\D/g, '')) || 0;
        const bbMax = parseInt(filters.bbMax) || 999;
        if (bbMax < 999 && cBb > 0 && cBb > bbMax) return false;
        
        // Rule 6: Pendidikan
        if (filters.pendidikan > 0 && getPendidikanScore(c.pendidikan || '') < filters.pendidikan) return false;
        
        // Rule 7: Sertifikat
        if (filters.jft && (!c.jft || c.jft === '-' || c.jft.trim() === '')) return false;
        if (filters.ssw && (!c.ssw || c.ssw === '-' || c.ssw.trim() === '')) return false;
        
        // Rule 8: Keyword
        if (filters.keyword) {
          const globalText = JSON.stringify(c).toUpperCase();
          const keywords = filters.keyword.split(',').map(k => k.trim().toUpperCase()).filter(k => k !== '');
          if (!keywords.some(k => globalText.includes(k))) return false;
        }
        
        return true;
      });
      
      // Sort by completeness (photo, JFT, SSW)
      filtered.sort((a, b) => {
        const scoreA = (a.pasPhoto && a.pasPhoto !== '-' ? 1 : 0) + (a.jft && a.jft !== '-' ? 2 : 0) + (a.ssw && a.ssw !== '-' ? 2 : 0);
        const scoreB = (b.pasPhoto && b.pasPhoto !== '-' ? 1 : 0) + (b.jft && b.jft !== '-' ? 2 : 0) + (b.ssw && b.ssw !== '-' ? 2 : 0);
        return scoreB - scoreA;
      });
      
      setResults(filtered);
      setSearching(false);
    }, 500);
  };

  const sendBlast = async () => {
    if (results.length === 0) {
      showToast('Tidak ada kandidat untuk dikirim tawaran.', 'error');
      return;
    }
    
    setSending(true);
    const sessionToken = authStore.get().sessionToken || '';
    
    try {
      const res = await fetch(getEndpoint('kirimTawaranMassal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kirimTawaranMassal',
          args: [{ candidates: results, jobCode: job.code }],
          sessionToken,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        const sent = data.results?.filter((r: { success: boolean }) => r.success).length || 0;
        showToast(`Tawaran berhasil dikirim ke ${sent} kandidat!`, 'success');
        onClose();
      } else {
        showToast(data.error || 'Gagal mengirim tawaran.', 'error');
      }
    } catch (e) {
      showToast('Network error: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4" onClick={onBackdropClick}>
      <div ref={containerRef} class="glass-panel p-6 rounded-[2rem] w-full max-w-3xl shadow-2xl relative border border-violet-500/50 max-h-[90vh] flex flex-col">
        <button onClick={onClose} class="absolute top-4 right-5 text-slate-400 hover:text-white z-[100]">
          <Icon name="times" class="text-2xl" />
        </button>
        
        <h2 class="text-lg font-bold text-violet-400 mb-1 flex items-center gap-2">
          <Icon name="search" class="text-violet-400" /> AI Headhunter (Match)
        </h2>
        <p class="text-xs text-slate-300 mb-4">
          Loker Tujuan: <span class="font-bold text-white uppercase">{job.code} - {job.pekerjaan}</span>
        </p>
        
        {/* Filter Panel */}
        <div class="bg-violet-900/20 border border-violet-500/30 p-4 rounded-xl mb-4">
          <h4 class="text-xs font-bold text-violet-400 mb-3">
            <Icon name="filter" class="mr-1" /> KRITERIA PENCARIAN KANDIDAT
          </h4>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label class="text-[10px] text-slate-400 uppercase font-bold">Gender</label>
              <select value={filters.gender} onChange={e => setFilter('gender', (e.target as HTMLSelectElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-violet-500">
                {GENDER_OPTIONS.map(g =>
                  <option key={g.value} value={g.value}>{g.label}</option>
                )}
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase font-bold">Usia Min</label>
              <input type="number" value={filters.usiaMin} onInput={e => setFilter('usiaMin', (e.target as HTMLInputElement).value)} placeholder="18" class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-violet-500" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase font-bold">Usia Max</label>
              <input type="number" value={filters.usiaMax} onInput={e => setFilter('usiaMax', (e.target as HTMLInputElement).value)} placeholder="35" class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-violet-500" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase font-bold">TB Minimal (cm)</label>
              <input type="number" value={filters.tbMin} onInput={e => setFilter('tbMin', (e.target as HTMLInputElement).value)} placeholder="150" class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-violet-500" />
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label class="text-[10px] text-slate-400 uppercase font-bold">BB Maksimal (kg)</label>
              <input type="number" value={filters.bbMax} onInput={e => setFilter('bbMax', (e.target as HTMLInputElement).value)} placeholder="80" class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-violet-500" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase font-bold">Pendidikan</label>
              <select value={filters.pendidikan} onChange={e => setFilter('pendidikan', Number((e.target as HTMLSelectElement).value))} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-violet-500">
                {PENDIDIKAN_OPTIONS.map(p =>
                  <option key={p.value} value={p.value}>{p.label}</option>
                )}
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase font-bold">Keyword</label>
              <input type="text" value={filters.keyword} onInput={e => setFilter('keyword', (e.target as HTMLInputElement).value)} placeholder="Ex-Japan, Kaigo..." class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-violet-500" />
            </div>
            <div class="flex items-end gap-4">
              <label class="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold cursor-pointer">
                <input type="checkbox" checked={filters.jft} onChange={e => setFilter('jft', (e.target as HTMLInputElement).checked)} class="accent-violet-500" /> JFT
              </label>
              <label class="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold cursor-pointer">
                <input type="checkbox" checked={filters.ssw} onChange={e => setFilter('ssw', (e.target as HTMLInputElement).checked)} class="accent-violet-500" /> SSW
              </label>
            </div>
          </div>
          <button onClick={runMatchmaking} disabled={searching} class="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50">
            <Icon name="search" class="mr-1" /> {searching ? 'Mencari...' : 'Cari Kandidat'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div class="flex-1 overflow-y-auto custom-scrollbar">
            <p class="text-xs text-violet-400 font-bold mb-2">Ditemukan {results.length} kandidat cocok</p>
            <div class="space-y-2">
              {results.map(c => (
                <div key={c.wa} class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div class="flex items-center gap-3">
                    {c.pasPhoto && c.pasPhoto !== '-' ? (
                      <img src={c.pasPhoto} alt={c.nama} class="w-10 h-10 rounded-full object-cover border-2 border-violet-500" />
                    ) : (
                      <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">?</div>
                    )}
                    <div>
                      <p class="font-bold text-white text-sm">{c.nama}</p>
                      <p class="text-[10px] text-slate-400">{c.gender || '-'} | {c.usia || '-'} th | TB {c.tb || '-'} | {c.pendidikan || '-'}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    {c.jft && c.jft !== '-' && <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">JFT</span>}
                    {c.ssw && c.ssw !== '-' && <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">SSW</span>}
                    <button onClick={() => window.open(`https://wa.me/${c.wa}`, '_blank')} class="w-7 h-7 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs cursor-pointer">
                      <Icon name="whatsapp" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={sendBlast} disabled={sending} class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition mt-4 disabled:opacity-50">
              <Icon name="whatsapp" class="mr-1" /> {sending ? 'Mengirim...' : `Kirim Tawaran ke ${results.length} Kandidat`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}