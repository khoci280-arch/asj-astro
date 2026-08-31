import { h } from "preact";
import { useState, useCallback } from "preact/hooks";
import { t } from "../../store/i18n";
import apiClient from "../../lib/apiClient";
import Icon from '../ui/Icon';
import { useOverlay } from '../ui/useOverlay';

interface Props { isOpen: boolean; onClose: () => void; }

const DEFAULT_PESAN = [
  "Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu Wali dari {nama}.",
  "Kami dari pengurus LPK AMANAH SAKURA JAPAN PONOROGO mengundang Bapak/Ibu untuk bergabung ke dalam grup WhatsApp resmi kelas guna memantau perkembangan belajar serta informasi kegiatan belajar mengajar (KBM).",
  "",
  "Silakan klik tautan berikut untuk bergabung:",
  "{link_grup}",
  "",
  "Terima kasih atas perhatian dan kerja samanya.",
].join("\n");

function parseDaftarOrtu(text: string): { list: { nama: string; wa: string }[]; invalid: number } {
  const list: { nama: string; wa: string }[] = [];
  let invalid = 0;
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    let nama = "", waRaw = "";
    const sep = line.search(/[|\t;]/);
    if (sep !== -1) { nama = line.slice(0, sep).trim(); waRaw = line.slice(sep + 1).trim(); }
    else { const m = line.match(/^(.*?)(\d{9,15})$/); if (!m) { invalid++; return; } nama = m[1].trim(); waRaw = m[2]; }
    const wa = waRaw.replace(/\D/g, "");
    if (!/^628\d{9,11}$/.test(wa) || !wa) { invalid++; return; }
    list.push({ nama: nama || t("wa.nama_orangtua"), wa });
  });
  return { list, invalid };
}

function parseVarianPesan(tpl: string): string[] {
  return tpl.split(/^---\s*$/m).map(s => s.trim()).filter(Boolean);
}

