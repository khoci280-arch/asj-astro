/**
 * BottomNav.tsx — Compact single-row bottom nav (Preact island)
 * Admin: 6 icon buttons, Menu toggles sidebar
 * Kandidat: 3 buttons with center dashboard bubble
 */
import { useStore } from '@nanostores/preact';
import { authStore } from '../store/authReactive';
import { logoutSupabase } from '../store/userStore';
import { t } from '../store/i18n';

export default function BottomNav() {
  const auth = useStore(authStore);
  if (!auth.isLoggedIn) return null;

  async function handleLogout() {
    await logoutSupabase();
    window.location.href = '/';
  }

  if (auth.role === 'admin') {
    function switchTab(tab: string) {
      if (window.location.pathname === '/admin') {
        window.location.hash = tab;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.location.href = '/admin#' + tab;
      }
    }

    return (
      <div id="bottom-nav-admin" class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 z-[90]">
        <div class="flex justify-around items-center h-11 px-1">
          <button onClick={() => {
            const sidebar = document.querySelector('[id*="admin-sidebar"]') as HTMLElement;
            if (sidebar) sidebar.classList.toggle('-translate-x-full');
          }} class="flex flex-col items-center justify-center text-slate-400 hover:text-red-400 active:scale-90 transition w-10" aria-label="Menu">
            <i class="fas fa-bars text-xs" aria-hidden="true"></i>
          </button>
          <button onClick={() => switchTab('kelola')} class="flex flex-col items-center justify-center text-slate-400 hover:text-white active:scale-90 transition w-10" aria-label="Lowongan">
            <i class="fas fa-briefcase text-xs" aria-hidden="true"></i>
          </button>
          <button onClick={() => switchTab('pelamar')} class="flex flex-col items-center justify-center text-slate-400 hover:text-white active:scale-90 transition w-10">
            <i class="fas fa-users text-xs"></i>
          </button>
          <button onClick={() => switchTab('mail')} class="flex flex-col items-center justify-center text-slate-400 hover:text-white active:scale-90 transition w-10">
            <i class="fas fa-envelope text-xs"></i>
          </button>
          <button onClick={() => switchTab('wa')} class="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 active:scale-90 transition w-10">
            <i class="fab fa-whatsapp text-xs"></i>
          </button>
          <button onClick={() => switchTab('config')} class="flex flex-col items-center justify-center text-slate-400 hover:text-white active:scale-90 transition w-10">
            <i class="fas fa-cogs text-xs"></i>
          </button>
        </div>
      </div>
    );
  }

  // Kandidat: 3 buttons, center is raised circle
  return (
    <div id="bottom-nav-kandidat" class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 z-[90]">
      <div class="flex justify-around items-center h-11 px-6">
        <a href="/public" class="flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition w-10">
          <i class="fas fa-globe text-xs"></i>
        </a>
        <a href="/candidate" class="relative -top-2 flex items-center justify-center">
          <div class="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white border-2 border-slate-950 shadow-md active:scale-95 transition">
            <i class="fas fa-id-card text-sm"></i>
          </div>
        </a>
        <button onClick={handleLogout} class="flex items-center justify-center text-slate-400 hover:text-red-400 active:scale-90 transition w-10">
          <i class="fas fa-power-off text-xs"></i>
        </button>
      </div>
    </div>
  );
}
