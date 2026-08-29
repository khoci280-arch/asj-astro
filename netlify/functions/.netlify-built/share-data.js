"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/_lib/env.ts
function normalizeKey(raw) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function parseLine(line) {
  const kv = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (kv) return { key: kv[1], value: kv[2].trim() };
  const pipeFull = line.match(/^\s*\|\s*(.+?)\s*\|\s*([^|]*?)\s*\|\s*$/);
  if (pipeFull) {
    const key = normalizeKey(pipeFull[1]);
    if (key) return { key, value: pipeFull[2].trim() };
  }
  const pipeTail = line.match(/^\s*\|\s*(.+?)\s*\|\s*([^|]*)$/);
  if (pipeTail) {
    const key = normalizeKey(pipeTail[1]);
    if (key) return { key, value: pipeTail[2].trim() };
  }
  return null;
}
function loadFileEnv() {
  if (fileEnv) return fileEnv;
  fileEnv = {};
  try {
    const p = import_path.default.join(process.cwd(), ".env.local");
    if (!import_fs.default.existsSync(p)) return fileEnv;
    const lines = import_fs.default.readFileSync(p, "utf8").split(/\r?\n/);
    let currentVar = "";
    for (const line of lines) {
      const cm = line.match(/^\s*#+\s*(.+?)\s*$/);
      if (cm) {
        currentVar = normalizeKey(cm[1]);
        continue;
      }
      const parsed = parseLine(line);
      if (!parsed) continue;
      let val = parsed.value;
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      const isScope = SCOPE_ROWS.has(parsed.key);
      const target = isScope ? ALIASES[currentVar] || currentVar : ALIASES[parsed.key] || parsed.key;
      if (!WHITELIST.has(target)) continue;
      if (isScope) {
        if (parsed.key === "PRODUCTION" || !(target in fileEnv)) {
          fileEnv[target] = val;
        }
      } else {
        fileEnv[target] = val;
      }
    }
  } catch {
  }
  return fileEnv;
}
function env(key) {
  const v = process.env[key] !== void 0 && process.env[key] !== "" ? process.env[key] : loadFileEnv()[key] || "";
  if (key === "NETLIFY_SITE_URL") {
    const m = String(v).match(/https?:\/\/[a-z0-9.-]+(?::\d+)?/i);
    if (m) return m[0];
  }
  return v;
}
var import_fs, import_path, WHITELIST, SCOPE_ROWS, ALIASES, fileEnv;
var init_env = __esm({
  "netlify/functions/_lib/env.ts"() {
    "use strict";
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    WHITELIST = /* @__PURE__ */ new Set([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_KEY",
      "GEMINI_API_KEY",
      "FONNTE_TOKEN",
      "FONNTE_API_KEY",
      "ADMIN_PASSWORD",
      "ADMIN_MASTER_PASSWORD",
      "MASTER_PASSWORD",
      "ASJ_ADMIN_PASSWORD",
      "ADMIN_PIN",
      "PIN_ADMIN",
      "ADMIN_MASTER_PIN",
      "ADMIN_NUMBERS",
      "PIN_KHOCI",
      "GROQ_API_KEY",
      "SUPABASE_STORAGE_BUCKET",
      "LOG_DRAIN_TOKEN",
      "CLOUDINARY_URL",
      "NETLIFY_SITE_URL",
      "SESSION_SECRET",
      "ASJ_ADMINS",
      "SENTRY_DSN",
      "FIREBASE_SERVICE_ACCOUNT"
    ]);
    SCOPE_ROWS = /* @__PURE__ */ new Set([
      "PRODUCTION",
      "DEPLOY_PREVIEW",
      "BRANCH_DEPLOY",
      "LOCAL_DEVELOPMENT_NETLIFY_CLI"
    ]);
    ALIASES = {
      SERVICE_ROLE_KEY: "SUPABASE_SERVICE_ROLE_KEY",
      SERVICE_KEY: "SUPABASE_SERVICE_ROLE_KEY",
      SUPABASE_KEY: "SUPABASE_SERVICE_ROLE_KEY",
      ANON_KEY: "SUPABASE_ANON_KEY",
      SUPABASE_ANON: "SUPABASE_ANON_KEY",
      GEMINI_KEY: "GEMINI_API_KEY",
      GEMINI: "GEMINI_API_KEY",
      GOOGLE_GEMINI_KEY: "GEMINI_API_KEY",
      FONNTE: "FONNTE_TOKEN",
      FONNTE_API: "FONNTE_TOKEN",
      MASTER_PIN: "ADMIN_MASTER_PIN",
      ADMIN_PIN: "ADMIN_MASTER_PIN",
      SESSION_KEY: "SESSION_SECRET",
      ASJ_ADMIN: "ASJ_ADMINS"
    };
    fileEnv = null;
  }
});

// netlify/functions/shared/wa-rules.ts
function normalizeWa(raw) {
  let s = String(raw || "").replace(/[^0-9]/g, "");
  if (s.startsWith("0")) s = "62" + s.slice(1);
  if (s.startsWith("620")) s = "62" + s.slice(3);
  if (!s.startsWith("628")) return "";
  return s;
}
var init_wa_rules = __esm({
  "netlify/functions/shared/wa-rules.ts"() {
    "use strict";
  }
});

// netlify/functions/_lib/db/client.ts
function supabaseUrl() {
  return env("SUPABASE_URL");
}
function supabaseKey() {
  return env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_ANON_KEY") || env("SUPABASE_KEY");
}
async function supabaseJson(method, pathname, opts = {}) {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) throw new Error("SUPABASE_URL / key belum dikonfigurasi");
  const qs = opts.query ? "?" + // @ts-expect-error JS→TS migration
  new URLSearchParams(Object.entries(opts.query).map(([k, v]) => [k, String(v)])).toString() : "";
  const res = await fetch(url.replace(/\/$/, "") + "/rest/v1/" + pathname + qs, {
    method,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      // @ts-expect-error JS→TS migration
      ...opts.headers || {}
    },
    // @ts-expect-error JS→TS migration
    body: opts.body ? JSON.stringify(opts.body) : void 0
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(pathname + " \u2192 HTTP " + res.status + " " + text2.slice(0, 200));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
async function findTable(candidates, limit = 300) {
  for (const t of candidates) {
    try {
      const rows = await supabaseJson("GET", t, {
        query: { select: "*", limit }
      });
      if (Array.isArray(rows)) return { table: t, rows };
    } catch {
    }
  }
  return { table: null, rows: [] };
}
function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== void 0 && row[k] !== null && row[k] !== "") return row[k];
  }
  return null;
}
function toText(v) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
var init_client = __esm({
  "netlify/functions/_lib/db/client.ts"() {
    "use strict";
    init_env();
    init_wa_rules();
  }
});

