/**
 * App.tsx - Header + Mobile Nav with i18n (Preact island)
 *
 * Initializes Supabase auth listener at boot (useEffect).
 * All 11 consumers continue to import authStore from authReactive.ts — no breakage.
 */
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { authStore, logout } from '../store/authReactive';
import { initializeAuthListener, logoutSupabase } from '../store/userStore';
import { langStore, t, translateDataLang } from '../store/i18n';

// ─── Named Constants ───
const Z_INDEX = { OVERLAY: 35, NAV: 40, HAMBURGER: 30 } as const;

import LoginModal from './LoginModal';
import AdminAiCopilot from './admin/AdminAiCopilot';
import { showToast } from './Toast';

/** User state from auth store */
interface UserState {
  isLoggedIn: boolean;
  role: "admin" | "kandidat" | null;
  name: string;
  wa: string;
}

type ModalMode = 'closed' | 'login' | 'daftar';

export default function App() {
  const u: UserState = useStore(authStore) as UserState;
  const lang = useStore(langStore);
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAiCopilot, setShowAiCopilot] = useState(false);

  // Initialize Supabase auth listener once at boot
  useEffect(() => { translateDataLang();
    const cleanup = initializeAuthListener();
    return cleanup;
  }, []);

  function openLogin() { setModalMode("login"); setMenuOpen(false); }
  function openRegister() { setModalMode("daftar"); setMenuOpen(false); }
  function closeModal() { setModalMode("closed"); }
  async function handleLogout() { await logoutSupabase(); window.location.reload(); }
  function toggleMenu() { setMenuOpen(!menuOpen); }
  function toggleLang() { langStore.set(lang === "id" ? "jp" : "id"); window.dispatchEvent(new Event("asj-lang-change")); translateDataLang(); }
  function installApp() { showToast("Install: Chrome > Menu > Home Screen", "info"); setMenuOpen(false); }

  return (
    <>
      <header id="asj-header" class="max-w-7xl mx-auto px-4 mt-6 relative text-white border border-white/10 shadow-2xl h-auto min-h-[14rem] md:h-56 flex items-end p-6 md:p-8 bg-cover bg-center transition-colors duration-700">
        <div id="asj-header-overlay" class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
        <div class="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
          <div class="flex items-center gap-5">
            <img id="logo-asj" src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo-removebg-preview.webp" alt="Logo ASJ" class="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-2xl" onError={(e: any) => { e.target.style.display = "none" }} />
            <div>
              <div id="header-tagline" class="text-pink-300 text-xs md:text-sm font-bold tracking-[4px] mb-1">日本への挑戦</div>
              <h1 class="text-2xl md:text-4xl font-black italic tracking-wide drop-shadow-lg"><span>PT AMANAH SAKURA JAPAN</span></h1>
            </div>
          </div>
          <div class="absolute top-4 right-4" style={{ zIndex: Z_INDEX.HAMBURGER }}>
            <button onClick={toggleMenu} class="w-10 h-10 flex items-center justify-center bg-black hover:bg-zinc-800 text-white rounded-full border border-white/60 transition shadow-lg" aria-label="Toggle Menu">
              <i class={menuOpen ? "fas fa-times text-lg" : "fas fa-bars text-lg"}></i>
            </button>
          </div>
          {/* ─── Desktop Nav ─── */}
          <div class="hidden md:flex flex-col items-end gap-3">
            <div class="flex items-center gap-3">
              <button onClick={installApp} class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white border border-emerald-400/30 rounded-full text-xs font-bold transition-colors shadow-[0_0_15px_rgba(118,185,0,0.4)] animate-pulse flex items-center"><i class="fas fa-mobile-alt mr-1.5"></i> {t("ui.install_app")}</button>
              <button onClick={toggleLang} class="px-3 py-2 bg-black hover:bg-zinc-800 text-white border border-white/60 rounded-full text-xs font-bold transition-colors shadow-lg flex items-center gap-1.5"><i class="fas fa-language"></i> {lang === "id" ? "ID" : "JP"}</button>
            </div>
            <div class="flex flex-wrap gap-3 mt-1">
              {!u.isLoggedIn && (<>
                <button onClick={openLogin} class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg">{t("header.login")}</button>
                <button onClick={openRegister} class="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white border border-white/60 rounded-full text-sm font-bold transition-colors">{t("header.register")}</button>
                <button onClick={openLogin} class="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg" aria-label="Admin"><i class="fas fa-shield-alt"></i></button>
              </>)}
              {u.isLoggedIn && u.role === "admin" && (<>
                <a href="/admin#mail" class="relative w-10 h-10 flex items-center justify-center bg-black hover:bg-zinc-800 text-white border border-white/60 rounded-full transition-colors shadow-lg"><i class="fas fa-bell"></i></a>
                <span class="px-5 py-2.5 bg-black text-amber-300 border border-amber-500/60 rounded-full text-sm font-bold">Admin: {u.name}</span>
                <a href="/public" class="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white border border-white/60 rounded-full text-sm font-bold transition-colors"><i class="fas fa-globe mr-1"></i> {t("header.public")}</a>
                <button onClick={() => { setShowAiCopilot(true); setMenuOpen(false); }} class="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white border border-violet-300/40 rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-robot mr-1"></i> AI HR</button>
                <a href="/admin" class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-cogs mr-1"></i> {t("header.admin")}</a>
                <button onClick={handleLogout} class="px-5 py-2.5 bg-black text-white border border-white/20 hover:bg-white/10 rounded-full text-sm font-bold transition-colors"><i class="fas fa-sign-out-alt mr-1"></i> {t("header.logout")}</button>
              </>)}
              {u.isLoggedIn && u.role === "kandidat" && (<>
                <span class="px-5 py-2.5 bg-black text-emerald-300 border border-emerald-500/60 rounded-full text-sm font-bold">{u.name}</span>
                <a href="/candidate" class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-id-card mr-1"></i> {t("header.dashboard")}</a>
                <button onClick={handleLogout} class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-sign-out-alt mr-1"></i> {t("header.logout")}</button>
              </>)}
            </div>
          </div>
        </div>
      </header>

      {menuOpen && <div class="fixed inset-0 bg-black/70" style={{ zIndex: Z_INDEX.OVERLAY }} onClick={() => setMenuOpen(false)}></div>}
      
      {/* ─── Mobile Nav ─── */}
      <nav class={"fixed top-0 right-0 h-full w-72 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transition-transform duration-300 transform " + (menuOpen ? "translate-x-0" : "translate-x-full")} style={{ zIndex: Z_INDEX.NAV }}>
        <div class="flex items-center justify-between p-4 border-b border-slate-700">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-widest"><i class="fas fa-bars mr-2 text-sky-400"></i> {t("ui.menu")}</span>
          <button onClick={toggleMenu} class="text-slate-400 hover:text-white p-1 transition" aria-label="Close"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div class="space-y-3 pb-3 mb-3 border-b border-slate-700">
            <button onClick={installApp} class="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center"><i class="fas fa-mobile-alt mr-2"></i> {t("ui.install_app")}</button>
            <button onClick={toggleLang} class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"><i class="fas fa-language"></i> Bahasa <span>{lang === "id" ? "ID" : "JP"}</span></button>
          </div>
          {!u.isLoggedIn && (<div class="space-y-3">
            <button onClick={openLogin} class="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-lg transition">{t("header.login")}</button>
            <button onClick={openRegister} class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition">{t("header.register")}</button>
            <button onClick={openLogin} class="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg transition"><i class="fas fa-shield-alt mr-2"></i> {t("header.admin_login")}</button>
          </div>)}
          {u.isLoggedIn && u.role === "admin" && (<div class="space-y-3">
            <a href="/admin" class="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center"><i class="fas fa-cogs mr-2"></i> {t("header.admin")}</a>
            <button onClick={() => { setShowAiCopilot(true); setMenuOpen(false); }} class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition flex items-center justify-center"><i class="fas fa-robot mr-2"></i> AI HR Copilot</button>
            <a href="/public" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition flex items-center justify-center"><i class="fas fa-globe mr-2"></i> {t("header.public")}</a>
            <button onClick={handleLogout} class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition flex items-center justify-center"><i class="fas fa-sign-out-alt mr-2"></i> {t("header.logout")}</button>
          </div>)}
          {u.isLoggedIn && u.role === "kandidat" && (<div class="space-y-3">
            <a href="/candidate" class="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center"><i class="fas fa-id-card mr-2"></i> {t("header.dashboard")}</a>
            <a href="/public" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition flex items-center justify-center"><i class="fas fa-globe mr-2"></i> {t("header.public")}</a>
            <button onClick={handleLogout} class="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition flex items-center justify-center"><i class="fas fa-sign-out-alt mr-2"></i> {t("header.logout")}</button>
          </div>)}
        </div>
      </nav>

      {showAiCopilot && <AdminAiCopilot onClose={() => setShowAiCopilot(false)} />}
      <LoginModal mode={modalMode} onClose={closeModal} onSwitchMode={setModalMode} />
    </>
  );
}
