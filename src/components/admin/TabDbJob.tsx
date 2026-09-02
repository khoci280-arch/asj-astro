/**
 * TabDbJob.tsx — Admin DB Job Internal tab
 * Source: legacy/index.html page-admin → admin-dbjob
 */
import { useState, useEffect } from 'preact/hooks';
import { authStore } from '../../store/authReactive';
import { t } from '../../store/i18n';
import { showToast } from '../Toast';
import AdminJobEditModal from './AdminJobEditModal';
import AdminShareModal from './AdminShareModal';
import MatchmakingModal from './MatchmakingModal';
import ListKandidatModal from './ListKandidatModal';
import { useStore } from '@nanostores/preact';
import { allKandidatList, fetchKandidatFromAPI } from '../../store/adminStore';
import Icon from '../ui/Icon';
import { getEndpoint } from '../../lib/apiEndpoint';

interface DbJob {
  code: string; tsk: string; pekerjaan: string; kategori: string;
  lokasi: string; tahapan: string; statusInt: string; createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  URGENT: 'bg-red-500/20 text-purple-400 border-red-500/40',
  CLOSE: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

export default function TabDbJob() {
  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [sortType, setSortType] = useState('TERBARU');
  const [fBidang, setFBidang] = useState('ALL');
  const [fTahapan, setFTahapan] = useState('ALL');
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editJob, setEditJob] = useState<DbJob | null>(null);
  const [shareJob, setShareJob] = useState<DbJob | null>(null);
  const [matchJob, setMatchJob] = useState<DbJob | null>(null);
  const [listJobCode, setListJobCode] = useState<string | null>(null);
  const allCandidates = useStore(allKandidatList);

  useEffect(() => { fetchLoker(); }, []);
  useEffect(() => { fetchKandidatFromAPI(); }, []);