// netlify/functions/_lib/db/jobs.ts
async function findJobs() {
  return findTable([
    "job_database",
    "jobs",
    "lokers",
    "loker",
    "lowongan",
    "job_listings",
    "joblistings",
    "tbl_jobs",
    "data_loker"
  ]);
}
async function findJobByCodeFiltered(code) {
  const want = String(code || "").trim();
  if (!want) return void 0;
  let anyOk = false;
  for (const col of ["code_job", "code"]) {
    try {
      const rows = await supabaseJson("GET", "job_database", {
        query: { select: "*", limit: "1", [col]: "eq." + want }
      });
      anyOk = true;
      if (Array.isArray(rows) && rows.length) return rows[0];
    } catch {
    }
  }
  return anyOk ? null : void 0;
}
var init_jobs = __esm({
  "netlify/functions/_lib/db/jobs.ts"() {
    "use strict";
    init_client();
  }
});

// netlify/functions/_lib/db/forms.ts
function parseDocs(keterangan) {
  const out = [];
  String(keterangan || "").split(";").forEach((chunk) => {
    const i = chunk.indexOf(":");
    if (i <= 0) return;
    const nama = chunk.slice(0, i).trim();
    const url = chunk.slice(i + 1).trim();
    if (!nama || !url || !/^https?:\/\//i.test(url)) return;
    out.push({ nama, url });
  });
  return out;
}
async function findForms() {
  const rows = await supabaseJson("GET", "database_asj_form", {
    query: { select: "*", order: "timestamp.desc", limit: 500 }
  });
  return Array.isArray(rows) ? rows : [];
}
async function findFormsByWaList(waList) {
  const list = [
    ...new Set((Array.isArray(waList) ? waList : []).map((w) => normalizeWa(w)).filter(Boolean))
  ];
  if (!list.length) return [];
  const inList = list.join(",");
  const tryQuery = async (query) => {
    try {
      const light = await supabaseJson("GET", "database_asj_form", {
        query: { ...query, select: FORM_LIGHT_COLS }
      });
      if (Array.isArray(light)) return light;
    } catch {
    }
    try {
      const full = await supabaseJson("GET", "database_asj_form", { query });
      if (Array.isArray(full)) return full;
    } catch {
    }
    return void 0;
  };
  const r1 = await tryQuery({ limit: "500", or: `(no_wa.in.(${inList}),wa.in.(${inList}))` });
  if (r1 !== void 0) return r1;
  return tryQuery({ limit: "500", no_wa: "in.(" + inList + ")" });
}
var FORM_LIGHT_COLS;
var init_forms = __esm({
  "netlify/functions/_lib/db/forms.ts"() {
    "use strict";
    init_client();
    FORM_LIGHT_COLS = "id,timestamp,code_job,kategory,nama_lengkap,no_wa,status,folder_url,pas_photo,jft,ssw,file_cv,keterangan,feedback_berkas,created_at,updated_at";
  }
});

// netlify/functions/_lib/db/candidates.ts
function mapCandidate(row) {
  const nama = toText(pick(row, ["nama_lengkap", "nama", "name", "full_name"]));
  const wa = toText(
    pick(row, ["no_wa", "wa", "whatsapp", "telepon", "phone", "no_hp", "telp"])
  ).replace(/\D/g, "");
  const idKandidat = toText(pick(row, ["id_kandidat", "id", "kandidat_id", "uid"]));
  const tb = toText(pick(row, ["tb"]));
  const bb = toText(pick(row, ["bb"]));
  const tempatLahir = toText(pick(row, ["tempat_lahir", "tempatLahir"]));
  const tglLahir = toText(pick(row, ["tgl_lahir", "tglLahir", "tanggal_lahir"]));
  return {
    idKandidat,
    id: idKandidat,
    nama,
    wa,
    gender: toText(pick(row, ["gender", "jenis_kelamin", "jk"])),
    usia: toText(pick(row, ["usia", "umur"])),
    tb,
    bb,
    // Gabungan TB/BB & TTL (komentar asli: dihitung backend mapCandidate).
    tbBb: tb && tb !== "-" || bb && bb !== "-" ? [tb, bb].filter((x) => x && x !== "-").join(" / ") : "-",
    ttl: [tempatLahir, tglLahir].filter((x) => x && x !== "-").join(", ") || "-",
    pendidikan: toText(pick(row, ["pendidikan"])),
    pasPhoto: pick(row, ["pas_photo", "pasPhoto", "photo"]) || "",
    email: toText(pick(row, ["email"])),
    tempatLahir,
    tglLahir,
    alamat: toText(pick(row, ["alamat_lengkap", "alamat", "address"])),
    jftText: toText(pick(row, ["nilai_jft_text", "jft_text"])),
    sswText: toText(pick(row, ["bidang_ssw_text", "ssw_text"])),
    catatanInt: toText(pick(row, ["catatan_internal", "catatan_int"])),
    catatanExt: toText(pick(row, ["catatan_external", "catatan_ext"])),
    catatan: toText(pick(row, ["catatan_admin"])),
    tahapan: toText(pick(row, ["tahapan_seleksi", "tahapan"])),
    status: toText(pick(row, ["status_kandidat", "status"])),
    idLoker: toText(pick(row, ["id_loker_pilihan", "id_loker"])),
    folderUrl: pick(row, ["folder_url", "folderUrl"]) || "",
    jft: pick(row, ["jft", "file_jft"]) || "",
    ssw: pick(row, ["ssw", "file_ssw"]) || "",
    fileCv: pick(row, ["file_cv", "fileCv", "cv"]) || "",
    // Alias jftUrl/sswUrl/cvUrl — dibaca modal CV admin (dossier) & dashboard.
    // Backend lama (Netlify GAS) mengembalikan nama ini; tanpa alias, tombol
    // FORMAT CV / SERTIF JFT / SERTIF SSW di dossier tidak pernah muncul.
    jftUrl: pick(row, ["jft", "file_jft"]) || "",
    sswUrl: pick(row, ["ssw", "file_ssw"]) || "",
    cvUrl: pick(row, ["file_cv", "fileCv", "cv"]) || "",
    nik: toText(pick(row, ["nik"])),
    noPasport: toText(pick(row, ["no_pasport", "no_paspor"])),
    tanggalDaftar: pick(row, ["tanggal_daftar", "tanggalDaftar"]) || "",
    createdAt: pick(row, ["created_at"]) || "",
    _raw: row
  };
}
async function findCandidates() {
  return findTable(CAND_TABLES);
}
async function findCandidatesByJobFiltered(code) {
  const want = String(code || "").trim();
  if (!want) return void 0;
  try {
    const rows = await supabaseJson("GET", "database_candidate", {
      query: { select: "*", limit: "500", id_loker_pilihan: "ilike.*" + want + "*" }
    });
    return Array.isArray(rows) ? rows : void 0;
  } catch {
    return void 0;
  }
}
var CAND_TABLES;
var init_candidates = __esm({
  "netlify/functions/_lib/db/candidates.ts"() {
    "use strict";
    init_client();
    CAND_TABLES = [
      "database_candidate",
      "master_database_candidate",
      "candidates",
      "kandidat",
      "calon",
      "data_kandidat",
      "siswa",
      "candidate_data",
      "master_kandidat"
    ];
  }
});

// netlify/functions/_lib/storage.ts
function bucket() {
  return env("SUPABASE_STORAGE_BUCKET") || "asj-files";
}
async function storageRequest(method, pathname, opts = {}) {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) throw new Error("Supabase belum dikonfigurasi");
  const res = await fetch(url.replace(/\/$/, "") + "/storage/v1/" + pathname, {
    method,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      // @ts-expect-error JS→TS migration
      ...opts.headers || {}
    },
    // @ts-expect-error JS→TS migration
    body: opts.body
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error("storage/" + pathname + " \u2192 HTTP " + res.status + " " + text2.slice(0, 200));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
var init_storage = __esm({
  "netlify/functions/_lib/storage.ts"() {
    "use strict";
    init_client();
    init_env();
  }
});

// netlify/functions/_lib/db/master.ts
var init_master = __esm({
  "netlify/functions/_lib/db/master.ts"() {
    "use strict";
    init_client();
  }
});

// netlify/functions/_lib/db/berkas.ts
async function listStorageFolder(prefix) {
  if (!prefix) return [];
  try {
    const j = await storageRequest("POST", "object/list/" + bucket(), {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix,
        limit: 200,
        sortBy: { column: "name", order: "asc" }
      })
    });
    return Array.isArray(j) ? j.filter((f) => f && f.name && !String(f.name).endsWith("/")).map((f) => String(f.name)) : [];
  } catch {
    return [];
  }
}
var BERKAS_COLUMNS;
var init_berkas = __esm({
  "netlify/functions/_lib/db/berkas.ts"() {
    "use strict";
    init_client();
    init_storage();
    init_master();
    BERKAS_COLUMNS = [
      ["kk", ["kk_url", "kk"]],
      ["akte", ["akte_url", "akte"]],
      ["sd", ["sd_url", "ijazah_sd_url", "ijazah_sd", "sd"]],
      ["smp", ["smp_url", "ijazah_smp_url", "ijazah_smp", "smp"]],
      ["sma", ["sma_url", "ijazah_sma_url", "ijazah_sma", "sma"]],
      ["univ", ["univ_url", "univ"]],
      ["pasport", ["pasport_url", "pasport"]],
      ["mcu", ["mcu_url", "mcu"]],
      ["kontrak", ["kontrak_url", "kontrak"]],
      ["cert", ["cert_url", "certificate_japan", "cert"]],
      ["ktp", ["ktp_url", "ktp"]],
      ["foto2", ["foto2_url", "pas_foto_studio", "foto2"]],
      ["ijinortu", ["ijinortu_url", "ijin_ortu", "ijinortu"]],
      ["cpmi", ["cpmi_url", "cpmi"]],
      ["kawin", ["kawin_url", "buku_nikah", "kawin"]],
      ["sehat", ["sehat_url", "surat_sehat", "sehat"]],
      ["bpjs", ["bpjs_url", "bpjs"]],
      ["psikotes", ["psikotes_url", "psikotes"]]
    ];
  }
});

