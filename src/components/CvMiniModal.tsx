/**
 * CvMiniModal.tsx - Compact CV preview/edit popup
 * Migrated from legacy/js/03_candidate.ts bukaModalCvMini()
 */
import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { authStore } from '../store/authReactive';
import { showToast } from './Toast';

interface Props { onClose: () => void; }

export default function CvMiniModal({ onClose }: Props) {
  const user = useStore(authStore);
  const [gender, setGender] = useState('LAKI-LAKI');
  const [usia, setUsia] = useState('');
  const [tb, setTb] = useState('');
  const [bb, setBb] = useState('');
  const [pendidikan, setPendidikan] = useState('');
  const [jftText, setJftText] = useState('');
  const [sswText, setSswText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoto = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) { setPhoto(file); setPhotoName(file.name); }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let photoBase64 = '';
      if (photo) {
        const reader = new FileReader();
        photoBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(photo);
        });
      }
      const payload = {
        wa: user.wa, nama: user.name, gender, usia, tb, bb,
        pendidikan, jft_text: jftText, ssw_text: sswText,
        photo: photoBase64
      };
      const res = await fetch('/.netlify/functions/bridge-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simpanUpdateMaster', args: [payload] })
      });
      const data = await res.json();
      if (data.success) {
        showToast('CV berhasil diperbarui!', 'success');
        onClose();
      } else {
        showToast(data.error || 'Gagal menyimpan', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + (e.message || 'Unknown'), 'error');
    } finally { setLoading(false); }
  };

  return (
    <div class="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 p-6 rounded-[2rem] w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-emerald-400"><i class="fas fa-user-edit mr-2"></i>Update CV</h3>
          <button onClick={onClose} class="text-slate-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1">Gender</label>
            <select value={gender} onChange={e => setGender((e.target as HTMLSelectElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none">
              <option value="LAKI-LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div><label class="block text-xs font-bold text-slate-400 mb-1">Usia</label><input type="number" value={usia} onInput={e => setUsia((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none" placeholder="25" /></div>
            <div><label class="block text-xs font-bold text-slate-400 mb-1">TB (cm)</label><input type="number" value={tb} onInput={e => setTb((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none" placeholder="170" /></div>
            <div><label class="block text-xs font-bold text-slate-400 mb-1">BB (kg)</label><input type="number" value={bb} onInput={e => setBb((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none" placeholder="65" /></div>
          </div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">Pendidikan</label><input type="text" value={pendidikan} onInput={e => setPendidikan((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none" placeholder="SMA/SMK" /></div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">JFT Score</label><input type="text" value={jftText} onInput={e => setJftText((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none" placeholder="A2/B1" /></div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">SSW Score</label><input type="text" value={sswText} onInput={e => setSswText((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none" placeholder="1/2 level" /></div>
          <div><label class="block text-xs font-bold text-slate-400 mb-1">Pas Photo</label><input type="file" accept="image/*" onChange={handlePhoto} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs file:font-bold" />{photoName && <p class="text-[10px] text-slate-500 mt-1">{photoName}</p>}</div>
        </div>
        <button onClick={handleSubmit} disabled={loading} class="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 transition">
          {loading ? 'Menyimpan...' : 'Simpan CV'}
        </button>
      </div>
    </div>
  );
}
