/**
 * AiCvForm.tsx — AI CV Chat + Preview Form (ai_form.html)
 * Source: legacy/ai_form.html (1:1 match)
 * Split panel: Chat AI Jeklin (left 35%) + CV Preview Form (right 65%)
 */
import { useState, useRef, useEffect } from 'preact/hooks';
import { showToast } from '../Toast';
import { authStore } from '../../store/authReactive';
import { apiClient } from '../../lib/apiClient';
import { validate, waSchema } from '../../lib/schemas';
import { t } from '../../store/i18n';

// ChatMessage type imported from shared types

interface CvData {
  nama: string; katakana: string; panggilan: string; panggilan_katakana: string;
  tmplahir: string; tgllahir: string; umur: string; gender: string; agama: string;
  goldar: string; status: string; anak: string; email: string; alamat: string;
  hp: string; hpdarurat: string; ktp: string; paspor: string; sim: string;
  tb: string; bb: string; tangan: string; sepatu: string; baju: string; topi: string; tahan_ac: string;
  matakanan: string; matakiri: string; kacamata: string; butawarna: string; tato: string;
  rokok: string; alkohol: string;
  alergi_id: string; alergi_jp: string; medis_id: string; medis_jp: string; laka_id: string; laka_jp: string;
  riwayatjepang: string;
  promo_id: string; promo_jp: string; lebih_id: string; lebih_jp: string;
  kurang_id: string; kurang_jp: string; hobi_id: string; hobi_jp: string;
  keahlian_id: string; keahlian_jp: string; moti_id: string; moti_jp: string;
  alasan_id: string; alasan_jp: string; pulang_id: string; pulang_jp: string;
  keinginan_id: string; keinginan_jp: string; tujuan_id: string; tujuan_jp: string;
  lama: string; gaji_yen: string; tabungan: string;
  bhs_jepang: string; nilai: string; lisensi: string;
  kenalan_nama_id: string; kenalan_nama_jp: string; kenalan_hub_id: string; kenalan_hub_jp: string;
  kenalan_kerja_id: string; kenalan_kerja_jp: string; kenalan_usia: string;
  kenalan_alamat_id: string; kenalan_alamat_jp: string;
  [key: string]: string;
}

const CV_FIELDS = [
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
] as const;

const EMPTY_CV: CvData = Object.fromEntries(CV_FIELDS.map(k => [k, ''])) as CvData;

const SUGGESTIONS = [
  'Perkenalkan diriku',
  'Isi data pendidikan',
  'Terjemahkan semua kolom ke JP',
  'Lengkapi data keluarga',
  'Isi pengalaman kerja',
  'Lengkapi data wawancara',
];

