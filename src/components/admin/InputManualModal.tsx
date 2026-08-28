/**
 * InputManualModal.tsx — Modal form input kandidat manual
 * Source: legacy/assets/modals-shared.html → modal-input-manual
 */
import { useState } from 'preact/hooks';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
};

export default function InputManualModal({ open, onClose, onSave }: Props) {
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [loker, setLoker] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!nama.trim() || !wa.trim()) return;
    setSaving(true);
    try {
      const session = JSON.parse(localStorage.getItem('asj_admin_session') || '{}');
      const res = await fetch('/.netlify/functions/tambahKandidatManual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tambahKandidatManual',
          args: [{ nama: nama.trim(), wa: wa.trim(), idLoker: loker.trim() || 'UMUM' }, session.token],
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSave(data.kandidat);
        setNama(''); setWa(''); setLoker('');
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

  return (
    <div class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-sky-900/50 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div class="p-6">
          <h3 class="text-xl font-bold text-sky-400 mb-4 border-b border-sky-900/50 pb-3">
            <i class="fas fa-user-plus mr-2"></i> Input Kandidat Manual
          </h3>
          <form onSubmit={handleSubmit} class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">NAMA LENGKAP</label>
              <input type="text" value={nama} onInput={(e) => setNama((e.target as HTMLInputElement).value)}
                required class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">NO WHATSAPP</label>
              <input type="tel" value={wa} onInput={(e) => setWa((e.target as HTMLInputElement).value)}
                required placeholder="08..." class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">JOB DILAMAR (KODE)</label>
              <input type="text" value={loker} onInput={(e) => setLoker((e.target as HTMLInputElement).value)}
                placeholder="UMUM atau Ketik Kode" class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-sky-500 transition" />
            </div>
            <div class="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                class="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-lg transition text-sm disabled:opacity-50">
                {saving ? <><i class="fas fa-spinner fa-spin mr-1"></i> Menyimpan...</> : <><i class="fas fa-save mr-1"></i> Simpan</>}
              </button>
              <button type="button" onClick={onClose}
                class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold shadow-lg transition text-sm">
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
