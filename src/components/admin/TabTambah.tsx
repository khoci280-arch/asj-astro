/**
 * TabTambah.tsx - Form Input Loker Baru
 */
import { useState, useEffect } from 'preact/hooks';

interface DD { tsk: string[]; tahapan: string[]; kategori: string[]; gender: string[]; lokasi: string[]; syarat: string[]; }
const RF = ['CV', 'JFT', 'SSW'];

export default function TabTambah() {
  const [dd, setDd] = useState<DD>({ tsk: [], tahapan: [], kategori: [], gender: [], lokasi: [], syarat: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tsk, setTsk] = useState('');
  const [tahapan, setTahapan] = useState('');
  const [kuota, setKuota] = useState('');
  const [kategori, setKategori] = useState('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [gender, setGender] = useState('');
  const [lokasi, setLokasi] = useState<string[]>([]);
  const [customLokasi, setCustomLokasi] = useState('');
  const [syarat, setSyarat] = useState<string[]>([]);
  const [customSyarat, setCustomSyarat] = useState('');
  const [reqFiles, setReqFiles] = useState<string[]>(RF);
  const [customReqFile, setCustomReqFile] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [totalBiaya, setTotalBiaya] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [pamfletFile, setPamfletFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/.netlify/functions/get-app-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getAppData', args: ['admin'] }) });
        const d = await r.json();
        if (d.success && d.dropdowns) setDd(d.dropdowns);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    } load(); }, []);

  function tog(a: string[], s: (v: string[]) => void, v: string) { s(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); }

  async function handleSubmit(e: Event) {
    e.preventDefault(); setSubmitting(true);
    try {
      const fd = new FormData(); fd.append('action', 'submitFormAdmin');
      fd.append('tsk', tsk); fd.append('tahapan', tahapan); fd.append('kuota', kuota); fd.append('kategori', kategori); fd.append('pekerjaan', pekerjaan); fd.append('gender', gender);
      fd.append('lokasi', JSON.stringify(lokasi)); fd.append('customLokasi', customLokasi); fd.append('syarat', JSON.stringify(syarat)); fd.append('customSyarat', customSyarat);
      fd.append('reqFiles', JSON.stringify(reqFiles)); fd.append('customReqFile', customReqFile); fd.append('keterangan', keterangan); fd.append('totalBiaya', totalBiaya);
      if (templateFile) fd.append('template', templateFile); if (pamfletFile) fd.append('pamflet', pamfletFile);
      const r = await fetch('/.netlify/functions/jobs', { method: 'POST', body: fd });
      const d = await r.json(); if (d.success) { alert('Loker berhasil ditambahkan!'); location.reload(); } else alert('Gagal: ' + (d.error || 'Unknown'));
    } catch (e) { alert('Error: ' + e); } finally { setSubmitting(false); }
  }

  if (loading) return <div class='text-center py-8'><i class='fas fa-spinner fa-spin text-2xl text-red-400'></i><p class='text-slate-500 mt-2 text-sm'>Memuat form...</p></div>;

  const ic = 'w-full p-3 rounded-lg bg-black/40 border border-slate-700 text-sm text-white outline-none focus:border-red-500 transition';
  const lc = 'block text-sm font-bold text-slate-300 mb-1.5';
  const rl = 'block text-sm text-red-400 mb-1.5 font-bold';

  return (<div>
    <h2 class='text-red-400 font-bold mb-6 border-b border-red-900/50 pb-3 text-lg'><i class='fas fa-plus-circle mr-2'></i> Form Input Loker Baru</h2>
    <form onSubmit={handleSubmit} class='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div class='space-y-5'>
        <div class='p-4 bg-red-900/10 border border-red-900/30 rounded-xl grid grid-cols-2 gap-4'>
          <div class='col-span-2'><label class='block text-xs font-bold text-red-400 mb-1 uppercase tracking-widest'><i class='fas fa-lock mr-1'></i> Info DB Internal</label></div>
          <div><label class={rl}>TSK PENGURUS</label><select value={tsk} onInput={(e)=>setTsk((e.target as HTMLSelectElement).value)} required class={ic}><option value=''>-</option>{dd.tsk.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div><label class={rl}>TAHAPAN INTERNAL</label><select value={tahapan} onInput={(e)=>setTahapan((e.target as HTMLSelectElement).value)} required class={ic}><option value=''>-</option>{dd.tahapan.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div class='col-span-2'><label class={rl}>KUOTA DIBUTUHKAN (Cth: 3 Org)</label><input type='text' value={kuota} onInput={(e)=>setKuota((e.target as HTMLInputElement).value)} required class='w-full p-3 rounded-lg bg-black border border-slate-700 text-sm text-white outline-none focus:border-red-500 transition' /></div>
        </div>
        <div><label class={lc}>KATEGORI BIDANG</label><select value={kategori} onInput={(e)=>setKategori((e.target as HTMLSelectElement).value)} required class={ic}><option value=''>-</option>{dd.kategori.map(k=><option key={k} value={k}>{k}</option>)}</select></div>
        <div><label class={lc}>NAMA PEKERJAAN (Judul Loker)</label><input type='text' value={pekerjaan} onInput={(e)=>setPekerjaan((e.target as HTMLInputElement).value)} required class={ic} /></div>
        <div><label class={lc}>GENDER</label><select value={gender} onInput={(e)=>setGender((e.target as HTMLSelectElement).value)} required class={ic}><option value=''>-</option>{dd.gender.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
        <div><label class='block text-xs font-bold text-sky-400 mb-1.5 uppercase'><i class='fas fa-file-excel mr-1'></i> UPLOAD FORMAT CV/EXCEL (Opsional)</label><input type='file' accept='.pdf,.xls,.xlsx,.doc,.docx' onChange={(e)=>setTemplateFile((e.target as HTMLInputElement).files?.[0]||null)} class='w-full text-sm text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-sky-900/50 file:text-sky-400 hover:file:bg-sky-900/80 cursor-pointer' /></div>
        <div><label class='block text-xs font-bold text-pink-400 mb-1.5 uppercase'><i class='fas fa-image mr-1'></i> UPLOAD PAMFLET (Opsional)</label><input type='file' accept='image/*' onChange={(e)=>setPamfletFile((e.target as HTMLInputElement).files?.[0]||null)} class='w-full text-sm text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-pink-900/50 file:text-pink-400 hover:file:bg-pink-900/80 cursor-pointer' /></div>
      </div>
      <div class='space-y-5'>
        <div><label class={lc}>PENEMPATAN LOKASI (Pilih Checkbox)</label>
          <div class='relative mb-2'><i class='fas fa-search absolute left-3 top-3 text-slate-500 text-sm'></i><input type='text' placeholder='Cari lokasi...' class='w-full pl-8 p-2.5 rounded-lg bg-black/40 border border-slate-700 text-sm text-white outline-none focus:border-red-500 transition' /></div>
          <div class='grid grid-cols-2 gap-2 h-28 overflow-y-auto p-3 bg-black/40 border border-slate-700 rounded-lg text-sm text-slate-300 mb-2 custom-scrollbar'>{dd.lokasi.map(l=><label key={l} class='flex items-center gap-2 cursor-pointer hover:text-white transition'><input type='checkbox' checked={lokasi.includes(l)} onChange={()=>tog(lokasi,setLokasi,l)} class='accent-red-500 w-5 h-5' /> {l}</label>)}</div>
          <input type='text' value={customLokasi} onInput={(e)=>setCustomLokasi((e.target as HTMLInputElement).value)} placeholder='Ketik manual lokasi lainnya...' class={ic} />
        </div>
        <div><label class={lc}>SYARAT KANDIDAT (Pilih Checkbox)</label>
          <div class='relative mb-2'><i class='fas fa-search absolute left-3 top-3 text-slate-500 text-sm'></i><input type='text' placeholder='Cari syarat...' class='w-full pl-8 p-2.5 rounded-lg bg-black/40 border border-slate-700 text-sm text-white outline-none focus:border-red-500 transition' /></div>
          <div class='grid grid-cols-2 gap-2 h-24 overflow-y-auto p-3 bg-black/40 border border-slate-700 rounded-lg text-sm text-slate-300 mb-2 custom-scrollbar'>{dd.syarat.map(s=><label key={s} class='flex items-center gap-2 cursor-pointer hover:text-white transition'><input type='checkbox' checked={syarat.includes(s)} onChange={()=>tog(syarat,setSyarat,s)} class='accent-red-500 w-5 h-5' /> {s}</label>)}</div>
          <input type='text' value={customSyarat} onInput={(e)=>setCustomSyarat((e.target as HTMLInputElement).value)} placeholder='Ketik manual syarat lainnya...' class={ic} />
        </div>
        <div><label class={lc}><i class='fas fa-file-upload mr-1'></i> SYARAT UPLOAD DOKUMEN</label>
          <div class='grid grid-cols-2 gap-2 h-24 overflow-y-auto p-3 bg-black/40 border border-slate-700 rounded-lg text-sm text-slate-300 mb-2 custom-scrollbar'>
            {['CV','JFT','SSW','SIM A','KTP','KK','AKTE','IJAZAH','IJAZAH SD','IJAZAH SMP','IJAZAH SMA','UNIVERSITAS','ALL'].map(f=><label key={f} class='flex items-center gap-2 cursor-pointer hover:text-white transition'><input type='checkbox' checked={reqFiles.includes(f)} onChange={()=>tog(reqFiles,setReqFiles,f)} class={'accent-'+(f==='ALL'?'pink':'red')+'-500 w-5 h-5'} /> {f}</label>)}
          </div>
          <input type='text' value={customReqFile} onInput={(e)=>setCustomReqFile((e.target as HTMLInputElement).value)} placeholder='Ketik dokumen lain...' class={ic} />
        </div>
        <div><label class={lc}>KETERANGAN PUBLIK (Opsional)</label><textarea value={keterangan} onInput={(e)=>setKeterangan((e.target as HTMLTextAreaElement).value)} rows={2} class={ic}></textarea></div>
      </div>
      <div class='md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div><label class='block text-sm font-bold text-emerald-400 mb-1.5 uppercase'><i class='fas fa-wallet mr-1'></i> TOTAL BIAYA JOB (Cth: 25 JT)</label><input type='text' value={totalBiaya} onInput={(e)=>setTotalBiaya((e.target as HTMLInputElement).value)} placeholder='Contoh: 25 JT' class={ic} /></div>
        <div><label class='block text-sm font-bold text-emerald-400 mb-1.5 uppercase'><i class='fas fa-list-check mr-1'></i> RINCIAN BIAYA & TAHAPAN</label><button type='button' class='w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase shadow-lg transition'><i class='fas fa-edit mr-1'></i> Buka Editor Rincian</button><div class='text-xs font-bold text-emerald-300 mt-1.5 min-h-[16px]'>Klik untuk isi rincian biaya</div></div>
      </div>
      <div class='md:col-span-2 mt-4'>
        <button type='submit' disabled={submitting} class='w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 font-black tracking-widest text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] transition text-base disabled:opacity-50'>
          <i class={'fas fa-cloud-upload-alt mr-2 '+(submitting?'fa-spin':'')}></i> {submitting?'MENGUNGGAH...':'UNGGAH DATA LOKER BARU'}
        </button>
      </div>
    </form>
  </div>);
}
