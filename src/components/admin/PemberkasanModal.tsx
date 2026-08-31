import { h } from "preact";
import { useState } from "preact/hooks";
import { t } from "../../store/i18n";
import apiClient from "../../lib/apiClient";
import { uploadToCloudinary } from "../../lib/cloudinary";
import Icon from '../ui/Icon';

interface Props { isOpen: boolean; onClose: () => void; waTarget: string; namaTarget: string; }

const TAHAP1 = [
  { id: "kk", label: "candidate.form_kk", accept: ".pdf" },
  { id: "akte", label: "candidate.form_akte", accept: ".pdf" },
  { id: "sd", label: "candidate.form_sd", accept: ".pdf" },
  { id: "smp", label: "candidate.form_smp", accept: ".pdf" },
  { id: "sma", label: "candidate.form_sma", accept: ".pdf" },
  { id: "univ", label: "candidate.form_univ", accept: ".pdf" },
  { id: "pasport", label: "candidate.form_passport", accept: ".pdf" },
  { id: "mcu", label: "ui.doc7_mcu", accept: ".pdf" },
  { id: "kontrak", label: "ui.doc8_contract", accept: ".pdf" },
  { id: "cert", label: "ui.doc9_cert_japan", accept: ".pdf" },
  { id: "ktp", label: "ui.doc10_ktp", accept: ".pdf", amber: true },
  { id: "foto2", label: "candidate.form_photo", accept: ".jpg,.jpeg,.png", amber: true },
];