// netlify/functions/_lib/actions-share.ts
var actions_share_exports = {};
__export(actions_share_exports, {
  docTypeOf: () => docTypeOf,
  handleShareData: () => handleShareData
});
async function handleShareData(jobCode) {
  const code = String(jobCode || "").trim();
  if (!code) return { error: "Kode job tidak ditemukan." };
  try {
    let jobRow = await findJobByCodeFiltered(code);
    if (jobRow === void 0) {
      const found = await findJobs();
      jobRow = found.rows.find((r) => String(pick(r, ["code_job", "code"]) || "") === code) || null;
    }
    if (!jobRow) return { error: "Kode job tidak ditemukan: " + code };
    const name = toText(pick(jobRow, ["pekerjaan", "nama_pekerjaan", "judul", "title"]));
    let candRows = await findCandidatesByJobFiltered(code);
    if (candRows === void 0) {
      const cands = await findCandidates();
      candRows = cands.rows;
    }
    const rows = (Array.isArray(candRows) ? candRows : []).filter(
      (r) => String(pick(r, ["id_loker_pilihan", "id_loker"]) || "").split(",").map((s) => s.trim()).includes(code)
    );
    const mapped = rows.map(mapCandidate);
    const storageBase = supabaseUrl().replace(/\/$/, "");
    const pubBase = storageBase + "/storage/v1/object/public/asj-files/";
    const waList = mapped.map((c) => normalizeWa(String(c.wa || ""))).filter(Boolean);
    let forms = await findFormsByWaList(waList);
    if (forms === void 0) forms = await findForms();
    const byWa = /* @__PURE__ */ new Map();
    const formsByWa = /* @__PURE__ */ new Map();
    for (const f of forms) {
      const w = normalizeWa(String(f.no_wa || f.wa || f.whatsapp || ""));
      if (!w) continue;
      if (!byWa.has(w)) byWa.set(w, []);
      for (const d of parseDocs(toText(f.keterangan))) byWa.get(w).push(d);
      if (!formsByWa.has(w)) formsByWa.set(w, []);
      formsByWa.get(w).push(f);
    }
    let pemberkasanRows = [];
    let masterRows = [];
    try {
      const [pRes, mRes] = await Promise.all([
        waList.length > 0 && waList.length <= 150 ? supabaseJson("GET", "pemberkasan_checklist", {
          query: { select: "*", wa: "in.(" + waList.join(",") + ")" }
        }).catch(() => null) : Promise.resolve(null),
        waList.length > 0 && waList.length <= 150 ? supabaseJson("GET", "master_database_candidate", {
          query: { select: "*", no_wa: "in.(" + waList.join(",") + ")" }
        }).catch(() => null) : Promise.resolve(null)
      ]);
      pemberkasanRows = Array.isArray(pRes) ? pRes : [];
      masterRows = Array.isArray(mRes) ? mRes : [];
    } catch {
    }
    const pByWa = /* @__PURE__ */ new Map();
    for (const r of pemberkasanRows) {
      pByWa.set(normalizeWa(String(r.wa || "")), r);
    }
    const mByWa = /* @__PURE__ */ new Map();
    for (const r of masterRows) {
      mByWa.set(normalizeWa(String(r.no_wa || r.wa || "")), r);
    }
    const rawShareDocs = toText(pick(jobRow, ["dokumen_share", "dokumenshare"])).toUpperCase();
    const allowedDocTypes = new Set(
      rawShareDocs ? rawShareDocs.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : ["CV", "JFT", "SSW"]
    );
    const showAllDocs = allowedDocTypes.has("ALL");
    const candidates = [];
    for (const c of mapped) {
      const folder = "master/" + String(c.nama || "").toUpperCase().replace(/\s+/g, "_") + "/";
      let names = [];
      try {
        names = await listStorageFolder(folder);
      } catch {
      }
      const mainBasenames = [c.pasPhoto, c.fileCv, c.jft, c.ssw].map((u) => {
        try {
          return decodeURIComponent(
            String(u || "").split("/").pop()
          );
        } catch {
          return String(u || "").split("/").pop();
        }
      }).filter(Boolean);
      const mainTypes = /* @__PURE__ */ new Set(["CV", "JFT", "SSW", "PHOTO"]);
      for (const b of mainBasenames) {
        const t = docTypeOf(b);
        if (t) mainTypes.add(t);
      }
      const byType = /* @__PURE__ */ new Map();
      for (const n of names) {
        if (mainBasenames.indexOf(n) !== -1) continue;
        const t = docTypeOf(n);
        if (mainTypes.has(t)) continue;
        const prev = byType.get(t);
        if (!prev || docAge(n) > docAge(prev.name)) {
          byType.set(t, { name: n, url: pubBase + folder + encodeURIComponent(n) });
        }
      }
      const rawExtraDocs = [...byType.values()];
      const extraDocs = showAllDocs ? rawExtraDocs : rawExtraDocs.filter((d) => {
        const t = docTypeOf(d.name);
        return allowedDocTypes.has(t);
      });
      const formDocs = (byWa.get(normalizeWa(String(c.wa || ""))) || []).filter(
        (d) => showAllDocs || allowedDocTypes.has(docTypeOf(d.name))
      );
      const seenUrl = new Set(extraDocs.map((d) => d.url));
      for (const d of formDocs) {
        if (!seenUrl.has(String(d.url))) {
          seenUrl.add(String(d.url));
          extraDocs.push(d);
        }
      }
      const pRow = pByWa.get(normalizeWa(String(c.wa || "")));
      const mRow = mByWa.get(normalizeWa(String(c.wa || "")));
      const pemberkasanSources = [pRow, mRow].filter(Boolean);
      for (const src of pemberkasanSources) {
        for (const [key, cols] of BERKAS_COLUMNS) {
          let v = "";
          for (const col of cols) {
            if (src[col]) {
              v = String(src[col]);
              break;
            }
          }
          if (v && v !== "-" && v.startsWith("http") && !seenUrl.has(v)) {
            const label = String(key).toUpperCase();
            if (!showAllDocs && !allowedDocTypes.has(label)) continue;
            seenUrl.add(v);
            extraDocs.push({ name: label, url: v });
          }
        }
      }
      let pasPhoto = c.pasPhoto;
      if (!pasPhoto || pasPhoto === "-") {
        const photoFile = names.find((n) => docTypeOf(n) === "PHOTO");
        if (photoFile) pasPhoto = pubBase + folder + encodeURIComponent(photoFile);
      }
      let finalCv = c.fileCv;
      let finalJft = c.jft;
      let finalSsw = c.ssw;
      const cWa = normalizeWa(String(c.wa || ""));
      const formRows = formsByWa.get(cWa) || [];
      const pickFirstForm = (fields) => {
        for (const r of formRows) {
          const v = toText(pick(r, fields));
          if (v && v !== "-" && v !== "null") return v;
        }
        return null;
      };
      if (!pasPhoto || pasPhoto === "-") {
        const fPhoto = pickFirstForm(["pas_photo", "pasPhoto", "photo"]);
        if (fPhoto) pasPhoto = fPhoto;
      }
      if (!finalJft || finalJft === "-") {
        const fJft = pickFirstForm(["jft", "jft_url"]);
        if (fJft) finalJft = fJft;
      }
      if (!finalSsw || finalSsw === "-") {
        const fSsw = pickFirstForm(["ssw", "ssw_url"]);
        if (fSsw) finalSsw = fSsw;
      }
      if (!finalCv || finalCv === "-") {
        const fCv = pickFirstForm(["file_cv", "cv", "cv_url"]);
        if (fCv) finalCv = fCv;
      }
      for (let i = extraDocs.length - 1; i >= 0; i--) {
        const doc = extraDocs[i];
        const t = docTypeOf(doc.name);
        if (t === "CV" && (!finalCv || finalCv === "-")) {
          finalCv = doc.url;
          extraDocs.splice(i, 1);
        } else if (t === "JFT" && (!finalJft || finalJft === "-")) {
          finalJft = doc.url;
          extraDocs.splice(i, 1);
        } else if (t === "SSW" && (!finalSsw || finalSsw === "-")) {
          finalSsw = doc.url;
          extraDocs.splice(i, 1);
        }
      }
      candidates.push({
        id_kandidat: c.idKandidat,
        no_wa: c.wa,
        nama_lengkap: c.nama,
        gender: c.gender,
        usia: c.usia,
        tb: c.tb,
        bb: c.bb,
        pas_photo: pasPhoto,
        file_cv: finalCv,
        jft: finalJft,
        ssw: finalSsw,
        nilai_jft_text: c.jftText,
        bidang_ssw_text: c.sswText,
        extraDocs
      });
    }
    const tsk = toText(pick(jobRow, ["tsk", "pengurus"]));
    return { job: { code, name, tsk }, candidates };
  } catch (e) {
    return { error: "Gagal memuat data share: " + e.message };
  }
}
function docTypeOf(name) {
  const base = String(name || "").replace(/\.[a-z0-9]+$/i, "");
  const up = base.toUpperCase();
  for (const tk of TYPE_TOKENS) {
    if (tk.length > 3 && up.includes(tk)) {
      return TYPE_ALIAS[tk] || tk;
    }
  }
  const m = base.match(/^[A-Z]+/);
  const prefix = m ? m[0] : null;
  if (prefix && TYPE_ALIAS[prefix]) return TYPE_ALIAS[prefix];
  if (prefix && prefix.length >= 2) return prefix;
  for (const tk of TYPE_TOKENS) {
    if (tk.length >= 2 && up.includes(tk)) {
      return TYPE_ALIAS[tk] || tk;
    }
  }
  return up;
}
function docAge(name) {
  const m = String(name || "").match(/_(\d{10,})/);
  return m ? Number(m[1]) : 0;
}
var TYPE_ALIAS, TYPE_TOKENS;
var init_actions_share = __esm({
  "netlify/functions/_lib/actions-share.ts"() {
    "use strict";
    init_client();
    init_jobs();
    init_forms();
    init_candidates();
    init_berkas();
    TYPE_ALIAS = {
      CVFILE: "CV",
      FILE_CV: "CV",
      CV_REVISI: "CV",
      PHOTOFILE: "PHOTO",
      PAS_PHOTO: "PHOTO",
      PASSPHOTO: "PHOTO",
      FOTO: "PHOTO",
      PHOTO: "PHOTO",
      JFTFILE: "JFT",
      SSWFILE: "SSW",
      KARTU_KELUARGA: "KK"
    };
    TYPE_TOKENS = [
      "PAS_PHOTO",
      "PHOTOFILE",
      "KARTU_KELUARGA",
      "CVFILE",
      "FILE_CV",
      "CV_REVISI",
      "JFTFILE",
      "SSWFILE",
      "PASSPHOTO",
      "PASSPORT",
      "IJAZAH",
      "KTP",
      "KK",
      "CV",
      "JFT",
      "SSW",
      "FOTO",
      "PHOTO"
    ];
  }
});

// netlify/functions/share-data.cjs
var { handleShareData: handleShareData2 } = (init_actions_share(), __toCommonJS(actions_share_exports));
exports.handler = async (event) => {
  const job = event.queryStringParameters && event.queryStringParameters.job || "";
  let out;
  try {
    out = await handleShareData2(job);
  } catch (e) {
    out = { error: "Error internal: " + e.message };
  }
  return {
    statusCode: out.error ? 400 : 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(out)
  };
};
