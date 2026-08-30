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
import { useState } from 'preact/hooks';
import { t } from '../../store/i18n';
import TabKelola from './TabKelola.tsx';
import TabPelamar from './TabPelamar.tsx';
import TabMail from './TabMail.tsx';
import TabDbJob from './TabDbJob.tsx';
import TabTambah from './TabTambah.tsx';
import TabJadwal from './TabJadwal.tsx';
import TabWA from './TabWA.tsx';
import TabConfig from './TabConfig.tsx';

type Tab = 'kelola' | 'dbjob' | 'tambah' | 'pelamar' | 'jadwal' | 'mail' | 'wa' | 'config';

const TABS: { id: Tab; icon: string; label: string; color: string }[] = [
  { id: 'kelola',  icon: 'fa-globe',        label: t('admin.tab_public_job'),     color: 'text-red-400' },
  { id: 'dbjob',   icon: 'fa-server',        label: t('admin.tab_internal_db'),    color: 'text-purple-400' },
  { id: 'tambah',  icon: 'fa-plus',          label: t('admin.tab_add_job'),        color: 'text-red-400' },
  { id: 'pelamar', icon: 'fa-users',         label: t('admin.tab_candidate'),      color: 'text-sky-400' },
  { id: 'jadwal',  icon: 'fa-calendar-alt',  label: t('admin.tab_schedule'),       color: 'text-amber-400' },
  { id: 'mail',    icon: 'fa-envelope',      label: t('admin.tab_mail'),           color: 'text-sky-400' },
  { id: 'wa',      icon: 'fa-whatsapp',      label: t('ui.wa_pintar'),             color: 'text-emerald-400' },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('kelola');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div id="dash-agenda-list" class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[200px]">
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
          <div id="todo-list" class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[190px]"></div>
        </div>
      </div>

            {/* ============================================
          3. SIDEBAR TOGGLE (visible on all sizes)
          ============================================ */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} class="sticky top-2 z-[30] ml-1 mb-2 px-3 py-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all duration-200 border border-slate-700 hover:border-red-500 shadow-lg inline-flex items-center gap-1.5">
        <i class="fas fa-bars"></i> Menu
      </button>

      {/* ============================================
          4. SIDEBAR BACKDROP (mobile only)
          ============================================ */}
      {sidebarOpen && (
        <div class="fixed inset-0 bg-black/60 z-[95] transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Tutup sidebar"
        />
      )}

      {/* ============================================
          5. SIDEBAR (fixed left, always on desktop, slide-in on mobile)
          ============================================ */}
      <aside
        role="navigation"
        aria-label="Admin sidebar"
        class={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-700 p-3 flex flex-col gap-1 shadow-2xl z-[96] transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
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
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'kelola':  return <TabKelola />;
    case 'pelamar': return <TabPelamar />;
    case 'mail':    return <TabMail />;
    case 'jadwal':  return <TabJadwal />;
    case 'tambah':  return <TabTambah />;
    case 'dbjob':   return <TabDbJob />;
    case 'wa':      return <TabWA />;
    case 'config':  return <TabConfig />;
    default:        return <TabPlaceholder tab={tab} />;
  }
}

function TabPlaceholder({ tab }: { tab: string }) {
  return (
    <div class="text-center py-8">
      <i class="fas fa-tools text-3xl text-slate-600 mb-3"></i>
      <p class="text-slate-500">Tab "{tab}" sedang dalam migrasi.</p>
    </div>
  );
}
