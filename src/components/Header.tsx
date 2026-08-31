import { useStore } from '@nanostores/preact';
import { authStore, logout } from '../store/authReactive';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function Header({ onLogin, onRegister }: Props) {
  const auth = useStore(authStore);

  function handleLogout() {
    logout();
    window.location.reload();
  }

  return (
    <header id="asj-header" class="max-w-7xl mx-auto px-4 mt-6 relative text-white border border-white/10 shadow-2xl h-auto md:h-56 flex items-end p-4 md:p-8 bg-cover bg-center transition-colors duration-700 overflow-hidden">
      <div id="asj-header-overlay" class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
      <div class="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-5">
        <div class="flex items-center gap-3 md:gap-5">
          <img id="logo-asj" src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo-removebg-preview.webp" alt="Logo ASJ" class="w-12 h-12 md:w-20 md:h-20 object-contain drop-shadow-2xl shrink-0" onError={(e: Event) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <div class="text-pink-300 text-[10px] md:text-sm font-bold tracking-[2px] md:tracking-[4px] mb-0.5 md:mb-1">{'\u65E5\u672C\u3078\u306E\u6311\u6226'}</div>
            <h1 class="text-lg md:text-4xl font-black italic tracking-wide drop-shadow-lg leading-tight">PT AMANAH SAKURA JAPAN</h1>
          </div>
        </div>
        
        <div class="flex flex-row items-center gap-2 md:gap-3 flex-wrap justify-end">
          {/* Install App - desktop only */}
          <button class="hidden md:flex px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white border border-emerald-400/30 rounded-full text-xs font-bold transition-colors shadow-[0_0_15px_rgba(118,185,0,0.4)] animate-pulse items-center">
            <i class="fas fa-mobile-alt mr-1.5"></i> Install App
          </button>
          
          {/* Language toggle - always visible */}
          <button class="w-9 h-9 md:w-auto md:px-3 md:py-2 flex items-center justify-center bg-black/50 hover:bg-black/70 border border-white/30 rounded-full text-xs font-bold transition-colors shrink-0" title="Language">
            <i class="fas fa-language"></i>
          </button>

          {/* Mobile: hamburger menu for extra buttons */}
          <button id="asj-mobile-menu-btn" class="md:hidden w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-black/70 border border-white/30 rounded-full text-sm transition-colors shrink-0" onClick={() => document.getElementById('asj-mobile-dropdown')?.classList.toggle('hidden')}>
            <i class="fas fa-bars"></i>
          </button>
          
          {/* Nav: Guest - desktop */}
          {!auth.isLoggedIn && (
            <div class="hidden md:flex items-center gap-2">
              <button onClick={onLogin} class="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg">Login Pelamar</button>
              <button onClick={onRegister} class="px-4 py-2 bg-black hover:bg-zinc-800 text-white border border-white/60 rounded-full text-sm font-bold transition-colors">Daftar Akun</button>
              <a href="/admin" class="w-9 h-9 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-shield-alt"></i></a>
            </div>
          )}
          
          {/* Nav: Admin - desktop */}
          {auth.isLoggedIn && auth.role === 'admin' && (
            <div class="hidden md:flex items-center gap-2">
              <span class="px-4 py-2 bg-black text-amber-300 border border-amber-500/60 rounded-full text-sm font-bold">{'\uD83D\uDC6E'} {auth.name}</span>
              <a href="/admin" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-cogs mr-1"></i> Panel Admin</a>
              <button onClick={handleLogout} class="px-4 py-2 bg-black text-white border border-white/20 hover:bg-white/10 rounded-full text-sm font-bold transition-colors"><i class="fas fa-sign-out-alt mr-1"></i> Keluar</button>
            </div>
          )}
          
          {/* Nav: Kandidat - desktop */}
          {auth.isLoggedIn && auth.role === 'kandidat' && (
            <div class="hidden md:flex items-center gap-2">
              <span class="px-4 py-2 bg-black text-emerald-300 border border-emerald-500/60 rounded-full text-sm font-bold">{auth.name}</span>
              <a href="/candidate" class="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-id-card mr-1"></i> Dashboard</a>
              <button onClick={handleLogout} class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-colors shadow-lg"><i class="fas fa-sign-out-alt mr-1"></i> Keluar</button>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile dropdown menu */}
      <div id="asj-mobile-dropdown" class="hidden absolute top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/20 p-4 flex flex-col gap-3">
        <div class="flex justify-between items-center mb-2">
          <span class="text-white font-bold text-sm">Menu</span>
          <button onClick={(e: Event) => { (e.target as HTMLElement).parentElement?.parentElement?.classList.add('hidden'); }} class="text-white/70 hover:text-white">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>
        <button class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-full text-sm font-bold flex items-center justify-center gap-2">
          <i class="fas fa-mobile-alt"></i> Install App
        </button>
        {!auth.isLoggedIn && (
          <>
            <button onClick={onLogin} class="px-4 py-2 bg-sky-600 text-white rounded-full text-sm font-bold">Login Pelamar</button>
            <button onClick={onRegister} class="px-4 py-2 bg-black text-white border border-white/60 rounded-full text-sm font-bold">Daftar Akun</button>
            <a href="/admin" class="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold text-center">Panel Admin</a>
          </>
        )}
        {auth.isLoggedIn && auth.role === 'admin' && (
          <>
            <span class="text-amber-300 text-sm font-bold text-center">{'\uD83D\uDC6E'} {auth.name}</span>
            <a href="/admin" class="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold text-center">Panel Admin</a>
            <button onClick={handleLogout} class="px-4 py-2 bg-black text-white border border-white/20 rounded-full text-sm font-bold">Keluar</button>
          </>
        )}
        {auth.isLoggedIn && auth.role === 'kandidat' && (
          <>
            <span class="text-emerald-300 text-sm font-bold text-center">{auth.name}</span>
            <a href="/candidate" class="px-4 py-2 bg-sky-600 text-white rounded-full text-sm font-bold text-center">Dashboard</a>
            <button onClick={handleLogout} class="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold">Keluar</button>
          </>
        )}
      </div>
    </header>
  );
}
