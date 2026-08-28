/**
 * AdminPanel.tsx — Admin dashboard with sidebar + tab routing
 * Source: legacy/index.html page-admin (lines 448-839)
 * Preact island — interactive (sidebar + tab switching)
 */
import { useState } from 'preact/hooks';
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
  { id: 'kelola', icon: 'fa-globe', label: 'Loker Publik', color: 'text-red-400' },
  { id: 'dbjob', icon: 'fa-server', label: 'DB Job Internal', color: 'text-purple-400' },
  { id: 'tambah', icon: 'fa-plus', label: 'Tambah Job', color: 'text-red-400' },
  { id: 'pelamar', icon: 'fa-users', label: 'Data Pelamar', color: 'text-sky-400' },
  { id: 'jadwal', icon: 'fa-calendar-alt', label: 'Jadwal Agenda', color: 'text-amber-400' },
  { id: 'mail', icon: 'fa-envelope', label: 'Mail Inbox', color: 'text-sky-400' },
  { id: 'wa', icon: 'fa-whatsapp', label: 'WA Pintar', color: 'text-emerald-400' },
  { id: 'config', icon: 'fa-cog', label: 'Pengaturan', color: 'text-slate-300' },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('kelola');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div class="space-y-6">
      {/* Dashboard Header */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm font-bold text-white"><i class="fas fa-calendar-check text-amber-400 mr-2"></i> Agenda & Jadwal</h3>
            <span class="text-xs bg-amber-900/40 text-amber-400 px-2 py-1 rounded-md font-bold">Admin</span>
          </div>
          <p class="text-xs text-slate-500">Jadwal akan dimuat dari backend.</p>
        </div>
        <div class="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg">
          <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-tasks text-pink-400 mr-2"></i> Papan Tugas Tim</h3>
          <div class="flex gap-2">
            <input type="text" placeholder="Ketik tugas baru..." class="flex-1 bg-black p-2.5 rounded-lg text-sm text-white border border-slate-600 outline-none focus:border-pink-500 transition" />
            <button class="bg-red-600 hover:bg-red-500 px-5 rounded-lg text-sm text-white font-bold transition shadow-lg"><i class="fas fa-plus"></i></button>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} class="px-3 py-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all duration-200 border border-slate-700 hover:border-red-500 shadow-lg inline-flex items-center gap-1.5">
        <i class="fas fa-bars"></i> Menu
      </button>

      {/* Sidebar (mobile overlay) */}
      {sidebarOpen && (
        <div class="fixed inset-0 bg-black/60 z-[95]" onClick={() => setSidebarOpen(false)}>
          <aside class="fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-700 p-3 flex flex-col gap-1 shadow-2xl z-[96]" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between px-2 py-2 mb-2 border-b border-slate-700">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-widest"><i class="fas fa-th-large mr-1"></i> Menu</span>
              <button onClick={() => setSidebarOpen(false)} class="text-slate-400 hover:text-white p-1 transition"><i class="fas fa-times text-lg"></i></button>
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
              >
                <i class={`fas ${tab.icon} w-5 text-center`}></i> {tab.label}
              </button>
            ))}
          </aside>
        </div>
      )}

      {/* Tab Content */}
      <div class="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-xl">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'kelola':
      return <TabKelola />;
    case 'pelamar':
      return <TabPelamar />;
    case 'mail':
      return <TabMail />;
    case 'jadwal':
      return <TabJadwal />;
    case 'tambah':
      return <TabTambah />;
    case 'dbjob':
      return <TabDbJob />;
    case 'wa':
      return <TabWA />;
    case 'config':
      return <TabConfig />;
    default:
      return <TabPlaceholder tab={tab} />;
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
