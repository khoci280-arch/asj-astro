/**
 * FormToolbar.tsx — Reusable toolbar for standalone form pages
 * Includes: Back to Portal + Theme toggle + Language toggle
 */
import { useStore } from '@nanostores/preact';
import { langStore, t } from '../../store/i18n';
import { useState } from 'preact/hooks';

interface Props {
  title?: string;
}

export default function FormToolbar({ title }: Props) {
  const lang = useStore(langStore);
  const [isDark, setIsDark] = useState(() => typeof document !== "undefined" ? !document.documentElement.classList.contains("light") : true);

  function toggleTheme() {
    document.documentElement.classList.toggle("light"); localStorage.setItem("asjTheme", document.documentElement.classList.contains("light") ? "light" : "dark");
    setIsDark(prev => !prev);
  }
  function toggleLang() {
    langStore.set(lang === "id" ? "jp" : "id");
  }

  return (
    <div class="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-3 py-2 bg-black/70 backdrop-blur-sm border-b border-white/10">
      <a href="/" class="flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/80 text-white text-xs font-bold rounded-full border border-white/20 transition-all hover:scale-105">
        <i class="fas fa-arrow-left"></i> <span class="hidden sm:inline">{t('button.portal')}</span>
      </a>
      {title && <span class="text-xs font-bold text-slate-300 hidden sm:inline">{title}</span>}
      <div class="flex items-center gap-2">
        <button onClick={toggleTheme} class="px-2.5 py-1.5 bg-black/50 hover:bg-black/80 text-white border border-white/20 rounded-full text-[11px] font-bold transition-all flex items-center gap-1">
          <i class={"fas " + (isDark ? "fa-moon" : "fa-sun")}></i> {isDark ? "Dark" : "Light"}
        </button>
        <button onClick={toggleLang} class="px-2.5 py-1.5 bg-black/50 hover:bg-black/80 text-white border border-white/20 rounded-full text-[11px] font-bold transition-all flex items-center gap-1">
          <i class="fas fa-language"></i> {lang === "id" ? "JP" : "ID"}
        </button>
      </div>
    </div>
  );
}