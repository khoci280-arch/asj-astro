/**
 * AdminPanel.tsx — Admin dashboard with fixed sidebar + tab routing
 * Source: legacy/index.html page-admin (lines 408-839)
 *
 * Layout:
 *   - Dashboard header (Agenda + Papan Tugas) — full width
 *   - Pengumuman Berjalan marquee — full width
 *   - Sidebar: fixed left (w-64) on desktop, slide-in drawer on mobile
 *   - Content area: pl-64 on desktop to offset sidebar
 */
import { useState, useEffect } from 'preact/hooks';
import { t } from '../../store/i18n';
// showToast dipakai di penangan error (lihat TODO di bawah) — tanpa impor ini
// kode melempar ReferenceError alih-alih menampilkan pesan gagal.
import { showToast } from '../Toast';
import TabKelola from './TabKelola.tsx';
import TabPelamar from './TabPelamar.tsx';

import TabDbJob from './TabDbJob.tsx';
import TabTambah from './TabTambah.tsx';
import TabMail from './TabMail.tsx';
import TabJadwal from './TabJadwal.tsx';
import TabWA from './TabWA.tsx';
import PemberkasanModal from "./PemberkasanModal";
import UndanganKelasModal from "./UndanganKelasModal";
import TabConfig from './TabConfig.tsx';
import AdminAiCopilot from "./AdminAiCopilot";

/**
 * Named constants — replace magic numbers
 */
const Z_INDEX = {
  MENU_BUTTON: 30,
  SIDEBAR_BACKDROP: 95,
  SIDEBAR: 96,
} as const;

const MAX_HEIGHT = {
  AGENDA_LIST: "200px",
  TODO_LIST: "190px",
} as const;

interface TabDef { id: Tab; icon: string; label: string; }

type Tab = 'kelola' | 'dbjob' | 'tambah' | 'pelamar' | 'jadwal' | 'mail' | 'wa' | 'config';

