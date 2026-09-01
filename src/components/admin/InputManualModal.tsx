/**
 * InputManualModal.tsx — Modal form input kandidat manual
 * Source: legacy/assets/modals-shared.html → modal-input-manual
 * Matched 1:1 with legacy screenshot
 */
import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { inputModalOpen, closeInputModal, addKandidat } from '../../store/adminStore';
// t() dipakai di baris ~146 tetapi tidak diimpor → ReferenceError saat render.
import { t } from '../../store/i18n';
import Icon from '../ui/Icon';
import { useOverlay } from '../ui/useOverlay';

// Props: no longer needed — reads from store directly
// Kept minimal for backward compat

const EXTRA_DOC_TYPES = [
  { value: 'PAS PHOTO', label: 'PAS PHOTO' },
  { value: 'CV', label: 'CV' },
  { value: 'JFT', label: 'JFT (Sertifikat Bahasa Jepang)' },
  { value: 'SSW', label: 'SSW (Sertifikat SSW)' },
  { value: 'KTP', label: 'KTP' },
  { value: 'KK', label: 'KK (Kartu Keluarga)' },
  { value: 'AKTE', label: 'AKTE KELAHIRAN' },
  { value: 'IJAZAH SD', label: 'IJAZAH SD' },
  { value: 'IJAZAH SMP', label: 'IJAZAH SMP' },
  { value: 'IJAZAH SMA', label: 'IJAZAH SMA' },
  { value: 'UNIVERSITAS', label: 'IJAZAH UNIVERSITAS' },
  { value: 'SIM', label: 'SIM (Surat Izin Mengemudi)' },
  { value: 'PASPORT', label: 'PASPORT' },
  { value: 'MCU', label: 'MCU (Medical Check Up)' },
  { value: 'EKTLN', label: 'EKTLN (Kartu Tenaga Kerja)' },
  { value: 'KONTRAK KERJA', label: 'KONTRAK KERJA' },
  { value: 'SERTIFIKAT JAPAN', label: 'SERTIFIKAT JAPAN' },
  { value: 'SURAT IJIN ORTU', label: 'SURAT IJIN ORTU' },
  { value: 'PERNYATAAN CPMI', label: 'PERNYATAAN CPMI' },
  { value: 'STATUS PERKAWINAN', label: 'STATUS PERKAWINAN' },
  { value: 'SURAT SEHAT', label: 'SURAT SEHAT PUSKESMAS' },
  { value: 'BPJS', label: 'BPJS KETENAGAKERJAAN' },
  { value: 'PSIKOTES', label: 'HASIL PSIKOTES' },
  { value: 'LAINNYA', label: 'LAINNYA' },
];

