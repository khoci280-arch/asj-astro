/**
 * i18n.ts — Simple language toggle store
 * Stores current language in Nanostores persistent
 */
import { persistentAtom } from '@nanostores/persistent';

export type Lang = "id" | "jp";

export const langStore = persistentAtom<Lang>("asj_lang", "id", {
  encode: JSON.stringify,
  decode: JSON.parse,
});

/** Key translations — expand as needed */
export const translations: Record<Lang, Record<string, string>> = {
  id: {
    "header.login": "Login Pelamar",
    "header.register": "Daftar Akun",
    "header.logout": "Keluar",
    "header.dashboard": "Dashboard",
    "header.admin": "Panel Admin",
    "header.public": "Publik",
    "header.admin_login": "Admin Login",
    "ui.install_app": "Install App",
    "ui.menu": "Menu",
    "ui.tab_loker": "Lowongan Loker",
    "ui.tab_layanan": "Program & Layanan ASJ",
    "ui.dark": "Dark",
    "ui.light": "Light",
    "public.filter": "Filter",
    "public.all": "Semua",
    "public.open": "Buka",
    "public.urgent": "Urgent",
    "public.close": "Tutup",
    "button.lamar": "Lamar",
    "button.save": "Simpan",
    "button.submit": "Kirim",
    "button.cancel": "Batal",
    "button.back": "Kembali",
    "form.search": "Cari...",
    "form.name": "Nama Lengkap",
    "form.phone": "No WhatsApp",
    "form.email": "Email",
  },
  jp: {
    "header.login": "ログイン",
    "header.register": "登録",
    "header.logout": "ログアウト",
    "header.dashboard": "ダッシュボード",
    "header.admin": "管理パネル",
    "header.public": "公開",
    "header.admin_login": "管理者ログイン",
    "ui.install_app": "アプリインストール",
    "ui.menu": "メニュー",
    "ui.tab_loker": "求人情報",
    "ui.tab_layanan": "プログラム＆サービス",
    "ui.dark": "ダーク",
    "ui.light": "ライト",
    "public.filter": "フィルター",
    "public.all": "すべて",
    "public.open": "募集中",
    "public.urgent": "急募",
    "public.close": "終了",
    "button.lamar": "応募",
    "button.save": "保存",
    "button.submit": "送信",
    "button.cancel": "キャンセル",
    "button.back": "戻る",
    "form.search": "検索...",
    "form.name": "氏名",
    "form.phone": "電話番号",
    "form.email": "メール",
  },
};

/** Get translation for current language */
export function t(key: string): string {
  const lang = langStore.get();
  return translations[lang]?.[key] || translations.id[key] || key;
}