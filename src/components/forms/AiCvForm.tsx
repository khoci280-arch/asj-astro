/**
 * AiCvForm.tsx — AI CV Chat + Preview Form (ai_form.html)
 * Source: legacy/ai_form.html (1:1 match)
 * Split panel: Chat AI Jeklin (left 35%) + CV Preview Form (right 65%)
 */
import { useState, useRef, useEffect } from 'preact/hooks';
import { authStore } from '../../store/authReactive';
import { apiClient } from '../../lib/apiClient';

interface ChatMessage { role: 'assistant' | 'user'; text: string; time: string }

interface CvData {
  nama: string; katakana: string; panggilan: string; panggilan_katakana: string;
  tmplahir: string; tgllahir: string; umur: string; gender: string; agama: string;
  goldar: string; status: string; anak: string; email: string; alamat: string;
  hp: string; hpdarurat: string; ktp: string; paspor: string; sim: string;
  // Fisik
  tb: string; bb: string; tangan: string; sepatu: string; baju: string; topi: string; tahan_ac: string;
  // Medis
  matakanan: string; matakiri: string; kacamata: string; butawarna: string; tato: string;
  rokok: string; alkohol: string;
  alergi_id: string; alergi_jp: string; medis_id: string; medis_jp: string; laka_id: string; laka_jp: string;
  // Wawancara
  riwayatjepang: string;
  promo_id: string; promo_jp: string; lebih_id: string; lebih_jp: string;
  kurang_id: string; kurang_jp: string; hobi_id: string; hobi_jp: string;
  keahlian_id: string; keahlian_jp: string; moti_id: string; moti_jp: string;
  alasan_id: string; alasan_jp: string; pulang_id: string; pulang_jp: string;
  keinginan_id: string; keinginan_jp: string; tujuan_id: string; tujuan_jp: string;
  lama: string; gaji_yen: string; tabungan: string;
  // Pendidikan
  bhs_jepang: string; nilai: string; lisensi: string;
  // Kenalan
  kenalan_nama_id: string; kenalan_nama_jp: string; kenalan_hub_id: string; kenalan_hub_jp: string;
  kenalan_kerja_id: string; kenalan_kerja_jp: string; kenalan_usia: string;
  kenalan_alamat_id: string; kenalan_alamat_jp: string;
  [key: string]: string;
}

const EMPTY_CV: CvData = Object.fromEntries([
  'nama','katakana','panggilan','panggilan_katakana','tmplahir','tgllahir','umur','gender','agama',
  'goldar','status','anak','email','alamat','hp','hpdarurat','ktp','paspor','sim',
  'tb','bb','tangan','sepatu','baju','topi','tahan_ac',
  'matakanan','matakiri','kacamata','butawarna','tato','rokok','alkohol',
  'alergi_id','alergi_jp','medis_id','medis_jp','laka_id','laka_jp',
  'riwayatjepang','promo_id','promo_jp','lebih_id','lebih_jp','kurang_id','kurang_jp',
  'hobi_id','hobi_jp','keahlian_id','keahlian_jp','moti_id','moti_jp',
  'alasan_id','alasan_jp','pulang_id','pulang_jp','keinginan_id','keinginan_jp',
  'tujuan_id','tujuan_jp','lama','gaji_yen','tabungan',
  'bhs_jepang','nilai','lisensi',
  'kenalan_nama_id','kenalan_nama_jp','kenalan_hub_id','kenalan_hub_jp',
  'kenalan_kerja_id','kenalan_kerja_jp','kenalan_usia','kenalan_alamat_id','kenalan_alamat_jp'
].map(k => [k, ''])) as CvData;

