/**
 * ChangePasswordModal.tsx - Password change dialog
 * Migrated from legacy/js/04_auth.ts bukaModalGantiPass()
 */
import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { authStore } from '../store/authReactive';
import { showToast } from './Toast';
import { validate, passwordSchema } from '../lib/schemas';
import { t } from '../store/i18n';

interface Props { onClose: () => void; }

export default function ChangePasswordModal({ onClose }: Props) {
  const user = useStore(authStore);
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!lama || !baru || !konfirmasi) { showToast('Isi semua field', 'error'); return; }
    if (baru !== konfirmasi) { showToast('Password baru tidak cocok', 'error'); return; }
    const v = validate(passwordSchema, baru);
    if (!v.success) { showToast(v.errors[0], 'error'); return; }
    if (!user.wa) { showToast('Sesi expired', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/bridge-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'gantiPasswordKandidat', args: [user.wa, lama, baru] })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Password berhasil diubah!', 'success');
        onClose();
      } else {
        showToast(data.error || 'Password lama salah', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + (e.message || 'Unknown'), 'error');
    } finally { setLoading(false); }
  };

  return (
    <div class="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-amber-400"><i class="fas fa-lock mr-2"></i>Ganti Password</h3>
          <button onClick={onClose} class="text-slate-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1">Password Lama</label>
            <input type="password" value={lama} onInput={e => setLama((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none focus:border-amber-500" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1">Password Baru</label>
            <input type="password" value={baru} onInput={e => setBaru((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none focus:border-amber-500" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1">Konfirmasi Password Baru</label>
            <input type="password" value={konfirmasi} onInput={e => setKonfirmasi((e.target as HTMLInputElement).value)} class="w-full p-3 rounded-xl bg-black/60 border border-slate-600 text-sm text-white outline-none focus:border-amber-500" />
          </div>
          <p class="text-[10px] text-slate-500">Minimal 6 karakter, tanpa spasi</p>
        </div>
        <button onClick={handleSubmit} disabled={loading} class="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 transition">
          {loading ? 'Memproses...' : 'Ganti Password'}
        </button>
      </div>
    </div>
  );
}