  async function fetchLoker() {
    try {
      const res = await fetch(getEndpoint('getAppData'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "getAppData", args: ["admin"], sessionToken: authStore.get().sessionToken || "" }),
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.dbJobs || data.jobs || []);
      }
    } catch (err) {
      console.error('[TabDbJob] Failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const bList = [...new Set(jobs.map(j => j.kategori).filter(Boolean))];
  const tList = [...new Set(jobs.map(j => j.tahapan).filter(Boolean))];
  const filtered = jobs
    .filter(j => {
      const ms = !search || [j.code, j.tsk, j.pekerjaan, j.lokasi].some(f => (f || '').toLowerCase().includes(search));
      return ms && (fBidang === 'ALL' || j.kategori === fBidang) && (fTahapan === 'ALL' || j.tahapan === fTahapan);
    })
    .sort((a, b) => {
      if (sortType === 'TERBANYAK') return 0;
      const tA = new Date(a.createdAt || 0).getTime(), tB = new Date(b.createdAt || 0).getTime();
      return sortType === 'TERLAMA' ? tA - tB : tB - tA;
    });

  function badgeColor(t: string) {
    const u = (t || '-').toUpperCase();
    if (/OPEN/.test(u)) return 'bg-emerald-600 text-white border-emerald-400/60';
    if (/URGENT/.test(u)) return 'bg-red-600 text-white border-red-400/60 animate-pulse';
    if (/CLOSE/.test(u)) return 'bg-red-600 text-white border-red-400/60';
    return 'bg-slate-800 text-slate-300 border-slate-600';
  }

  return (
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-purple-400 font-bold text-lg"><Icon name="server" class="mr-2" /> Histori Job Internal</h2>
        <div class="relative w-72">
          <Icon name="search" class="absolute left-3 top-2.5 text-slate-300 text-sm" />
          <input
            type="text"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder={t("db.placeholder_search")}
            class="w-full pl-9 p-2 rounded-lg bg-black/40 border border-slate-700 text-sm text-white outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      <div class="flex flex-col gap-3 mb-5 bg-black/30 p-4 rounded-lg border border-purple-900/30 text-sm">
        <div class="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
          <span class="text-xs font-bold text-slate-300 mr-2 uppercase tracking-widest"><Icon name="sort-amount-down" class="mr-1" /> Urutkan:</span>
          {[
            {id: 'TERBARU', l: 'Terbaru'}, {id: 'TERLAMA', l: 'Terlama'}, {id: 'TERBANYAK', l: 'Terbanyak'}
          ].map(o => (
            <button key={o.id} onClick={() => setSortType(o.id)}
              class={'px-4 py-1.5 rounded-full font-bold transition ' + (sortType === o.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div class="text-center py-8"><Icon spin name="spinner" class="text-2xl text-purple-400" /><p class="text-slate-500 mt-2 text-sm">Memuat data DB Job...</p></div>
      ) : (
        <div class="overflow-x-auto rounded-xl border border-slate-800">
          <table class="w-full min-w-[900px] text-sm text-left whitespace-nowrap">
            <thead class="bg-slate-800 text-slate-300 text-sm uppercase border-b border-slate-700 tracking-wider">
              <tr>
                <th scope="col" class="p-4">ID Loker</th>
                <th scope="col" class="p-4">Pengurus (TSK)</th>
                <th scope="col" class="p-4">Bidang & Lokasi</th>
                <th scope="col" class="p-4 text-center">Jml Kandidat</th>
                <th scope="col" class="p-4 text-center">Tahapan & Status</th>
                <th scope="col" class="p-4 text-center">Aksi DB</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} class="p-6 text-center text-slate-500">Tidak ada data</td></tr>
              ) : filtered.slice(0, limit).map(db => (
                <tr key={db.code} class="border-b border-slate-800 hover:bg-white/5">
                  <td class="p-4 font-mono text-purple-300 font-bold">{db.code}</td>
                  <td class="p-4">{db.tsk || '-'}</td>
                  <td class="p-4">
                    <div class="font-bold text-white text-[13px]">{db.pekerjaan || '-'}</div>
                    <div class="text-[10px] text-slate-400 font-bold mt-1.5">
                      <span class="text-sky-400"><Icon name="tag" class="mr-1" />{db.kategori || '-'}</span>
                      <span class="mx-1.5">&bull;</span>
                      <span class="text-amber-300"><Icon name="map-marker-alt" class="text-red-400 mr-1" />{db.lokasi || '-'}</span>
                    </div>
                  </td>
                  {(() => { const cCount = allCandidates.filter((c: any) => c.idLoker && c.idLoker.includes(db.code)).length; return (
                  <td class="p-4 text-center cursor-pointer group" onClick={() => setListJobCode(db.code)}>
                    <div class="inline-block px-4 py-1.5 bg-sky-900/30 group-hover:bg-sky-600 rounded-lg transition-all">
                      <span class="text-sky-400 group-hover:text-white font-bold text-lg">{cCount}</span>
                    </div>
                  </td>
                ); })()}
                  <td class="p-4 text-center"><span class={'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ' + badgeColor(db.tahapan)}><Icon name="chevron-circle-right" /> {db.tahapan || '-'}</span></td>
                  <td class="p-4 text-center">
                    <button onClick={() => setEditJob(db)} class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold shadow text-[10px] cursor-pointer"><Icon name="edit" /> Edit</button>
                    <button onClick={() => setShareJob(db)} class="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow text-[10px] cursor-pointer"><Icon name="share-alt" /> Share</button>
                    <button onClick={() => setMatchJob(db)} class="ml-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold shadow text-[10px] cursor-pointer"><Icon name="search" /> Match</button>
                    <button onClick={async () => { try { const r = await fetch(getEndpoint('downloadJobDocs'), { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({action:"downloadJobDocs", args:[db.code]}) }); const d = await r.json(); if(d.zipBase64){const b=atob(d.zipBase64);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);const bl=new Blob([u],{type:"application/zip"});const url=URL.createObjectURL(bl);const a=document.createElement("a");a.href=url;a.download=d.fileName||"Docs_"+db.code+".zip";a.click();URL.revokeObjectURL(url);} else {showToast(d.error||"Gagal","error");} } catch(e: unknown) {showToast("Error: " + (e instanceof Error ? e.message : String(e)),"error");} }} class="ml-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold shadow text-[10px] cursor-pointer"><Icon name="download" /> Docs</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editJob && <AdminJobEditModal job={editJob as any} onClose={() => setEditJob(null)} onSave={() => fetchLoker()} />}
      {shareJob && <AdminShareModal job={shareJob} onClose={() => setShareJob(null)} />}
      {listJobCode && <ListKandidatModal jobCode={listJobCode} isOpen={!!listJobCode} onClose={() => setListJobCode(null)} />}
      {matchJob && <MatchmakingModal job={matchJob} candidates={allCandidates} isOpen={!!matchJob} onClose={() => setMatchJob(null)} />}
      <p class="text-xs text-slate-500 mt-3">{filtered.length} job internal</p>
    </div>
  );
}
