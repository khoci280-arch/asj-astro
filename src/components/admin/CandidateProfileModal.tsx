/**
 * CandidateProfileModal.tsx — Full candidate profile view
 * Migrated from legacy bukaDigitalCV
 *
 * Shows: digital student card, CV progress, riwayat, documents, schedules, catatan
 */
import { useState, useEffect } from 'preact/hooks';
import Icon from '../ui/Icon';
import { useOverlay } from '../ui/useOverlay';
import { getEndpoint } from '../../lib/apiEndpoint';
import { authStore } from '../../store/authReactive';
import { t } from '../../store/i18n';

interface Props {
  wa: string;
  nama: string;
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTab = 'riwayat' | 'dokumen' | 'jadwal' | 'catatan';

interface CandidateData {
  nama: string;
  wa: string;
  gender?: string;
  usia?: string;
  jft?: string;
  tahapan?: string;
  status?: string;
  catatan?: string;
  applications?: Array<{
    code: string;
    tahapan: string;
    status: string;
    tanggal?: string;
  }>;
  schedules?: Array<{
    tanggal: string;
    jam: string;
    keterangan: string;
    status: string;
  }>;
  documents?: Array<{
    name: string;
    type: string;
    url?: string;
  }>;
}

export default function CandidateProfileModal({ wa, nama, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('riwayat');
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(false);

  const { containerRef, onBackdropClick } = useOverlay({ open: isOpen, onClose });

  useEffect(() => {
    if (!isOpen || !wa) return;
    setLoading(true);
    const sessionToken = authStore.get().sessionToken || '';
    fetch(getEndpoint('getAppData'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getAppData',
        args: ['kandidat', wa],
        sessionToken,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setData({
            nama: d.data.nama || nama,
            wa: d.data.wa || wa,
            gender: d.data.gender,
            usia: d.data.usia,
            jft: d.data.jft,
            tahapan: d.data.tahapan,
            status: d.data.status,
            catatan: d.data.catatan,
            applications: d.data.applications || [],
            schedules: d.data.schedules || [],
            documents: d.data.documents || [],
          });
        } else {
          setData({ nama, wa, applications: [], schedules: [], documents: [] });
        }
      })
      .catch(() => {
        setData({ nama, wa, applications: [], schedules: [], documents: [] });
      })
      .finally(() => setLoading(false));
  }, [isOpen, wa]);

  if (!isOpen) return null;

  const tabs: { id: ProfileTab; icon: string; label: string }[] = [
    { id: 'riwayat', icon: 'clock', label: 'Riwayat' },
    { id: 'dokumen', icon: 'file-alt', label: 'Dokumen' },
    { id: 'jadwal', icon: 'calendar-alt', label: 'Jadwal' },
    { id: 'catatan', icon: 'edit', label: 'Catatan' },
  ];

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onBackdropClick}>
      <div ref={containerRef} class="glass-panel p-6 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} class="absolute top-4 right-5 text-slate-400 hover:text-white z-[100]">
          <Icon name="times" class="text-2xl" />
        </button>

        {loading ? (
          <div class="text-center py-12">
            <Icon spin name="spinner" class="text-2xl text-sky-400" />
            <p class="text-slate-500 mt-2 text-sm">Memuat data kandidat...</p>
          </div>
        ) : (
          <>
            {/* Digital Student Card */}
            <div class="flex items-center gap-4 mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="w-16 h-16 rounded-full bg-sky-600/20 border-2 border-sky-500/40 flex items-center justify-center text-sky-400 text-xl font-bold">
                {(data?.nama || nama).charAt(0).toUpperCase()}
              </div>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">{data?.nama || nama}</h2>
                <p class="text-xs text-slate-400 font-mono">WA: {data?.wa || wa}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                  {data?.gender && (
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-600/50 text-slate-300 border border-slate-600">
                      {data.gender}
                    </span>
                  )}
                  {data?.usia && (
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-600/50 text-slate-300 border border-slate-600">
                      {data.usia} thn
                    </span>
                  )}
                  {data?.jft && (
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">
                      JFT: {data.jft}
                    </span>
                  )}
                  {data?.tahapan && (
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">
                      {data.tahapan}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div class="flex gap-1 mb-4 p-1 bg-slate-800/50 rounded-lg">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  class={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon name={tab.icon} class="mr-1" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div class="min-h-[200px]">
              {activeTab === 'riwayat' && (
                <div>
                  {(!data?.applications || data.applications.length === 0) ? (
                    <p class="text-slate-500 text-sm text-center py-8">Belum ada riwayat lamaran.</p>
                  ) : (
                    <div class="space-y-2">
                      {data.applications.map((app, i) => (
                        <div key={i} class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div>
                            <span class="font-mono text-sky-300 font-bold text-xs">{app.code}</span>
                            <span class="ml-2 text-white text-sm">{app.tahapan}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400">{app.tanggal || '-'}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">{app.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'dokumen' && (
                <div>
                  {(!data?.documents || data.documents.length === 0) ? (
                    <p class="text-slate-500 text-sm text-center py-8">Belum ada dokumen.</p>
                  ) : (
                    <div class="space-y-2">
                      {data.documents.map((doc, i) => (
                        <div key={i} class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div class="flex items-center gap-2">
                            <Icon name="file" class="text-sky-400" />
                            <span class="text-white text-sm">{doc.name}</span>
                          </div>
                          <span class="text-xs text-slate-400">{doc.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'jadwal' && (
                <div>
                  {(!data?.schedules || data.schedules.length === 0) ? (
                    <p class="text-slate-500 text-sm text-center py-8">Belum ada jadwal.</p>
                  ) : (
                    <div class="space-y-2">
                      {data.schedules.map((sched, i) => (
                        <div key={i} class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div>
                            <span class="text-white text-sm">{sched.keterangan}</span>
                            <span class="ml-2 text-xs text-slate-400">{sched.jam}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400">{sched.tanggal}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">{sched.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'catatan' && (
                <div>
                  <p class="text-slate-300 text-sm whitespace-pre-wrap">{data?.catatan || 'Belum ada catatan.'}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-700/50">
              <a
                href={`https://wa.me/${data?.wa || wa}`}
                target="_blank"
                rel="noopener noreferrer"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition"
              >
                <Icon name="whatsapp" class="mr-1" /> WhatsApp
              </a>
              <button onClick={onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition">
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
