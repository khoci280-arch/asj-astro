import { useState, useEffect } from 'preact/hooks';
import Icon from '../ui/Icon';
import { useOverlay } from '../ui/useOverlay';
import { getEndpoint } from '../../lib/apiEndpoint';
import { authStore } from '../../store/authReactive';
import { showToast } from '../Toast';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface Props {
  candidate: {
    wa: string;
    nama: string;
    gender?: string;
    usia?: string;
    tmplahir?: string;
    tgllahir?: string;
    fisik?: string;
    pendidikan?: string;
    jft?: string;
    ssw?: string;
    tahapan?: string;
    status?: string;
    isVIP?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

const GENDER_OPTIONS = ['', 'LAKI-LAKI', 'PEREMPUAN'];
const PENDIDIKAN_OPTIONS = ['', 'SD', 'SMP', 'SMA', 'SMK', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3'];
const TAHAPAN_OPTIONS = ['', 'Baru', 'Pendaftaran', 'LIST', 'MCU PARPOR', 'Wawancara', 'LULUS'];
const STATUS_OPTIONS = ['', 'Aktif', 'LULUS', 'GAGAL', 'Non-Aktif'];

export default function EditCandidateModal({ candidate, isOpen, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    gender: candidate.gender || '',
    usia: candidate.usia || '',
    tempatLahir: candidate.tmplahir || '',
    tglLahir: candidate.tgllahir || '',
    tb: candidate.fisik || '',
    pendidikan: candidate.pendidikan || '',
    jftText: candidate.jft || '',
    sswText: candidate.ssw || '',
    tahapan: candidate.tahapan || '',
    status: candidate.status || '',
  });
  const { containerRef, onBackdropClick } = useOverlay({ open: isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      setForm({
        gender: candidate.gender || '',
        usia: candidate.usia || '',
        tempatLahir: candidate.tmplahir || '',
        tglLahir: candidate.tgllahir || '',
        tb: candidate.fisik || '',
        pendidikan: candidate.pendidikan || '',
        jftText: candidate.jft || '',
        sswText: candidate.ssw || '',
        tahapan: candidate.tahapan || '',
        status: candidate.status || '',
      });
    }
  }, [isOpen, candidate]);

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const sessionToken = authStore.get().sessionToken || '';
    try {
      const res = await fetch(getEndpoint('updateKandidatSuper'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateKandidatSuper',
          args: [{
            wa: candidate.wa,
            gender: form.gender,
            usia: form.usia,
            tempatLahir: form.tempatLahir,
            tglLahir: form.tglLahir,
            tb: form.tb,
            jftText: form.jftText,
            sswText: form.sswText,
            tahapan: form.tahapan,
            status: form.status,
          }],
          sessionToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Data kandidat berhasil disimpan!', 'success');
        onClose();
      } else {
        showToast(data.error || 'Gagal menyimpan data.', 'error');
      }
    } catch (e) {
      showToast('Network error: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onBackdropClick}>
      <div ref={containerRef} class="glass-panel p-6 rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} class="absolute top-4 right-5 text-slate-400 hover:text-white z-[100]">
          <Icon name="times" class="text-2xl" />
        </button>

        <h2 class="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Icon name="edit" class="text-sky-400" /> Edit Data Kandidat
        </h2>
        <p class="text-xs text-slate-400 mb-4">{candidate.nama} — {candidate.wa}</p>

        <div class="space-y-3">
          {/* Gender */}
          <div>
            <label class="text-[10px] text-slate-500 uppercase font-bold">Gender</label>
            <select value={form.gender} onChange={e => setField('gender', (e.target as HTMLSelectElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500">
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g || '- Pilih -'}</option>)}
            </select>
          </div>

          {/* Usia + TB */}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">Usia</label>
              <input type="number" value={form.usia} onInput={e => setField('usia', (e.target as HTMLInputElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500" />
            </div>
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">Tinggi Badan (cm)</label>
              <input type="number" value={form.tb} onInput={e => setField('tb', (e.target as HTMLInputElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500" />
            </div>
          </div>

          {/* Tempat Lahir + Tgl Lahir */}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">Tempat Lahir</label>
              <input type="text" value={form.tempatLahir} onInput={e => setField('tempatLahir', (e.target as HTMLInputElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500" />
            </div>
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">Tanggal Lahir</label>
              <input type="date" value={form.tglLahir} onInput={e => setField('tglLahir', (e.target as HTMLInputElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500" />
            </div>
          </div>

          {/* Pendidikan */}
          <div>
            <label class="text-[10px] text-slate-500 uppercase font-bold">Pendidikan</label>
            <select value={form.pendidikan} onChange={e => setField('pendidikan', (e.target as HTMLSelectElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500">
              {PENDIDIKAN_OPTIONS.map(p => <option key={p} value={p}>{p || '- Pilih -'}</option>)}
            </select>
          </div>

          {/* JFT + SSW */}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">JFT / JFJ</label>
              <input type="text" value={form.jftText} onInput={e => setField('jftText', (e.target as HTMLInputElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500" />
            </div>
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">SSW / Bidang</label>
              <input type="text" value={form.sswText} onInput={e => setField('sswText', (e.target as HTMLInputElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500" />
            </div>
          </div>

          {/* Tahapan + Status */}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">Tahapan</label>
              <select value={form.tahapan} onChange={e => setField('tahapan', (e.target as HTMLSelectElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500">
                {TAHAPAN_OPTIONS.map(t => <option key={t} value={t}>{t || '- Pilih -'}</option>)}
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-500 uppercase font-bold">Status</label>
              <select value={form.status} onChange={e => setField('status', (e.target as HTMLSelectElement).value)} class="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-sky-500">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || '- Pilih -'}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div class="flex gap-2 mt-5 pt-4 border-t border-slate-700/50">
          <button
            onClick={handleSave}
            disabled={saving}
            class="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
          >
            {saving ? <><Icon spin name="spinner" /> Menyimpan...</> : <><Icon name="save" /> Simpan</>}
          </button>
          <button onClick={onClose} class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
