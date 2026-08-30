/**
 * SiswaBaruForm.tsx - Pendaftaran Siswa Baru + AI Chat Jeklin
 * Source: legacy/siswa-baru.html (1:1 match)
 * Split panel: Chat AI (left) + Form Biodata Preview (right)
 */
import { useState, useRef, useEffect } from 'preact/hooks';
import { showToast } from '../../components/Toast';
import { authStore } from '../../store/authReactive';
import { apiClient } from '../../lib/apiClient';
import { validate, waSchema, emailSchema } from '../../lib/schemas';
import { t } from '../../store/i18n';

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
  time: string;
}

interface Biodata {
  nama: string; ttl: string; gender: string; agama: string;
  email: string; alamat: string; pendidikan: string;
  waSiswa: string; waOrtu: string;
}

const DRAFT_KEY = "asj_siswa_draft_v1";

const INIT: Biodata = {
  nama: '', ttl: '', gender: '', agama: '', email: '',
  alamat: '', pendidikan: '', waSiswa: '', waOrtu: ''
};

export default function SiswaBaruForm() {
  const [tab, setTab] = useState<'chat' | 'form'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [biodata, setBiodata] = useState<Biodata>(INIT);
  const [docs, setDocs] = useState<Record<string, File | null>>({});
  const [docStatus, setDocStatus] = useState<Record<string, string>>({});
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load draft from localStorage
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.savedAt && Date.now() - draft.savedAt > 86400000) {
          showToast('Draf lebih dari 24 jam. Data mungkin sudah tidak relevan.', 'warning');
        }
        if (draft.biodata) setBiodata(draft.biodata);
        if (draft.docs) {
          setDocStatus(draft.docStatus || {});
        }
        if (draft.messages && draft.messages.length > 0) {
          setMessages(draft.messages);
          return;
        }
      }
    } catch {}
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setMessages([{ role: 'assistant', text: t('siswa.greeting') + ' 👑', time: now }]);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);
  // Auto-save to localStorage every 30s + on change
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          biodata, messages, docStatus, savedAt: Date.now()
        }));
      } catch {}
    }, 30000);
    return () => clearInterval(timer);
  }, [biodata, messages, docStatus]);

  // Save before unload
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          biodata, messages, docStatus, savedAt: Date.now()
        }));
      } catch {}
    };
    window.addEventListener('beforeunload', save);
    return () => window.removeEventListener('beforeunload', save);
  }, [biodata, messages, docStatus]);


  /** Current time string for chat messages */
  const now = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages(prev => [...prev, { role: 'user', text, time: now() }]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/.netlify/functions/bridge-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processSiswaAIChat', payload: [{ message: text, history: messages.map(m => ({ role: m.role, content: m.text })), biodata }] })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply || '...', time: now() }]);
        if (data.biodata) setBiodata(prev => ({ ...prev, ...data.biodata }));
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Maaf, terjadi gangguan. Coba lagi.', time: now() }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error koneksi. Cek internet.', time: now() }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDocUpload = (e: Event, type: string) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setDocs(prev => ({ ...prev, [type]: file }));
    setDocStatus(prev => ({ ...prev, [type]: file.name }));
  };

  const handleSubmit = async () => {
    if (!biodata.nama) { showToast('Biodata kosong. Jawab pertanyaan Jeklin dulu.', 'error'); return; }
    if (biodata.waSiswa) { const vw = validate(waSchema, biodata.waSiswa); if (!vw.success) { showToast(vw.errors[0], 'error'); return; } }
    if (biodata.email) { const ve = validate(emailSchema, biodata.email); if (!ve.success) { showToast(ve.errors[0], 'error'); return; } }
    const formData = new FormData();
    formData.append('biodata', JSON.stringify(biodata));
    Object.entries(docs).forEach(([k, f]) => { if (f) formData.append(k, f); });
    try {
      const token = authStore.get().token;
      const res = await fetch('/.netlify/functions/ai-form-submit', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData
      });
      if (res.ok) { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
      showToast(res.ok ? t('siswa.success') : t('siswa.failed'), res.ok ? 'success' : 'error');
    } catch (e) { showToast(t('siswa.network_error') + ' ' + (e as Error).message, 'error'); }
  };

  const BIODATA_FIELDS = [
    { id: 'nama' as const, label: t('siswa.field_nama'), span: true },
    { id: 'ttl' as const, label: t('siswa.field_ttl') },
    { id: 'gender' as const, label: t('siswa.field_gender') },
    { id: 'agama' as const, label: t('siswa.field_agama') },
    { id: 'email' as const, label: t('siswa.field_email') },
    { id: 'alamat' as const, label: t('siswa.field_alamat'), span: true },
    { id: 'pendidikan' as const, label: t('siswa.field_pendidikan'), span: true },
    { id: 'waSiswa' as const, label: t('siswa.field_wa_siswa') },
    { id: 'waOrtu' as const, label: t('siswa.field_wa_ortu') }
  ];

  const DOC_FIELDS = [
    { type: 'ktp', label: t('siswa.field_ktp'), icon: 'fa-id-card', bg: 'bg-sky-600' },
    { type: 'kk', label: t('siswa.field_kk'), icon: 'fa-users', bg: 'bg-amber-600' },
    { type: 'ijazah', label: t('siswa.field_ijazah'), icon: 'fa-graduation-cap', bg: 'bg-emerald-600' }
  ];

  return (
    <div class="flex flex-col md:flex-row h-[calc(100dvh-42px)] w-full relative pt-[42px]">
      {/* Mobile Tab */}
      <div class="md:hidden flex w-full bg-slate-900 border-b border-slate-800 z-50">
        <button onClick={() => setTab('chat')} class={tab === 'chat' ? 'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500' : 'flex-1 py-3 text-xs font-bold text-slate-400'}>
          <i class="fas fa-crown mr-2"></i>Chat Jeklin
        </button>
        <button onClick={() => setTab('form')} class={tab === 'form' ? 'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500' : 'flex-1 py-3 text-xs font-bold text-slate-400'}>
          <i class="fas fa-file-alt mr-2"></i>Form Siswa
        </button>
      </div>

      {/* Chat Panel */}
      <div class={`${tab === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-[40%] h-full md:h-full bg-slate-900 border-r border-slate-800 flex-col z-20`}>
        <div class="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3 relative overflow-hidden">
          <div class="absolute -top-4 -right-4 w-16 h-16 bg-amber-500 rounded-full blur-2xl opacity-20"></div>
          <div class="w-10 h-10 rounded-full bg-amber-500 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex-shrink-0">
            <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png" alt="Qween Jeklin" class="w-full h-full rounded-full object-cover" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-amber-400">Qween Jeklin</h2>
            <p class="text-[10px] text-slate-400"><span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>Asisten Pendaftaran ASJ</p>
          </div>
        </div>
        <div ref={chatRef} class="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4">
          {messages.map((msg, i) => (
            <div key={i} class={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div class={`${msg.role === 'user' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-200'} rounded-xl px-4 py-2.5 max-w-[80%] shadow-lg`}>
                <p class="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <p class={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-amber-200' : 'text-slate-500'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div class="flex justify-start">
              <div class="bg-slate-800 rounded-xl px-4 py-2.5 shadow-lg">
                <div class="flex gap-1.5 items-center h-8"><div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce"></div><div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style="animation-delay:0.15s"></div><div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style="animation-delay:0.3s"></div></div>
              </div>
            </div>
          )}
        </div>
        <div class="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input ref={inputRef} type="text" value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            class="flex-1 bg-slate-800 text-xs text-white px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Ketik balasanmu di sini…" />
          <button onClick={handleSend} disabled={sending}
            class="bg-amber-600 hover:bg-amber-500 text-wh
ite px-4 py-2.5 rounded-xl transition shadow-[0_4px_10px_0_rgba(245,158,11,0.3)] disabled:opacity-50">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      {/* Form Panel */}
      <main class={`${tab === 'form' ? 'flex' : 'hidden'} md:flex w-full md:w-[60%] h-[calc(100vh-42px)] md:h-full overflow-y-auto bg-slate-950 p-4 md:p-8`}>
        <div class="max-w-3xl mx-auto pb-20 w-full">
          <div class="flex justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div class="flex items-center gap-3">
              <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png" alt="ASJ Logo" class="h-10 object-contain" />
              <div>
                <h1 class="text-sm md:text-lg font-black text-white">FORM SISWA BARU ASJ</h1>
                <p class="text-[10px] text-slate-400">Jawab pertanyaan Jeklin untuk mengisi form otomatis.</p>
              </div>
            </div>
            <button onClick={handleSubmit} class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2">
              <i class="fas fa-paper-plane"></i>SUBMIT DATA
            </button>
          </div>
          {sending && (
            <div class="text-[10px] text-amber-400 font-bold mb-4 bg-amber-900/20 p-2 rounded border border-amber-500/20 flex items-center">
              <i class="fas fa-magic fa-spin mr-2"></i>Jeklin sedang menganalisis datamu...
            </div>
          )}
          <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-5 mb-5">
            <h2 class="text-xs font-bold text-sky-400 mb-4 uppercase tracking-wider border-b border-slate-800 pb-2">
              <i class="fas fa-address-card mr-1"></i>Data Pribadi
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BIODATA_FIELDS.map(f => (
                <div key={f.id} class={f.span ? 'col-span-1 md:col-span-2' : ''}>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">{f.label}</label>
                  <input type="text" value={biodata[f.id]} onInput={(e) => setBiodata(prev => ({ ...prev, [f.id]: (e.target as HTMLInputElement).value }))}
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" />
                </div>
              ))}
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DOC_FIELDS.map(d => (
              <div key={d.type} class="bg-slate-900 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                <div class={`w-12 h-12 rounded-lg ${d.bg} flex items-center justify-center text-white text-xl flex-shrink-0`}>
                  <i class={`fas ${d.icon}`}></i>
                </div>
                <div class="flex-1 overflow-hidden">
                  <label class="block text-[10px] font-bold text-sky-400 mb-1">{d.label}</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e) => handleDocUpload(e, d.type)}
                    class="w-full text-[9px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-white cursor-pointer" />
                  {docStatus[d.type] && <div class="text-[9px] text-emerald-400 mt-1 font-bold truncate"><i class="fas fa-check mr-0.5"></i>{docStatus[d.type]}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
