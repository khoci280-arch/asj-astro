/**
 * TabWA.tsx - WA Pintar tab
 * Source: legacy admin.html admin-wa (lines 747-799)
 */
import { useState, useEffect } from 'preact/hooks';
import { authStore } from '../../store/authReactive';

// WaTemplate type imported from shared types

export default function TabWA() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [nama, setNama] = useState('');
  const [isi, setIsi] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/.netlify/functions/get-app-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "getAppData", args: ["admin"], sessionToken: authStore.get().sessionToken || "" }) });
        const d = await r.json();
        if (d.success) setTemplates(d.waTemplates || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    } load(); }, []);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    try {
      const body: Record<string, string> = { nama, isi };
      if (editingId) body.id = editingId;
      const r = await fetch('/.netlify/functions/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { alert(editingId ? 'Template updated!' : 'Template saved!'); location.reload(); } else alert('Failed: ' + (d.error || 'Unknown'));
    } catch (e) { alert('Error: ' + e); }
  }

  function handleEdit(t: WaTemplate) { setEditingId(t.id); setNama(t.nama); setIsi(t.isi); }
  function handleCancel() { setEditingId(''); setNama(''); setIsi(''); }
  function handleDelete(id: string) {
    if (!confirm('Hapus template ini?')) return;
    fetch('/.netlify/functions/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      .then(r => r.json()).then(d => { if (d.success) location.reload(); else alert('Gagal: ' + d.error); }).catch(e => alert('Error: ' + e));
  }

  const ic = 'w-full p-2.5 rounded-lg bg-black/60 border border-slate-600 text-white text-sm outline-none focus:border-emerald-500 transition';

  if (loading) return <div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-emerald-400"></i><p class="text-slate-500 mt-2 text-sm">Memuat template...</p></div>;

  return (<div>
    <h2 class="text-emerald-400 font-bold mb-6 border-b border-emerald-900/50 pb-3 text-lg"><i class="fab fa-whatsapp mr-2"></i> Kelola Template WA Pintar</h2>

    <div class="mb-6 bg-emerald-950/60 p-5 rounded-2xl border-2 border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1.5"><span class="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded-full px-2.5 py-1"><i class="fas fa-star text-amber-400 mr-1"></i> Fitur Khusus</span></div>
        <h3 class="text-sm font-bold text-emerald-300 uppercase tracking-widest mb-1"><i class="fab fa-whatsapp text-emerald-400 mr-1"></i> Undangan Grup WhatsApp Kelas (Orang Tua/Wali)</h3>
        <p class="text-xs text-slate-300 leading-relaxed">Kirim undangan Grup WA ke Orang Tua/Wali secara massal</p>
      </div>
      <button class="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold text-center rounded-xl shadow-lg shadow-emerald-900/60 transition hover:-translate-y-0.5 shrink-0"><i class="fab fa-whatsapp text-white text-lg mr-1"></i> Mulai Kirim Undangan</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 bg-black/40 p-5 rounded-2xl border border-slate-700 flex flex-col h-fit">
        <h3 class="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">{editingId ? 'Edit Template' : 'Buat Template Baru'}</h3>
        <form onSubmit={handleSubmit} class="space-y-4">
          <div><label class="block text-xs font-bold text-slate-300 mb-1">NAMA TEMPLATE (Kategori)</label><input type="text" value={nama} onInput={(e) => setNama((e.target as HTMLInputElement).value)} required placeholder="Contoh: Jadwal Interview" class={ic} /></div>
          <div><label class="block text-xs font-bold text-slate-300 mb-1">ISI PESAN WA</label><textarea value={isi} onInput={(e) => setIsi((e.target as HTMLTextAreaElement).value)} required rows={8} placeholder="Konnichiwa <<NAMA>>,
Jadwal interview untuk posisi <<JOB>>..." class={ic + ' leading-relaxed'}></textarea>
            <p class="text-[9px] text-emerald-400/80 mt-1.5 leading-relaxed font-mono bg-emerald-900/20 p-2 rounded"><strong>Gunakan Kode Ini:</strong><br/>&lt;&lt;NAMA&gt;&gt; = Nama Kandidat<br/>&lt;&lt;JOB&gt;&gt; = Job yg dilamar</p>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="submit" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg transition text-sm"><i class="fas fa-save mr-1"></i> {editingId ? 'Update Template' : 'Simpan Template'}</button>
            {editingId && <button type="button" onClick={handleCancel} class="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold shadow-lg transition text-sm"><i class="fas fa-times"></i></button>}
          </div>
        </form>
      </div>

      <div class="lg:col-span-2">
        <h3 class="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4"><i class="fas fa-list mr-1"></i> Template Tersimpan</h3>
        {templates.length === 0 ? <p class="text-slate-500 text-sm text-center py-8">Belum ada template</p> :
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} class="bg-slate-800/80 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition">
              <div class="flex items-center justify-between mb-2"><span class="text-emerald-400 font-bold text-sm">{t.nama}</span><span class="text-[9px] text-slate-500 font-mono">ID: {t.id}</span></div>
              <pre class="text-xs text-slate-300 bg-black/40 rounded-lg p-3 mb-3 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">{t.isi}</pre>
              <div class="flex gap-2">
                <button onClick={() => handleEdit(t)} class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"><i class="fas fa-edit mr-1"></i> Edit</button>
                <button onClick={() => handleDelete(t.id)} class="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          ))}</div>}
        </div>
    </div>

  </div>);
}