export default function InputManualModal() {
  const open = useStore(inputModalOpen);
  const onClose = closeInputModal;
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [loker, setLoker] = useState('');
  const [gender, setGender] = useState('');
  const [usia, setUsia] = useState('');
  const [tinggi, setTinggi] = useState('');
  const [berat, setBerat] = useState('');
  const [pendidikan, setPendidikan] = useState('');
  const [saving, setSaving] = useState(false);

  // File states
  const [photo, setPhoto] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [jft, setJft] = useState<File | null>(null);
  const [ssw, setSsw] = useState<File | null>(null);
  const [extraDocs, setExtraDocs] = useState<{ type: string; file: File | null }[]>([
    { type: 'PAS PHOTO', file: null }
  ]);

  if (!open) return null;

  function addExtraDoc() {
    setExtraDocs([...extraDocs, { type: 'PAS PHOTO', file: null }]);
  }

  function removeExtraDoc(i: number) {
    if (extraDocs.length <= 1) return; // keep at least 1 row
    setExtraDocs(extraDocs.filter((_, idx) => idx !== i));
  }

  function updateExtraDocType(i: number, type: string) {
    const updated = [...extraDocs];
    updated[i] = { ...updated[i], type };
    setExtraDocs(updated);
  }

  function updateExtraDocFile(i: number, file: File | null) {
    const updated = [...extraDocs];
    updated[i] = { ...updated[i], file };
    setExtraDocs(updated);
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!nama.trim() || !wa.trim()) return;
    setSaving(true);
    try {
      const session = JSON.parse(localStorage.getItem('asj_admin_session') || '{}');
      const formData = new FormData();
      formData.append('nama', nama.trim());
      formData.append('wa', wa.trim());
      formData.append('idLoker', loker.trim() || 'UMUM');
      formData.append('gender', gender);
      formData.append('usia', usia);
      formData.append('tinggi', tinggi);
      formData.append('berat', berat);
      formData.append('pendidikan', pendidikan);
      if (photo) formData.append('photo', photo);
      if (cv) formData.append('cv', cv);
      if (jft) formData.append('jft', jft);
      if (ssw) formData.append('ssw', ssw);
      extraDocs.forEach((d, i) => {
        if (d.file) {
          formData.append(`extra_${i}_type`, d.type);
          formData.append(`extra_${i}_file`, d.file);
        }
      });
      formData.append('token', session.token || '');

      const res = await fetch('/.netlify/functions/candidates', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        addKandidat(data.kandidat);
        setNama(''); setWa(''); setLoker(''); setGender(''); setUsia('');
        setTinggi(''); setBerat(''); setPendidikan('');
        setPhoto(null); setCv(null); setJft(null); setSsw(null);
        setExtraDocs([{ type: 'PAS PHOTO', file: null }]);
        onClose();
      } else {
        alert(data.error || 'Gagal menyimpan kandidat.');
      }
    } catch (err) {
      alert('Network error: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const { containerRef, onBackdropClick } = useOverlay({ open: true, onClose });

  return (
    <div class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" ref={containerRef} onClick={onBackdropClick}>
      <div class="bg-slate-900 border border-sky-900/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div class="p-6">
          <div class="flex justify-between items-center mb-4 border-b border-sky-900/50 pb-3">
            <h3 class="text-xl font-bold text-sky-400"><Icon name="user-plus" class="mr-2" /> Input Kandidat Manual</h3>
            <button onClick={onClose} class="text-slate-400 hover:text-white transition"><Icon name="times" class="text-2xl" /></button>
          </div>
          <form onSubmit={handleSubmit} class="space-y-4">
            {/* Search existing candidate */}
            <div class="bg-sky-900/20 p-3 rounded-xl border border-sky-500/30">
              <label class="block text-xs font-bold text-sky-400 mb-1">CARI KANDIDAT TERDAFTAR (Opsional)</label>
              <input type="text" placeholder={t("input.placeholder_auto")}
                class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" />
              <p class="text-[9px] text-slate-400 mt-1">Jika dipilih, dokumen lama kandidat akan dipertahankan.</p>
            </div>

            {/* Basic info */}
            <div><label class="block text-xs font-bold text-slate-400 mb-1">NAMA LENGKAP</label>
              <input type="text" value={nama} onInput={(e) => setNama((e.target as HTMLInputElement).value)}
                required class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" /></div>
            <div><label class="block text-xs font-bold text-slate-400 mb-1">NO WHATSAPP</label>
              <input type="tel" value={wa} onInput={(e) => setWa((e.target as HTMLInputElement).value)}
                required placeholder="08..." class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" /></div>
            <div><label class="block text-xs font-bold text-slate-400 mb-1">JOB DILAMAR (KODE)</label>
              <input type="text" value={loker} onInput={(e) => setLoker((e.target as HTMLInputElement).value)}
                placeholder="UMUM atau Ketik Kode" class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" /></div>

            {/* Physical data */}
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-xs font-bold text-slate-400 mb-1">Gender</label>
                <select value={gender} onChange={(e) => setGender((e.target as HTMLSelectElement).value)}
                  class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition">
                  <option value="">-</option><option value="LAKI-LAKI">LAKI-LAKI</option><option value="PEREMPUAN">PEREMPUAN</option>
                </select></div>
              <div><label class="block text-xs font-bold text-slate-400 mb-1">Usia</label>
                <input type="number" value={usia} onInput={(e) => setUsia((e.target as HTMLInputElement).value)}
                  min="15" max="60" class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" /></div>
              <div><label class="block text-xs font-bold text-slate-400 mb-1">Tinggi (CM)</label>
                <input type="number" value={tinggi} onInput={(e) => setTinggi((e.target as HTMLInputElement).value)}
                  min="100" max="250" class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" /></div>
              <div><label class="block text-xs font-bold text-slate-400 mb-1">Berat (KG)</label>
                <input type="number" value={berat} onInput={(e) => setBerat((e.target as HTMLInputElement).value)}
                  min="30" max="200" class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" /></div>
              <div class="col-span-2"><label class="block text-xs font-bold text-slate-400 mb-1">PENDIDIKAN</label>
                <select value={pendidikan} onChange={(e) => setPendidikan((e.target as HTMLSelectElement).value)}
                  class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition">
                  <option value="">-</option><option value="SMA">SMA</option><option value="SMK">SMK</option><option value="MA">MA</option><option value="D3">D3</option><option value="S1">S1</option>
                </select></div>
            </div>

            {/* File uploads */}
            <div class="p-4 bg-sky-900/20 border border-sky-500/30 rounded-xl space-y-3">
              <div><label class="block text-xs font-bold text-sky-400 mb-1">PAS PHOTO (JPG/PNG)</label>
                <input type="file" accept="image/*" onChange={(e) => setPhoto((e.target as HTMLInputElement).files?.[0] || null)}
                  class="w-full text-sm text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-700 file:text-white" />
                {photo && <span class="block mt-1 text-xs font-bold text-emerald-400">{photo.name}</span>}</div>
              <div><label class="block text-xs font-bold text-sky-400 mb-1">CV / RIREKISHO (PDF/Excel/Word)</label>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" onChange={(e) => setCv((e.target as HTMLInputElement).files?.[0] || null)}
                  class="w-full text-sm text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-700 file:text-white" />
                {cv && <span class="block mt-1 text-xs font-bold text-emerald-400">{cv.name}</span>}</div>
              <div><label class="block text-xs font-bold text-sky-400 mb-1">JFT (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => setJft((e.target as HTMLInputElement).files?.[0] || null)}
                  class="w-full text-sm text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-700 file:text-white" />
                {jft && <span class="block mt-1 text-xs font-bold text-emerald-400">{jft.name}</span>}</div>
              <div><label class="block text-xs font-bold text-sky-400 mb-1">SSW (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => setSsw((e.target as HTMLInputElement).files?.[0] || null)}
                  class="w-full text-sm text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-700 file:text-white" />
                {ssw && <span class="block mt-1 text-xs font-bold text-emerald-400">{ssw.name}</span>}</div>
            </div>

            {/* Extra docs — legacy layout with column headers + +/- buttons */}
            <div class="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl space-y-2">
              <label class="block text-xs font-bold text-emerald-400 mb-2"><Icon name="folder-plus" class="mr-1" /> UPLOAD DOKUMEN LAINNYA (Opsional)</label>
              <div class="flex gap-2 items-center text-[10px] font-bold text-slate-400 px-1">
                <span class="w-40">JENIS DOKUMEN</span>
                <span class="flex-1">FILE (PDF/Gambar)</span>
                <span class="w-8 text-center"></span>
              </div>
              {extraDocs.map((d, i) => (
                <div key={i} class="flex gap-2 items-center">
                  <select value={d.type} onChange={(e) => updateExtraDocType(i, (e.target as HTMLSelectElement).value)}
                    class="w-40 p-2 rounded-lg bg-black/60 border border-slate-700 text-white text-xs outline-none focus:border-sky-500 transition">
                    {EXTRA_DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div class="flex-1 flex items-center gap-2">
                    <label class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded cursor-pointer transition">
                      <Icon name="upload" class="text-[10px]" /> Choose File
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden"
                        onChange={(e) => updateExtraDocFile(i, (e.target as HTMLInputElement).files?.[0] || null)} />
                    </label>
                    <span class="text-[10px] text-slate-400 truncate">{d.file ? d.file.name : 'No file chosen'}</span>
                  </div>
                  <button type="button" onClick={() => removeExtraDoc(i)}
                    class="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded text-xs transition">
                    <Icon name="minus" />
                  </button>
                </div>
              ))}
              <div class="flex items-center gap-2 pt-1">
                <button type="button" onClick={addExtraDoc}
                  class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition">
                  <Icon name="plus" class="mr-1" /> Tambah
                </button>
                <button type="button" onClick={() => removeExtraDoc(extraDocs.length - 1)}
                  class="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition">
                  <Icon name="minus" class="mr-1" /> Hapus
                </button>
              </div>
            </div>

            <button type="submit" disabled={saving}
              class="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-lg transition mt-2 disabled:opacity-50">
              {saving ? <><Icon spin name="spinner" class="mr-1" /> Menyimpan...</> : <><Icon name="save" class="mr-1" /> Simpan & Upload</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