const TABS: TabDef[] = [
  { id: 'kelola',  icon: 'fa-globe',        label: t('admin.tab_public_job'),     },
  { id: 'dbjob',   icon: 'fa-server',        label: t('admin.tab_internal_db'),    },
  { id: 'tambah',  icon: 'fa-plus',          label: t('admin.tab_add_job'),        },
  { id: 'pelamar', icon: 'fa-users',         label: t('admin.tab_candidate'),      },
  { id: 'jadwal',  icon: 'fa-calendar-alt',  label: t('admin.tab_schedule'),       },
  { id: 'mail',    icon: 'fa-envelope',      label: t('admin.tab_mail'),           },
  { id: 'wa',      icon: 'fa-whatsapp',      label: t('ui.wa_pintar'),             },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'kelola' as Tab;
    var h = window.location.hash.replace('#', '');
    return (['kelola','dbjob','tambah','pelamar','jadwal','mail','wa','config'].includes(h) ? h : 'kelola') as Tab;
  });
  useEffect(() => {
    const handleOpenAiCopilot = (e: Event) => {
      setAiCopilotTarget((e as CustomEvent).detail);
      setShowAiCopilot(true);
    };
    const handleOpenEdit = (e: Event) => {
      // TODO: Open edit modal with e.detail.wa
      showToast('Edit kandidat: ' + (e as CustomEvent).detail.nama, 'info');
    };
    const handleShowHistory = (e: Event) => {
      // TODO: Open history modal with e.detail.wa
      showToast('Riwayat: ' + (e as any).detail.nama, 'info');
    };
    window.addEventListener('openAdminAiCopilot', handleOpenAiCopilot);
    const handleOpenUndangan = () => setShowUndanganKelas(true);
    window.addEventListener('openUndanganKelas', handleOpenUndangan);
    window.addEventListener('openCandidateEdit', handleOpenEdit);
    window.addEventListener('showCandidateHistory', handleShowHistory);
    return () => {
      window.removeEventListener('openAdminAiCopilot', handleOpenAiCopilot);
      window.removeEventListener('openUndanganKelas', handleOpenUndangan);
      window.removeEventListener('openCandidateEdit', handleOpenEdit);
      window.removeEventListener('showCandidateHistory', handleShowHistory);
    };
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Listen for bottom nav toggle
  useEffect(() => {
    const handler = () => setSidebarOpen(prev => !prev);
    window.addEventListener("asj-toggle-sidebar", handler);
    return () => window.removeEventListener("asj-toggle-sidebar", handler);
  }, []);
  const [showUndanganKelas, setShowUndanganKelas] = useState(false);
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [aiCopilotTarget, setAiCopilotTarget] = useState<{wa: string; nama: string} | null>(null);
  const [showPemberkasan, setShowPemberkasan] = useState(false);
  const [pemberkasanTarget, setPemberkasanTarget] = useState({ wa: "", nama: "" });

  return (
    <div class="space-y-6">
      {/* ============================================
          1. DASHBOARD: AGENDA & PAPAN TUGAS TIM
          ============================================ */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KIRI: AGENDA HARIAN */}
        <div class="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg flex flex-col h-full min-h-[300px]">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm font-bold text-white"><i class="fas fa-calendar-check text-amber-400 mr-2"></i> <span data-lang="ui.agenda_recent">{t('ui.agenda_recent')}</span></h3>
            <span class="text-xs bg-amber-900/40 text-amber-400 px-2 py-1 rounded-md font-bold" id="dash-admin-name">Admin</span>
          </div>
          <div id="dash-agenda-list" class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2" style={{ maxHeight: MAX_HEIGHT.AGENDA_LIST }}>
            <p class="text-xs text-slate-500">{t('ui.schedule_empty')}</p>
          </div>
          <button onClick={() => setActiveTab('jadwal')} class="mt-3 text-xs text-amber-400 font-bold hover:text-amber-300 hover:bg-black/50 w-full text-center py-2 bg-black/30 rounded-lg transition border border-slate-800">
            {t('ui.open_schedule')} <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </div>
        {/* KANAN: PAPAN TUGAS TIM */}
        <div class="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg flex flex-col h-full min-h-[300px]">
          <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-tasks text-pink-400 mr-2"></i> <span data-lang="admin.task_board">{t('admin.task_board')}</span></h3>
          <div class="flex gap-2 mb-3">
            <input type="text" id="todo-input" class="flex-1 bg-black p-2.5 rounded-lg text-sm text-white border border-slate-600 outline-none focus:border-pink-500 transition" placeholder={t('admin.task_placeholder')} aria-label={t('admin.task_placeholder')} />
            <button class="bg-red-600 hover:bg-red-500 px-5 rounded-lg text-sm text-white font-bold transition shadow-lg" aria-label={t('button.add')}><i class="fas fa-plus"></i></button>
          </div>
          <div id="todo-list" class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2" style={{ maxHeight: MAX_HEIGHT.TODO_LIST }}></div>
        </div>
      </div>

            {/* ============================================
          3. SIDEBAR TOGGLE (visible on all sizes)
          ============================================ */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ zIndex: String(Z_INDEX.MENU_BUTTON) }} class="sticky top-2 ml-1 mb-2 px-3 py-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all duration-200 border border-slate-700 hover:border-red-500 shadow-lg inline-flex items-center gap-1.5">
        <i class="fas fa-bars"></i> Menu
      </button>

      {/* ============================================
          4. SIDEBAR BACKDROP (mobile only)
          ============================================ */}
      {sidebarOpen && (
        <div style={{ zIndex: String(Z_INDEX.SIDEBAR_BACKDROP) }} class="fixed inset-0 bg-black/60 transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label={t("admin.close_sidebar")}
        />
      )}

      {/* ============================================
          5. SIDEBAR (fixed left, always on desktop, slide-in on mobile)
          ============================================ */}
      <aside
        role="navigation"
        id="admin-sidebar" aria-label="Admin sidebar"
        class={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-700 p-3 flex flex-col gap-1 shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
        style={{ zIndex: String(Z_INDEX.SIDEBAR) }}
        onClick={(e: Event) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between px-2 py-2 mb-2 border-b border-slate-700">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-widest"><i class="fas fa-th-large mr-1"></i> Menu</span>
          <button onClick={() => setSidebarOpen(false)} class="text-slate-400 hover:text-white p-1 transition lg:hidden" aria-label="Tutup menu"><i class="fas fa-times text-lg"></i></button>
        </div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
            class={`w-full px-3 py-2.5 rounded-lg text-sm font-bold transition text-left flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            aria-label={tab.label}
          >
            <i class={`fas ${tab.icon} w-5 text-center`}></i> <span>{tab.label}</span>
          </button>
        ))}
        <div class="flex-1"></div>
        <button onClick={() => setShowAiCopilot(true)} class="w-full px-3 py-2.5 rounded-lg text-sm font-bold transition text-left flex items-center gap-2 bg-violet-900/50 text-violet-400 hover:bg-violet-600 hover:text-white border border-violet-500/30" title="AI HR Copilot">
          <i class="fas fa-robot w-5 text-center"></i> <span>AI HR</span>
        </button>
        <button onClick={() => setActiveTab('config')} class={`w-full px-3 py-2.5 rounded-lg text-sm font-bold transition text-left flex items-center gap-2 mt-auto ${
          activeTab === 'config' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
        }`} aria-label={t('ui.settings')}>
          <i class="fas fa-cog w-5 text-center"></i> <span>{t('ui.settings')}</span>
        </button>
      </aside>

      {/* ============================================
          6. CONTENT AREA (offset by sidebar on desktop)
          ============================================ */}
      <div class="pl-0 lg:pl-64 min-w-0">
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-xl overflow-x-auto">
          <TabContent tab={activeTab} />
        </div>
      </div>

      {/* ── Global Modals ── */}
      {showPemberkasan && <PemberkasanModal isOpen={showPemberkasan} onClose={() => setShowPemberkasan(false)} waTarget={pemberkasanTarget.wa} namaTarget={pemberkasanTarget.nama} />}
      {showUndanganKelas && <UndanganKelasModal isOpen={showUndanganKelas} onClose={() => setShowUndanganKelas(false)} />}
      {showAiCopilot && <AdminAiCopilot candidateWa={aiCopilotTarget?.wa} candidateId={aiCopilotTarget?.nama} onClose={() => { setShowAiCopilot(false); setAiCopilotTarget(null); }} />}
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  if (tab === "kelola")  return <TabKelola />;
  if (tab === "pelamar") return <TabPelamar />;
  
  if (tab === "jadwal")  return <TabJadwal />;
  if (tab === "mail")    return <TabMail />;
  if (tab === "tambah")  return <TabTambah />;
  if (tab === "dbjob")   return <TabDbJob />;
  if (tab === "wa")      return <TabWA />;
  if (tab === "config")  return <TabConfig />;
  return <TabPlaceholder tab={tab} />;
}

function TabPlaceholder({ tab }: { tab: string }) {
  return (
    <div class="text-center py-8">
      <i class="fas fa-tools text-3xl text-slate-600 mb-3"></i>
      <p class="text-slate-500">Tab "{tab}" sedang dalam migrasi.</p>
    </div>
  );
}