export default function UndanganKelasModal({ isOpen, onClose }: Props) {
  const [daftar, setDaftar] = useState("");
  const [linkGrup, setLinkGrup] = useState(() => { try { return localStorage.getItem("asj_link_grup_kelas") || ""; } catch { return ""; } });
  const [interval, setInterval_] = useState(10);
  const [pesan, setPesan] = useState(DEFAULT_PESAN);
  const [sending, setSending] = useState(false);

  const { list, invalid } = parseDaftarOrtu(daftar);
  const variants = parseVarianPesan(pesan);
  const contohNama = list.length ? list[0].nama : t("wa.nama_siswa_ph");
  const preview = (variants[0] || pesan).replace(/\{nama\}/g, contohNama).replace(/\{link_grup\}/g, linkGrup || "https://chat.whatsapp.com/...");

  const handleSend = useCallback(async () => {
    if (!list.length) { showToast(t("ui.toast_no_valid_wa"), "error"); return; }
    if (invalid > 0) showToast(t("ui.toast_invalid_rows_n").replace("{n}", String(invalid)), "warning");
    if (!linkGrup) { showToast(t("ui.toast_group_link_required"), "error"); return; }
    if (!pesan.trim()) { showToast(t("ui.toast_msg_empty"), "error"); return; }
    if (!confirm(t("ui.toast_confirm_send_n").replace("{n}", String(list.length)).replace("{s}", String(interval)))) return;
    setSending(true);
    try {
      const res = await apiClient.call("kirimTawaranMassal", [{ candidates: list, jobCode: "", linkGrup, interval, customMessage: pesan }]);
      const ok = (Array.isArray(res?.results) ? res.results : []).filter((r: { success: boolean }) => r.success).length;
      try { localStorage.setItem("asj_link_grup_kelas", linkGrup); } catch {}
      showToast(t("ui.toast_invites_done_n").replace("{n}", String(ok)), "success");
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(t("ui.toast_invite_send_failed") + msg, "error");
    } finally { setSending(false); }
  }, [list, invalid, linkGrup, interval, pesan, onClose]);

  const { containerRef, onBackdropClick } = useOverlay({ open: isOpen, onClose });

  if (!isOpen) return null;

  return h("div", { class: "fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4", ref: containerRef, onClick: onBackdropClick },
    h("div", { class: "glass-panel p-6 md:p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col border border-emerald-500/50" },
      h("button", { onClick: onClose, class: "absolute top-5 right-6 text-slate-400 hover:text-white transition z-[100]" }, h(Icon, { name: "times", class: "text-2xl" })),
      h("h3", { class: "text-xl font-black text-white mb-2 border-b border-emerald-900/50 pb-3" }, h(Icon, { name: "whatsapp", class: "text-emerald-400 mr-2" }), t("ui.invite_class_title")),
      h("p", { class: "text-xs text-slate-400 mb-4 leading-relaxed" }, t("ui.invite_class_desc")),
      h("div", { class: "space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1" },
        h("div", null,
          h("label", { class: "block text-[10px] font-bold text-emerald-400 uppercase mb-1" }, h(Icon, { name: "users", class: "mr-1" }), t("ui.paste_list_label")),
          h("textarea", { rows: 6, value: daftar, onInput: (e: Event) => setDaftar((e.target as HTMLTextAreaElement).value), placeholder: "Nama Orang Tua/Wali|628xxxxxxxxxx", class: "w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500 placeholder:text-slate-500" }),
          h("p", { class: "text-[9px] text-slate-500 mt-1" }, t("ui.paste_list_hint"), " ", h("b", null, "Nama|628xxxxxxxxxx"), " ", t("ui.paste_list_hint2"))),
        h("div", null,
          h("label", { class: "block text-[10px] font-bold text-emerald-400 uppercase mb-1" }, h(Icon, { name: "link", class: "mr-1" }), t("ui.group_link_label")),
          h("input", { type: "text", value: linkGrup, onInput: (e: Event) => setLinkGrup((e.target as HTMLInputElement).value), placeholder: "https://chat.whatsapp.com/...", class: "w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500 placeholder:text-slate-500" })),
        h("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-3" },
          h("div", null,
            h("label", { class: "block text-[10px] font-bold text-emerald-400 uppercase mb-1" }, h(Icon, { name: "stopwatch", class: "mr-1" }), t("ui.interval_label")),
            h("input", { type: "number", value: String(interval), onInput: (e: Event) => setInterval_(parseInt((e.target as HTMLInputElement).value) || 10), min: "1", class: "w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500" })),
          h("div", { class: "flex flex-col items-end justify-end gap-0.5" },
            h("span", { class: "text-xs font-bold text-emerald-400" }, t("ui.list_preview_n").replace("{n}", String(list.length))),
            variants.length > 1 ? h("span", { class: "text-[9px] font-bold text-amber-400" }, " • " + t("ui.variant_count_n").replace("{n}", String(variants.length))) : null)),
        h("div", null,
          h("label", { class: "block text-[10px] font-bold text-emerald-400 uppercase mb-1" }, h(Icon, { name: "comment-dots", class: "mr-1" }), t("ui.message_label")),
          h("textarea", { rows: 9, value: pesan, onInput: (e: Event) => setPesan((e.target as HTMLTextAreaElement).value), class: "w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500 leading-relaxed" }),
          h("p", { class: "text-[9px] text-slate-500 mt-1" }, t("ui.message_hint"), " ", h("b", null, "{nama}"), " ", t("ui.message_hint2"), " ", h("b", null, "{link_grup}"), " ", t("ui.message_hint3"))),
        h("div", { class: "bg-black/40 border border-slate-700 rounded-xl p-3" },
          h("p", { class: "text-[9px] font-bold text-slate-400 mb-1 uppercase" }, h(Icon, { name: "eye", class: "mr-1" }), t("ui.message_preview")),
          h("div", { class: "text-xs text-slate-300 whitespace-pre-wrap leading-relaxed" }, preview))),
      h("button", { onClick: handleSend, disabled: sending, class: "w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(118,185,0,0.4)] transition disabled:opacity-50 disabled:cursor-not-allowed" },
        sending ? t("ui.sending") : t("ui.start_send_invite"))));
}

declare function showToast(msg: string, type: string): void;
