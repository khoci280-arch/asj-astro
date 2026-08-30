/**
 * BottomNav.tsx — Reactive bottom navigation (Preact island)
 * Two variants: admin + kandidat
 * Shows based on auth state from Nanostores
 * Admin: switches tabs within admin page (SPA-style)
 * Kandidat: navigates to candidate dashboard
 */
import { useStore } from '@nanostores/preact';
import { authStore, logout } from '../store/authReactive';
import { logoutSupabase } from '../store/userStore';
import { t } from '../store/i18n';

export default function BottomNav() {
  const auth = useStore(authStore);

  if (!auth.isLoggedIn) return null;

  async function handleLogout() {
    await logoutSupabase();
    window.location.href = '/';
  }

  // Admin bottom nav — tab switching within admin page
  if (auth.role === 'admin') {
    function switchTab(tab: string) {
      // If on admin page, switch tabs via URL hash
      if (window.location.pathname === '/admin') {
        window.location.hash = tab;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        // Navigate to admin page with hash
        window.location.href = '/admin#' + tab;
      }
    }

    return (
      <div id="bottom-nav-admin" class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-[90] pb-safe">
        <div class="flex justify-between items-center px-2 py-1.5">
          <button onClick={() => {
            // Toggle sidebar on admin page
            const sidebar = document.querySelector('[class*="sidebar"]') as HTMLElement;
            if (sidebar) sidebar.classList.toggle('-translate-x-full');
          }} class="flex flex-col items-center text-slate-400 hover:text-red-400 transition group" aria-label="Menu">
            <i class="fas fa-bars text-sm mb-0.5 group-active:scale-90 transition"></i>
            <span class="text-[8px] font-bold">Menu</span>
          </button>
          <button onClick={() => switchTab('kelola')} class="flex flex-col items-center text-slate-400 hover:text-white transition group">
            <i class="fas fa-briefcase text-sm mb-0.5 group-active:scale-90 transition"></i>
            <span class="text-[8px] font-bold">{t('ui.loker')}</span>
          </button>
          <button onClick={() => switchTab('pelamar')} class="flex flex-col items-center text-slate-400 hover:text-white transition group">
            <i class="fas fa-users text-sm mb-0.5 group-active:scale-90 transition"></i>
            <span class="text-[8px] font-bold">{t('ui.applicant')}</span>
          </button>
          <button onClick={() => switchTab('mail')} class="relative flex flex-col items-center text-slate-400 hover:text-white transition group">
            <div class="relative">
              <i class="fas fa-envelope text-sm mb-0.5 group-active:scale-90 transition"></i>
              <span id="nav-bot-notif" class="hidden absolute -top-1 -right-2 w-3 h-3 bg-red-500 rounded-full border border-slate-900"></span>
            </div>
            <span class="text-[8px] font-bold">{t('ui.mail')}</span>
          </button>
          <button onClick={() => switchTab('wa')} class="flex flex-col items-center text-slate-400 hover:text-emerald-400 transition group">
            <i class="fab fa-whatsapp text-sm mb-0.5 group-active:scale-90 transition"></i>
            <span class="text-[8px] font-bold">{t('ui.wa')}</span>
          </button>
          <button onClick={() => switchTab('config')} class="flex flex-col items-center text-slate-400 hover:text-white transition group">
            <i class="fas fa-cogs text-sm mb-0.5 group-active:scale-90 transition"></i>
            <span class="text-[8px] font-bold">{t('ui.settings2')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Kandidat bottom nav
  return (
    <div id="bottom-nav-kandidat" class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-[90] pb-safe">
      <div class="flex justify-around items-center px-4 py-1.5">
        <a href="/public" class="flex flex-col items-center text-slate-400 hover:text-white transition group">
          <i class="fas fa-globe text-sm mb-0.5 group-active:scale-90 transition"></i>
          <span class="text-[8px] font-bold">{t('ui.search_job')}</span>
        </a>
        <a href="/candidate" class="relative -top-3 flex flex-col items-center group">
          <div class="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white border-4 border-slate-950 shadow-lg group-active:scale-95 transition">
            <i class="fas fa-id-card text-lg"></i>
          </div>
          <span class="text-xs text-emerald-400 font-bold mt-1">{t('header.dashboard')}</span>
        </a>
        <button onClick={handleLogout} class="flex flex-col items-center text-slate-400 hover:text-red-400 transition group">
          <i class="fas fa-power-off text-sm mb-0.5 group-active:scale-90 transition"></i>
          <span class="text-[8px] font-bold">{t('header.logout')}</span>
        </button>
      </div>
    </div>
  );
}
