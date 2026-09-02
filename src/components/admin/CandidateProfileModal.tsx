import { useState, useEffect } from 'preact/hooks';
import Icon from '../ui/Icon';
import { useOverlay } from '../ui/useOverlay';
import { getEndpoint } from '../../lib/apiEndpoint';
import { authStore } from '../../store/authReactive';
import { showToast } from '../Toast';

interface Props {
  wa: string;
  nama: string;
  isOpen: boolean;
  onClose: () => void;
}

interface CandidateData {
  nama: string;
  wa: string;
  idKandidat?: string;
  gender?: string;
  usia?: string;
  fisik?: string;
  pendidikan?: string;
  tmplahir?: string;
  tgllahir?: string;
  email?: string;
  alamat?: string;
  jft?: string;
  ssw?: string;
  tahapan?: string;
  status?: string;
  catatanInternal?: string;
  catatanExternal?: string;
  isVIP?: boolean;
  isSiswaASJ?: boolean;
  foto?: string;
  applications?: Array<{
    code: string;
    kategori?: string;
    status: string;
  }>;
  berkas?: Record<string, string>;
  bio?: Record<string, string>;
}

function mapApiToCandidate(c: Record<string, any>, fallbackNama: string, fallbackWa: string): CandidateData {
  return {
    nama: c.nama || fallbackNama,
    wa: c.wa || fallbackWa,
    idKandidat: c.idKandidat,
    gender: c.gender,
    usia: c.usia,
    fisik: c.fisik,
    pendidikan: c.pendidikan,
    tmplahir: c.bio?.tmplahir || c.tmplahir,
    tgllahir: c.bio?.tgllahir || c.tgllahir,
    email: c.bio?.email || c.email,
    alamat: c.bio?.alamat || c.alamat,
    jft: c.jft,
    ssw: c.ssw,
    tahapan: c.tahapan,
    status: c.status,
    catatanInternal: c.catatanInt || c.catatanInternal || '',
    catatanExternal: c.catatanExt || c.catatanExternal || '',
    isVIP: c.isVIP,
    isSiswaASJ: c.isSiswaASJ || false,
    foto: c.berkas?.foto || c.foto,
    applications: c.applications || [],
    berkas: c.berkas || {},
    bio: c.bio || {},
  };
}

