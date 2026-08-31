/**
 * CekSiswaModal.tsx — Modal untuk menampilkan daftar siswa yang sudah daftar
 */
import { useState, useEffect } from 'preact/hooks';
import { t } from '../store/i18n';

interface Props {
  onClose: () => void;
}

interface Siswa {
  nama: string;
  wa: string;
  status: string;
  kelas?: string;
}

export default function CekSiswaModal({ onClose }: Props) {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiswa();
  }, []);

  async function fetchSiswa() {
    try {
      const res = await fetch('/.netlify/functions/get-app-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAppData', args: ['siswa'] }),
      });
      const data = await res.json();
      if (data.success && data.siswa) {
        setSiswa(data.siswa);
      }
    } catch (err) {
      console.error('[CekSiswaModal] Failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[260] flex items-center justify-center p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 class="text-lg font-bold text-white">
            <i class="fas fa-users text-emerald-400 mr-2"></i>
            {t('siswa.title') || 'Daftar Siswa Terdaftar'}
          </h3>
          <button onClick={onClose} class="text-slate-400 hover:text-white transition">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div class="text-center py-8">
              <i class="fas fa-spinner fa-spin text-2xl text-emerald-400"></i>
              <p class="text-slate-400 mt-2 text-sm">{t('ui.loading') || 'Memuat data...'}</p>
            </div>
          ) : siswa.length === 0 ? (
            <div class="text-center py-8">
              <i class="fas fa-inbox text-3xl text-slate-600 mb-3"></i>
              <p class="text-slate-400 text-sm">{t('ui.no_students') || 'Belum ada siswa yang mendaftar.'}</p>
            </div>
          ) : (
            <div class="space-y-3">
              {siswa.map((s, i) => (
                <div key={i} class="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-emerald-900/50 rounded-full flex items-center justify-center">
                      <i class="fas fa-user text-emerald-400"></i>
                    </div>
                    <div>
                      <p class="text-white font-bold text-sm">{s.nama}</p>
                      <p class="text-slate-400 text-xs">{s.wa}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    {s.kelas && <span class="px-2 py-0.5 bg-amber-900/40 text-amber-400 text-[10px] font-bold rounded">{s.kelas}</span>}
                    <span class={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      s.status === 'LULUS' ? 'bg-emerald-900/40 text-emerald-400' :
                      s.status === 'PENDING' ? 'bg-amber-900/40 text-amber-400' :
                      'bg-slate-700 text-slate-300'
                    }`}>{s.status || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
