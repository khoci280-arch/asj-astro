/**
 * LokerTable.tsx - Public job listing table with status filters
 * Source: legacy/js/render/public.ts renderPublicFiltered()
 * Matches legacy: sorting, limit 10, pamflet, gender badges,
 * Detail/Template/Apply buttons, filter counts, syarat + keterangan
 */
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import PamfletModal from "./PamfletModal";
import { t } from '../../store/i18n';
import LokerDetailModal from './LokerDetailModal';

// NOTE: Shared Job type available at types/api.ts
// This local interface extends it with public-view specific fields
interface Job {
  code: string;
  pekerjaan: string;
  status: string;
  tahapan: string;
  keterangan: string;
  kategori: string;
  kuota: string;
  gender: string;
  lokasi: string;
  syarat: string;
  rincianBiaya?: string;
  totalBiaya?: string;
  pamflet?: string;
  templateCv?: string;
  dokumenShare?: string;
  createdAt?: string;
}

const LIMIT_INITIAL = 10;
// ─── Named Constants ───
const TABLE_MIN_WIDTH = "700px";
const COL_WIDTH = { CODE: "w-24", ACTION: "w-28" } as const;
const COL_MIN_WIDTH = { JOB: "180px", REQ: "140px" } as const;



export default function LokerTable() {
  const [isDark, setIsDark] = useState(() => typeof document !== "undefined" ? !document.documentElement.classList.contains("light") : true);
  function toggleTheme() { document.documentElement.classList.toggle("light"); setIsDark(!isDark); localStorage.setItem("asjTheme", !isDark ? "light" : "dark"); }
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(LIMIT_INITIAL);
  const [pamfletUrl, setPamfletUrl] = useState("");
  const [showPamflet, setShowPamflet] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    try {
      const res = await fetch("/.netlify/functions/get-app-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAppData", args: ["public"] }),
      });
      const data = await res.json();
      if (data.success && data.jobs) setJobs(data.jobs);
    } catch (err) {
      console.error("[LokerTable] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === "ALL"
    ? jobs
    : jobs.filter((j) => (j.status || "").toUpperCase().includes(filter));

  const sorted = [...filtered].sort((a, b) => {
    const aO = (a.status || "").toUpperCase().includes("OPEN") ? 1 : 0;
    const bO = (b.status || "").toUpperCase().includes("OPEN") ? 1 : 0;
    if (aO !== bO) return bO - aO;
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt((a.code || "").replace(/D/g, "")) || 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt((b.code || "").replace(/D/g, "")) || 0;
    return tB - tA;
  });

  const displayed = sorted.slice(0, limit);

  function getStatusBadge(status: string) {
    const s = (status || "").toUpperCase();
    if (s.includes("OPEN"))
      return <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-emerald-600 text-white border-emerald-400/60"><i class="fas fa-door-open"></i> {t("status.open")}</span>;
    if (s.includes("URGENT"))
      return <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-red-600 text-white border-red-400/60 animate-pulse"><i class="fas fa-exclamation-triangle"></i> {t("status.urgent")}</span>;
    if (s.includes("CLOSE"))
      return <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-red-600 text-white border-red-400/60"><i class="fas fa-door-closed"></i> {t("status.close")}</span>;
    return <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-slate-800 text-slate-300 border-slate-600"><i class="fas fa-tag"></i> {status || "-"}</span>;
  }

  function getGenderBadge(gender: string) {
    const g = (gender || "").toUpperCase();
    // Use raw gender text — already contains emojis and readable text from API
    const lbl = gender || "-";
    if (g.includes("PRIA") || g.includes("LAKI"))
      return <span class="px-2 py-0.5 bg-blue-900/50 text-blue-300 border border-blue-500/50 rounded text-[10px] font-bold shadow-sm whitespace-nowrap"><i class="fas fa-mars mr-1"></i> {lbl}</span>;
    if (g.includes("WANITA") || g.includes("PEREMPUAN"))
      return <span class="px-2 py-0.5 bg-pink-900/50 text-pink-300 border border-pink-500/50 rounded text-[10px] font-bold shadow-sm whitespace-nowrap"><i class="fas fa-venus mr-1"></i> {lbl}</span>;
    return <span class="px-2 py-0.5 bg-purple-900/50 text-purple-300 border border-purple-500/50 rounded text-[10px] font-bold shadow-sm whitespace-nowrap"><i class="fas fa-venus-mars mr-1"></i> {lbl || "-"}</span>;
  }

  function jobTutupUntukLamar(j: Job) {
    if (!j) return true;
    if ((j.status || "").toUpperCase().includes("CLOSE")) return true;
    const tp = (j.tahapan || "").toUpperCase().trim();
    if (!tp || tp === "-" || tp === "LIST" || tp === "PENCARIAN" || tp === "PENDAFTARAN" || tp === "OPEN" || tp === "DAFTAR" || tp === "MENUNGGU" || tp === "REVIEW") return false;
    return /KAIWA|MENDAN|MENSETSU|LOLOS|USER|MCU|PARPOR|PASPOR|KONTRAK|COE|SISKOP|E-?ID|VISA|FLIGHT|BERANGKAT|TERBANG|TIKET|NAITEI|PEMBERKASAN|MEDICAL/i.test(tp);
  }

  /** Open application form via bridge, fallback to WhatsApp */
  async function openForm(job: Job) {
    try { const res = await fetch("/.netlify/functions/bridge-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generateFormBridge", args: [job.code, job.kategori || "", "", "", job.dokumenShare || ""] }) }); const data = await res.json(); if (data.formUrl) { window.location.href = data.formUrl; } else { window.open("https://wa.me/6287889502004?text=" + encodeURIComponent("Halo Admin ASJ, saya tertarik lowongan " + job.code + " (" + job.pekerjaan + ")."), "_blank"); } } catch { window.open("https://wa.me/6287889502004?text=" + encodeURIComponent("Halo Admin ASJ, saya tertarik lowongan " + job.code + " (" + job.pekerjaan + ")."), "_blank"); }
    
  }

  function filterCount(s: string) {
    if (s === "ALL") return jobs.length;
    return jobs.filter(j => (j.status || "").toUpperCase().includes(s)).length;
  }

  const fDefs = [
    { key: "ALL", icon: "fa-th-large", lbl: t("public.all"), cls: "bg-slate-700 hover:bg-slate-600 text-white" },
    { key: "OPEN", icon: "fa-door-open", lbl: t("public.open"), cls: "bg-emerald-600 hover:bg-emerald-500 text-white" },
    { key: "URGENT", icon: "fa-bolt", lbl: t("public.urgent"), cls: "bg-amber-500 hover:bg-amber-400 text-white" },
    { key: "CLOSE", icon: "fa-door-closed", lbl: t("public.close"), cls: "bg-red-600 hover:bg-red-500 text-white" },
  ];

  return (
    <div class="animate-fade-in">
      <div class="flex flex-wrap justify-between items-center p-4 rounded-xl border border-slate-700 shadow-lg mb-6 gap-4 bg-slate-900">
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-300 mr-1 uppercase tracking-widest"><i class="fas fa-paint-brush"></i> Tema</span>
          <button onClick={toggleTheme} class="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/25 rounded-full text-xs font-bold transition-colors shadow-lg flex items-center gap-1.5">
            <i class={"fas fa-" + (isDark ? "moon" : "sun")}></i> {isDark ? "Dark" : "Light"}
          </button>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <span class="text-xs font-bold text-slate-300 mr-2 uppercase tracking-widest"><i class="fas fa-filter"></i> Filter</span>
           {fDefs.map(fd => {
            const btnCls = "px-4 py-2 rounded-lg text-sm font-bold shadow-md transition " + (filter === fd.key ? fd.cls : "bg-slate-700 hover:bg-slate-600 text-slate-200");
            const cntCls = "px-1.5 py-0.5 rounded-full text-[9px] ml-0.5 font-black " + (filter === fd.key ? "bg-white/30 text-white" : "bg-slate-900 text-slate-200");
            return (
              <button key={fd.key} onClick={() => { setFilter(fd.key); setLimit(LIMIT_INITIAL); }} class={btnCls}>
                <i class={"fas " + fd.icon + " mr-1"}></i> {fd.lbl} <span class={cntCls}>{filterCount(fd.key)}</span>
              </button>
            );
          })}
          <span class="text-xs text-slate-500 font-bold ml-2">{displayed.length} / {filtered.length} {t("public.lowongan_count")}</span>
        </div>
      </div>
      <div class="overflow-x-auto rounded-xl border border-slate-800 shadow-xl bg-slate-900">
        <table class="w-full min-w-[900px] text-left text-sm whitespace-nowrap">
          <thead class="bg-slate-800 text-slate-200 text-sm uppercase tracking-wider font-bold border-b border-slate-700">
            <tr>
              <th scope="col" class="p-2 text-center w-24">{t("table.code")}</th>
              <th scope="col" class="p-2 min-w-[180px]">{t("table.job")}</th>
              <th scope="col" class="p-2 text-center">{t("table.status")}</th>
              <th scope="col" class="p-2 min-w-[140px] max-w-[200px]">{t("table.req")}</th>
              <th scope="col" class="p-1.5 text-center w-20">{t("table.action")}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} class="p-8 text-center text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i> {t("public.loading")}</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={5} class="p-10 text-center text-slate-500 font-bold">{t("public.empty")}</td></tr>
            ) : displayed.map((job, i) => (
              <tr key={job.code || i} class="rt-row border-b border-slate-800 hover:bg-white/5 transition">
                <td data-label={t("table.code")} class="p-2 font-mono text-xs text-center font-bold align-top text-sky-400">{job.code || "-"}</td>
                <td data-label={t("table.job")} class="rt-full p-2 align-top whitespace-normal min-w-[180px]">
                  <div class="flex items-start gap-4">
                    {job.pamflet && job.pamflet !== "-" && job.pamflet.length > 5 && (
                      <img src={job.pamflet} loading="lazy" decoding="async" class="hidden sm:block w-12 h-16 md:w-16 md:h-24 object-cover rounded-lg border border-slate-600 shadow-md cursor-pointer hover:scale-105 transition-all flex-shrink-0" title={t("ui.click_zoom")} alt="Pamflet" onClick={() => { setPamfletUrl(job.pamflet || ""); setShowPamflet(true); }} />
                    )}
                    <div class="flex flex-col pt-1">
                      <span class="font-bold text-base text-white leading-tight">{job.pekerjaan || "-"}</span>
                      <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span class="text-[11px] text-slate-300"><i class="fas fa-map-marker-alt mr-1 text-red-400"></i> {job.lokasi || "-"}</span>
                        {getGenderBadge(job.gender)}
                      </div>
                    </div>
                  </div>
                </td>
                <td data-label={t("table.status")} class="p-1.5 text-center align-top text-xs">{getStatusBadge(job.status)}</td>
                <td data-label={t("table.req")} class="rt-full p-2 text-xs text-slate-300 whitespace-normal min-w-[140px] max-w-[200px] leading-relaxed align-top">
                  {(job.syarat || "").split(",").map(s => s.trim()).filter(Boolean).join(", ")}
                  {job.keterangan && job.keterangan !== "-" && (
                    <div class="mt-2 pt-2 border-t border-slate-700/50 text-[10px] text-amber-300/90 leading-relaxed"><i class="fas fa-info-circle mr-1"></i> {job.keterangan}</div>
                  )}
                </td>
                <td data-label={t("table.action")} class="rt-full p-1 align-top w-20">
                  <div class="flex flex-row gap-1 items-center justify-center">
                    <button onClick={() => setSelectedJob(job)} class="px-2 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-[0_4px_15px_rgba(245,158,11,0.4)] transition text-[10px] font-black border border-amber-500/50" title={t("button.detail")}><i class="fas fa-eye"></i> <span class="hidden sm:inline">{t("button.detail")}</span></button>
                    {job.templateCv && job.templateCv !== "-" && (
                      <a href={job.templateCv} target="_blank" class="inline-flex items-center justify-center px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-[0_4px_15px_rgba(2,132,199,0.4)] transition text-[10px] font-bold border border-sky-500/50"><i class="fas fa-download"></i> <span class="hidden sm:inline">{t("button.format")}</span></a>
                    )}
                    {jobTutupUntukLamar(job) ? (
                      <button disabled class="px-2 py-1.5 bg-slate-600 rounded-lg text-white text-[10px] font-bold opacity-50 cursor-not-allowed shadow-inner border border-slate-500">{t("button.closed")}</button>
                    ) : (
                      <button onClick={() => openForm(job)} class="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-[0_4px_15px_rgba(5,150,105,0.4)] transition text-[11px] font-bold border border-emerald-500/50"><i class="fas fa-paper-plane"></i> <span class="hidden sm:inline">{t("button.apply")}</span></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > limit && (
        <div class="p-5 text-center">
          <button onClick={() => setLimit(prev => prev + 10)} class="px-6 py-2.5 bg-slate-800 text-white rounded-full text-xs font-bold shadow-lg hover:bg-slate-700 transition">
            {t("button.more")} <i class="fas fa-chevron-down ml-2"></i>
          </button>
        </div>
      )}

      {selectedJob && <LokerDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
          <PamfletModal isOpen={showPamflet} url={pamfletUrl} onClose={() => setShowPamflet(false)} />
</div>
  );
}