const JEKLIN_IMG = 'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png';

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
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    setMessages([{ role: 'assistant',
      text: 'Halo! Saya Qween Jeklin, HRD ASJ. Saya akan membantu mengisi CV Jepangmu. Silakan ceritakan tentang dirimu!',
      time: now() }]);
    setShowSuggestions(true);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, sending]);

  /** Add assistant message to chat */
  const addBot = (text: string) => {
    setMessages(prev => [...prev, { role: 'assistant', text, time: now() }]);
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setMessages(prev => [...prev, { role: 'user', text: msg, time: now() }]);
    setInput('');
    setSending(true);
    setShowSuggestions(false);
    try {
      const trimmedHistory = messages.slice(-20).map(m => ({ role: m.role, content: m.text }));
      const res = await fetch('/.netlify/functions/bridge-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processAIChat', payload: [{ message: msg, history: trimmedHistory, cvData: cv }] })
      });
      if (res.ok) {
        const data = await res.json();
        addBot(data.reply || 'Jeklin bingung nih kak, coba tanya lagi ya!');
        if (data.cvData) {
          setCv(prev => ({ ...prev, ...data.cvData }));
          showToast(t('toast.saved'), 'success');
        }
        if (data.suggestions && data.suggestions.length > 0) {
          setTimeout(() => setShowSuggestions(true), 500) /* SUGGESTION_DELAY_MS */;
        }
      } else {
        addBot('Waduh sistem Jeklin lagi sibuk kak, coba beberapa saat lagi ya!');
      }
    } catch {
      addBot('Waduh Jeklin lagi sibuk nih, coba beberapa saat lagi ya!');
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
    if (cv.hp) { var vw = validate(waSchema, cv.hp); if (!vw.success) { showToast(vw.errors[0], 'error'); return; } }
    try {
      const token = authStore.get().token;
      const fd = new FormData();
      fd.append('cvData', JSON.stringify(cv));
      Object.entries(docs).forEach(([k, f]) => { if (f) fd.append(k, f); });
      const res = await fetch('/.netlify/functions/ai-form-submit', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd
      });
      if (res.ok) { showToast(t('toast.saved'), 'success'); }
      else { showToast('Gagal menyimpan.', 'error'); }
    } catch (e) { showToast('Error: ' + (e as Error).message, 'error'); }
  };

  const updateCv = (field: string, value: string) => setCv(prev => ({ ...prev, [field]: value }));

  return (
    <div class="flex flex-col md:flex-row h-[calc(100dvh-42px)] w-full relative pt-[42px]" style={{ height: '100dvh' }}>
      {/* Mobile Tab */}
      <div class="md:hidden flex w-full bg-slate-900 border-b border-slate-800 z-50">
        <button onClick={() => setTab('chat')} class={tab === 'chat' ? 'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500' : 'flex-1 py-3 text-xs font-bold text-slate-400'}>
          <i class="fas fa-crown mr-2"></i>{t('form.ai_cv_chat')}
        </button>
        <button onClick={() => setTab('form')} class={tab === 'form' ? 'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500' : 'flex-1 py-3 text-xs font-bold text-slate-400'}>
          <i class="fas fa-file-alt mr-2"></i>{t('form.preview_cv')}
        </button>
      </div>

      {/* Chat Panel */}
      <div class={`${tab === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-[35%] h-full md:h-full bg-slate-900 border-r border-slate-800 flex-col z-20`}>
        <div class="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3 relative overflow-hidden">
          <div class="absolute -top-4 -right-4 w-16 h-16 bg-amber-500 rounded-full blur-2xl opacity-20"></div>
          <div class="w-10 h-10 rounded-full bg-amber-500 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex-shrink-0">
            <img src={JEKLIN_IMG} alt="Qween Jeklin" class="w-full h-full rounded-full object-cover" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-amber-400">Qween Jeklin</h2>
            <p class="text-[10px] text-slate-400"><span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>HRD ASJ (Boss's Daughter)</p>
          </div>
        </div>

        <div ref={chatRef} class="flex-1 overflow-y-auto p-3 space-y-4 pb-24 md:pb-4">
          {messages.map((msg, i) => (
            <div key={i} class={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
              {msg.role === 'assistant' && (
                <img src={JEKLIN_IMG} alt="Jeklin" class="w-8 h-8 rounded-full object-cover shadow-sm border border-amber-400 flex-shrink-0 mt-1" />
              )}
              <div class={`${msg.role === 'user' ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-amber-500/20 rounded-tl-none'} rounded-2xl px-4 py-2.5 max-w-[80%] shadow-md`}>
                <p class="text-xs leading-relaxed whitespace-pre-wrap m-0" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }}></p>
                <p class={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-sky-200' : 'text-slate-500'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div class="flex items-start gap-3 fade-in">
              <img src={JEKLIN_IMG} alt="Jeklin" class="w-8 h-8 rounded-full object-cover shadow-sm border border-amber-400 flex-shrink-0" />
              <div class="bg-slate-800 p-3.5 rounded-2xl rounded-tl-none shadow-md border border-amber-500/20 flex gap-1.5 items-center h-10" style={{ width: 'fit-content' }}>
                <div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Pills */}
        {showSuggestions && !sending && (
          <div class="px-3 pb-2 flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)}
                class="whitespace-nowrap px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs rounded-full transition-colors font-medium border border-slate-700 flex-shrink-0 shadow-sm">
                {s}
              </button>
            ))}
          </div>
        )}

        <div class="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input ref={inputRef} type="text" value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            class="flex-1 bg-slate-800 text-xs text-white px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
            placeholder={t('form.placeholder_chat')} />
          <button onClick={() => handleSend()} disabled={sending}
            class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl transition shadow-[0_4px_10px_0_rgba(245,158,11,0.3)] disabled:opacity-50">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      {/* Form Panel */}
      <main class={`${tab === 'form' ? 'flex' : 'hidden'} md:flex w-full md:w-[65%] h-[calc(100vh-42px)] md:h-full overflow-y-auto bg-slate-950 p-3 md:p-6`}>
        <div class="max-w-5xl mx-auto pb-20 w-full">
          <div class="flex justify-between items-center mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div class="flex items-center gap-3">
              <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png" alt="ASJ" class="h-8 md:h-10 object-contain" />
              <div>
                <h1 class="text-sm md:text-base font-black text-white">PREVIEW CV JEPANG</h1>
                <p class="text-[10px] md:text-[11px] text-slate-400">{t('form.cv_edit_hint')}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button onClick={saveToDatabase} class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg flex items-center gap-2">
                <i class="fas fa-cloud-upload-alt"></i>{t('button.save_db')}
              </button>
              <button onClick={() => setFormLang(l => l === 'id' ? 'jp' : 'id')} class="bg-sky-600 hover:bg-sky-500 text-white text-[10px] md:text-xs font-bold px-3 py-2 rounded-lg transition shadow-lg">
                <i class="fas fa-language mr-1"></i>{formLang === 'id' ? 'JP' : 'ID'}
              </button>
            </div>
          </div>

          {sending && (
            <div class="text-[10px] text-amber-400 font-bold mb-3 bg-amber-900/20 p-2 rounded border border-amber-500/20 flex items-center">
              <i class="fas fa-magic fa-spin mr-2"></i>{t('form.ai_analyzing')}
            </div>
          )}

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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Section title="2. Fisik & Ukuran" icon="fa-child" color="amber">
              <div class="grid grid-cols-3 gap-2">
                <Field label="Tinggi (cm)" id="tb" value={cv.tb} center readonly />
                <Field label="Berat (kg)" id="bb" value={cv.bb} center readonly />
                <Field label="Tgn Dominan" id="tangan" value={cv.tangan} center readonly />
                <Field label="Uk. Sepatu" id="sepatu" value={cv.sepatu} center readonly />
                <Field label="Uk. Baju" id="baju" value={cv.baju} center readonly />
                <Field label="Uk. Topi" id="topi" value={cv.topi} center readonly />
                <div class="col-span-3"><Field label="Tanpa AC?" id="tahan_ac" value={cv.tahan_ac} readonly /></div>
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
              </div>
              <div class="col-span-4 space-y-1 mt-2 p-2 bg-slate-800/40 rounded border border-slate-700/50">
                <div class="grid grid-cols-2 gap-2">
                  <label class="block text-[11px] text-[#e2e8f0]">Alergi</label>
                  <div></div>
                </div>
                <TextAreaPair idId="alergi_id" idJp="alergi_jp" valueId={cv.alergi_id} valueJp={cv.alergi_jp} onChange={updateCv} />
                <div class="grid grid-cols-2 gap-2"><label class="block text-[11px] text-[#e2e8f0]">Penyakit</label><div></div></div>
                <TextAreaPair idId="medis_id" idJp="medis_jp" valueId={cv.medis_id} valueJp={cv.medis_jp} onChange={updateCv} />
                <div class="grid grid-cols-2 gap-2"><label class="block text-[11px] text-[#e2e8f0]">Kecelakaan</label><div></div></div>
                <TextAreaPair idId="laka_id" idJp="laka_jp" valueId={cv.laka_id} valueJp={cv.laka_jp} onChange={updateCv} />
              </div>
            </Section>
          </div>

          <Section title="4. Jiko PR & Wawancara" icon="fa-comments" color="purple" borderLeft>
            <div class="mb-2"><Field label="Pernah ke Jepang?" id="riwayatjepang" value={cv.riwayatjepang} readonly span={1} /></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="space-y-2">
                <TextAreaPair label="Promosi Diri" idId="promo_id" idJp="promo_jp" valueId={cv.promo_id} valueJp={cv.promo_jp} onChange={updateCv} />
                <TextAreaPair label="Kelebihan / 長所" idId="lebih_id" idJp="lebih_jp" valueId={cv.lebih_id} valueJp={cv.lebih_jp} onChange={updateCv} />
                <TextAreaPair label="Kekurangan / 短所" idId="kurang_id" idJp="kurang_jp" valueId={cv.kurang_id} valueJp={cv.kurang_jp} onChange={updateCv} />
                <TextAreaPair label="Hobi" idId="hobi_id" idJp="hobi_jp" valueId={cv.hobi_id} valueJp={cv.hobi_jp} onChange={updateCv} />
                <TextAreaPair label="Keahlian Khusus" idId="keahlian_id" idJp="keahlian_jp" valueId={cv.keahlian_id} valueJp={cv.keahlian_jp} onChange={updateCv} />
              </div>
              <div class="space-y-2">
                <TextAreaPair label="Motivasi ke Jepang" idId="moti_id" idJp="moti_jp" valueId={cv.moti_id} valueJp={cv.moti_jp} onChange={updateCv} />
                <TextAreaPair label="Alasan Memilih Bidang" idId="alasan_id" idJp="alasan_jp" valueId={cv.alasan_id} valueJp={cv.alasan_jp} onChange={updateCv} />
                <TextAreaPair label="Rencana Setelah Pulang" idId="pulang_id" idJp="pulang_jp" valueId={cv.pulang_id} valueJp={cv.pulang_jp} onChange={updateCv} />
                <TextAreaPair label="Target Pribadi" idId="keinginan_id" idJp="keinginan_jp" valueId={cv.keinginan_id} valueJp={cv.keinginan_jp} onChange={updateCv} />
                <TextAreaPair label="Tujuan Kerja di Jepang" idId="tujuan_id" idJp="tujuan_jp" valueId={cv.tujuan_id} valueJp={cv.tujuan_jp} onChange={updateCv} />
                <div class="grid grid-cols-3 gap-2">
                  <Field label="Lama di Jepang" id="lama" value={cv.lama} center readonly />
                  <Field label="Gaji (Yen)" id="gaji_yen" value={cv.gaji_yen} center readonly jp />
                  <Field label="Tabungan" id="tabungan" value={cv.tabungan} center readonly jp />
                </div>
              </div>
            </div>
          </Section>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Section title="Pendidikan" icon="fa-graduation-cap" color="emerald">
              <div class="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-800/50 rounded border border-slate-700 mb-2">
                <Field label="Bhs Jepang" id="bhs_jepang" value={cv.bhs_jepang} readonly />
                <Field label="Nilai" id="nilai" value={cv.nilai} readonly />
                <Field label="Lisensi/SSW" id="lisensi" value={cv.lisensi} readonly />
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

          <Section title="Kenalan di Jepang" icon="fa-user-friends" color="pink">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Field label="Nama (ID)" id="kenalan_nama_id" value={cv.kenalan_nama_id} readonly />
              <Field label="Nama (JP)" id="kenalan_nama_jp" value={cv.kenalan_nama_jp} jp readonly />
              <Field label="Hubungan (ID)" id="kenalan_hub_id" value={cv.kenalan_hub_id} readonly />
              <Field label="Hubungan (JP)" id="kenalan_hub_jp" value={cv.kenalan_hub_jp} jp readonly />
              <Field label="Pekerjaan (ID)" id="kenalan_kerja_id" value={cv.kenalan_kerja_id} readonly />
              <Field label="Pekerjaan (JP)" id="kenalan_kerja_jp" value={cv.kenalan_kerja_jp} jp readonly />
              <Field label="Usia" id="kenalan_usia" value={cv.kenalan_usia} readonly />
              <div class="col-span-2 md:col-span-4 mt-1 grid grid-cols-2 gap-2">
                <Field label="Alamat (ID)" id="kenalan_alamat_id" value={cv.kenalan_alamat_id} readonly />
                <Field label="Alamat (JP)" id="kenalan_alamat_jp" value={cv.kenalan_alamat_jp} jp readonly />
              </div>
            </div>
          </Section>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <UploadRow type="foto" label="Pas Foto" icon="fa-camera" bg="bg-sky-600" accept="image/*" status={docStatus['foto']} onUpload={handleDocUpload} />
            <UploadRow type="jft" label="Sertifikat JFT" icon="fa-file-pdf" bg="bg-amber-600" accept=".pdf" status={docStatus['jft']} onUpload={handleDocUpload} />
            <UploadRow type="ssw" label="Sertifikat SSW" icon="fa-file-signature" bg="bg-emerald-600" accept=".pdf" status={docStatus['ssw']} onUpload={handleDocUpload} />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UploadRow type="ktp" label="KTP" icon="fa-id-card" bg="bg-rose-600" accept=".pdf,image/*" status={docStatus['ktp']} onUpload={handleDocUpload} />
            <UploadRow type="kk" label="KK" icon="fa-users" bg="bg-orange-600" accept=".pdf,image/*" status={docStatus['kk']} onUpload={handleDocUpload} />
            <UploadRow type="ijazahSd" label="IJAZAH SD" icon="fa-graduation-cap" bg="bg-violet-600" accept=".pdf" status={docStatus['ijazahSd']} onUpload={handleDocUpload} />
            <UploadRow type="ijazahSmp" label="IJAZAH SMP" icon="fa-graduation-cap" bg="bg-sky-600" accept=".pdf" status={docStatus['ijazahSmp']} onUpload={handleDocUpload} />
            <UploadRow type="ijazahSma" label="IJAZAH SMA" icon="fa-graduation-cap" bg="bg-teal-600" accept=".pdf" status={docStatus['ijazahSma']} onUpload={handleDocUpload} />
            <UploadRow type="univ" label="IJAZAH UNIV" icon="fa-university" bg="bg-indigo-600" accept=".pdf" status={docStatus['univ']} onUpload={handleDocUpload} />
          </div>
        </div>
      </main>
    </div>
  );
}