const TAHAP2 = [
  { id: "ijinortu", label: "candidate.form_parent_permit", accept: ".pdf" },
  { id: "cpmi", label: "candidate.form_cpmi", accept: ".pdf" },
  { id: "kawin", label: "candidate.form_marital", accept: ".pdf" },
  { id: "sehat", label: "ui.doc4_health", accept: ".pdf" },
  { id: "bpjs", label: "candidate.form_bpjs", accept: ".pdf" },
  { id: "psikotes", label: "candidate.form_psikotes", accept: ".pdf" },
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function FileInput({ id, label, accept, amber }: { id: string; label: string; accept: string; amber?: boolean }) {
  const [status, setStatus] = useState<"idle" | "selected" | "error">("idle");
  return h("div", null,
    h("div", { class: "flex justify-between items-center mb-1" },
      h("label", { class: `text-xs font-bold ${amber ? "text-amber-400" : "text-emerald-300"}` }, t(label)),
      status === "selected" ? h("span", { class: "text-[9px] font-bold text-emerald-400" }, "\u2713") :
      status === "error" ? h("span", { class: "text-[9px] font-bold text-red-400" }, "MAX 5MB") : null),
    h("input", { type: "file", accept, id: `berkas-${id}`,
      onChange: (e: Event) => {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (!f) { setStatus("idle"); return; }
        if (f.size > MAX_FILE_BYTES) { setStatus("error"); return; }
        setStatus("selected");
      },
      class: `w-full text-xs text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold ${amber ? "file:bg-amber-900/40 file:text-amber-300" : "file:bg-slate-700 file:text-white"}` }));
}

export default function PemberkasanModal({ isOpen, onClose, waTarget, namaTarget }: Props) {
  const [t1Open, setT1Open] = useState(false);
  const [t2Open, setT2Open] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState<Record<string, string>>({});

  const handleUpload = async (tahap: 1 | 2) => {
    if (!waTarget) return;
    const inputs = tahap === 1 ? TAHAP1 : TAHAP2;
    const files: { fileObj: File; jenisBerkas: string }[] = [];
    for (const inp of inputs) {
      const el = document.getElementById(`berkas-${inp.id}`) as HTMLInputElement;
      if (el?.files?.[0]) files.push({ fileObj: el.files[0], jenisBerkas: inp.id.toUpperCase() });
    }
    if (!files.length) { showToast(t("ui.toast_pick_min_one"), "error"); return; }
    setUploading(true);
    try {
      let ok = 0;
      for (const f of files) {
        try {
          const cloudinaryUrl = await uploadToCloudinary(f.fileObj);
          const res = await apiClient.call("simpanBerkasTahapan", [{ wa: waTarget, nama: namaTarget, jenisBerkas: f.jenisBerkas, fileUrl: cloudinaryUrl }]);
          if (res?.success) ok++;
        } catch {}
      }
      showToast(t("ui.toast_uploaded_n").replace("{n}", String(ok)) + t("ui.toast_docs_exclaim"), "success");
      onClose();
    } catch { showToast(t("ui.toast_network_upload_error"), "error"); }
    finally { setUploading(false); }
  };

  const handleSaveBio = async () => {
    if (!waTarget) return;
    setUploading(true);
    try {
      const res = await apiClient.call("simpanBiodataLengkap", [{ wa: waTarget, ...bio }]);
      if (res?.success) { showToast(t("ui.toast_biodata_saved"), "success"); onClose(); }
      else showToast(t("ui.toast_failed_prefix") + (res?.error || ""), "error");
    } catch { showToast(t("ui.toast_network_error"), "error"); }
    finally { setUploading(false); }
  };

  if (!isOpen) return null;

  const Panel = ({ title, icon, color, isOpen: open, onToggle, children }: { title: string; icon: string; color: string; isOpen: boolean; onToggle: () => void; children?: any }) =>
    h("div", { class: `bg-black/40 border ${color}/40 rounded-[2rem] overflow-hidden text-left shadow-lg` },
      h("button", { onClick: onToggle, class: `w-full p-5 flex justify-between items-center ${color.replace("border", "bg")}-900/40 font-bold ${color.replace("border", "text")}-400 hover:${color.replace("border", "bg")}-900/60 transition-colors` },
        h("span", { class: "text-sm md:text-base" }, h("i", { class: `fas ${icon} mr-2` }), title),
        h(Icon, { name: "chevron-down", class: `transition-transform duration-300 ${open ? "rotate-180" : ""}` })),
      open ? h("div", { class: "p-6 border-t border-slate-700/50 space-y-4" }, children) : null);

  const Input = ({ label, field, type = "text" }: { label: string; field: string; type?: string }) =>
    h("div", null,
      h("label", { class: "block text-xs text-slate-400 mb-1 font-bold" }, t(label)),
      h("input", { type, value: bio[field] || "", onInput: (e: Event) => setBio({ ...bio, [field]: (e.target as HTMLInputElement).value }),
        class: "w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-amber-500" }));

  const Textarea = ({ label, field }: { label: string; field: string }) =>
    h("div", { class: "md:col-span-2" },
      h("label", { class: "block text-xs text-slate-400 mb-1 font-bold" }, t(label)),
      h("textarea", { rows: 2, value: bio[field] || "", onInput: (e: Event) => setBio({ ...bio, [field]: (e.target as HTMLTextAreaElement).value }),
        class: "w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-amber-500" }));

  const Section = ({ title }: { title: string }) =>
    h("div", { class: "md:col-span-2 border-b border-slate-700/50 pb-1 mt-2" },
      h("h4", { class: "text-sm font-bold text-amber-400" }, t(title)));

  return h("div", { class: "fixed inset-0 bg-black/80 backdrop-blur-md z-[260] flex items-center justify-center p-4", onClick: (e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); } },
    h("div", { class: "glass-panel p-6 md:p-8 rounded-[2.5rem] w-full max-w-4xl shadow-[0_0_40px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto custom-scrollbar" },
      h("button", { onClick: onClose, class: "absolute top-6 right-6 text-slate-400 hover:text-white transition z-[100]" }, h(Icon, { name: "times", class: "text-2xl" })),
      h("h3", { class: "text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-wide border-b border-slate-700/50 pb-4" },
        h(Icon, { name: "folder-open", class: "text-emerald-400 mr-2" }), t("ui.berkas_center")),
      h("p", { class: "text-sm text-emerald-400 font-bold mb-6" }, t("ui.candidate_label"), " ", h("span", { class: "text-white bg-slate-800 px-2 py-0.5 rounded" }, namaTarget)),
      h("div", { class: "space-y-4" },
        h(Panel, { title: t("ui.stage1_short"), icon: "fa-file-alt", color: "border-emerald-500", isOpen: t1Open, onToggle: () => setT1Open(!t1Open) },
          h("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-5" },
            ...TAHAP1.map(f => h(FileInput, { key: f.id, id: f.id, label: f.label, accept: f.accept, amber: f.amber }))),
          h("button", { onClick: () => handleUpload(1), disabled: uploading, class: "w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition mt-4 disabled:opacity-50" },
            h(Icon, { name: "cloud-upload-alt", class: "mr-1" }), uploading ? t("ui.uploading") : t("ui.upload_berkas_tahap_1"))),
        h(Panel, { title: t("ui.stage2_short"), icon: "fa-plane-departure", color: "border-sky-500", isOpen: t2Open, onToggle: () => setT2Open(!t2Open) },
          h("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-5" },
            ...TAHAP2.map(f => h(FileInput, { key: f.id, id: f.id, label: f.label, accept: f.accept }))),
          h("button", { onClick: () => handleUpload(2), disabled: uploading, class: "w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-lg transition mt-4 disabled:opacity-50" },
            h(Icon, { name: "cloud-upload-alt", class: "mr-1" }), uploading ? t("ui.uploading") : t("ui.upload_berkas_tahap_2"))),
        h(Panel, { title: t("candidate.biodata_title"), icon: "fa-user-edit", color: "border-amber-500", isOpen: bioOpen, onToggle: () => setBioOpen(!bioOpen) },
          h("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4" },
            h(Section, { title: "candidate.bio_personal" }),
            h(Input, { label: "candidate.bio_email", field: "email", type: "email" }),
            h(Input, { label: "candidate.bio_pob", field: "tempat_lahir" }),
            h(Input, { label: "candidate.form_dob", field: "tgl_lahir", type: "date" }),
            h(Textarea, { label: "candidate.bio_address", field: "alamat_lengkap" }),
            h(Section, { title: "ui.family_data" }),
            h(Input, { label: "candidate.bio_father", field: "nama_ayah" }),
            h(Input, { label: "candidate.bio_father_dob", field: "ttl_ayah" }),
            h(Input, { label: "candidate.bio_mother", field: "nama_ibu" }),
            h(Input, { label: "candidate.bio_mother_dob", field: "ttl_ibu" }),
            h(Section, { title: "candidate.bio_passport" }),
            h(Input, { label: "candidate.bio_pass_num", field: "no_pasport" }),
            h(Input, { label: "candidate.bio_coe_num", field: "no_coe" }),
            h(Input, { label: "ui.passport_city", field: "kota_pasport" }),
            h(Input, { label: "candidate.bio_pass_issue", field: "tgl_pasport" }),
            h(Input, { label: "candidate.bio_pass_exp", field: "exp_pasport" }),
            h(Section, { title: "ui.company_data" }),
            h(Input, { label: "candidate.bio_comp_name", field: "nama_perusahaan" }),
            h(Input, { label: "candidate.bio_shacou", field: "nama_shacou" }),
            h(Input, { label: "ui.company_phone", field: "telp_perusahaan" }),
            h(Input, { label: "candidate.bio_comp_web", field: "web_perusahaan" }),
            h(Textarea, { label: "candidate.bio_comp_address", field: "alamat_perusahaan" })),
          h("button", { onClick: handleSaveBio, disabled: uploading, class: "w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg transition mt-4 text-sm disabled:opacity-50" },
            h(Icon, { name: "save", class: "mr-1" }), uploading ? t("ui.saving") : t("ui.save_biodata"))))));
}

declare function showToast(msg: string, type: string): void;