export default function AiCvForm() {
  const [tab, setTab] = useState<'chat' | 'form'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cv, setCv] = useState<CvData>(EMPTY_CV);
  const [formLang, setFormLang] = useState<'id' | 'jp'>('id');
  const [docs, setDocs] = useState<Record<string, File | null>>({});
  const [docStatus, setDocStatus] = useState<Record<string, string>>({});
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setMessages([{ role: 'assistant',
      text: 'Halo! Saya Qween Jeklin, HRD ASJ. Saya akan membantu mengisi CV Jepangmu. Silakan ceritakan tentang dirimu!',
      time: now }]);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const now = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages(prev => [...prev, { role: 'user', text, time: now() }]);
    setInput('');
    setSending(true);
    try {
      const res = await apiClient.post('/.netlify/functions/ai-cv', {
        message: text,
        history: messages.map(m => ({ role: m.role, content: m.text })),
        cvData: cv
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply || '...', time: now() }]);
        if (data.cvData) setCv(prev => ({ ...prev, ...data.cvData }));
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Maaf, terjadi gangguan.', time: now() }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error koneksi.', time: now() }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDocUpload = (type: string, file: File | null) => {
    if (!file) return;
    setDocs(prev => ({ ...prev, [type]: file }));
    setDocStatus(prev => ({ ...prev, [type]: file.name }));
    if (type === 'foto' && file.type.startsWith('image/')) {
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const saveToDatabase = async () => {
    try {
      const token = authStore.get().token;
      const fd = new FormData();
      fd.append('cvData', JSON.stringify(cv));
      Object.entries(docs).forEach(([k, f]) => { if (f) fd.append(k, f); });
      const res = await fetch('/.netlify/functions/save-ai-cv', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd
      });
      alert(res.ok ? 'Data berhasil disimpan!' : 'Gagal menyimpan.');
    } catch (e) { alert('Error: ' + (e as Error).message); }
  };

  const updateCv = (field: string, value: string) => setCv(prev => ({ ...prev, [field]: value }));

  return (
    <div class="flex flex-col md:flex-row h-screen w-full relative" style={{ height: '100vh', height: '100dvh' }}>
      {/* Mobile Tab */}
      <div class="md:hidden flex w-full bg-slate-900 border-b border-slate-800 z-50">
        <button onClick={() => setTab('chat')} class={tab === 'chat' ? 'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500' : 'flex-1 py-3 text-xs font-bold text-slate-400'}>
          <i class="fas fa-crown mr-2"></i>Chat Jeklin
        </button>
        <button onClick={() => setTab('form')} class={tab === 'form' ? 'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500' : 'flex-1 py-3 text-xs font-bold text-slate-400'}>
          <i class="fas fa-file-alt mr-2"></i>Preview CV
        </button>
      </div>

      {/* Chat Panel */}
      <div class={`${tab === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-[35%] h-[calc(100vh-42px)] md:h-full bg-slate-900 border-r border-slate-800 flex-col z-20`}>
        <div class="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3 relative overflow-hidden">
          <div class="absolute -top-4 -right-4 w-16 h-16 bg-amber-500 rounded-full blur-2xl opacity-20"></div>
          <div class="w-10 h-10 rounded-full bg-amber-500 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex-shrink-0">
            <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png" alt="Qween Jeklin" class="w-full h-full rounded-full object-cover" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-amber-400">Qween Jeklin</h2>
            <p class="text-[10px] text-slate-400"><span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>HRD ASJ (Boss's Daughter)</p>
          </div>
        </div>
        <div ref={chatRef} class="flex-1 overflow-y-auto p-3 space-y-4 pb-24 md:pb-4">
          {messages.map((msg, i) => (
            <div key={i} class={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div class={`${msg.role === 'user' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-200'} rounded-xl px-4 py-2.5 max-w-[80%] shadow-lg`}>
                <p class="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <p class={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-amber-200' : 'text-slate-500'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
          {sending && <div class="flex justify-start"><div class="bg-slate-800 rounded-xl px-4 py-2.5"><span class="text-xs text-slate-400 animate-pulse">Jeklin mengetik...</span></div></div>}
        </div>
        <div class="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input ref={inputRef} type="text" value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            class="flex-1 bg-slate-800 text-xs text-white px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Ketik balasanmu di sini..." />
          <button onClick={handleSend} disabled={sending}
            class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl transition shadow-[0_4px_10px_0_rgba(245,158,11,0.3)] disabled:opacity-50">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      {/* Form Panel */}
      <main class={`${tab === 'form' ? 'flex' : 'hidden'} md:flex w-full md:w-[65%] h-[calc(100vh-42px)] md:h-full overflow-y-auto bg-slate-950 p-3 md:p-6`}>
        <div class="max-w-5xl mx-auto pb-20 w-full">
          {/* Header */}
          <div class="flex justify-between items-center mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div class="flex items-center gap-3">
              <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png" alt="ASJ" class="h-8 md:h-10 object-contain" />
              <div>
                <h1 class="text-sm md:text-base font-black text-white">PREVIEW CV JEPANG</h1>
                <p class="text-[10px] md:text-[11px] text-slate-400">Edit manual aktif. Data tersimpan otomatis di perangkat.</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button onClick={saveToDatabase} class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg flex items-center gap-2">
                <i class="fas fa-cloud-upload-alt"></i>SIMPAN DB
              </button>
              <button onClick={() => setFormLang(l => l === 'id' ? 'jp' : 'id')} class="bg-sky-600 hover:bg-sky-500 text-white text-[10px] md:text-xs font-bold px-3 py-2 rounded-lg transition shadow-lg">
                <i class="fas fa-language mr-1"></i>{formLang === 'id' ? 'JP' : 'ID'}
              </button>
            </div>
          </div>

          {sending && (
            <div class="text-[10px] text-amber-400 font-bold mb-3 bg-amber-900/20 p-2 rounded border border-amber-500/20 flex items-center">
              <i class="fas fa-magic fa-spin mr-2"></i>Qween Jeklin sedang menganalisis & translate datamu...
            </div>
          )}

          {/* Section 1: Identitas */}
          <Section title="1. Identitas & Kontak" icon="fa-address-card" color="sky">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Field label="Nama Lengkap" id="nama" value={cv.nama} span={2} readonly />
              <Field label="Katakana" id="katakana" value={cv.katakana} span={2} jp />
              <Field label="Panggilan" id="panggilan" value={cv.panggilan} readonly />
              <Field label="P. Katakana" id="panggilan_katakana" value={cv.panggilan_katakana} jp />
              <Field label="Tmp Lahir" id="tmplahir" value={cv.tmplahir} readonly />
              <Field label="Tgl Lahir" id="tgllahir" value={cv.tgllahir} readonly />
              <Field label="Umur" id="umur" value={cv.umur} center readonly />
              <Field label="Gender" id="gender" value={cv.gender} center readonly />
              <Field label="Agama" id="agama" value={cv.agama} center readonly />
              <Field label="Gol. Darah" id="goldar" value={cv.goldar} center readonly />
              <Field label="Status Nikah" id="status" value={cv.status} center readonly />
              <Field label="Anak" id="anak" value={cv.anak} center readonly />
              <Field label="Email" id="email" value={cv.email} span={2} readonly />
              <Field label="Alamat Lengkap" id="alamat" value={cv.alamat} span={3} spanMd={3} readonly />
              <Field label="No. HP (WA)" id="hp" value={cv.hp} readonly />
              <Field label="HP Darurat" id="hpdarurat" value={cv.hpdarurat} readonly />
              <Field label="NIK KTP" id="ktp" value={cv.ktp} span={2} readonly />
              <Field label="No. Paspor" id="paspor" value={cv.paspor} span={2} readonly />
              <Field label="SIM" id="sim" value={cv.sim} readonly />
            </div>
          </Section>

          {/* Sections 2+3: Fisik + Medis */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Section title="2. Fisik & Ukuran" icon="fa-child" color="amber">
              <div class="grid grid-cols-3 gap-2">
                <Field label="Tinggi (cm)" id="tb" value={cv.tb} center readonly />
                <Field label="Berat (kg)" id="bb" value={cv.bb} center readonly />
                <Field label="Tgn Dominan" id="tangan" value={cv.tangan} center readonly />
                <Field label="Uk. Sepatu" id="sepatu" value={cv.sepatu} center readonly />
                <Field label="Uk. Baju" id="baju" value={cv.baju} center readonly />
                <Field label="Uk. Topi" id="topi" value={cv.topi} center readonly />
                <div class="col-span-3"><Field label="Sanggup Kerja Tanpa AC?" id="tahan_ac" value={cv.tahan_ac} readonly /></div>
              </div>
            </Section>
            <Section title="3. Medis & Kebiasaan" icon="fa-notes-medical" color="red">
              <div class="grid grid-cols-4 gap-2">
                <Field label="Mata Kanan" id="matakanan" value={cv.matakanan} center readonly />
                <Field label="Mata Kiri" id="matakiri" value={cv.matakiri} center readonly />
                <div class="col-span-2"><Field label="Kacamata?" id="kacamata" value={cv.kacamata} center readonly /></div>
                <div class="col-span-2"><Field label="Buta Warna" id="butawarna" value={cv.butawarna} readonly /></div>
                <div class="col-span-2"><Field label="Tato / Tindik" id="tato" value={cv.tato} readonly /></div>
                <Field label="Rokok" id="rokok" value={cv.rokok} center readonly />
                <Field label="Alkohol" id="alkohol" value={cv.alkohol} center readonly />
                <div class="col-span-4 space-y-1 mt-2 p-2 bg-slate-800/40 rounded border border-slate-700/50">
                  <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-[11px] text-[#e2e8f0] mb-0.5">Alergi (ID)</label><textarea value={cv.alergi_id} onInput={(e) => updateCv('alergi_id', (e.target as HTMLTextAreaElement).value)} rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] outline-none resize-none" readonly /></div>
                    <div><label class="block text-[11px] text-[#e2e8f0] mb-0.5">Alergi (JP)</label><textarea value={cv.alergi_jp} onInput={(e) => updateCv('alergi_jp', (e.target as HTMLTextAreaElement).value)} rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] text-pink-300 font-bold outline-none resize-none" readonly /></div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-[11px] text-[#e2e8f0] mb-0.5">Penyakit (ID)</label><textarea value={cv.medis_id} onInput={(e) => updateCv('medis_id', (e.target as HTMLTextAreaElement).value)} rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] outline-none resize-none" readonly /></div>
                    <div><label class="block text-[11px] text-[#e2e8f0] mb-0.5">Penyakit (JP)</label><textarea value={cv.medis_jp} onInput={(e) => updateCv('medis_jp', (e.target as HTMLTextAreaElement).value)} rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] text-pink-300 font-bold outline-none resize-none" readonly /></div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-[11px] text-[#e2e8f0] mb-0.5">Kecelakaan (ID)</label><textarea value={cv.laka_id} onInput={(e) => updateCv('laka_id', (e.target as HTMLTextAreaElement).value)} rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] outline-none resize-none" readonly /></div>
                    <div><label class="block text-[11px] text-[#e2e8f0] mb-0.5">Kecelakaan (JP)</label><textarea value={cv.laka_jp} onInput={(e) => updateCv('laka_jp', (e.target as HTMLTextAreaElement).value)} rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] text-pink-300 font-bold outline-none resize-none" readonly /></div>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* Section 4: Jiko PR & Wawancara */}
          <Section title="4. Jiko PR & Wawancara (Auto-Translate)" icon="fa-comments" color="purple" borderLeft>
            <div class="mb-2"><Field label="Pernah ke Jepang sebelumnya?" id="riwayatjepang" value={cv.riwayatjepang} readonly span={1} /></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="space-y-2">
                <TextAreaPair label="Promosi Diri / Perkenalan" idId="promo_id" idJp="promo_jp" />
                <TextAreaPair label="Kelebihan / 長所" idId="lebih_id" idJp="lebih_jp" />
                <TextAreaPair label="Kekurangan / 短所" idId="kurang_id" idJp="kurang_jp" />
                <TextAreaPair label="Hobi" idId="hobi_id" idJp="hobi_jp" />
                <TextAreaPair label="Keahlian Khusus" idId="keahlian_id" idJp="keahlian_jp" />
              </div>
              <div class="space-y-2">
                <TextAreaPair label="Motivasi ke Jepang" idId="moti_id" idJp="moti_jp" />
                <TextAreaPair label="Alasan Memilih Bidang Ini" idId="alasan_id" idJp="alasan_jp" />
                <TextAreaPair label="Rencana Setelah Pulang ke ID" idId="pulang_id" idJp="pulang_jp" />
                <TextAreaPair label="Keinginan Pribadi (Target)" idId="keinginan_id" idJp="keinginan_jp" />
                <TextAreaPair label="Tujuan Kerja di Jepang" idId="tujuan_id" idJp="tujuan_jp" />
                <div class="grid grid-cols-3 gap-2">
                  <Field label="Lama di Jepang" id="lama" value={cv.lama} center readonly />
                  <Field label="Gaji (Yen)" id="gaji_yen" value={cv.gaji_yen} center readonly jp />
                  <Field label="Tabungan" id="tabungan" value={cv.tabungan} center readonly jp />
                </div>
              </div>
            </div>
          </Section>

          {/* Section 5: Pendidikan + Pekerjaan + Keluarga */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Section title="Pendidikan" icon="fa-graduation-cap" color="emerald">
              <div class="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-800/50 rounded border border-slate-700 mb-2">
                <Field label="Bahasa Jepang" id="bhs_jepang" value={cv.bhs_jepang} readonly />
                <Field label="Nilai" id="nilai" value={cv.nilai} readonly />
                <Field label="Lisensi / SSW" id="lisensi" value={cv.lisensi} readonly />
              </div>
              <div class="text-[9px] text-slate-500 italic py-1">Data dinamis dari AI</div>
            </Section>
            <Section title="Pekerjaan" icon="fa-briefcase" color="blue">
              <div class="text-[9px] text-slate-500 italic py-1">Data dinamis dari AI</div>
            </Section>
            <Section title="Keluarga (KK)" icon="fa-users" color="orange">
              <div class="text-[9px] text-slate-500 italic py-1">Data dinamis dari AI</div>
            </Section>
          </div>

          {/* Section 6: Kenalan di Jepang */}
          <Section title="Kenalan di Jepang (Bilingual)" icon="fa-user-friends" color="pink">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Field label="Nama (ID)" id="kenalan_nama_id" value={cv.kenalan_nama_id} readonly />
              <Field label="Nama (Katakana)" id="kenalan_nama_jp" value={cv.kenalan_nama_jp} jp readonly />
              <Field label="Hubungan (ID)" id="kenalan_hub_id" value={cv.kenalan_hub_id} readonly />
              <Field label="Hubungan (JP)" id="kenalan_hub_jp" value={cv.kenalan_hub_jp} jp readonly />
              <Field label="Pekerjaan (ID)" id="kenalan_kerja_id" value={cv.kenalan_kerja_id} readonly />
              <Field label="Pekerjaan (JP)" id="kenalan_kerja_jp" value={cv.kenalan_kerja_jp} jp readonly />
              <Field label="Usia" id="kenalan_usia" value={cv.kenalan_usia} readonly />
              <div class="col-span-2 md:col-span-4 mt-1 grid grid-cols-2 gap-2">
                <Field label="Alamat di Jepang (ID/Romaji)" id="kenalan_alamat_id" value={cv.kenalan_alamat_id} readonly />
                <Field label="Alamat di Jepang (JP)" id="kenalan_alamat_jp" value={cv.kenalan_alamat_jp} jp readonly />
              </div>
            </div>
          </Section>

          {/* Section 7: Upload Documents */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <UploadRow type="foto" label="Upload Pas Foto" icon="fa-camera" bg="bg-sky-600" accept="image/*" />
            <UploadRow type="jft" label="Sertifikat JFT" icon="fa-file-pdf" bg="bg-amber-600" accept=".pdf" />
            <UploadRow type="ssw" label="Sertifikat SSW" icon="fa-file-signature" bg="bg-emerald-600" accept=".pdf" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UploadRow type="ktp" label="KTP (PDF/JPG/PNG)" icon="fa-id-card" bg="bg-rose-600" accept=".pdf,image/*" />
            <UploadRow type="kk" label="KK (PDF/JPG/PNG)" icon="fa-users" bg="bg-orange-600" accept=".pdf,image/*" />
            <UploadRow type="ijazahSd" label="IJAZAH SD (PDF)" icon="fa-graduation-cap" bg="bg-violet-600" accept=".pdf" />
            <UploadRow type="ijazahSmp" label="IJAZAH SMP (PDF)" icon="fa-graduation-cap" bg="bg-sky-600" accept=".pdf" />
            <UploadRow type="ijazahSma" label="IJAZAH SMA (PDF)" icon="fa-graduation-cap" bg="bg-teal-600" accept=".pdf" />
            <UploadRow type="univ" label="IJAZAH UNIVERSITAS (PDF)" icon="fa-university" bg="bg-indigo-600" accept=".pdf" />
          </div>

        </div>
      </main>
    </div>
  );
}

/* === Sub-components === */

function Section({ title, icon, color, borderLeft, children }: {
  title: string; icon: string; color: string; borderLeft?: boolean; children: any;
}) {
  return (
    <div class={`bg-slate-900/40 border border-slate-800 rounded-lg p-3 mb-3 shadow ${borderLeft ? 'border-l-2 border-l-purple-500' : ''}`}>
      <h2 class={`text-[13px] font-bold uppercase tracking-wide mb-2 border-b border-slate-800/50 pb-1 text-${color}-400`}>
        <i class={`fas ${icon} mr-1`}></i> {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, id, value, readonly, center, jp, span, spanMd }: {
  label: string; id: string; value: string; readonly?: boolean; center?: boolean;
  jp?: boolean; span?: number; spanMd?: number;
}) {
  const spanClass = span === 3 ? 'col-span-3' : span === 2 ? 'col-span-2' : '';
  const mdSpanClass = spanMd === 3 ? 'md:col-span-3' : spanMd === 2 ? 'md:col-span-2' : '';
  return (
    <div class={`${spanClass} ${mdSpanClass}`}>
      <label class="block text-[11px] text-[#e2e8f0] mb-0.5">{label}</label>
      <input type="text" value={value} readonly={readonly}
        class={`w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] outline-none ${center ? 'text-center' : ''} ${jp ? 'text-pink-300 font-bold' : 'text-white'}`} />
    </div>
  );
}

function TextAreaPair({ label, idId, idJp }: { label: string; idId: string; idJp: string }) {
  const cv = {} as CvData;
  return (
    <div>
      <label class="block text-[11px] text-[#e2e8f0] mb-0.5">{label}</label>
      <div class="grid grid-cols-2 gap-2">
        <textarea value="" rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] outline-none resize-none" readonly placeholder="ID..." />
        <textarea value="" rows={1} class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] text-purple-300 font-bold outline-none resize-none" readonly placeholder="JP..." />
      </div>
    </div>
  );
}

function UploadRow({ type, label, icon, bg, accept }: {
  type: string; label: string; icon: string; bg: string; accept: string;
}) {
  return (
    <div class="bg-slate-900/60 border border-slate-700 p-3 rounded-lg shadow flex items-center gap-3">
      <div class={`w-10 h-10 rounded ${bg} flex items-center justify-center text-white text-lg flex-shrink-0`}>
        <i class={`fas ${icon}`}></i>
      </div>
      <div class="flex-1 overflow-hidden">
        <label class="block text-xs font-bold text-white mb-0.5">{label}</label>
        <input type="file" accept={accept}
          class="w-full text-[9px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-white cursor-pointer" />
      </div>
    </div>
  );
}