/* === Sub-components === */

function Section({ title, icon, color, borderLeft, children }: {
  title: string; icon: string; color: string; borderLeft?: boolean; children: preact.ComponentChildren;
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

/** FIXED: TextAreaPair now reads from cv state + writes via onChange */
function TextAreaPair({ label, idId, idJp, valueId, valueJp, onChange }: {
  label?: string; idId: string; idJp: string; valueId: string; valueJp: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div>
      {label && <label class="block text-[11px] text-[#e2e8f0] mb-0.5">{label}</label>}
      <div class="grid grid-cols-2 gap-2">
        <textarea value={valueId} rows={2}
          onInput={(e) => onChange(idId, (e.target as HTMLTextAreaElement).value)}
          class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] text-white outline-none resize-none" placeholder="ID..." />
        <textarea value={valueJp} rows={2}
          onInput={(e) => onChange(idJp, (e.target as HTMLTextAreaElement).value)}
          class="w-full bg-slate-800 border border-slate-600 rounded p-1 text-[12px] text-purple-300 font-bold outline-none resize-none" placeholder="JP..." />
      </div>
    </div>
  );
}

function UploadRow({ type, label, icon, bg, accept, status, onUpload }: {
  type: string; label: string; icon: string; bg: string; accept: string; status?: string;
  onUpload?: (type: string, file: File | null) => void;
}) {
  return (
    <div class="bg-slate-900/60 border border-slate-700 p-3 rounded-lg shadow flex items-center gap-3">
      <div class={`w-10 h-10 rounded ${bg} flex items-center justify-center text-white text-lg flex-shrink-0`}>
        <i class={`fas ${icon}`}></i>
      </div>
      <div class="flex-1 overflow-hidden">
        <div class="flex items-center gap-2">
          <label class="block text-xs font-bold text-white mb-0.5">{label}</label>
          {status && <span class="text-[9px] text-emerald-400 font-medium"><i class="fas fa-check mr-0.5"></i>{status}</span>}
        </div>
        <input type="file" accept={accept}
          onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0] || null; onUpload?.(type, f); }}
          class="w-full text-[9px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-white cursor-pointer" />
      </div>
    </div>
  );
}
