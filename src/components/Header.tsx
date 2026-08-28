import { useStore } from '@nanostores/preact';
import { authStore, logout } from '../store/authReactive';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function Header({ onLogin, onRegister }: Props) {
  const  = useStore(authStore);

  function handleLogout() {
    logout();
    window.location.reload();
  }

  return (
    <header id="asj-header" class="max-w-7xl mx-auto px-4 mt-6 relative text-white border border-white/10 shadow-2xl h-auto min-h-[14rem] md:h-56 flex items-end p-6 md:p-8 bg-cover bg-center transition-colors duration-700">
      <div id="asj-header-overlay" class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
      <div class="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div class="flex items-center gap-5">
          <img id="logo-asj" src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo-removebg-preview.webp" alt="Logo ASJ" class="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-2xl" onerror="this.onerror=null;this.style.display='none';" />
          <div>
            <div class="text-pink-300 text-xs md:text-sm font-bold tracking-[4px] mb-1">{'\u65E5\u672C\u3078\u306E\u6311\u6226'}</div>
            <h1 class="text-2xl md:text-4xl font-black italic tracking-wide drop-shadow-lg">PT AMANAH SAKURA JAPAN</h1>
          </div>
        </div>
        <div class="flex flex-col items-end gap-3">
          {/* Desktop: Install + Language */}
          <div class="!hidden flex items-center gap-3">
            <button class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white border border-emerald-400/30 rounded-full text-xs font-bold transition-colors shadow-[0_0_15px_rgba(118,185,0,0.4)] animate-pulse flex items-center">
              <i class="fas fa-mobile-alt mr-1.5"></i> Install App
            </button>
          </div>

          {/* Nav: Guest */}
          {!.isLoggedIn && (
            <div class="flex flex-wrap gap-3">
              <button onClick={onLogin} class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg">Login Pelamar</button>
              <button onClick={onRegister} class="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white border border-white/60 rounded-full text-sm font-bold transition-colors">Daftar Akun</button>
              <button class="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg" aria-label="Panel Admin"><i class="fas fa-shield-alt"></i></button>
            </div>
          )}

          {/* Nav: Admin */}
          {.isLoggedIn && .role === 'admin' && (
            <div class="flex flex-wrap gap-3">
              <span class="px-5 py-2.5 bg-black text-amber-300 border border-amber-500/60 rounded-full text-sm font-bold">{'\uD83D\uDC6E'} {.name}</span>
              <button class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-cogs mr-1"></i> Panel Admin</button>
              <button onClick={handleLogout} class="px-5 py-2.5 bg-black text-white border border-white/20 hover:bg-white/10 rounded-full text-sm font-bold transition-colors"><i class="fas fa-sign-out-alt mr-1"></i> Keluar</button>
            </div>
          )}

          {/* Nav: Kandidat */}
          {.isLoggedIn && .role === 'kandidat' && (
            <div class="flex flex-wrap items-center gap-3">
              <span class="px-5 py-2.5 bg-black text-emerald-300 border border-emerald-500/60 rounded-full text-sm font-bold">{.name}</span>
              <button class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-id-card mr-1"></i> Dashboard</button>
              <button onClick={handleLogout} class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-sign-out-alt mr-1"></i> Keluar</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
