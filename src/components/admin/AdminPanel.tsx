/**
 * AdminPanel.tsx — Admin dashboard with sidebar + tab routing
 * Source: legacy/index.html page-admin (lines 448-839)
 * Preact island — interactive (sidebar + tab switching)
 */
import { useState } from 'preact/hooks';
import TabKelola from './TabKelola.tsx';
import TabPelamar from './TabPelamar.tsx';

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

function TabKelolaOld() {
  return (
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-red-400 font-bold text-lg"><i class="fas fa-globe mr-2"></i> Loker Publik</h2>
        <div class="relative w-72">
          <i class="fas fa-search absolute left-3 top-2.5 text-slate-300 text-sm"></i>
          <input type="text" placeholder="Cari Kode / Pekerjaan..." class="w-full pl-9 p-2 rounded-lg bg-black/40 border border-slate-700 text-sm text-white outline-none focus:border-red-500 transition" />
        </div>
      </div>
      <p class="text-slate-500 text-sm text-center py-8">Data loker akan dimuat dari backend.</p>
    </div>
  );
}

function TabPelamarOld() {
  return (
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-sky-400 font-bold text-lg"><i class="fas fa-users mr-2"></i> Database Pelamar</h2>
        <div class="flex gap-2">
          <button class="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold hover:bg-sky-500 shadow-lg transition"><i class="fas fa-user-plus mr-1"></i> Input Manual</button>
          <button class="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg transition"><i class="fas fa-file-csv mr-1"></i> Export CSV</button>
        </div>
      </div>
      <div class="flex gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <select class="bg-black/40 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none">
          <option>Semua Gender</option><option>Laki-laki</option><option>Perempuan</option>
        </select>
        <select class="bg-black/40 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none">
          <option>Semua Usia</option><option>&lt; 20</option><option>20-25</option><option>&gt; 25</option>
        </select>
      </div>
      <p class="text-slate-500 text-sm text-center py-8">Data pelamar akan dimuat dari backend.</p>
    </div>
  );
}

function TabMail() {
  return (
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-sky-400 font-bold text-lg"><i class="fas fa-envelope mr-2"></i> Mail Inbox</h2>
        <div class="flex gap-2">
          {['MENUNGGU', 'REVIEW', 'LULUS', 'GAGAL', 'SEMUA'].map((s) => (
            <button key={s} class="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition">{s}</button>
          ))}
        </div>
      </div>
      <p class="text-slate-500 text-sm text-center py-8">Mail inbox akan dimuat dari backend.</p>
    </div>
  );
}

function TabJadwal() {
  return (
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-amber-400 font-bold text-lg"><i class="fas fa-calendar-alt mr-2"></i> Jadwal Agenda</h2>
        <button class="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-500 shadow-lg transition"><i class="fas fa-plus mr-1"></i> Buat Jadwal</button>
      </div>
      <p class="text-slate-500 text-sm text-center py-8">Jadwal akan dimuat dari backe
nd.</p>
    </div>
  );
}

function TabTambah() {
  return (
    <div>
      <h2 class="text-red-400 font-bold mb-4 text-lg"><i class="fas fa-plus-circle mr-2"></i> Form Input Loker Baru</h2>
      <p class="text-slate-500 text-sm text-center py-8">Form tambah loker akan dimigrate selanjutnya.</p>
    </div>
  );
}

function TabDbJob() {
  return (
    <div>
      <h2 class="text-purple-400 font-bold mb-4 text-lg"><i class="fas fa-server mr-2"></i> Histori Job Internal</h2>
      <p class="text-slate-500 text-sm text-center py-8">DB Job Internal akan dimuat dari backend.</p>
    </div>
  );
}

function TabWA() {
  return (
    <div>
      <h2 class="text-emerald-400 font-bold mb-4 text-lg"><i class="fab fa-whatsapp mr-2"></i> Kelola Template WA Pintar</h2>
      <p class="text-slate-500 text-sm text-center py-8">WA Pintar templates akan dimuat dari backend.</p>
    </div>
  );
}

function TabConfig() {
  return (
    <div>
      <h2 class="text-white font-bold mb-4 text-lg"><i class="fas fa-cogs mr-2 text-slate-300"></i> Pengaturan Sistem</h2>
      <p class="text-slate-500 text-sm text-center py-8">System config akan dimuat dari backend.</p>
    </div>
  );
}

function TabPlaceholder({ tab }: { tab: string }) {
  return (
    <div class="text-center py-8">
      <i class="fas fa-tools text-3xl text-slate-600 mb-3"></i>
      <p class="text-slate-500">Tab "{tab}" sedang dalam migrasi.</p>
    </div>
  );
}
