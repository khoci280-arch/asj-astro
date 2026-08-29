/**
 * LokerDetailModal.tsx - Job detail modal with rincian biaya
 */
interface Job {
  code: string; pekerjaan: string; status: string;
  keterangan: string; kategori: string; kuota: string;
  gender: string; lokasi: string; syarat: string;
  rincianBiaya?: string; totalBiaya?: string; pamflet?: string;
}
interface Props { job: Job; onClose: () => void; }

function parseRincianBiaya(text: string) {
  if (!text || text === '-') return { total: '', sections: [] as {title:string;items:{label:string;value:string}[]}[] };
  const sections: {title:string;items:{label:string;value:string}[]}[] = [];
  let total = '';
  let cur: {title:string;items:{label:string;value:string}[]} | null = null;
  for (const line of text.split(String.fromCharCode(10)).map((l:string)=>l.trim()).filter(Boolean)) {
    if (/^total[:\s]/i.test(line)) { total = line.replace(/^total[:\s]*/i,'').trim(); continue; }
    if (/^[A-Z\s]+:$/.test(line)) {
      if (cur) sections.push(cur);
      cur = { title: line.replace(/[:\s]+$/,'').trim(), items: [] };
    } else if (cur) {
      const p = line.split(/[:|]/);
      if (p.length >= 2) cur.items.push({ label: p[0].trim(), value: p.slice(1).join(':').trim() });
    }
  }
  if (cur) sections.push(cur);
  return { total, sections };
}

function genderBadge(g: string) {
  const v = (g||'').toUpperCase();
  if (v.includes('LAKI') || v==='L') return <span class="px-2 py-0.5 bg-sky-900/40 text-sky-300 border border-sky-500/30 rounded text-[10px] font-bold"><i class="fas fa-mars mr-1"></i>Laki-laki</span>;
  if (v.includes('PEREMPUAN') || v==='P') return <span class="px-2 py-0.5 bg-pink-900/40 text-pink-300 border border-pink-500/30 rounded text-[10px] font-bold"><i class="fas fa-venus mr-1"></i>Perempuan</span>;
  return <span class="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-600 rounded text-[10px] font-bold">{g||'Semua'}</span>;
}

export default function LokerDetailModal({ job, onClose }: Props) {
  const st = (job.status||'').toUpperCase();
  const isOpen = st.includes('OPEN') || st.includes('URGENT');
  const { total, sections } = parseRincianBiaya(job.rincianBiaya||'');
  const displayTotal = total || job.totalBiaya || '';
  const syaratList = job.syarat && job.syarat !== '-' ? job.syarat.split(',').map((s:string)=>s.trim()).filter(Boolean) : [];
  const waMsg = encodeURIComponent('Halo Admin ASJ, saya tertarik lowongan '+job.code+' ('+job.pekerjaan+'). Mohon info lebih lanjut.');

  return (
    <div class="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e: any)=>e.stopPropagation()}>
        <div class="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div class="flex items-center gap-2">
            <span class="text-sky-400 font-mono text-xs font-bold">{job.code}</span>
            <span class={'px-2 py-0.5 rounded-full text-[10px] font-black '+(st.includes('URGENT')?'bg-amber-500 text-white animate-pulse':isOpen?'bg-emerald-600 text-white':'bg-red-700/80 text-white')}>
              {st.includes('URGENT')?'Urgent':isOpen?'Buka':'Tutup'}
            </span>
          </div>
          <button onClick={onClose} class="text-slate-400 hover:text-white p-1"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="p-5">
          {job.pamflet && job.pamflet !== '-' && job.pamflet.length > 5 && (
            <div class="mb-4"><img src={job.pamflet} loading="lazy" class="w-full h-40 object-cover rounded-xl border border-slate-700" alt={job.pekerjaan} /></div>
          )}
          <h3 class="text-xl font-black text-white mb-2">{job.pekerjaan}</h3>
          <div class="flex flex-wrap items-center gap-2 mb-4">
            {genderBadge(job.gender)}
            {job.lokasi && <span class="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-600 rounded text-[10px] font-bold"><i class="fas fa-map-marker-alt mr-1 text-red-400"></i>{job.lokasi}</span>}
            {job.kuota && job.kuota !== '-' && <span class="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-600 rounded text-[10px] font-bold"><i class="fas fa-users mr-1"></i>Kuota: {job.kuota}</span>}
            {job.kategori && <span class="text-[10px] text-slate-500"><i class="fas fa-tag mr-1 text-sky-500/70"></i>{job.kategori}</span>}
          </div>
          {displayTotal && (
            <div class="bg-gradient-to-r from-emerald-900/40 to-sky-900/30 border border-emerald-500/40 rounded-2xl p-5 mb-5 text-center">
              <p class="text-[10px] font-bold uppercase tracking-[4px] text-emerald-400 mb-1"><i class="fas fa-wallet mr-1"></i> Total Biaya</p>
              <p class="text-3xl font-black text-white tracking-wide">{displayTotal}</p>
            </div>
          )}
          {sections.map((sec:any,i:number)=>(
            <div key={i} class="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
              <h4 class="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">{sec.title}</h4>
              <div class="space-y-1.5">
                {sec.items.map((item:any,j:number)=>(
                  <div key={j} class="flex justify-between text-xs">
                    <span class="text-slate-400">{item.label}</span>
                    <span class="text-white font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {syaratList.length > 0 && (
            <div class="bg-slate-900/60 border border-slate-700 rounded-xl p-4 mb-4">
              <h4 class="text-xs font-black text-sky-400 uppercase tracking-widest mb-3"><i class="fas fa-clipboard-check mr-1.5"></i> Persyaratan</h4>
              <ul class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                {syaratList.map((s:string,i:number)=>(
                  <li key={i} class="flex items-start text-xs text-slate-300"><i class="fas fa-check text-emerald-500 mt-0.5 mr-2 text-[10px]"></i>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {job.keterangan && job.keterangan !== '-' && (
            <div class="bg-sky-900/15 border border-sky-500/30 rounded-xl p-4 mb-5">
              <h4 class="text-xs font-black text-sky-400 uppercase tracking-widest mb-2"><i class="fas fa-info-circle mr-1.5"></i> Keterangan</h4>
              <p class="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{job.keterangan}</p>
            </div>
          )}
          <div class="flex flex-col sm:flex-row gap-3">
            <a href={'https://wa.me/6287889502004?text='+waMsg} target="_blank" class="flex-1 px-5 py-3.5 bg-[#25D366] hover:bg-[#1fbd5b] text-white text-sm font-bold text-center rounded-xl shadow transition"><i class="fab fa-whatsapp mr-1.5"></i> Chat WA</a>
            <a href="/apply" class={'flex-1 px-5 py-3.5 text-white text-sm font-bold text-center rounded-xl shadow transition '+(isOpen?'bg-emerald-600 hover:bg-emerald-500':'bg-slate-600 opacity-60 cursor-not-allowed')}><i class="fas fa-paper-plane mr-1.5"></i> {isOpen?'Lamar Sekarang':'Ditutup'}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