export default function CandidateProfileModal({ wa, nama, isOpen, onClose }: Props) {
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [catatanInternal, setCatatanInternal] = useState('');
  const [catatanExternal, setCatatanExternal] = useState('');
  const [isVIP, setIsVIP] = useState(false);
  const { containerRef, onBackdropClick } = useOverlay({ open: isOpen, onClose });

  useEffect(() => {
    if (!isOpen || !wa) return;
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    const sessionToken = authStore.get().sessionToken || '';
    fetch(getEndpoint('getAppData'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getAppData',
        args: ['kandidat', wa],
        sessionToken,
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => {
        if (controller.signal.aborted) return;
        // Backend returns candidates array; kandidat mode has exactly one entry.
        const c = d.candidates?.[0] || d.data || {};
        setData(mapApiToCandidate(c, nama, wa));
        setCatatanInternal(c.catatanInt || c.catatanInternal || '');
        setCatatanExternal(c.catatanExt || c.catatanExternal || '');
        setIsVIP(!!c.isVIP || !!c.isSiswaASJ);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        setData({ nama, wa, applications: [] });
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isOpen, wa]);

  if (!isOpen) return null;

  const handleSaveCatatan = () => {
    // TODO: register updateCandidateNotes action in backend
    showToast('Fitur simpan catatan belum tersedia', 'info');
  };

  const handleDownloadBiodata = () => {
    if (!data) return;
    const lines = [
      `BIODATA KANDIDAT`,
      `================`,
      `Nama: ${data.nama}`,
      `WA: ${data.wa}`,
      `ID: ${data.idKandidat || '-'}`,
      `Gender: ${data.gender || '-'}`,
      `Usia: ${data.usia || '-'} Tahun`,
      `Tempat Lahir: ${data.tmplahir || '-'}`,
      `Tanggal Lahir: ${data.tgllahir || '-'}`,
      `Email: ${data.email || '-'}`,
      `Alamat: ${data.alamat || '-'}`,
      `JFT: ${data.jft || '-'}`,
      `SSW: ${data.ssw || '-'}`,
      `Fisik: ${data.fisik || '-'}`,
      `Pendidikan: ${data.pendidikan || '-'}`,
      `Tahapan: ${data.tahapan || '-'}`,
      `Status: ${data.status || '-'}`,
      `VIP: ${data.isVIP ? 'YA' : 'TIDAK'}`,
      ``,
      `BERKAS:`,
      ...Object.entries(data.berkas || {}).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`),
      ``,
      `BIODATA DETAIL:`,
      ...Object.entries(data.bio || {}).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biodata-${data.idKandidat || data.wa}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onBackdropClick}>
      <div ref={containerRef} class="glass-panel p-6 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} class="absolute top-4 right-5 text-slate-400 hover:text-white z-[100]">
          <Icon name="times" class="text-2xl" />
        </button>

        {loading || !data ? (
          <div class="text-center py-12">
            <Icon spin name="spinner" class="text-2xl text-sky-400" />
            <p class="text-slate-500 mt-2 text-sm">Memuat data kandidat...</p>
          </div>
        ) : (
          <>
            {/* 1. Digital Student Card */}
            <div class="flex items-start gap-4 mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="w-20 h-20 rounded-lg bg-sky-600/20 border-2 border-sky-500/40 flex items-center justify-center overflow-hidden shrink-0">
                {data.foto ? (
                  <img src={data.foto} alt={data.nama} class="w-full h-full object-cover" />
                ) : (
                  <span class="text-sky-400 text-2xl font-bold">{data.nama.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-lg font-bold text-white truncate">{data.nama}</h2>
                  {data.isSiswaASJ ? (
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Siswa ASJ</span>
                  ) : (
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/40">Eksternal</span>
                  )}
                </div>
                <p class="text-xs text-emerald-400 font-mono mt-1">📱 {data.wa}</p>
                {data.idKandidat && (
                  <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600/30 text-sky-300 border border-sky-500/40">{data.idKandidat}</span>
                )}
                {data.tahapan && (
                  <div class="mt-2">
                    <span class="text-[10px] text-slate-500 uppercase">Status Tahapan</span>
                    <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">{data.tahapan}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Biodata */}
            <div class="mb-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <h3 class="text-xs font-bold text-sky-400 mb-3 uppercase">Biodata</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-[10px] text-slate-500 uppercase">Gender</span>
                  <p class="text-white font-bold">{data.gender || '-'}</p>
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 uppercase">Usia</span>
                  <p class="text-white font-bold">{data.usia ? `${data.usia} Tahun` : '-'}</p>
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 uppercase">Fisik (Tinggi)</span>
                  <p class="text-white font-bold">{data.fisik || '-'}</p>
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 uppercase">Pendidikan</span>
                  <p class="text-white font-bold">{data.pendidikan || '-'}</p>
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 uppercase">Tempat, Tgl Lahir</span>
                  <p class="text-white font-bold">{data.tmplahir && data.tgllahir ? `${data.tmplahir}, ${data.tgllahir}` : data.tmplahir || data.tgllahir || '-'}</p>
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 uppercase">Email</span>
                  <p class="text-white font-bold">{data.email || '-'}</p>
                </div>
                <div class="col-span-2">
                  <span class="text-[10px] text-slate-500 uppercase">Alamat Asal</span>
                  <p class="text-white font-bold">{data.alamat || '-'}</p>
                </div>
              </div>
              <div class="flex gap-3 mt-3">
                <div class="flex-1 p-2 bg-sky-900/30 rounded-lg border border-sky-500/20 text-center">
                  <span class="text-[10px] text-sky-400 uppercase font-bold">JFT / JFJ</span>
                  <p class="text-white font-bold text-sm">{data.jft || '-'}</p>
                </div>
                <div class="flex-1 p-2 bg-emerald-900/30 rounded-lg border border-emerald-500/20 text-center">
                  <span class="text-[10px] text-emerald-400 uppercase font-bold">SSW / Bidang</span>
                  <p class="text-white font-bold text-sm">{data.ssw || '-'}</p>
                </div>
              </div>
            </div>

            {/* 3. Edit Data Cepat */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openCandidateEdit', { detail: data }));
              }}
              class="w-full mb-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <Icon name="edit" /> Edit Data Cepat
            </button>

            {/* 3b. Pemberkasan & Biodata */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openPemberkasan', { detail: { wa: data.wa, nama: data.nama } }));
              }}
              class="w-full mb-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <Icon name="folder-open" /> Lengkapi Pemberkasan & Biodata
            </button>

            {/* 4. Job Yang Dilamar */}
            <div class="mb-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <h3 class="text-xs font-bold text-sky-400 mb-3 uppercase">Job / Bidang Yang Dilamar</h3>
              {(!data.applications || data.applications.length === 0) ? (
                <p class="text-slate-500 text-sm">Belum ada lamaran.</p>
              ) : (
                <div class="flex flex-wrap gap-2">
                  {data.applications.map((app, i) => (
                    <div key={i} class="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700/50">
                      <Icon name="briefcase" class="text-sky-400 text-xs" />
                      <span class="text-white text-sm font-bold">{app.kategori || app.code}</span>
                      <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'LULUS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                        app.status === 'Aktif' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' :
                        'bg-slate-600/50 text-slate-300 border border-slate-600'
                      }`}>{app.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Download Full Biodata */}
            <button
              onClick={handleDownloadBiodata}
              class="w-full mb-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <Icon name="download" /> Download Full Biodata
            </button>

            {/* 6. Evaluasi Kandidat (VIP Toggle) */}
            <div class="mb-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <h3 class="text-xs font-bold text-sky-400 mb-3 uppercase">Evaluasi Kandidat (Admin)</h3>
              <button
                onClick={() => setIsVIP(!isVIP)}
                class={`w-full px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
                  isVIP
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {isVIP ? '✅ VIP (Rencana Resmi)' : '☐ Tandai VIP'}
              </button>
            </div>

            {/* 7. Catatan Internal & External */}
            <div class="mb-4 space-y-3">
              <div>
                <label class="text-xs font-bold text-red-400 uppercase mb-1 block">Catatan Internal (Private)</label>
                <textarea
                  value={catatanInternal}
                  onInput={(e) => setCatatanInternal((e.target as HTMLTextAreaElement).value)}
                  placeholder="Kelemahan/Catatan khusus admin..."
                  class="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500 transition resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label class="text-xs font-bold text-sky-400 uppercase mb-1 block">Catatan External (Kandidat)</label>
                <textarea
                  value={catatanExternal}
                  onInput={(e) => setCatatanExternal((e.target as HTMLTextAreaElement).value)}
                  placeholder="Feedback untuk kandidat..."
                  class="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500 transition resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* 8. Simpan + Footer */}
            <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-700/50">
              <button
                onClick={handleSaveCatatan}
                class="w-full px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
              >
                <Icon name="save" /> Simpan Evaluasi Catatan
              </button>
              <div class="flex gap-2">
                <a
                  href={`https://wa.me/${data.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  <Icon name="whatsapp" /> WhatsApp
                </a>
                <button onClick={onClose} class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition">
                  Tutup
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
