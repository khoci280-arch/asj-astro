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
function debugFileEnvKeys() {
  return Object.keys(loadFileEnv());
}
function debugFileStructure() {
  const info = {
    cwd: process.cwd(),
    exists: false,
    size: 0,
    lines: 0,
    keys: [],
    // Klasifikasi bentuk baris (nilai tidak pernah ditampilkan):
    keyValue: 0,
    // KEY=value
    jsonKey: 0,
    // "KEY": value (format JSON)
    comment: 0,
    // # ... / ; ...
    blank: 0,
    other: 0,
    otherShapes: []
    // klasifikasi bentuk baris lain (tanpa isi)
  };
  try {
    let fieldShape2 = function(f) {
      const t = f.trim();
      if (/^https?:\/\//.test(t)) return "url";
      if (/^ey[A-Za-z0-9_-]+$/.test(t) && t.length > 20) return "jwt";
      if (/^\d+$/.test(t)) return "num";
      if (/^[A-Za-z][A-Za-z0-9_. -]{0,40}$/.test(t)) return "word";
      if (t === "\u2705" || t === "\u2714" || t === "\u2713") return "check";
      if (t === "") return "empty";
      return "mixed(" + t.length + ")";
    }, maskVal2 = function(v) {
      if (v === "") return "(kosong)";
      const s = v.length <= 12 ? v.charAt(0) + "\u2026(" + v.length + ")" : v.slice(0, 3) + "\u2026" + v.slice(-3) + " (" + v.length + ")";
      return s;
    };
    var fieldShape = fieldShape2, maskVal = maskVal2;
    const p = import_path.default.join(process.cwd(), ".env.local");
    const st = import_fs.default.statSync(p);
    info.exists = true;
    info.size = st.size;
    const content = import_fs.default.readFileSync(p, "utf8");
    const rawLines = content.split(/\r?\n/);
    info.lines = rawLines.length;
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (parseLine(line)) {
        info.keyValue++;
        info.keys.push(parseLine(line).key);
      } else if (trimmed.startsWith("#") || trimmed.startsWith(";")) {
        info.comment++;
      } else if (trimmed === "") {
        info.blank++;
      } else {
        info.other++;
        const shape = trimmed.startsWith("{") ? "{obj" : trimmed.startsWith("[") ? "[arr" : trimmed.startsWith('"') ? '"str' : "len" + trimmed.length + ":" + trimmed.charAt(0);
        if (info.otherShapes.length < 5 && !info.otherShapes.includes(shape)) {
          info.otherShapes.push(shape);
        }
      }
    }
    info.keys = [...new Set(info.keys)];
    const keyStats = {};
    for (const line of rawLines) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      const s = keyStats[parsed.key] || { count: 0, valueLen: 0, valueHasPipe: false };
      s.count++;
      s.valueLen = parsed.value.length;
      if (parsed.value.includes("|")) s.valueHasPipe = true;
      keyStats[parsed.key] = s;
    }
    info.keyStats = Object.entries(keyStats).map(([k, s]) => ({ key: k, ...s }));
    const prefixCount = {};
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
      if (parseLine(line)) continue;
      const cls = trimmed.startsWith("|-") ? "|- (separator tabel)" : trimmed.startsWith("|") ? "| (pipe lain)" : trimmed.startsWith("-") ? "- (dash)" : trimmed.startsWith("{") ? "{ (obj)" : "lainnya";
      prefixCount[cls] = (prefixCount[cls] || 0) + 1;
    }
    info.otherPrefix = prefixCount;
    const shapeCount = {};
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
      if (parseLine(line)) continue;
      const fields = trimmed.split("|").map(fieldShape2);
      const pat = fields.join(" | ");
      shapeCount[pat] = (shapeCount[pat] || 0) + 1;
    }
    info.otherFieldShapes = Object.entries(shapeCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([pat, cnt]) => pat + " x" + cnt);
    const masked = [];
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
      if (parseLine(line)) continue;
      const m = trimmed.match(/^\s*\|\s*([^|]*)/);
      if (m) {
        const f = m[1].trim();
        const mask = f.length <= 8 ? f.charAt(0) + "\u2026" : f.slice(0, 5) + "\u2026" + f.slice(-5) + " (" + f.length + ")";
        if (!masked.includes(mask)) masked.push(mask);
      }
    }
    info.otherMaskedKeys = masked.slice(0, 12);
    const linesDump = [];
    for (let i = 0; i < Math.min(rawLines.length, 30); i++) {
      const line = rawLines[i];
      const trimmed = line.trim();
      if (trimmed === "") continue;
      const parsed = parseLine(line);
      if (parsed) {
        linesDump.push(i + 1 + ": " + parsed.key + " = " + maskVal2(parsed.value));
      } else if (trimmed.startsWith("#")) {
        const text = trimmed.replace(/^#+\s*/, "").trim();
        linesDump.push(i + 1 + ": # " + (text.length > 60 ? text.slice(0, 60) + "\u2026" : text));
      } else {
        const fields = trimmed.split("|");
        linesDump.push(i + 1 + ": [" + fields.map((f) => maskVal2(f.trim())).join(" | ") + "]");
      }
    }
    info.linesDump = linesDump;
    const allComments = [];
    for (const line of rawLines) {
      const m = line.match(/^\s*#+\s*(.+?)\s*$/);
      if (m) allComments.push(m[1]);
    }
    info.comments = [...new Set(allComments)];
  } catch {
  }
  return info;
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

// netlify/functions/_lib/session.ts
function secret() {
  return env("SESSION_SECRET") || env("ADMIN_PASSWORD") || env("ASJ_ADMIN_PASSWORD") || env("ADMIN_MASTER_PIN") || env("PIN_KHOCI") || // Fallback lokal — DI PRODUKSI pastikan SESSION_SECRET / ADMIN_* di-set
  // supaya token tidak bisa dipalsukan dengan nilai yang ada di repo.
  "asj-portal-local-secret";
}
function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = import_crypto.default.createHmac("sha256", secret()).update(body).digest("base64url");
  return body + "." + sig;
}
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expect = import_crypto.default.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !import_crypto.default.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
var import_crypto;
var init_session = __esm({
  "netlify/functions/_lib/session.ts"() {
    "use strict";
    import_crypto = __toESM(require("crypto"), 1);
    init_env();
  }
});

// netlify/functions/_lib/rate-limit.ts
function prune(now) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now && b.lockUntil < now) buckets.delete(k);
  }
}
function getBucket(key, now) {
  let b = buckets.get(key);
  if (!b) {
    b = { count: 0, fails: 0, resetAt: now, lockUntil: 0 };
    buckets.set(key, b);
    prune(now);
  }
  return b;
}
function check(key, opts) {
  const now = Date.now();
  const limit = opts.limit || 5;
  const windowMs = opts.windowMs || 6e4;
  const b = getBucket(key, now);
  if (b.lockUntil > now) {
    return { ok: false, retryAfter: Math.ceil((b.lockUntil - now) / 1e3), locked: true };
  }
  if (now >= b.resetAt) {
    b.resetAt = now + windowMs;
    b.count = 0;
    b.fails = 0;
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1e3) };
  }
  return { ok: true };
}
function fail(key, opts) {
  const now = Date.now();
  const windowMs = opts.windowMs || 6e4;
  const lockoutAfter = opts.lockoutAfter || 0;
  const lockoutMs = opts.lockoutMs || 0;
  const b = getBucket(key, now);
  if (now >= b.resetAt) {
    b.resetAt = now + windowMs;
    b.count = 0;
    b.fails = 0;
  }
  b.fails += 1;
  if (lockoutAfter > 0 && b.fails >= lockoutAfter) {
    b.lockUntil = now + lockoutMs;
    b.fails = 0;
  }
}
var buckets, MAX_BUCKETS;
var init_rate_limit = __esm({
  "netlify/functions/_lib/rate-limit.ts"() {
    "use strict";
    buckets = /* @__PURE__ */ new Map();
    MAX_BUCKETS = 2e4;
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
function isValidWaFormat(wa) {
  return /^628\d{10,11}$/.test(wa);
}
var init_wa_rules = __esm({
  "netlify/functions/shared/wa-rules.ts"() {
    "use strict";
  }
});

// netlify/functions/_lib/db/client.ts
var client_exports = {};
__export(client_exports, {
  columnsFromSchema: () => columnsFromSchema,
  findTable: () => findTable,
  getSchema: () => getSchema,
  hasBackend: () => hasBackend,
  normalizeGender: () => normalizeGender,
  normalizeStatus: () => normalizeStatus,
  normalizeWa: () => normalizeWa,
  pick: () => pick,
  supabaseJson: () => supabaseJson,
  supabaseKey: () => supabaseKey,
  supabasePaged: () => supabasePaged,
  supabaseUpsert: () => supabaseUpsert,
  supabaseUrl: () => supabaseUrl,
  tablesFromSchema: () => tablesFromSchema,
  toText: () => toText
});
function supabaseUrl() {
  return env("SUPABASE_URL");
}
function supabaseKey() {
  return env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_ANON_KEY") || env("SUPABASE_KEY");
}
function hasBackend() {
  return !!(supabaseUrl() && supabaseKey());
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
async function supabaseUpsert(table, row, conflictCols, opts = {}) {
  const cols = conflictCols.join(",");
  try {
    return await supabaseJson("POST", table, {
      ...opts,
      body: row,
      query: { ...opts.query || {}, on_conflict: cols },
      // Gabung Prefer pemanggil (mis. return=minimal) dengan resolution upsert.
      headers: {
        ...opts.headers || {},
        Prefer: (opts.headers && opts.headers.Prefer || "return=minimal") + ",resolution=merge-duplicates"
      }
    });
  } catch (e) {
    if (!String(e && e.message || "").includes("42P10")) throw e;
    return supabaseJson("POST", table, {
      ...opts,
      body: row,
      headers: { ...opts.headers || {}, Prefer: "return=minimal" }
    });
  }
}
async function supabasePaged(table, qs, { start, end } = {}) {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) throw new Error("SUPABASE_URL / key belum dikonfigurasi");
  const res = await fetch(url.replace(/\/$/, "") + "/rest/v1/" + table + (qs ? "?" + qs : ""), {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      Range: start + "-" + end,
      Prefer: "count=exact"
    }
  });
  if (!res.ok) {
    throw new Error(table + " \u2192 HTTP " + res.status + " " + (await res.text()).slice(0, 150));
  }
  const rows = await res.json();
  const cr = res.headers.get("content-range") || "";
  const total = parseInt(String(cr).split("/")[1] || "0", 10) || rows.length;
  return { rows, total };
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
function normalizeStatus(v) {
  const s = toText(v).toUpperCase();
  if (s.includes("URGENT")) return "URGENT";
  if (s === "") return "CLOSE";
  if (s.includes("CLOSE") || s.includes("TUTUP") || s.includes("SELESAI")) {
    return "CLOSE";
  }
  return "OPEN";
}
function normalizeGender(v) {
  const s = toText(v).trim().toUpperCase();
  if (!s || s === "-") return "";
  if (s === "L" || s === "LK" || s === "M" || s === "PRIA" || s === "MALE" || s.includes("LAKI"))
    return "LAKI-LAKI";
  if (s === "P" || s === "PR" || s === "F" || s === "W" || s === "FEMALE" || s === "WANITA" || s === "CEWEK" || s.includes("PEREMPUAN") || s.includes("\u5973"))
    return "PEREMPUAN";
  return "";
}
async function getSchema() {
  if (!hasBackend()) return null;
  try {
    return await supabaseJson("GET", "", {});
  } catch {
    return null;
  }
}
function tablesFromSchema(spec) {
  if (!spec || !spec.paths) return [];
  return Object.keys(spec.paths).map((p) => p.replace(/^\//, "")).filter(Boolean);
}
function columnsFromSchema(spec, table) {
  if (!spec || !spec.components || !spec.components.schemas) return [];
  const s = spec.components.schemas[table];
  return s && s.properties ? Object.keys(s.properties) : [];
}
var init_client = __esm({
  "netlify/functions/_lib/db/client.ts"() {
    "use strict";
    init_env();
    init_wa_rules();
  }
});

// netlify/functions/_lib/db/jobs.ts
function mapJob(row) {
  const pekerjaan = pick(row, [
    "pekerjaan",
    "nama_pekerjaan",
    "judul",
    "title",
    "pekerjaan_loker",
    "nama_loker",
    "posisi",
    "job"
  ]);
  const klien = pick(row, ["perusahaan", "klien", "company", "client"]);
  const code = toText(
    pick(row, ["code_job", "code", "kode", "no_loker", "id_loker", "id_lowongan", "id"])
  );
  const templateCv = pick(row, ["format_cv", "template_cv", "templatecv", "cv_template"]) || "";
  return {
    // id:0 + rowIndex=kode — persis perilaku backend asli (diverifikasi dari
    // situs live asjportal.netlify.app).
    id: 0,
    code,
    rowIndex: code,
    pekerjaan: klien ? pekerjaan + " - " + klien : pekerjaan,
    kategori: toText(pick(row, ["kategori", "category", "bidang", "sektor"])),
    // status & gender dikirim MENTAH (persis backend asli — frontend sudah
    // menghandle nilai seperti "❌ CLOSE", "👨 Pria👩 Wanita").
    status: toText(pick(row, ["status", "state", "is_open"])),
    lokasi: toText(pick(row, ["lokasi", "location", "prefektur", "kota", "area"])),
    gender: toText(pick(row, ["gender", "jenis_kelamin", "jk"])),
    kuota: (() => {
      const kv = pick(row, ["kuota", "quota", "jml_kuota"]);
      return kv == null || kv === "" || kv === 0 ? "" : toText(kv);
    })(),
    jumlahKandidat: Number(pick(row, ["jumlah_kandidat", "jumlahKandidat"])) || 0,
    syarat: toText(pick(row, ["syarat", "persyaratan", "requirements", "requirement"])),
    keterangan: toText(pick(row, ["keterangan", "deskripsi", "description", "info_tambahan"])),
    tahapan: toText(pick(row, ["tahapan", "tahapan_seleksi"])),
    tsk: toText(pick(row, ["tsk", "pengurus"])),
    dokumenShare: toText(pick(row, ["dokumen_share", "dokumenshare", "dokumen", "docs_share"])),
    template: templateCv,
    templateCv,
    pamflet: toText(pick(row, ["link_pamflet", "pamflet", "poster", "flyer", "brosur"])),
    rincianBiaya: toText(pick(row, ["rincian_biaya", "rincianbiaya", "biaya_rincian", "rincian"])),
    totalBiaya: toText(pick(row, ["total_biaya", "totalbiaya", "total"])),
    createdAt: toText(pick(row, ["created_at", "createdat", "tanggal", "date_created", "tgl"])),
    _raw: row
  };
}
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
async function countCandidatesForJob(code) {
  try {
    const rows = await supabaseJson("GET", "database_candidate", {
      query: { select: "id", id_loker_pilihan: "eq." + String(code), limit: "1" }
    });
    return Array.isArray(rows) ? rows.length > 0 : void 0;
  } catch {
    return void 0;
  }
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
async function maxJobCodeNumber() {
  try {
    const rows = await supabaseJson("GET", "job_database", {
      query: { select: "code_job", order: "code_job.desc", limit: "20" }
    });
    if (!Array.isArray(rows) || rows.length === 0) return void 0;
    let max = 0;
    let found = false;
    for (const r of rows) {
      const m = String(r.code_job || r.code || "").match(/TG(\d+)ASJ/);
      if (m) {
        max = Math.max(max, parseInt(m[1], 10));
        found = true;
      }
    }
    return found ? max : void 0;
  } catch {
    return void 0;
  }
}
var init_jobs = __esm({
  "netlify/functions/_lib/db/jobs.ts"() {
    "use strict";
    init_client();
  }
});

// netlify/functions/_lib/db/forms.ts
function mapForm(row, i) {
  return {
    rowIndex: i,
    id: row.id,
    timestamp: toText(row.timestamp || row.created_at),
    code: toText(row.code_job),
    kategori: toText(row.kategory),
    nama: toText(row.nama_lengkap),
    wa: toText(row.no_wa).replace(/\D/g, ""),
    status: toText(row.status) || "MENUNGGU",
    folderUrl: row.folder_url || "",
    photo: row.pas_photo || "",
    jft: row.jft || "",
    ssw: row.ssw || "",
    cv: row.file_cv || "",
    keterangan: toText(row.keterangan),
    // Aktivitas terakhir kandidat (status UPDATE): "[BIODATA] email diubah · [UPLOAD KTP]".
    feedback: toText(row.feedback_berkas),
    // Dokumen tambahan dari keterangan "NAMA:URL;NAMA2:URL2;..." — dipakai
    // mail inbox untuk menampilkan SEMUA yang di-upload kandidat + preview.
    docs: parseDocs(toText(row.keterangan))
  };
}
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
async function findFormsLight() {
  try {
    const rows = await supabaseJson("GET", "database_asj_form", {
      query: { select: FORM_LIGHT_COLS, order: "timestamp.desc", limit: 500 }
    });
    return Array.isArray(rows) ? rows : void 0;
  } catch {
    return void 0;
  }
}
async function findFormsByWa(wa) {
  const want = normalizeWa(wa);
  if (!want) return [];
  try {
    const rows = await supabaseJson("GET", "database_asj_form", {
      query: {
        select: "*",
        limit: "100",
        order: "timestamp.desc",
        or: `(no_wa.eq.${want},wa.eq.${want})`
      }
    });
    if (Array.isArray(rows)) return rows;
  } catch {
  }
  try {
    const rows = await supabaseJson("GET", "database_asj_form", {
      query: { select: "*", limit: "100", order: "timestamp.desc", no_wa: "eq." + want }
    });
    if (Array.isArray(rows)) return rows;
  } catch {
  }
  return void 0;
}
async function upsertFormRow(body) {
  try {
    await supabaseJson("POST", "database_asj_form", {
      query: { on_conflict: "no_wa,code_job" },
      body,
      headers: { Prefer: "return=minimal,resolution=merge-duplicates" }
    });
  } catch (e) {
    if (!String(e.message || "").includes("42P10")) throw e;
    await supabaseJson("POST", "database_asj_form", {
      body,
      headers: { Prefer: "return=minimal" }
    });
  }
}
async function findFormByIndexFiltered(idx) {
  const i = Number(idx);
  if (!Number.isInteger(i) || i < 0) return void 0;
  try {
    const rows = await supabaseJson("GET", "database_asj_form", {
      query: { select: "*", order: "timestamp.desc", limit: "1", offset: String(i) }
    });
    return Array.isArray(rows) ? rows[0] || null : void 0;
  } catch {
    return void 0;
  }
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
function publicUrl(path2) {
  return supabaseUrl().replace(/\/$/, "") + "/storage/v1/object/public/" + bucket() + "/" + path2;
}
function b64ToBuffer(data) {
  let s = String(data || "");
  const comma = s.indexOf(",");
  if (comma >= 0 && /^data:/i.test(s.slice(0, comma + 1))) s = s.slice(comma + 1);
  return Buffer.from(s, "base64");
}
function mimeFromName(name, fallback) {
  const ext = String(name || "").split(".").pop().toLowerCase();
  const map = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text"
  };
  return map[ext] || fallback || "application/octet-stream";
}
function stemAliases(stem) {
  const u = String(stem || "").toUpperCase();
  const m = {
    PAS_PHOTO: ["PHOTOFILE", "PASPHOTO", "FOTO"],
    PHOTOFILE: ["PAS_PHOTO", "PASPHOTO", "FOTO"],
    PASPHOTO: ["PAS_PHOTO", "PHOTOFILE", "FOTO"],
    CV: ["CVFILE", "FILE_CV", "CV_REVISI"],
    CVFILE: ["CV", "FILE_CV", "CV_REVISI"],
    CV_REVISI: ["CV", "CVFILE", "FILE_CV"],
    JFT: ["JFTFILE"],
    JFTFILE: ["JFT"],
    SSW: ["SSWFILE"],
    SSWFILE: ["SSW"],
    KK: ["KARTU_KELUARGA"],
    KARTU_KELUARGA: ["KK"]
  };
  return m[u] || [];
}
function isVarianOf(name, stem) {
  const n = String(name || "");
  if (!n || !stem) return false;
  if (n.startsWith(stem + ".")) return true;
  return n.startsWith(stem + "_");
}
async function hapusJenisVarian(folder, stem) {
  const f = String(folder).replace(/^\/+|\/+$/g, "");
  const stems = [String(stem || "")].concat(stemAliases(stem)).filter(Boolean);
  try {
    const list = await storageRequest("POST", "object/list/" + bucket(), {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: f + "/", limit: 300, offset: 0 })
    });
    const items = Array.isArray(list) ? list : [];
    const victims = items.map((o) => o && o.name ? String(o.name) : "").filter((n) => n && stems.some((s) => isVarianOf(n, s)));
    if (victims.length) {
      await storageRequest("DELETE", "object/" + bucket(), {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: victims.map((n) => f + "/" + n) })
      });
    }
  } catch (e) {
  }
}
async function uploadBase64(data, folder, fileName) {
  if (!data) return null;
  const buf = b64ToBuffer(data);
  const cleanName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const stem = cleanName.split(".")[0];
  await hapusJenisVarian(folder, stem);
  const path2 = String(folder).replace(/^\/+|\/+$/g, "") + "/" + cleanName;
  await storageRequest("POST", "object/" + bucket() + "/" + path2, {
    headers: {
      // @ts-expect-error JS→TS migration
      "Content-Type": mimeFromName(cleanName),
      "x-upsert": "true"
    },
    body: buf
  });
  return publicUrl(path2);
}
async function resolveFileUrl(value, folder, fileName) {
  if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  return uploadBase64(value, folder, fileName);
}
var init_storage = __esm({
  "netlify/functions/_lib/storage.ts"() {
    "use strict";
    init_client();
    init_env();
  }
});

// netlify/functions/_lib/db/master.ts
async function fetchMasterByWa(waList) {
  const inList = waList.join(",");
  try {
    const rows = await supabaseJson("GET", "master_database_candidate", {
      query: {
        select: "*",
        limit: "500",
        or: `(no_wa.in.(${inList}),wa.in.(${inList}),whatsapp.in.(${inList}))`
      }
    });
    if (Array.isArray(rows)) return rows;
  } catch {
  }
  try {
    const rows = await supabaseJson("GET", "master_database_candidate", {
      query: { select: "*", limit: "500", no_wa: "in.(" + inList + ")" }
    });
    if (Array.isArray(rows)) return rows;
  } catch {
  }
  return null;
}
async function fetchMasterLightByWa(waList) {
  const inList = waList.join(",");
  const tryQuery = async (query) => {
    try {
      const light = await supabaseJson("GET", "master_database_candidate", {
        query: { ...query, select: MASTER_LIGHT_COLS }
      });
      if (Array.isArray(light)) return light;
    } catch {
    }
    try {
      const full = await supabaseJson("GET", "master_database_candidate", { query });
      if (Array.isArray(full)) return full;
    } catch {
    }
    return null;
  };
  const r1 = await tryQuery({
    limit: "500",
    or: `(no_wa.in.(${inList}),wa.in.(${inList}),whatsapp.in.(${inList}))`
  });
  if (r1 !== null) return r1;
  return tryQuery({ limit: "500", no_wa: "in.(" + inList + ")" });
}
var MASTER_LIGHT_COLS;
var init_master = __esm({
  "netlify/functions/_lib/db/master.ts"() {
    "use strict";
    init_client();
    MASTER_LIGHT_COLS = "id,id_kandidat,nama_lengkap,no_wa,kk_url,ijazah_sd_url,ijazah_smp_url,ijazah_sma_url,univ_url,ktp_url,email,tempat_lahir,tgl_lahir,alamat_lengkap,no_coe,exp_pasport";
  }
});

// netlify/functions/_lib/db/berkas.ts
async function fetchBerkasByWa(waList) {
  try {
    const rows = await supabaseJson("GET", "pemberkasan_checklist", {
      query: { select: "*", limit: "500", wa: "in.(" + waList.join(",") + ")" }
    });
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}
async function attachBerkasBio(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return candidates;
  try {
    const waList = [
      ...new Set(candidates.map((c) => normalizeWa(String(c.wa || ""))).filter(Boolean))
    ];
    const useFilter = waList.length > 0 && waList.length <= 150;
    let pRows = null;
    let mRows = null;
    if (useFilter) {
      const [p, m] = await Promise.all([fetchBerkasByWa(waList), fetchMasterLightByWa(waList)]);
      pRows = p;
      mRows = m;
    }
    if (!Array.isArray(pRows)) {
      try {
        pRows = await supabaseJson("GET", "pemberkasan_checklist", {
          query: { select: "*", limit: 500 }
        });
      } catch {
        pRows = [];
      }
    }
    if (!Array.isArray(mRows)) {
      try {
        mRows = await supabaseJson("GET", "master_database_candidate", {
          query: { select: "*", limit: 500 }
        });
      } catch {
        mRows = [];
      }
    }
    const pByWa = /* @__PURE__ */ new Map();
    for (const r of Array.isArray(pRows) ? pRows : []) {
      pByWa.set(normalizeWa(String(r.wa || "")), r);
    }
    const mByWa = /* @__PURE__ */ new Map();
    for (const r of Array.isArray(mRows) ? mRows : []) {
      mByWa.set(normalizeWa(String(pick(r, ["no_wa", "wa", "whatsapp"]) || "")), r);
    }
    for (const c of candidates) {
      const want = normalizeWa(String(c.wa || ""));
      const pr = pByWa.get(want);
      const mr = mByWa.get(want);
      const sources = [pr, mr].filter(Boolean);
      if (sources.length) {
        const berkas = {};
        for (const [key, cols] of BERKAS_COLUMNS) {
          let v = "";
          for (const src of sources) {
            for (const col of cols) {
              if (src[col]) {
                v = src[col];
                break;
              }
            }
            if (v) break;
          }
          berkas[key] = v && v !== "-" ? toText(v) : "";
        }
        c.berkas = berkas;
      } else {
        c.berkas = {};
      }
      if (mr) {
        const bio = {};
        for (const [key, cols] of BIO_COLUMNS) {
          const v = pick(mr, cols);
          bio[key] = v && v !== "-" ? toText(v) : "";
        }
        c.bio = bio;
      } else {
        c.bio = {};
      }
    }
  } catch (e) {
  }
  return candidates;
}
var BERKAS_COLUMNS, BIO_COLUMNS;
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
    BIO_COLUMNS = [
      ["email", ["email"]],
      ["tmplahir", ["tempat_lahir", "tmplahir"]],
      ["tgllahir", ["tgl_lahir", "tgllahir"]],
      ["alamat", ["alamat_lengkap", "alamat"]],
      ["ayah", ["nama_ayah", "ayah"]],
      ["ttlayah", ["ttl_ayah", "ttlayah"]],
      ["ibu", ["nama_ibu", "ibu"]],
      ["ttlibu", ["ttl_ibu", "ttlibu"]],
      ["pasport", ["no_pasport", "pasport"]],
      ["coe", ["no_coe", "coe"]],
      ["kotapasport", ["kota_pasport", "kotapasport"]],
      ["tglpasport", ["tgl_pasport", "tglpasport"]],
      ["exppasport", ["exp_pasport", "exppasport"]],
      ["pt", ["nama_perusahaan", "pt"]],
      ["shacou", ["nama_shacou", "shacou"]],
      ["telppt", ["telp_perusahaan", "telppt"]],
      ["webpt", ["web_perusahaan", "webpt"]],
      ["alamatpt", ["alamat_perusahaan", "alamatpt"]]
    ];
  }
});

// netlify/functions/_lib/db/misc.ts
async function findAdmins() {
  return findTable([
    "user_sessions",
    "admin_users",
    "admins",
    "admin",
    "staff",
    "users",
    "pengguna"
  ]);
}
async function findSettings() {
  return findTable([
    "sys_config",
    "assets",
    "settings",
    "app_config",
    "config",
    "system_config",
    "pengaturan",
    "site_config"
  ]);
}
async function findAssets() {
  const found = await findSettings();
  for (const row of found.rows) {
    const logo = pick(row, ["logo", "LOGO", "logo_url", "logoUrl", "assets_logo"]) || row.assets && typeof row.assets === "object" && row.assets.LOGO;
    if (logo) {
      const nested = (k) => row.assets && typeof row.assets === "object" && row.assets[k] || null;
      return {
        LOGO: logo,
        BANNER: {
          TOKYO: pick(row, ["banner_tokyo", "banner", "BANNER_TOKYO"]) || nested("BANNER")?.TOKYO || null,
          SAKURA: pick(row, ["banner_sakura", "banner_sakura_url"]) || nested("BANNER")?.SAKURA || null
        },
        FOOTER: {
          TOKYO: pick(row, ["footer_tokyo", "footer", "footer_momiji"]) || nested("FOOTER")?.TOKYO || null,
          SAKURA: pick(row, ["footer_sakura"]) || nested("FOOTER")?.SAKURA || null
        },
        SOCIAL: {
          whatsapp: pick(row, ["wa_admin", "whatsapp_admin", "social_wa"]) || nested("SOCIAL")?.whatsapp || null,
          instagram: pick(row, ["ig", "instagram", "social_ig"]) || nested("SOCIAL")?.instagram || null,
          tiktok: pick(row, ["tiktok", "social_tiktok"]) || nested("SOCIAL")?.tiktok || null,
          maps: pick(row, ["maps", "maps_link", "lokasi_maps"]) || nested("SOCIAL")?.maps || null
        }
      };
    }
  }
  return null;
}
var init_misc = __esm({
  "netlify/functions/_lib/db/misc.ts"() {
    "use strict";
    init_client();
  }
});

// node_modules/bcryptjs/index.js
function randomBytes(len) {
  try {
    return crypto.getRandomValues(new Uint8Array(len));
  } catch {
  }
  try {
    return import_crypto2.default.randomBytes(len);
  } catch {
  }
  if (!randomFallback) {
    throw Error(
      "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
    );
  }
  return randomFallback(len);
}
function setRandomFallback(random) {
  randomFallback = random;
}
function genSaltSync(rounds, seed_length) {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== "number")
    throw Error(
      "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
    );
  if (rounds < 4) rounds = 4;
  else if (rounds > 31) rounds = 31;
  var salt = [];
  salt.push("$2b$");
  if (rounds < 10) salt.push("0");
  salt.push(rounds.toString());
  salt.push("$");
  salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join("");
}
function genSalt(rounds, seed_length, callback) {
  if (typeof seed_length === "function")
    callback = seed_length, seed_length = void 0;
  if (typeof rounds === "function") callback = rounds, rounds = void 0;
  if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  else if (typeof rounds !== "number")
    throw Error("illegal arguments: " + typeof rounds);
  function _async(callback2) {
    nextTick(function() {
      try {
        callback2(null, genSaltSync(rounds));
      } catch (err) {
        callback2(err);
      }
    });
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function hashSync(password, salt) {
  if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof salt === "number") salt = genSaltSync(salt);
  if (typeof password !== "string" || typeof salt !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
  return _hash(password, salt);
}
function hash(password, salt, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password === "string" && typeof salt === "number")
      genSalt(salt, function(err, salt2) {
        _hash(password, salt2, callback2, progressCallback);
      });
    else if (typeof password === "string" && typeof salt === "string")
      _hash(password, salt, callback2, progressCallback);
    else
      nextTick(
        callback2.bind(
          this,
          Error("Illegal arguments: " + typeof password + ", " + typeof salt)
        )
      );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function safeStringCompare(known, unknown) {
  var diff = known.length ^ unknown.length;
  for (var i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}
function compareSync(password, hash2) {
  if (typeof password !== "string" || typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
  if (hash2.length !== 60) return false;
  return safeStringCompare(
    hashSync(password, hash2.substring(0, hash2.length - 31)),
    hash2
  );
}
function compare(password, hashValue, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password !== "string" || typeof hashValue !== "string") {
      nextTick(
        callback2.bind(
          this,
          Error(
            "Illegal arguments: " + typeof password + ", " + typeof hashValue
          )
        )
      );
      return;
    }
    if (hashValue.length !== 60) {
      nextTick(callback2.bind(this, null, false));
      return;
    }
    hash(
      password,
      hashValue.substring(0, 29),
      function(err, comp) {
        if (err) callback2(err);
        else callback2(null, safeStringCompare(comp, hashValue));
      },
      progressCallback
    );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function getRounds(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  return parseInt(hash2.split("$")[2], 10);
}
function getSalt(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  if (hash2.length !== 60)
    throw Error("Illegal hash length: " + hash2.length + " != 60");
  return hash2.substring(0, 29);
}
function truncates(password) {
  if (typeof password !== "string")
    throw Error("Illegal arguments: " + typeof password);
  return utf8Length(password) > 72;
}
function utf8Length(string) {
  var len = 0, c = 0;
  for (var i = 0; i < string.length; ++i) {
    c = string.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}
function utf8Array(string) {
  var offset = 0, c1, c2;
  var buffer = new Array(utf8Length(string));
  for (var i = 0, k = string.length; i < k; ++i) {
    c1 = string.charCodeAt(i);
    if (c1 < 128) {
      buffer[offset++] = c1;
    } else if (c1 < 2048) {
      buffer[offset++] = c1 >> 6 | 192;
      buffer[offset++] = c1 & 63 | 128;
    } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
      ++i;
      buffer[offset++] = c1 >> 18 | 240;
      buffer[offset++] = c1 >> 12 & 63 | 128;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    } else {
      buffer[offset++] = c1 >> 12 | 224;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    }
  }
  return buffer;
}
function base64_encode(b, len) {
  var off = 0, rs = [], c1, c2;
  if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
  while (off < len) {
    c1 = b[off++] & 255;
    rs.push(BASE64_CODE[c1 >> 2 & 63]);
    c1 = (c1 & 3) << 4;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 4 & 15;
    rs.push(BASE64_CODE[c1 & 63]);
    c1 = (c2 & 15) << 2;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 6 & 3;
    rs.push(BASE64_CODE[c1 & 63]);
    rs.push(BASE64_CODE[c2 & 63]);
  }
  return rs.join("");
}
function base64_decode(s, len) {
  var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
  if (len <= 0) throw Error("Illegal len: " + len);
  while (off < slen - 1 && olen < len) {
    code = s.charCodeAt(off++);
    c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    code = s.charCodeAt(off++);
    c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c1 == -1 || c2 == -1) break;
    o = c1 << 2 >>> 0;
    o |= (c2 & 48) >> 4;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c3 == -1) break;
    o = (c2 & 15) << 4 >>> 0;
    o |= (c3 & 60) >> 2;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    o = (c3 & 3) << 6 >>> 0;
    o |= c4;
    rs.push(String.fromCharCode(o));
    ++olen;
  }
  var res = [];
  for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
  return res;
}
function _encipher(lr, off, P, S) {
  var n, l = lr[off], r = lr[off + 1];
  l ^= P[0];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[1];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[2];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[3];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[4];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[5];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[6];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[7];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[8];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[9];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[10];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[11];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[12];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[13];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[14];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[15];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[16];
  lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
  lr[off + 1] = l;
  return lr;
}
function _streamtoword(data, offp) {
  for (var i = 0, word = 0; i < 4; ++i)
    word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
  return { key: word, offp };
}
function _key(key, P, S) {
  var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
  for (i = 0; i < plen; i += 2)
    lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _ekskey(data, key, P, S) {
  var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
  offp = 0;
  for (i = 0; i < plen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _crypt(b, salt, rounds, callback, progressCallback) {
  var cdata = C_ORIG.slice(), clen = cdata.length, err;
  if (rounds < 4 || rounds > 31) {
    err = Error("Illegal number of rounds (4-31): " + rounds);
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.length !== BCRYPT_SALT_LEN) {
    err = Error(
      "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
    );
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  rounds = 1 << rounds >>> 0;
  var P, S, i = 0, j;
  if (typeof Int32Array === "function") {
    P = new Int32Array(P_ORIG);
    S = new Int32Array(S_ORIG);
  } else {
    P = P_ORIG.slice();
    S = S_ORIG.slice();
  }
  _ekskey(salt, b, P, S);
  function next() {
    if (progressCallback) progressCallback(i / rounds);
    if (i < rounds) {
      var start = Date.now();
      for (; i < rounds; ) {
        i = i + 1;
        _key(b, P, S);
        _key(salt, P, S);
        if (Date.now() - start > MAX_EXECUTION_TIME) break;
      }
    } else {
      for (i = 0; i < 64; i++)
        for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
      var ret = [];
      for (i = 0; i < clen; i++)
        ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
      if (callback) {
        callback(null, ret);
        return;
      } else return ret;
    }
    if (callback) nextTick(next);
  }
  if (typeof callback !== "undefined") {
    next();
  } else {
    var res;
    while (true) if (typeof (res = next()) !== "undefined") return res || [];
  }
}
function _hash(password, salt, callback, progressCallback) {
  var err;
  if (typeof password !== "string" || typeof salt !== "string") {
    err = Error("Invalid string / salt: Not a string");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var minor, offset;
  if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
    err = Error("Invalid salt version: " + salt.substring(0, 2));
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
  else {
    minor = salt.charAt(2);
    if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
      err = Error("Invalid salt revision: " + salt.substring(2, 4));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    offset = 4;
  }
  if (salt.charAt(offset + 2) > "$") {
    err = Error("Missing salt rounds");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
  password += minor >= "a" ? "\0" : "";
  var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
  function finish(bytes) {
    var res = [];
    res.push("$2");
    if (minor >= "a") res.push(minor);
    res.push("$");
    if (rounds < 10) res.push("0");
    res.push(rounds.toString());
    res.push("$");
    res.push(base64_encode(saltb, saltb.length));
    res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
    return res.join("");
  }
  if (typeof callback == "undefined")
    return finish(_crypt(passwordb, saltb, rounds));
  else {
    _crypt(
      passwordb,
      saltb,
      rounds,
      function(err2, bytes) {
        if (err2) callback(err2, null);
        else callback(null, finish(bytes));
      },
      progressCallback
    );
  }
}
function encodeBase64(bytes, length) {
  return base64_encode(bytes, length);
}
function decodeBase64(string, length) {
  return base64_decode(string, length);
}
var import_crypto2, randomFallback, nextTick, BASE64_CODE, BASE64_INDEX, BCRYPT_SALT_LEN, GENSALT_DEFAULT_LOG2_ROUNDS, BLOWFISH_NUM_ROUNDS, MAX_EXECUTION_TIME, P_ORIG, S_ORIG, C_ORIG, bcryptjs_default;
var init_bcryptjs = __esm({
  "node_modules/bcryptjs/index.js"() {
    import_crypto2 = __toESM(require("crypto"), 1);
    randomFallback = null;
    nextTick = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
    BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
    BASE64_INDEX = [
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      0,
      1,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      -1,
      -1,
      -1,
      -1,
      -1
    ];
    BCRYPT_SALT_LEN = 16;
    GENSALT_DEFAULT_LOG2_ROUNDS = 10;
    BLOWFISH_NUM_ROUNDS = 16;
    MAX_EXECUTION_TIME = 100;
    P_ORIG = [
      608135816,
      2242054355,
      320440878,
      57701188,
      2752067618,
      698298832,
      137296536,
      3964562569,
      1160258022,
      953160567,
      3193202383,
      887688300,
      3232508343,
      3380367581,
      1065670069,
      3041331479,
      2450970073,
      2306472731
    ];
    S_ORIG = [
      3509652390,
      2564797868,
      805139163,
      3491422135,
      3101798381,
      1780907670,
      3128725573,
      4046225305,
      614570311,
      3012652279,
      134345442,
      2240740374,
      1667834072,
      1901547113,
      2757295779,
      4103290238,
      227898511,
      1921955416,
      1904987480,
      2182433518,
      2069144605,
      3260701109,
      2620446009,
      720527379,
      3318853667,
      677414384,
      3393288472,
      3101374703,
      2390351024,
      1614419982,
      1822297739,
      2954791486,
      3608508353,
      3174124327,
      2024746970,
      1432378464,
      3864339955,
      2857741204,
      1464375394,
      1676153920,
      1439316330,
      715854006,
      3033291828,
      289532110,
      2706671279,
      2087905683,
      3018724369,
      1668267050,
      732546397,
      1947742710,
      3462151702,
      2609353502,
      2950085171,
      1814351708,
      2050118529,
      680887927,
      999245976,
      1800124847,
      3300911131,
      1713906067,
      1641548236,
      4213287313,
      1216130144,
      1575780402,
      4018429277,
      3917837745,
      3693486850,
      3949271944,
      596196993,
      3549867205,
      258830323,
      2213823033,
      772490370,
      2760122372,
      1774776394,
      2652871518,
      566650946,
      4142492826,
      1728879713,
      2882767088,
      1783734482,
      3629395816,
      2517608232,
      2874225571,
      1861159788,
      326777828,
      3124490320,
      2130389656,
      2716951837,
      967770486,
      1724537150,
      2185432712,
      2364442137,
      1164943284,
      2105845187,
      998989502,
      3765401048,
      2244026483,
      1075463327,
      1455516326,
      1322494562,
      910128902,
      469688178,
      1117454909,
      936433444,
      3490320968,
      3675253459,
      1240580251,
      122909385,
      2157517691,
      634681816,
      4142456567,
      3825094682,
      3061402683,
      2540495037,
      79693498,
      3249098678,
      1084186820,
      1583128258,
      426386531,
      1761308591,
      1047286709,
      322548459,
      995290223,
      1845252383,
      2603652396,
      3431023940,
      2942221577,
      3202600964,
      3727903485,
      1712269319,
      422464435,
      3234572375,
      1170764815,
      3523960633,
      3117677531,
      1434042557,
      442511882,
      3600875718,
      1076654713,
      1738483198,
      4213154764,
      2393238008,
      3677496056,
      1014306527,
      4251020053,
      793779912,
      2902807211,
      842905082,
      4246964064,
      1395751752,
      1040244610,
      2656851899,
      3396308128,
      445077038,
      3742853595,
      3577915638,
      679411651,
      2892444358,
      2354009459,
      1767581616,
      3150600392,
      3791627101,
      3102740896,
      284835224,
      4246832056,
      1258075500,
      768725851,
      2589189241,
      3069724005,
      3532540348,
      1274779536,
      3789419226,
      2764799539,
      1660621633,
      3471099624,
      4011903706,
      913787905,
      3497959166,
      737222580,
      2514213453,
      2928710040,
      3937242737,
      1804850592,
      3499020752,
      2949064160,
      2386320175,
      2390070455,
      2415321851,
      4061277028,
      2290661394,
      2416832540,
      1336762016,
      1754252060,
      3520065937,
      3014181293,
      791618072,
      3188594551,
      3933548030,
      2332172193,
      3852520463,
      3043980520,
      413987798,
      3465142937,
      3030929376,
      4245938359,
      2093235073,
      3534596313,
      375366246,
      2157278981,
      2479649556,
      555357303,
      3870105701,
      2008414854,
      3344188149,
      4221384143,
      3956125452,
      2067696032,
      3594591187,
      2921233993,
      2428461,
      544322398,
      577241275,
      1471733935,
      610547355,
      4027169054,
      1432588573,
      1507829418,
      2025931657,
      3646575487,
      545086370,
      48609733,
      2200306550,
      1653985193,
      298326376,
      1316178497,
      3007786442,
      2064951626,
      458293330,
      2589141269,
      3591329599,
      3164325604,
      727753846,
      2179363840,
      146436021,
      1461446943,
      4069977195,
      705550613,
      3059967265,
      3887724982,
      4281599278,
      3313849956,
      1404054877,
      2845806497,
      146425753,
      1854211946,
      1266315497,
      3048417604,
      3681880366,
      3289982499,
      290971e4,
      1235738493,
      2632868024,
      2414719590,
      3970600049,
      1771706367,
      1449415276,
      3266420449,
      422970021,
      1963543593,
      2690192192,
      3826793022,
      1062508698,
      1531092325,
      1804592342,
      2583117782,
      2714934279,
      4024971509,
      1294809318,
      4028980673,
      1289560198,
      2221992742,
      1669523910,
      35572830,
      157838143,
      1052438473,
      1016535060,
      1802137761,
      1753167236,
      1386275462,
      3080475397,
      2857371447,
      1040679964,
      2145300060,
      2390574316,
      1461121720,
      2956646967,
      4031777805,
      4028374788,
      33600511,
      2920084762,
      1018524850,
      629373528,
      3691585981,
      3515945977,
      2091462646,
      2486323059,
      586499841,
      988145025,
      935516892,
      3367335476,
      2599673255,
      2839830854,
      265290510,
      3972581182,
      2759138881,
      3795373465,
      1005194799,
      847297441,
      406762289,
      1314163512,
      1332590856,
      1866599683,
      4127851711,
      750260880,
      613907577,
      1450815602,
      3165620655,
      3734664991,
      3650291728,
      3012275730,
      3704569646,
      1427272223,
      778793252,
      1343938022,
      2676280711,
      2052605720,
      1946737175,
      3164576444,
      3914038668,
      3967478842,
      3682934266,
      1661551462,
      3294938066,
      4011595847,
      840292616,
      3712170807,
      616741398,
      312560963,
      711312465,
      1351876610,
      322626781,
      1910503582,
      271666773,
      2175563734,
      1594956187,
      70604529,
      3617834859,
      1007753275,
      1495573769,
      4069517037,
      2549218298,
      2663038764,
      504708206,
      2263041392,
      3941167025,
      2249088522,
      1514023603,
      1998579484,
      1312622330,
      694541497,
      2582060303,
      2151582166,
      1382467621,
      776784248,
      2618340202,
      3323268794,
      2497899128,
      2784771155,
      503983604,
      4076293799,
      907881277,
      423175695,
      432175456,
      1378068232,
      4145222326,
      3954048622,
      3938656102,
      3820766613,
      2793130115,
      2977904593,
      26017576,
      3274890735,
      3194772133,
      1700274565,
      1756076034,
      4006520079,
      3677328699,
      720338349,
      1533947780,
      354530856,
      688349552,
      3973924725,
      1637815568,
      332179504,
      3949051286,
      53804574,
      2852348879,
      3044236432,
      1282449977,
      3583942155,
      3416972820,
      4006381244,
      1617046695,
      2628476075,
      3002303598,
      1686838959,
      431878346,
      2686675385,
      1700445008,
      1080580658,
      1009431731,
      832498133,
      3223435511,
      2605976345,
      2271191193,
      2516031870,
      1648197032,
      4164389018,
      2548247927,
      300782431,
      375919233,
      238389289,
      3353747414,
      2531188641,
      2019080857,
      1475708069,
      455242339,
      2609103871,
      448939670,
      3451063019,
      1395535956,
      2413381860,
      1841049896,
      1491858159,
      885456874,
      4264095073,
      4001119347,
      1565136089,
      3898914787,
      1108368660,
      540939232,
      1173283510,
      2745871338,
      3681308437,
      4207628240,
      3343053890,
      4016749493,
      1699691293,
      1103962373,
      3625875870,
      2256883143,
      3830138730,
      1031889488,
      3479347698,
      1535977030,
      4236805024,
      3251091107,
      2132092099,
      1774941330,
      1199868427,
      1452454533,
      157007616,
      2904115357,
      342012276,
      595725824,
      1480756522,
      206960106,
      497939518,
      591360097,
      863170706,
      2375253569,
      3596610801,
      1814182875,
      2094937945,
      3421402208,
      1082520231,
      3463918190,
      2785509508,
      435703966,
      3908032597,
      1641649973,
      2842273706,
      3305899714,
      1510255612,
      2148256476,
      2655287854,
      3276092548,
      4258621189,
      236887753,
      3681803219,
      274041037,
      1734335097,
      3815195456,
      3317970021,
      1899903192,
      1026095262,
      4050517792,
      356393447,
      2410691914,
      3873677099,
      3682840055,
      3913112168,
      2491498743,
      4132185628,
      2489919796,
      1091903735,
      1979897079,
      3170134830,
      3567386728,
      3557303409,
      857797738,
      1136121015,
      1342202287,
      507115054,
      2535736646,
      337727348,
      3213592640,
      1301675037,
      2528481711,
      1895095763,
      1721773893,
      3216771564,
      62756741,
      2142006736,
      835421444,
      2531993523,
      1442658625,
      3659876326,
      2882144922,
      676362277,
      1392781812,
      170690266,
      3921047035,
      1759253602,
      3611846912,
      1745797284,
      664899054,
      1329594018,
      3901205900,
      3045908486,
      2062866102,
      2865634940,
      3543621612,
      3464012697,
      1080764994,
      553557557,
      3656615353,
      3996768171,
      991055499,
      499776247,
      1265440854,
      648242737,
      3940784050,
      980351604,
      3713745714,
      1749149687,
      3396870395,
      4211799374,
      3640570775,
      1161844396,
      3125318951,
      1431517754,
      545492359,
      4268468663,
      3499529547,
      1437099964,
      2702547544,
      3433638243,
      2581715763,
      2787789398,
      1060185593,
      1593081372,
      2418618748,
      4260947970,
      69676912,
      2159744348,
      86519011,
      2512459080,
      3838209314,
      1220612927,
      3339683548,
      133810670,
      1090789135,
      1078426020,
      1569222167,
      845107691,
      3583754449,
      4072456591,
      1091646820,
      628848692,
      1613405280,
      3757631651,
      526609435,
      236106946,
      48312990,
      2942717905,
      3402727701,
      1797494240,
      859738849,
      992217954,
      4005476642,
      2243076622,
      3870952857,
      3732016268,
      765654824,
      3490871365,
      2511836413,
      1685915746,
      3888969200,
      1414112111,
      2273134842,
      3281911079,
      4080962846,
      172450625,
      2569994100,
      980381355,
      4109958455,
      2819808352,
      2716589560,
      2568741196,
      3681446669,
      3329971472,
      1835478071,
      660984891,
      3704678404,
      4045999559,
      3422617507,
      3040415634,
      1762651403,
      1719377915,
      3470491036,
      2693910283,
      3642056355,
      3138596744,
      1364962596,
      2073328063,
      1983633131,
      926494387,
      3423689081,
      2150032023,
      4096667949,
      1749200295,
      3328846651,
      309677260,
      2016342300,
      1779581495,
      3079819751,
      111262694,
      1274766160,
      443224088,
      298511866,
      1025883608,
      3806446537,
      1145181785,
      168956806,
      3641502830,
      3584813610,
      1689216846,
      3666258015,
      3200248200,
      1692713982,
      2646376535,
      4042768518,
      1618508792,
      1610833997,
      3523052358,
      4130873264,
      2001055236,
      3610705100,
      2202168115,
      4028541809,
      2961195399,
      1006657119,
      2006996926,
      3186142756,
      1430667929,
      3210227297,
      1314452623,
      4074634658,
      4101304120,
      2273951170,
      1399257539,
      3367210612,
      3027628629,
      1190975929,
      2062231137,
      2333990788,
      2221543033,
      2438960610,
      1181637006,
      548689776,
      2362791313,
      3372408396,
      3104550113,
      3145860560,
      296247880,
      1970579870,
      3078560182,
      3769228297,
      1714227617,
      3291629107,
      3898220290,
      166772364,
      1251581989,
      493813264,
      448347421,
      195405023,
      2709975567,
      677966185,
      3703036547,
      1463355134,
      2715995803,
      1338867538,
      1343315457,
      2802222074,
      2684532164,
      233230375,
      2599980071,
      2000651841,
      3277868038,
      1638401717,
      4028070440,
      3237316320,
      6314154,
      819756386,
      300326615,
      590932579,
      1405279636,
      3267499572,
      3150704214,
      2428286686,
      3959192993,
      3461946742,
      1862657033,
      1266418056,
      963775037,
      2089974820,
      2263052895,
      1917689273,
      448879540,
      3550394620,
      3981727096,
      150775221,
      3627908307,
      1303187396,
      508620638,
      2975983352,
      2726630617,
      1817252668,
      1876281319,
      1457606340,
      908771278,
      3720792119,
      3617206836,
      2455994898,
      1729034894,
      1080033504,
      976866871,
      3556439503,
      2881648439,
      1522871579,
      1555064734,
      1336096578,
      3548522304,
      2579274686,
      3574697629,
      3205460757,
      3593280638,
      3338716283,
      3079412587,
      564236357,
      2993598910,
      1781952180,
      1464380207,
      3163844217,
      3332601554,
      1699332808,
      1393555694,
      1183702653,
      3581086237,
      1288719814,
      691649499,
      2847557200,
      2895455976,
      3193889540,
      2717570544,
      1781354906,
      1676643554,
      2592534050,
      3230253752,
      1126444790,
      2770207658,
      2633158820,
      2210423226,
      2615765581,
      2414155088,
      3127139286,
      673620729,
      2805611233,
      1269405062,
      4015350505,
      3341807571,
      4149409754,
      1057255273,
      2012875353,
      2162469141,
      2276492801,
      2601117357,
      993977747,
      3918593370,
      2654263191,
      753973209,
      36408145,
      2530585658,
      25011837,
      3520020182,
      2088578344,
      530523599,
      2918365339,
      1524020338,
      1518925132,
      3760827505,
      3759777254,
      1202760957,
      3985898139,
      3906192525,
      674977740,
      4174734889,
      2031300136,
      2019492241,
      3983892565,
      4153806404,
      3822280332,
      352677332,
      2297720250,
      60907813,
      90501309,
      3286998549,
      1016092578,
      2535922412,
      2839152426,
      457141659,
      509813237,
      4120667899,
      652014361,
      1966332200,
      2975202805,
      55981186,
      2327461051,
      676427537,
      3255491064,
      2882294119,
      3433927263,
      1307055953,
      942726286,
      933058658,
      2468411793,
      3933900994,
      4215176142,
      1361170020,
      2001714738,
      2830558078,
      3274259782,
      1222529897,
      1679025792,
      2729314320,
      3714953764,
      1770335741,
      151462246,
      3013232138,
      1682292957,
      1483529935,
      471910574,
      1539241949,
      458788160,
      3436315007,
      1807016891,
      3718408830,
      978976581,
      1043663428,
      3165965781,
      1927990952,
      4200891579,
      2372276910,
      3208408903,
      3533431907,
      1412390302,
      2931980059,
      4132332400,
      1947078029,
      3881505623,
      4168226417,
      2941484381,
      1077988104,
      1320477388,
      886195818,
      18198404,
      3786409e3,
      2509781533,
      112762804,
      3463356488,
      1866414978,
      891333506,
      18488651,
      661792760,
      1628790961,
      3885187036,
      3141171499,
      876946877,
      2693282273,
      1372485963,
      791857591,
      2686433993,
      3759982718,
      3167212022,
      3472953795,
      2716379847,
      445679433,
      3561995674,
      3504004811,
      3574258232,
      54117162,
      3331405415,
      2381918588,
      3769707343,
      4154350007,
      1140177722,
      4074052095,
      668550556,
      3214352940,
      367459370,
      261225585,
      2610173221,
      4209349473,
      3468074219,
      3265815641,
      314222801,
      3066103646,
      3808782860,
      282218597,
      3406013506,
      3773591054,
      379116347,
      1285071038,
      846784868,
      2669647154,
      3771962079,
      3550491691,
      2305946142,
      453669953,
      1268987020,
      3317592352,
      3279303384,
      3744833421,
      2610507566,
      3859509063,
      266596637,
      3847019092,
      517658769,
      3462560207,
      3443424879,
      370717030,
      4247526661,
      2224018117,
      4143653529,
      4112773975,
      2788324899,
      2477274417,
      1456262402,
      2901442914,
      1517677493,
      1846949527,
      2295493580,
      3734397586,
      2176403920,
      1280348187,
      1908823572,
      3871786941,
      846861322,
      1172426758,
      3287448474,
      3383383037,
      1655181056,
      3139813346,
      901632758,
      1897031941,
      2986607138,
      3066810236,
      3447102507,
      1393639104,
      373351379,
      950779232,
      625454576,
      3124240540,
      4148612726,
      2007998917,
      544563296,
      2244738638,
      2330496472,
      2058025392,
      1291430526,
      424198748,
      50039436,
      29584100,
      3605783033,
      2429876329,
      2791104160,
      1057563949,
      3255363231,
      3075367218,
      3463963227,
      1469046755,
      985887462
    ];
    C_ORIG = [
      1332899944,
      1700884034,
      1701343084,
      1684370003,
      1668446532,
      1869963892
    ];
    bcryptjs_default = {
      setRandomFallback,
      genSaltSync,
      genSalt,
      hashSync,
      hash,
      compareSync,
      compare,
      getRounds,
      getSalt,
      truncates,
      encodeBase64,
      decodeBase64
    };
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
async function fetchPagedAll(table, select) {
  const qs = new URLSearchParams({ select }).toString();
  const all = [];
  const pageSize = 1e3;
  for (let start = 0; ; start += pageSize) {
    const { rows, total } = await supabasePaged(table, qs, {
      start,
      end: start + pageSize - 1
    });
    all.push(...rows);
    if (rows.length === 0 || start + rows.length >= total) break;
  }
  return all;
}
async function findAllCandidatesLight() {
  for (const t of CAND_TABLES) {
    try {
      return await fetchPagedAll(t, CAND_LIGHT_COLS);
    } catch {
    }
  }
  return void 0;
}
async function findCandidatesByIds(ids) {
  const list = [
    ...new Set((Array.isArray(ids) ? ids : []).map((x) => String(x).trim()).filter(Boolean))
  ];
  if (!list.length) return [];
  try {
    const rows = await supabaseJson("GET", "database_candidate", {
      query: { select: "*", id: "in.(" + list.join(",") + ")" }
    });
    return Array.isArray(rows) ? rows : void 0;
  } catch {
    return void 0;
  }
}
async function findCandidateByWaFiltered(wa) {
  const want = normalizeWa(wa);
  const cols = CAND_WA_COLS.slice(0, 3);
  const settled = await Promise.allSettled(
    cols.map(
      (col) => supabaseJson("GET", "database_candidate", {
        query: { select: "*", limit: "5", [col]: "eq." + want }
      })
    )
  );
  let anySucceed = false;
  for (let i = 0; i < cols.length; i++) {
    const r = settled[i];
    if (r.status === "rejected") continue;
    anySucceed = true;
    const rows = r.value;
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const hit = rows.find((x) => normalizeWa(pick(x, CAND_WA_COLS) || "") === want);
    if (hit) return hit;
  }
  return anySucceed ? null : void 0;
}
async function maxCandidateIdNumber() {
  try {
    const tables = ["database_candidate", "master_database_candidate"];
    let max = 0;
    let found = false;
    for (const table of tables) {
      const rows = await supabaseJson("GET", table, {
        query: { select: "id_kandidat", order: "id_kandidat.desc", limit: "5" }
      });
      if (!Array.isArray(rows)) continue;
      for (const r of rows) {
        const m = String(r.id_kandidat || "").match(/ASJ(\d+)/i);
        if (m) {
          max = Math.max(max, parseInt(m[1], 10));
          found = true;
        }
      }
    }
    return found ? max : void 0;
  } catch {
    return void 0;
  }
}
async function findCandidateByIdFiltered(id) {
  const want = String(id || "").trim();
  if (!want) return void 0;
  let anyOk = false;
  for (const col of ["id_kandidat", "id"]) {
    try {
      const rows = await supabaseJson("GET", "database_candidate", {
        query: { select: "*", limit: "1", [col]: "eq." + want }
      });
      anyOk = true;
      if (Array.isArray(rows) && rows.length) return rows[0];
    } catch {
    }
  }
  return anyOk ? null : void 0;
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
function attachApplications(candidates, forms) {
  if (!Array.isArray(candidates) || !Array.isArray(forms)) return candidates;
  const byWa = /* @__PURE__ */ new Map();
  for (const f of forms) {
    const w = normalizeWa(String(f.no_wa || f.wa || f.whatsapp || ""));
    if (!w) continue;
    if (!byWa.has(w)) byWa.set(w, []);
    byWa.get(w).push({
      code: toText(f.code_job || f.code || ""),
      kategori: toText(f.kategory || f.kategori || ""),
      status: toText(f.status || "MENUNGGU"),
      timestamp: toText(f.timestamp || f.created_at || ""),
      nama: toText(f.nama_lengkap || f.nama || ""),
      // CV milik lamaran loker ini (CV per loker: JOB<code>_CV di folder master).
      cv: toText(f.file_cv || "")
    });
  }
  for (const c of candidates) {
    const w = normalizeWa(String(c.wa || ""));
    const apps = byWa.get(w) || [];
    const tahapan = toText(c.tahapan || "");
    apps.forEach((a) => {
      a.tahapan = tahapan;
    });
    apps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    c.applications = apps;
  }
  return candidates;
}
var CAND_TABLES, CAND_LIGHT_COLS, CAND_WA_COLS;
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
    CAND_LIGHT_COLS = "id,id_kandidat,nama_lengkap,no_wa,status_kandidat,id_loker_pilihan,tahapan_seleksi,updated_at,created_at,tanggal_daftar";
    CAND_WA_COLS = ["no_wa", "wa", "whatsapp", "telepon", "phone", "no_hp"];
  }
});

// netlify/functions/_lib/cache.ts
function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return void 0;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return void 0;
  }
  return hit.value;
}
function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== void 0) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function cacheClear() {
  store.clear();
}
var store, DEFAULT_TTL_MS, MAX_ENTRIES;
var init_cache = __esm({
  "netlify/functions/_lib/cache.ts"() {
    "use strict";
    store = /* @__PURE__ */ new Map();
    DEFAULT_TTL_MS = 2e4;
    MAX_ENTRIES = 50;
  }
});

// netlify/functions/_lib/candidate-helpers.ts
var candidate_helpers_exports = {};
__export(candidate_helpers_exports, {
  CAND_WA_COLS: () => CAND_WA_COLS2,
  findCandidateByWa: () => findCandidateByWa,
  nextCandidateId: () => nextCandidateId
});
async function nextCandidateId() {
  const fastMax = await maxCandidateIdNumber();
  if (fastMax !== void 0) return "ASJ" + String(fastMax + 1).padStart(5, "0");
  const found = await findCandidates();
  let max = 0;
  for (const r of found.rows) {
    const m = String(pick(r, ["id_kandidat", "id"]) || "").match(/ASJ(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  try {
    const master = await supabaseJson("GET", "master_database_candidate", {
      query: { select: "id_kandidat", order: "id_kandidat.desc", limit: "5" }
    });
    for (const r of Array.isArray(master) ? master : []) {
      const m = String(r.id_kandidat || "").match(/ASJ(\d+)/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  } catch {
  }
  return "ASJ" + String(max + 1).padStart(5, "0");
}
async function findCandidateByWa(wa) {
  const want = normalizeWa(wa);
  const hit = await findCandidateByWaFiltered(want);
  if (hit !== void 0) return hit;
  const found = await findCandidates();
  return found.rows.find((r) => normalizeWa(pick(r, CAND_WA_COLS2) || "") === want) || null;
}
var CAND_WA_COLS2;
var init_candidate_helpers = __esm({
  "netlify/functions/_lib/candidate-helpers.ts"() {
    "use strict";
    init_client();
    init_candidates();
    CAND_WA_COLS2 = ["no_wa", "wa", "whatsapp", "telepon", "phone", "no_hp"];
  }
});

// netlify/functions/_lib/actions-auth.ts
function masterPins() {
  return [
    "ADMIN_PASSWORD",
    "ADMIN_MASTER_PASSWORD",
    "MASTER_PASSWORD",
    "ASJ_ADMIN_PASSWORD",
    "ADMIN_PIN",
    "PIN_ADMIN",
    "ADMIN_MASTER_PIN"
  ].map(env).filter(Boolean);
}
async function handleCheckAdminMaster(payload) {
  const pin = String(payload && payload[0] || "");
  const pins = masterPins();
  if (pins.length === 0) {
    return {
      success: false,
      error: "PIN master admin belum dikonfigurasi di server. Set env ADMIN_PASSWORD (nilai dari dashboard Netlify) lewat Keys/API keys."
    };
  }
  if (pins.includes(pin)) return { success: true };
  return { success: false, error: "PIN master salah." };
}
async function handleCheckAdminPersonal(payload) {
  const name = String(payload && payload[0] || "").trim();
  const pin = String(payload && payload[1] || "");
  if (!name || !pin) return { success: false, error: "Nama dan PIN wajib diisi." };
  let ok = false;
  if (name.toLowerCase() === "khoci") {
    const khociPin = env("PIN_KHOCI");
    if (khociPin && khociPin === pin) ok = true;
  }
  const envAdmins = env("ASJ_ADMINS");
  if (envAdmins) {
    for (const item of envAdmins.split(",")) {
      const idx = item.indexOf(":");
      if (idx < 0) continue;
      const n = item.slice(0, idx).trim();
      const p = item.slice(idx + 1).trim();
      if (n.toLowerCase() === name.toLowerCase() && p === pin) ok = true;
    }
  }
  if (!ok && hasBackend()) {
    try {
      const found = await findAdmins();
      for (const row of found.rows) {
        const rn = toText(pick(row, ["nama", "name", "admin_name", "username", "nama_admin"]));
        const rp = toText(pick(row, ["pin", "password", "pass", "pin_admin", "kode"]));
        if (rn && rp && rn.toLowerCase() === name.toLowerCase() && rp === pin) ok = true;
      }
    } catch {
    }
  }
  if (!ok) return { success: false, error: "Nama atau PIN salah." };
  return {
    success: true,
    sessionToken: signToken({ role: "admin", name }),
    // Refresh token "ingat saya": token terpisah (role admin + kind refresh)
    // yang disimpan frontend di key sendiri. Dipakai boot untuk memulihkan
    // sesi admin secara diam-diam (tanpa modal login) selama user tidak
    // logout — walau key sesi utama hilang/terhapus sebagian. Dicabut saat
    // logout (frontend hapus asj_admin_refresh).
    refreshToken: signToken({ role: "admin", name, kind: "refresh" })
  };
}
async function handleRefreshAdminSession(payload) {
  const rt = String(payload && payload[0] || "");
  const t = verifyToken(rt);
  if (!t || t.role !== "admin" || t.kind !== "refresh") {
    return { success: false, sessionInvalid: true, message: "Sesi admin tidak valid" };
  }
  const name = String(t.name || "");
  return {
    success: true,
    name,
    sessionToken: signToken({ role: "admin", name })
  };
}
async function handleLoginKandidat(payload) {
  const wa = normalizeWa(String(payload && payload[0] || ""));
  const password = String(payload && payload[1] || "");
  if (!wa || !password) return { success: false, error: "Nomor WA dan password wajib diisi." };
  if (!isValidWaFormat(wa)) {
    return {
      success: false,
      error: "Nomor WA tidak valid. Gunakan format 08xx atau 628xx (12-13 digit)."
    };
  }
  if (!hasBackend()) {
    return { success: false, error: "Backend belum dikonfigurasi (Supabase keys belum ada)." };
  }
  try {
    const row = await findCandidateByWa(wa);
    if (!row) return { success: false, error: "Nomor WA belum terdaftar." };
    const stored = pick(row, ["password_kandidat", "password", "pass", "pin", "hash"]);
    const defaultPass = wa.slice(-4);
    let okPass = false;
    if (stored && String(stored).startsWith("$2")) {
      okPass = await bcryptjs_default.compare(password, String(stored));
    } else if (stored == null || stored === "") {
      okPass = password === defaultPass;
    } else {
      okPass = String(stored) === password;
    }
    if (!okPass) return { success: false, error: "Password salah." };
    const nama = toText(pick(row, ["nama_lengkap", "nama", "name", "full_name"])) || wa;
    return {
      success: true,
      nama,
      wa,
      sessionToken: signToken({ role: "kandidat", wa }),
      // Refresh token "ingat saya" kandidat (role kandidat + kind refresh):
      // dipakai boot untuk memulihkan sesi tanpa modal login selama user
      // tidak logout — setara dengan fitur admin (8511014).
      refreshToken: signToken({ role: "kandidat", wa, kind: "refresh" })
    };
  } catch (e) {
    return { success: false, error: "Gagal memeriksa kandidat: " + e.message };
  }
}
async function handleRefreshKandidatSession(payload) {
  const rt = String(payload && payload[0] || "");
  const t = verifyToken(rt);
  if (!t || t.role !== "kandidat" || t.kind !== "refresh") {
    return { success: false, sessionInvalid: true, message: "Sesi kandidat tidak valid" };
  }
  const wa = normalizeWa(String(t.wa || ""));
  if (!wa) return { success: false, sessionInvalid: true, message: "Sesi kandidat tidak valid" };
  let nama = wa;
  try {
    const row = await findCandidateByWa(wa);
    if (row) {
      nama = toText(pick(row, ["nama_lengkap", "nama", "name", "full_name"])) || wa;
    }
  } catch (e) {
  }
  return {
    success: true,
    nama,
    wa,
    sessionToken: signToken({ role: "kandidat", wa })
  };
}
async function handleDaftarKandidat(payload) {
  const nama = String(payload && payload[0] || "").trim();
  const wa = normalizeWa(String(payload && payload[1] || ""));
  if (!nama || !wa) return { success: false, error: "Nama dan nomor WA wajib diisi." };
  cacheClear();
  if (!isValidWaFormat(wa)) {
    return {
      success: false,
      error: "Nomor WA tidak valid (" + wa + "). Gunakan format 08xx atau 628xx (12-13 digit). Periksa nomor kembali."
    };
  }
  if (!hasBackend()) {
    return { success: false, error: "Backend belum dikonfigurasi (Supabase keys belum ada)." };
  }
  try {
    const found = await findCandidates();
    if (!found.table) {
      return { success: false, error: "Tabel kandidat belum terdeteksi di Supabase." };
    }
    if (await findCandidateByWa(wa)) {
      return { success: false, error: "Nomor WA sudah terdaftar." };
    }
    const defaultPass = wa.slice(-4);
    const hash2 = bcryptjs_default.hashSync(defaultPass, 10);
    const variants = [
      { nama_lengkap: nama, no_wa: wa, password_kandidat: hash2, password_diubah: false },
      { nama_lengkap: nama, no_wa: wa, password: hash2 },
      { nama, wa, password: hash2 },
      { nama, whatsapp: wa, password: hash2 },
      { name: nama, wa, password: hash2 },
      { name: nama, whatsapp: wa, password: hash2 },
      { nama, no_wa: wa, password: hash2 }
    ];
    for (const body of variants) {
      try {
        await supabaseJson("POST", found.table, {
          body,
          headers: { Prefer: "return=minimal" }
        });
        return { success: true };
      } catch {
      }
    }
    return {
      success: false,
      error: "Pendaftaran gagal: kolom tabel kandidat tidak cocok dengan mapping. Hubungi developer."
    };
  } catch (e) {
    return { success: false, error: "Gagal mendaftar: " + e.message };
  }
}
async function handleGantiPasswordKandidat(payload, sessionToken) {
  const wa = normalizeWa(String(payload && payload[0] || ""));
  const lama = String(payload && payload[1] || "");
  const baru = String(payload && payload[2] || "");
  if (!wa || !lama || !baru) return { success: false, error: "Data tidak lengkap." };
  if (baru.length < 6 || baru.length > 20 || /\s/.test(baru)) {
    return { success: false, error: "Password baru 6-20 karakter tanpa spasi." };
  }
  const t = verifyToken(sessionToken);
  if (!t || t.role !== "kandidat" || t.kind === "refresh" || normalizeWa(t.wa) !== wa) {
    return { success: false, sessionInvalid: true, message: "Sesi kandidat tidak valid" };
  }
  if (!hasBackend()) {
    return { success: false, error: "Backend belum dikonfigurasi." };
  }
  try {
    let row = await findCandidateByWaFiltered(wa);
    let table = "database_candidate";
    let colWa = null;
    if (row) {
      colWa = CAND_WA_COLS2.find((c) => c in row);
    } else if (row === void 0) {
      const found = await findCandidates();
      table = found.table;
      colWa = CAND_WA_COLS2.find((c) => found.rows[0] && c in found.rows[0]);
      if (!colWa) return { success: false, error: "Kolom password tidak ditemukan." };
      row = found.rows.find((r) => normalizeWa(String(r[colWa] || "")) === wa);
    }
    const colPass = ["password_kandidat", "password", "pass", "pin"].find((c) => row && c in row);
    if (!row || !colPass) return { success: false, error: "Kandidat tidak ditemukan." };
    const stored = row[colPass];
    let okLama = stored && String(stored).startsWith("$2") ? await bcryptjs_default.compare(lama, String(stored)) : String(stored || "") === lama;
    if (!okLama) return { success: false, error: "Password lama salah." };
    const body = { [colPass]: bcryptjs_default.hashSync(baru, 10) };
    if ("password_diubah" in row) body.password_diubah = true;
    await supabaseJson("PATCH", table, {
      query: { [colWa]: "eq." + row[colWa] },
      body,
      headers: { Prefer: "return=minimal" }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal mengganti password: " + e.message };
  }
}
function requireRole(sessionToken, role) {
  const t = verifyToken(sessionToken);
  if (!t || t.role !== role || t.kind === "refresh") {
    return {
      error: { success: false, sessionInvalid: true, message: "Sesi " + role + " tidak valid" }
    };
  }
  return { token: t };
}
function requireAdmin(sessionToken) {
  return requireRole(sessionToken, "admin");
}
function isOwnerOrAdmin(sessionToken, wa) {
  const t = verifyToken(sessionToken);
  if (!t || t.kind === "refresh") return false;
  if (t.role === "admin") return true;
  if (t.role === "kandidat" && normalizeWa(t.wa || "") === normalizeWa(wa)) {
    return true;
  }
  return false;
}
async function registerFcmToken(payload, sessionToken) {
  const [waStr, token, deviceInfo] = payload;
  const waRaw = String(waStr || "").trim();
  let wa = normalizeWa(waRaw);
  let ident = null;
  if (sessionToken) {
    ident = verifyToken(sessionToken);
  }
  if (ident && ident.role === "admin") {
    wa = waRaw || "ADMIN";
  } else if (waRaw === "ADMIN") {
    wa = "ADMIN";
  }
  if (!wa || !token) return { success: false, message: "Invalid data" };
  if (ident && ident.role === "kandidat" && ident.wa !== wa) {
    return { success: false, message: "Unauthorized FCM registration" };
  }
  try {
    await supabaseJson("POST", "fcm_tokens", {
      query: { on_conflict: "token" },
      body: {
        wa,
        token,
        device_info: String(deviceInfo || "").substring(0, 200),
        last_used_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
var init_actions_auth = __esm({
  "netlify/functions/_lib/actions-auth.ts"() {
    "use strict";
    init_bcryptjs();
    init_env();
    init_wa_rules();
    init_client();
    init_candidates();
    init_misc();
    init_session();
    init_cache();
    init_candidate_helpers();
  }
});

// netlify/functions/_lib/demo.ts
function demoRincian(includeList, excludeList, benefitList, persyaratanList, tahapanList, total) {
  const lines = [];
  lines.push("INCLUDE");
  includeList.forEach((i) => lines.push("- " + i));
  lines.push("EXCLUDE");
  excludeList.forEach((i) => lines.push("- " + i));
  lines.push("BENEFIT");
  benefitList.forEach((i) => lines.push("- " + i));
  lines.push("PERSYARATAN");
  persyaratanList.forEach((i) => lines.push("- " + i));
  lines.push("TAHAPAN PEMBAYARAN");
  tahapanList.forEach((t) => lines.push(t.nomor + ". " + t.nama + " : " + t.nominal));
  lines.push("TOTAL BIAYA: " + total);
  return lines.join("\n");
}
function demoGetAppData(mode) {
  const isAdmin = mode === "admin";
  const jobs = isAdmin ? DEMO_JOBS : DEMO_JOBS.filter((j) => j.status !== "CLOSE");
  return {
    success: true,
    jobs,
    dbJobs: DEMO_JOBS,
    candidates: [],
    candidatesTotal: 0,
    schedules: [],
    tugas: [],
    formInbox: [],
    waTemplates: [],
    kandidatRiwayat: [],
    dropdowns: {},
    assets: DEMO_ASSETS,
    pengumuman: DEMO_PREVIEW_NOTE
  };
}
var DEMO_PREVIEW_NOTE, STORAGE_BASE, DEMO_ASSETS, DEMO_JOBS;
var init_demo = __esm({
  "netlify/functions/_lib/demo.ts"() {
    "use strict";
    DEMO_PREVIEW_NOTE = "\u26A0 MODE PREVIEW \u2014 Data loker di bawah adalah CONTOH DEMO. Backend asli (Supabase) belum dikonfigurasi: isi SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di Keys/API keys.";
    STORAGE_BASE = "https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files";
    DEMO_ASSETS = {
      LOGO: STORAGE_BASE + "/assets/logo_asj.png",
      BANNER: {
        TOKYO: STORAGE_BASE + "/assets/tokyo_banner.jpg",
        SAKURA: STORAGE_BASE + "/assets/sakra_banner.webp"
      },
      FOOTER: {
        TOKYO: STORAGE_BASE + "/assets/tokyo_footer.jpg",
        SAKURA: STORAGE_BASE + "/assets/sakura_footer.webp"
      },
      SOCIAL: {
        whatsapp: "6287889502004",
        instagram: "https://www.instagram.com/amanah_sakura_japan",
        tiktok: "https://www.tiktok.com/@lpkamanahjepangponorogo",
        maps: "https://maps.app.goo.gl/wDUmAonpPWAcJzFEA"
      }
    };
    DEMO_JOBS = [
      {
        code: "DEMO-0001",
        pekerjaan: "Perawat Lansia (Kaigo)",
        kategori: "KAIGO",
        status: "OPEN",
        lokasi: "Tokushimaken",
        gender: "WANITA",
        kuota: "10",
        syarat: "SMA/SMK,Sertifikat JFT A2,Sehat Jasmani & Rohani,Usia 18-30 Tahun,Tidak Takut Jarum Suntik",
        keterangan: "Ditempatkan di fasilitas perawatan lansia Jepang. Bisa langsung magang sambil kursus bahasa Jepang.",
        dokumenShare: "CV,JFT,SSW",
        templateCv: null,
        pamflet: null,
        rincianBiaya: demoRincian(
          [
            "Tiket pesawat PP",
            "Visa kerja (COE)",
            "Asuransi kesehatan",
            "Training bahasa Jepang 3 bulan"
          ],
          ["Paspor", "MCU (medical check up)", "Uang saku pribadi"],
          [
            "Gaji pokok 180.000 yen ke atas",
            "Asrama subsidi perusahaan",
            "Lembur dibayar sesuai kaidah Jepang"
          ],
          ["CV sesuai format ASJ", "Sertifikat JFT/SSW (1 file PDF)", "Foto full body"],
          [
            { nomor: 1, nama: "TTD KONTRAK", nominal: "Rp 5.000.000" },
            { nomor: 2, nama: "COE TERBIT", nominal: "Rp 12.500.000" },
            { nomor: 3, nama: "VISA JADI", nominal: "Rp 10.000.000" }
          ],
          "Rp 27.500.000"
        ),
        totalBiaya: "Rp 27.500.000",
        createdAt: "2026-08-01T09:00:00.000Z"
      },
      {
        code: "DEMO-0002",
        pekerjaan: "Operator Produksi Pabrik",
        kategori: "PABRIK",
        status: "URGENT",
        lokasi: "Shizuoka",
        gender: "L/P",
        kuota: "25",
        syarat: "SMA/SMK,Bisa Kerja Shift,JFT A3 atau A2,Usia 18-28 Tahun",
        keterangan: "Butuh segera untuk pabrik komponen otomotif. Jadwal keberangkatan Oktober 2026.",
        dokumenShare: "CV,JFT,SSW,KTP",
        templateCv: null,
        pamflet: null,
        rincianBiaya: demoRincian(
          [
            "Tiket pesawat PP",
            "Visa kerja (COE)",
            "Asuransi kesehatan",
            "Training bahasa Jepang 3 bulan"
          ],
          ["Paspor", "MCU (medical check up)"],
          ["Gaji pokok 170.000 yen ke atas", "Lembur & bonus musiman", "Asrama disediakan"],
          ["CV sesuai format ASJ", "Sertifikat JFT/SSW (1 file PDF)", "Scan KTP & KK"],
          [
            { nomor: 1, nama: "TTD KONTRAK", nominal: "Rp 4.500.000" },
            { nomor: 2, nama: "COE TERBIT", nominal: "Rp 11.000.000" },
            { nomor: 3, nama: "VISA JADI", nominal: "Rp 10.000.000" }
          ],
          "Rp 25.500.000"
        ),
        totalBiaya: "Rp 25.500.000",
        createdAt: "2026-08-05T09:00:00.000Z"
      },
      {
        code: "DEMO-0003",
        pekerjaan: "Welder (Pengelasan)",
        kategori: "KONSTRUKSI",
        status: "OPEN",
        lokasi: "Chiba",
        gender: "PRIA",
        kuota: "8",
        syarat: "SMA/SMK,Pengalaman Las 2 Tahun,Sertifikat JFT A2,Usia 20-32 Tahun",
        keterangan: "Posisi las SMAW/FCAW untuk pabrik baja. Pengalaman lebih diutamakan.",
        dokumenShare: "CV,JFT,SSW",
        templateCv: null,
        pamflet: null,
        rincianBiaya: demoRincian(
          [
            "Tiket pesawat PP",
            "Visa kerja (COE)",
            "Asuransi kesehatan",
            "Training bahasa Jepang 3 bulan"
          ],
          ["Paspor", "MCU (medical check up)"],
          ["Gaji pokok 190.000 yen ke atas", "Tunjangan skill las", "Perusahaan sediakan alat kerja"],
          ["CV sesuai format ASJ", "Sertifikat JFT/SSW (1 file PDF)", "Surat pengalaman kerja"],
          [
            { nomor: 1, nama: "TTD KONTRAK", nominal: "Rp 5.000.000" },
            { nomor: 2, nama: "COE TERBIT", nominal: "Rp 13.000.000" },
            { nomor: 3, nama: "VISA JADI", nominal: "Rp 10.000.000" }
          ],
          "Rp 28.000.000"
        ),
        totalBiaya: "Rp 28.000.000",
        createdAt: "2026-07-28T09:00:00.000Z"
      },
      {
        code: "DEMO-0004",
        pekerjaan: "Pertanian & Perkebunan (Nougyou)",
        kategori: "PERTANIAN",
        status: "OPEN",
        lokasi: "Hokkaido",
        gender: "L/P",
        kuota: "20",
        syarat: "SMA/SMK,Tahan Panas & Dingin,JFT A2,Usia 18-30 Tahun",
        keterangan: "Musim panen sayuran dan buah. Kerja musiman dengan bonus panen.",
        dokumenShare: "CV,JFT,SSW",
        templateCv: null,
        pamflet: null,
        rincianBiaya: demoRincian(
          [
            "Tiket pesawat PP",
            "Visa kerja (COE)",
            "Asuransi kesehatan",
            "Training bahasa Jepang 3 bulan"
          ],
          ["Paspor", "MCU (medical check up)", "Makan sehari-hari"],
          ["Gaji pokok 160.000 yen ke atas", "Bonus hasil panen", "Asrama murah dekat lahan"],
          ["CV sesuai format ASJ", "Sertifikat JFT/SSW (1 file PDF)", "Foto full body"],
          [
            { nomor: 1, nama: "TTD KONTRAK", nominal: "Rp 4.000.000" },
            { nomor: 2, nama: "COE TERBIT", nominal: "Rp 10.000.000" },
            { nomor: 3, nama: "VISA JADI", nominal: "Rp 9.000.000" }
          ],
          "Rp 23.000.000"
        ),
        totalBiaya: "Rp 23.000.000",
        createdAt: "2026-08-02T09:00:00.000Z"
      },
      {
        code: "DEMO-0005",
        pekerjaan: "Makanan & Minuman (Food Factory)",
        kategori: "PABRIK",
        status: "CLOSE",
        lokasi: "Gifu",
        gender: "WANITA",
        kuota: "15",
        syarat: "SMA/SMK,JFT A2,Usia 18-28 Tahun,Rajin & Teliti",
        keterangan: "Kelas sudah penuh untuk angkatan ini \u2014 buka lagi di angkatan berikutnya.",
        dokumenShare: "CV,JFT,SSW",
        templateCv: null,
        pamflet: null,
        rincianBiaya: demoRincian(
          [
            "Tiket pesawat PP",
            "Visa kerja (COE)",
            "Asuransi kesehatan",
            "Training bahasa Jepang 3 bulan"
          ],
          ["Paspor", "MCU (medical check up)"],
          ["Gaji pokok 170.000 yen ke atas", "Lembur tersedia", "Asrama disediakan"],
          ["CV sesuai format ASJ", "Sertifikat JFT/SSW (1 file PDF)"],
          [
            { nomor: 1, nama: "TTD KONTRAK", nominal: "Rp 4.500.000" },
            { nomor: 2, nama: "COE TERBIT", nominal: "Rp 11.000.000" },
            { nomor: 3, nama: "VISA JADI", nominal: "Rp 10.000.000" }
          ],
          "Rp 25.500.000"
        ),
        totalBiaya: "Rp 25.500.000",
        createdAt: "2026-07-15T09:00:00.000Z"
      },
      {
        code: "DEMO-0006",
        pekerjaan: "Konstruksi Umum (Kensetsu)",
        kategori: "KONSTRUKSI",
        status: "URGENT",
        lokasi: "Kanagawa",
        gender: "PRIA",
        kuota: "12",
        syarat: "SMA/SMK,Sehat & Kuat Fisik,JFT A2 atau A3,Usia 20-30 Tahun",
        keterangan: "Pekerjaan konstruksi gedung dan renovasi. Wajib mau kerja di ketinggian.",
        dokumenShare: "CV,JFT,SSW,SIM A",
        templateCv: null,
        pamflet: null,
        rincianBiaya: demoRincian(
          [
            "Tiket pesawat PP",
            "Visa kerja (COE)",
            "Asuransi kesehatan",
            "Training bahasa Jepang 3 bulan"
          ],
          ["Paspor", "MCU (medical check up)"],
          ["Gaji pokok 185.000 yen ke atas", "Tunjangan proyek", "Alat kerja disediakan"],
          ["CV sesuai format ASJ", "Sertifikat JFT/SSW (1 file PDF)", "Scan SIM A"],
          [
            { nomor: 1, nama: "TTD KONTRAK", nominal: "Rp 5.000.000" },
            { nomor: 2, nama: "COE TERBIT", nominal: "Rp 12.000.000" },
            { nomor: 3, nama: "VISA JADI", nominal: "Rp 10.000.000" }
          ],
          "Rp 27.000.000"
        ),
        totalBiaya: "Rp 27.000.000",
        createdAt: "2026-08-06T09:00:00.000Z"
      }
    ];
  }
});

// netlify/functions/_lib/actions-public.ts
function parseConfigList(v) {
  if (Array.isArray(v)) return v;
  const s = String(v || "").trim();
  if (s.startsWith("[") || s.startsWith("{")) {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
    } catch {
    }
  }
  return s.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
}
function stripRaw(list) {
  return (list || []).map(({ _raw, ...rest }) => rest);
}
async function loadSchedules() {
  try {
    const rows = await supabaseJson("GET", "database_schedule", {
      query: { select: "*", limit: 500, order: "created_at.desc" }
    });
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      idJadwal: toText(r.id_jadwal || r.id || ""),
      namaAgenda: toText(r.nama_agenda || ""),
      idLoker: toText(r.id_loker_terkait || "-"),
      waktu: toText(r.tanggal_waktu || ""),
      link: toText(r.lokasi_link || "-"),
      kandidat: toText(r.daftar_kandidat || "-"),
      tsk: toText(r.tsk || ""),
      status: toText(r.status_jadwal || "AKTIF")
    }));
  } catch {
    return [];
  }
}
async function loadTugas() {
  try {
    const rows = await supabaseJson("GET", "database_tugas", {
      query: { select: "*", limit: 500, order: "created_at.desc" }
    });
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: toText(r.id_tugas || r.id || ""),
      task: toText(r.nama_tugas || ""),
      status: toText(r.status || "BARU"),
      dibuatOleh: toText(r.dibuat_oleh || ""),
      waktuDibuat: toText(r.waktu_dibuat || "")
    }));
  } catch {
    return [];
  }
}
async function loadWaTemplates() {
  try {
    const rows = await supabaseJson("GET", "wa_templates", {
      query: { select: "*", limit: 500 }
    });
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: toText(r.id || ""),
      nama: toText(r.nama || ""),
      isi: toText(r.isi || "")
    }));
  } catch {
    return [];
  }
}
function dedupeKandidatRaw(rows) {
  if (!Array.isArray(rows)) return rows;
  const seen = /* @__PURE__ */ new Map();
  const out = [];
  const tsOf = (r) => String(pick(r, ["updated_at", "created_at", "tanggal_daftar"]) || "");
  for (const r of rows) {
    const wa = normalizeWa(
      String(pick(r, ["no_wa", "wa", "whatsapp", "telepon", "phone", "no_hp", "telp"]) || "")
    );
    if (!wa) {
      out.push(r);
      continue;
    }
    const ts = tsOf(r);
    const prev = seen.get(wa);
    if (!prev || ts > prev.ts || ts === prev.ts && Number(r.id || 0) > Number(prev.row.id || 0)) {
      seen.set(wa, { ts, row: r });
    }
  }
  for (const v of seen.values()) out.push(v.row);
  return out;
}
function saringKandidatUnik(uniq, q) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return uniq;
  const digit = needle.replace(/\D/g, "");
  return uniq.filter((r) => {
    const nama = String(pick(r, ["nama_lengkap", "nama", "name"]) || "").toLowerCase();
    const wa = normalizeWa(
      String(pick(r, ["no_wa", "wa", "whatsapp", "telepon", "phone", "no_hp", "telp"]) || "")
    );
    return nama.includes(needle) || digit && wa.includes(digit);
  });
}
async function loadCandidatesUnik(q, opts = {}) {
  const page = Number(opts.page) || 1;
  const pageSize = Number(opts.pageSize) || 50;
  const cacheKey = "cand:" + String(q || "") + "|p" + page + "|s" + pageSize;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const start = (page - 1) * pageSize;
  const tsOf = (r) => String(pick(r, ["updated_at", "created_at", "tanggal_daftar"]) || "");
  const urutkan = (uniq2) => uniq2.sort((a, b) => tsOf(b) > tsOf(a) ? 1 : tsOf(b) < tsOf(a) ? -1 : 0);
  const light = await findAllCandidatesLight();
  if (light !== void 0) {
    let uniq2 = dedupeKandidatRaw(light);
    uniq2 = saringKandidatUnik(uniq2, q);
    urutkan(uniq2);
    const total = uniq2.length;
    const slice = uniq2.slice(start, start + pageSize);
    const full = await findCandidatesByIds(slice.map((r) => r.id));
    if (full !== void 0) {
      const byId = new Map(full.map((r) => [String(r.id), r]));
      if (slice.every((r) => byId.has(String(r.id)))) {
        const result = {
          rows: slice.map((r) => byId.get(String(r.id))),
          total
        };
        cacheSet(cacheKey, result, CAND_CACHE_TTL_MS);
        return result;
      }
    }
  }
  const found = await findCandidates();
  const rows = Array.isArray(found.rows) ? found.rows : [];
  let uniq = dedupeKandidatRaw(rows);
  uniq = saringKandidatUnik(uniq, q);
  urutkan(uniq);
  return { rows: uniq.slice(start, start + pageSize), total: uniq.length };
}
async function loadPublicBase(mode) {
  const cached = cacheGet("public-base");
  if (cached) return cached;
  const base = demoGetAppData(mode || "public");
  const [found, assets, settings] = await Promise.all([findJobs(), findAssets(), findSettings()]);
  let foundTable = found;
  if (!foundTable.table) {
    const spec = await getSchema();
    const names = tablesFromSchema(spec);
    for (const name of names) {
      const cols = columnsFromSchema(spec, name);
      if (cols.some((c) => /pekerjaan|judul|nama_loker|lowongan|title/.test(c)) && cols.some((c) => /status|kode|code/.test(c))) {
        const hit = await findTable([name]);
        if (hit.table) {
          foundTable = hit;
          break;
        }
      }
    }
  }
  if (!foundTable.table) {
    base.pengumuman = "\u26A0 Backend Supabase terhubung, tapi tabel lowongan belum terdeteksi otomatis. Mapping skema perlu disesuaikan.";
    return { notFound: true, base };
  }
  const jobs = foundTable.rows.map(mapJob).filter((j) => j.pekerjaan && j.pekerjaan !== "");
  const dropdowns = {};
  let pengumuman = "";
  if (settings.table) {
    for (const row of settings.rows) {
      const type = toText(row.config_type);
      const key = DROPDOWN_MAP[type];
      if (key) {
        dropdowns[key] = (dropdowns[key] || []).concat(parseConfigList(row.config_value));
      }
      if (type === "broadcast" && toText(row.config_value).trim() && !pengumuman) {
        pengumuman = toText(row.config_value);
      }
    }
  }
  const data = {
    jobs: stripRaw(jobs),
    assets: assets || base.assets,
    dropdowns,
    pengumuman
  };
  cacheSet("public-base", data, PUBLIC_CACHE_TTL_MS);
  return data;
}
async function handleGetAppData(payload, sessionToken) {
  const mode = payload && payload[0] || "public";
  if (!hasBackend()) {
    return demoGetAppData(mode);
  }
  try {
    let t = null;
    if (mode === "admin" || mode === "kandidat") {
      const role = mode === "admin" ? "admin" : "kandidat";
      t = verifyToken(sessionToken);
      const waPayload = String(payload && payload[1] || "").replace(/\D/g, "");
      const valid = t && t.role === role && (mode !== "kandidat" || (t.wa || "") === waPayload || waPayload === "");
      if (!valid) {
        const pub0 = await loadPublicBase(mode);
        if (pub0.notFound) return pub0.base;
        return {
          success: true,
          activeTheme: "",
          sessionInvalid: true,
          jobs: pub0.jobs,
          dropdowns: pub0.dropdowns,
          assets: pub0.assets,
          pengumuman: pub0.pengumuman
        };
      }
    }
    const w = mode === "kandidat" ? normalizeWa(t.wa || "") : "";
    const jobs = [];
    if (mode === "admin") jobs.push(loadCandidatesUnik("", { page: 1, pageSize: 50 }));
    if (mode === "kandidat") {
      jobs.push(findCandidateByWaFiltered(w), findFormsByWa(w), loadSchedules());
    }
    const results = await Promise.all([loadPublicBase(mode), ...jobs]);
    const pub = results[0];
    if (pub.notFound) return pub.base;
    const result = {
      success: true,
      activeTheme: "",
      sessionInvalid: false,
      jobs: pub.jobs,
      dropdowns: pub.dropdowns,
      assets: pub.assets,
      pengumuman: pub.pengumuman
    };
    if (mode === "admin") {
      const { rows: candRows, total: candidatesTotal } = results[1];
      result.dbJobs = pub.jobs;
      result.candidates = stripRaw(candRows.map(mapCandidate));
      const [berkas, schedules, tugas, allForms, waTemplates] = await Promise.all([
        attachBerkasBio(result.candidates),
        loadSchedules(),
        loadTugas(),
        // Inbox admin: proyeksi kolom ringan (mapForm & attachApplications
        // hanya membaca kolom itu); fallback findForms() bila skema tidak
        // cocok dengan FORM_LIGHT_COLS.
        findFormsLight().then((r) => r === void 0 ? findForms() : r),
        loadWaTemplates()
      ]);
      result.candidates = berkas;
      attachApplications(result.candidates, allForms);
      result.candidatesTotal = candidatesTotal;
      result.schedules = schedules;
      result.tugas = tugas;
      result.formInbox = allForms.map(mapForm);
      result.waTemplates = waTemplates;
      result.kandidatRiwayat = [];
    }
    if (mode === "kandidat") {
      let row = results[1];
      if (row === void 0) {
        const foundCand = await findCandidates();
        row = foundCand.rows.find(
          (r) => normalizeWa(
            pick(r, ["no_wa", "wa", "whatsapp", "telepon", "phone", "no_hp"]) || ""
          ) === w
        ) || null;
      }
      result.dbJobs = pub.jobs;
      const myCands = row ? stripRaw([mapCandidate(row)]) : [];
      await attachBerkasBio(myCands);
      let myForms = results[2];
      if (myForms === void 0) myForms = await findForms();
      attachApplications(myCands, myForms);
      result.candidates = myCands;
      result.kandidatRiwayat = myCands[0] && myCands[0].applications || [];
      try {
        const allSched = results[3];
        const myJobCodes = new Set(
          (Array.isArray(myForms) ? myForms : []).map((f) => String(pick(f, ["code_job", "code"]) || "").toUpperCase()).filter(Boolean)
        );
        result.mySchedules = allSched.filter((s) => {
          const kandidatList = String(s.kandidat || "").split(/[\n,;]+/).map((x) => normalizeWa(x)).filter(Boolean);
          const inDaftar = kandidatList.length > 0 && kandidatList.some((k) => k === w || k.endsWith(w.slice(-9)));
          const lokerSama = String(s.idLoker || "").toUpperCase() !== "-" && myJobCodes.has(String(s.idLoker || "").toUpperCase());
          return inDaftar || lokerSama;
        }).map((s) => ({
          agenda: s.namaAgenda || "",
          status: s.status || "AKTIF",
          waktu: s.waktu || "",
          lokasi: s.link && s.link !== "-" ? s.link : "-",
          link: s.link && s.link !== "-" ? s.link : ""
        }));
      } catch {
        result.mySchedules = [];
      }
    }
    return result;
  } catch (e) {
    return { success: false, message: "Gagal memuat data dari Supabase: " + e.message };
  }
}
async function handleGetMonthlyReport(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  try {
    const { rows: candRows } = await loadCandidatesUnik("", {
      page: 1,
      pageSize: 5e3
    });
    const cands = candRows.map(mapCandidate);
    const byLoker = {};
    for (const c of cands) {
      const loker = String(c.idLoker || "UNKNOWN").trim();
      if (!byLoker[loker]) {
        byLoker[loker] = { total: 0, tahapan: {}, status: {} };
      }
      byLoker[loker].total++;
      const tahap = String(c.tahapan || "-").trim() || "-";
      byLoker[loker].tahapan[tahap] = (byLoker[loker].tahapan[tahap] || 0) + 1;
      const stat = String(c.status || "-").trim() || "-";
      byLoker[loker].status[stat] = (byLoker[loker].status[stat] || 0) + 1;
    }
    const report = Object.entries(byLoker).sort((a, b) => b[1].total - a[1].total).map(([loker, data]) => ({ loker, ...data }));
    return {
      success: true,
      report,
      totalCandidates: cands.length,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (e) {
    return { success: false, error: "Gagal generate laporan: " + e.message };
  }
}
var DROPDOWN_MAP, CAND_CACHE_TTL_MS, PUBLIC_CACHE_TTL_MS;
var init_actions_public = __esm({
  "netlify/functions/_lib/actions-public.ts"() {
    "use strict";
    init_jobs();
    init_forms();
    init_berkas();
    init_misc();
    init_session();
    init_actions_auth();
    init_demo();
    init_cache();
    init_client();
    init_candidates();
    DROPDOWN_MAP = {
      list_kategori: "kategori",
      list_gender: "gender",
      list_tahapan: "tahapan",
      tsk: "tsk",
      list_lokasi: "lokasi",
      list_syarat: "syarat",
      lokasi__link_zoom: "lokasiZoom",
      list_status_loker: "statusLoker",
      status_form: "statusForm",
      list_status_lamaran: "statusLamaran",
      broadcast: "broadcast"
    };
    CAND_CACHE_TTL_MS = 25e3;
    PUBLIC_CACHE_TTL_MS = 2e4;
  }
});

// netlify/functions/_lib/actions-diagnostics.ts
async function handleGetAppConfig(sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const diag = {
    success: true,
    backend: "netlify-functions-rebuild",
    supabaseConfigured: hasBackend(),
    supabaseUrlFormat: null,
    supabaseReachable: false,
    supabaseError: null,
    adminPinConfigured: masterPins().length > 0,
    fileEnvKeys: debugFileEnvKeys(),
    fileEnvStructure: debugFileStructure(),
    tables: {}
  };
  if (!hasBackend()) return diag;
  const url = supabaseUrl();
  diag.supabaseUrlFormat = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ? "ok" : "tidak valid \u2014 harus berbentuk https://<ref>.supabase.co";
  try {
    const spec = await supabaseJson("GET", "", {});
    diag.supabaseReachable = true;
    const names = tablesFromSchema(spec);
    diag.tables.all = names;
    const columns = {};
    for (const name of names) {
      columns[name] = columnsFromSchema(spec, name);
    }
    diag.tables.columns = columns;
  } catch (e) {
    diag.supabaseError = String(e.message || e).slice(0, 300);
  }
  const jobs = await findJobs();
  diag.tables.jobs = jobs.table;
  if (jobs.rows[0]) {
    diag.tables.jobsColumns = Object.keys(jobs.rows[0]);
    diag.jobStatusSamples = [
      ...new Set(
        jobs.rows.slice(0, 20).map((r) => "status=" + toText(r.status) + " | tahapan=" + toText(r.tahapan))
      )
    ].slice(0, 8);
    diag.jobStatusAll = [...new Set(jobs.rows.map((r) => toText(r.status)))].slice(0, 15);
  }
  const cands = await findCandidates();
  diag.tables.candidates = cands.table;
  if (cands.rows[0]) {
    diag.tables.candidatesColumns = Object.keys(cands.rows[0]);
    const pw = cands.rows[0].password_kandidat ?? cands.rows[0].password ?? null;
    diag.candidatePassSample = pw == null ? "kosong" : typeof pw === "string" && pw.startsWith("$2") ? "bcrypt" : "plaintext";
    diag.candidatePassChanged = cands.rows[0].password_diubah ?? null;
  }
  const admins = await findAdmins();
  diag.tables.admins = admins.table;
  if (admins.rows[0]) diag.tables.adminsColumns = Object.keys(admins.rows[0]);
  const settings = await findSettings();
  diag.tables.settings = settings.table;
  if (settings.rows[0]) {
    diag.tables.settingsColumns = Object.keys(settings.rows[0]);
    diag.sysConfigTypes = [...new Set(settings.rows.map((r) => toText(r.config_type)))].slice(
      0,
      30
    );
  }
  return diag;
}
function handleReportWebVital(payload) {
  if (!payload || !payload.name) return { success: false, error: "invalid payload" };
  const { name, value, rating, delta, id, navigationType } = payload;
  console.log(
    `[web-vitals] ${rating === "good" ? "\u2705" : rating === "needs-improvement" ? "\u26A0\uFE0F" : "\u274C"} ${name}: ${typeof value === "number" ? value.toFixed(name === "CLS" ? 4 : 0) : value}ms (${rating}) delta=${delta} nav=${navigationType} id=${id}`
  );
  return { success: true };
}
var init_actions_diagnostics = __esm({
  "netlify/functions/_lib/actions-diagnostics.ts"() {
    "use strict";
    init_env();
    init_jobs();
    init_candidates();
    init_misc();
    init_actions_auth();
    init_client();
  }
});

// netlify/functions/_lib/actions-job.ts
function mapJobPayloadToRow(data) {
  const row = {};
  for (const [from, to] of Object.entries(JOB_COLUMNS)) {
    if (data[from] !== void 0 && data[from] !== null) row[to] = data[from];
  }
  return row;
}
async function nextJobCode() {
  const fastMax = await maxJobCodeNumber();
  if (fastMax !== void 0) return "TG" + (fastMax + 1) + "ASJ";
  const found = await findJobs();
  let max = 0;
  for (const row of found.rows) {
    const m = String(row.code_job || row.code || "").match(/TG(\d+)ASJ/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return "TG" + (max + 1) + "ASJ";
}
async function handleSimpanJobBaru(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const data = payload && payload[0] || {};
  if (!data.pekerjaan) return { success: false, error: "Nama pekerjaan wajib diisi." };
  if (!hasBackend()) return { success: false, error: "Backend belum dikonfigurasi." };
  try {
    const code = await nextJobCode();
    const body = { code_job: code, ...mapJobPayloadToRow(data) };
    await supabaseJson("POST", "job_database", {
      body,
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, code };
  } catch (e) {
    return { success: false, error: "Gagal simpan loker: " + e.message };
  }
}
async function handleEditLokerFull(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const data = payload && payload[0] || {};
  if (!data.code) return { success: false, error: "Kode loker tidak ditemukan." };
  if (!hasBackend()) return { success: false, error: "Backend belum dikonfigurasi." };
  try {
    const body = mapJobPayloadToRow(data);
    for (const k of Object.keys(body)) {
      if (k !== "dokumen_share" && (body[k] === "" || body[k] === "-")) delete body[k];
    }
    await supabaseJson("PATCH", "job_database", {
      query: { code_job: "eq." + data.code },
      body,
      headers: { Prefer: "return=minimal" }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal edit loker: " + e.message };
  }
}
async function getJobMapped(code) {
  let row = await findJobByCodeFiltered(code);
  if (row === void 0) {
    const found = await findJobs();
    row = (found.rows || []).find((r) => String(r.code_job || r.code || "") === String(code)) || null;
  }
  if (!row) return null;
  return stripRaw([mapJob(row)])[0] || null;
}
async function handleUbahStatusJob(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code, status] = payload || [];
  if (!code || !status) return { success: false, error: "Data tidak lengkap." };
  try {
    await supabaseJson("PATCH", "job_database", {
      query: { code_job: "eq." + code },
      body: { status },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, job: await getJobMapped(code) };
  } catch (e) {
    return { success: false, error: "Gagal ubah status: " + e.message };
  }
}
async function handleHapusJobData(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code] = payload || [];
  if (!code) return { success: false, error: "Kode loker tidak ditemukan." };
  try {
    const adaTerkait = await countCandidatesForJob(code);
    if (adaTerkait === true) {
      return { success: false, error: "Gagal hapus loker. Mungkin masih ada kandidat terkait." };
    }
    if (adaTerkait === void 0) {
      const cands = await findCandidates();
      const terkait = cands.rows.some((r) => String(r.id_loker_pilihan || "") === String(code));
      if (terkait) {
        return { success: false, error: "Gagal hapus loker. Mungkin masih ada kandidat terkait." };
      }
    }
    await supabaseJson("DELETE", "job_database", {
      query: { code_job: "eq." + code },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, code };
  } catch (e) {
    return { success: false, error: "Gagal hapus loker: " + e.message };
  }
}
async function handleUpdateTahapanDbJob(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code, tahapan, status] = payload || [];
  if (!code) return { success: false, error: "Kode loker tidak ditemukan." };
  const body = {};
  if (tahapan !== void 0 && tahapan !== null) body.tahapan = tahapan;
  if (status !== void 0 && status !== null) body.status = status;
  try {
    await supabaseJson("PATCH", "job_database", {
      query: { code_job: "eq." + code },
      body,
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, job: await getJobMapped(code) };
  } catch (e) {
    return { success: false, error: "Gagal update tahapan: " + e.message };
  }
}
async function handleUpdateDokumenShare(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code, joined] = payload || [];
  if (!code) return { success: false, error: "Kode loker tidak ditemukan." };
  try {
    await supabaseJson("PATCH", "job_database", {
      query: { code_job: "eq." + code },
      body: { dokumen_share: joined || "" },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal update dokumen: " + e.message };
  }
}
async function handleTandaiGagalJob(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [wa, jobCode] = payload || [];
  if (!wa || !jobCode) return { success: false, error: "Data tidak lengkap." };
  cacheClear();
  try {
    const row = await findCandidateByWa(wa);
    if (!row) {
      return { success: false, error: "Kandidat tidak ditemukan." };
    }
    const idLoker = toText(pick(row, ["id_loker_pilihan", "id_loker"]));
    if (String(idLoker) !== String(jobCode)) {
      return { success: false, error: "Kandidat tidak terdaftar di job ini." };
    }
    await supabaseJson("PATCH", "database_candidate", {
      query: { id: "eq." + row.id },
      body: {
        status_kandidat: "GAGAL",
        id_loker_pilihan: null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      headers: { Prefer: "return=minimal" }
    });
    let formUpdated = null;
    try {
      let forms = await findFormsByWa(wa);
      if (forms === void 0) forms = await findForms();
      const want = normalizeWa(wa);
      const m = forms.find((r) => normalizeWa(String(r.no_wa || "")) === want) || null;
      if (m && m.id !== void 0) {
        await supabaseJson("PATCH", "database_asj_form", {
          query: { id: "eq." + m.id },
          body: { status: "GAGAL" },
          headers: { Prefer: "return=minimal" }
        });
        m.status = "GAGAL";
        formUpdated = mapForm(m, -1);
      }
    } catch (e) {
    }
    let candidate = null;
    try {
      const row2 = await findCandidateByWa(wa);
      if (row2 && row2.id !== void 0) {
        candidate = stripRaw([mapCandidate(row2)])[0] || null;
        if (candidate) {
          try {
            await attachBerkasBio([candidate]);
          } catch (e2) {
          }
        }
      }
    } catch (e3) {
    }
    return { success: true, candidate, form: formUpdated };
  } catch (e) {
    return { success: false, error: "Gagal tandai gagal: " + e.message };
  }
}
var JOB_COLUMNS;
var init_actions_job = __esm({
  "netlify/functions/_lib/actions-job.ts"() {
    "use strict";
    init_client();
    init_forms();
    init_candidates();
    init_berkas();
    init_actions_auth();
    init_candidate_helpers();
    init_cache();
    init_actions_public();
    init_jobs();
    JOB_COLUMNS = {
      tsk: "tsk",
      kategori: "kategori",
      pekerjaan: "pekerjaan",
      lokasi: "lokasi",
      gender: "gender",
      templateCv: "format_cv",
      status: "status",
      kuota: "kuota",
      jmlKandidat: "jumlah_kandidat",
      syarat: "syarat",
      keterangan: "keterangan",
      pamflet: "link_pamflet",
      tahapanDB: "tahapan",
      totalBiaya: "total_biaya",
      rincianBiaya: "rincian_biaya",
      dokumenShare: "dokumen_share"
    };
  }
});

// netlify/functions/_lib/fcm-server.ts
function getGoogleAuthToken(serviceAccount) {
  return new Promise((resolve, reject) => {
    if (_oauthToken && Date.now() < _tokenExpiry) {
      return resolve(_oauthToken);
    }
    const header = { alg: "RS256", typ: "JWT" };
    const iat = Math.floor(Date.now() / 1e3);
    const exp = iat + 3600;
    const claim = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp,
      iat
    };
    const toBase64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signatureInput = toBase64Url(header) + "." + toBase64Url(claim);
    const sign = import_crypto3.default.createSign("RSA-SHA256");
    sign.update(signatureInput);
    const signature = sign.sign(serviceAccount.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = signatureInput + "." + signature;
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }).toString();
    fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    }).then((res) => res.json()).then((data) => {
      if (data.access_token) {
        _oauthToken = data.access_token;
        _tokenExpiry = Date.now() + (data.expires_in - 300) * 1e3;
        resolve(_oauthToken);
      } else {
        reject(new Error("Gagal mendapatkan token: " + JSON.stringify(data)));
      }
    }).catch(reject);
  });
}
async function sendPushNotification(token, title, body, url = "/") {
  const envRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!envRaw) return false;
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(envRaw);
    if (serviceAccount.private_key && serviceAccount.private_key.includes("\\n")) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
  } catch (e) {
    console.error("[FCM] Error parse FIREBASE_SERVICE_ACCOUNT");
    return false;
  }
  try {
    const accessToken = await getGoogleAuthToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    const payload = buildPushPayload(token, title, body, url);
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[FCM] Send Error:", data);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[FCM] Catch Error:", e.message);
    return false;
  }
}
async function sendMulticast(tokens, title, body, url = "/") {
  const invalidTokens = [];
  for (let token of tokens) {
    if (!token) continue;
    const ok = await sendPushNotification(token, title, body, url);
    if (!ok) invalidTokens.push(token);
  }
  return { successCount: tokens.length - invalidTokens.length, invalidTokens };
}
function buildPushPayload(token, title, body, url = "/") {
  return {
    message: {
      token: String(token),
      data: { title: String(title || ""), body: String(body || ""), url: String(url || "/") },
      webpush: { headers: { Urgency: "high" } }
    }
  };
}
var import_crypto3, _oauthToken, _tokenExpiry;
var init_fcm_server = __esm({
  "netlify/functions/_lib/fcm-server.ts"() {
    "use strict";
    import_crypto3 = __toESM(require("crypto"), 1);
    _oauthToken = null;
    _tokenExpiry = 0;
  }
});

// netlify/functions/_lib/fcm-helpers.ts
var fcm_helpers_exports = {};
__export(fcm_helpers_exports, {
  getAdminTokens: () => getAdminTokens,
  getKandidatTokens: () => getKandidatTokens,
  notifyAdmins: () => notifyAdmins,
  notifyKandidat: () => notifyKandidat
});
async function getAdminTokens() {
  try {
    const rows = await supabaseJson("GET", "fcm_tokens", {
      query: { select: "token,wa", limit: 200 }
    });
    if (!Array.isArray(rows)) return [];
    return rows.filter((t) => {
      const wa = String(t.wa || "");
      return !wa || !/^628\d{9,11}$/.test(wa);
    }).map((t) => t.token).filter(Boolean);
  } catch {
    return [];
  }
}
async function getKandidatTokens(wa) {
  try {
    const rows = await supabaseJson("GET", "fcm_tokens", {
      query: { select: "token", wa: "eq." + wa, limit: 20 }
    });
    if (!Array.isArray(rows)) return [];
    return rows.map((t) => t.token).filter(Boolean);
  } catch {
    return [];
  }
}
async function notifyAdmins(title, body, url = "/") {
  try {
    const tokens = await getAdminTokens();
    if (tokens.length === 0) return;
    await sendMulticast(tokens, title, body, url);
  } catch {
  }
}
async function notifyKandidat(wa, title, body, url = "/") {
  try {
    const tokens = await getKandidatTokens(wa);
    if (tokens.length === 0) return;
    await sendMulticast(tokens, title, body, url);
  } catch {
  }
}
var init_fcm_helpers = __esm({
  "netlify/functions/_lib/fcm-helpers.ts"() {
    "use strict";
    init_client();
    init_fcm_server();
  }
});

// netlify/functions/_lib/actions-mail.ts
async function handleFormStatus(rowIndex, status, reason) {
  cacheClear();
  const idx = Number(rowIndex);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: "Index form tidak valid." };
  }
  try {
    let f = await findFormByIndexFiltered(idx);
    if (f === void 0) {
      const forms = await findForms();
      f = forms[idx] || null;
    }
    if (!f) return { success: false, error: "Form tidak ditemukan." };
    const body = { status };
    if (reason !== null && reason !== void 0) body.keterangan = reason;
    await supabaseJson("PATCH", "database_asj_form", {
      query: { id: "eq." + f.id },
      body,
      headers: { Prefer: "return=minimal" }
    });
    try {
      await syncCandidateDariForm(f, status);
    } catch (e) {
      console.error("[form-status] sync candidate:", e && e.message ? e.message : e);
    }
    const waNotify = normalizeWa(String(f.no_wa || f.wa || ""));
    if (waNotify && (status === "GAGAL" || status === "REVIEW ADMIN" || status === "LULUS")) {
      try {
        const jobCode = String(f.code_job || "");
        const reasonText = reason || "";
        let title = "";
        let body2 = "";
        if (status === "GAGAL") {
          title = "Dokumen " + jobCode + " perlu revisi";
          body2 = reasonText || "Lamaran ditolak. Silakan cek dashboard untuk detail.";
        } else if (status === "REVIEW ADMIN") {
          title = "Dokumen " + jobCode + " sedang direview";
          body2 = "Admin sedang meninjau dokumen Anda.";
        } else if (status === "LULUS") {
          title = "Lamaran " + jobCode + " disetujui! \u{1F389}";
          body2 = "Selamat! Lamaran Anda telah disetujui. Cek dashboard untuk langkah selanjutnya.";
        }
        if (title) {
          const { rows: tokens } = await supabaseJson("GET", "fcm_tokens", {
            query: { select: "token", wa: "eq." + waNotify, limit: 10 }
          });
          if (Array.isArray(tokens) && tokens.length > 0) {
            const tokenList = tokens.map((t) => t.token).filter(Boolean);
            if (tokenList.length > 0) {
              await sendMulticast(tokenList, title, body2, "/");
            }
          }
        }
      } catch (eFcm) {
        console.error(
          "[form-status] FCM notification:",
          eFcm && eFcm.message ? eFcm.message : eFcm
        );
      }
    }
    f.status = status;
    if (reason !== null && reason !== void 0) f.keterangan = reason;
    let candidate = null;
    const wa = normalizeWa(String(f.no_wa || f.wa || ""));
    if (wa) {
      try {
        const row = await findCandidateByWa(wa);
        if (row && row.id !== void 0) {
          candidate = stripRaw([mapCandidate(row)])[0] || null;
          if (candidate) {
            try {
              await attachBerkasBio([candidate]);
            } catch (e2) {
            }
          }
        }
      } catch (e3) {
      }
    }
    return { success: true, form: mapForm(f, idx), candidate };
  } catch (e) {
    return { success: false, error: "Gagal proses form: " + e.message };
  }
}
async function syncCandidateDariForm(f, status) {
  const wa = normalizeWa(String(f.no_wa || f.wa || ""));
  const codeJob = String(f.code_job || "");
  if (!wa) return;
  const row = await findCandidateByWa(wa);
  if (status === "LULUS") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const base = {
      nama_lengkap: String(f.nama_lengkap || ""),
      gender: String(f.gender || ""),
      usia: String(f.usia || ""),
      tb: String(f.tb || ""),
      bb: String(f.bb || ""),
      pas_photo: f.pas_photo || "",
      jft: f.jft || "",
      ssw: f.ssw || "",
      file_cv: f.file_cv || "",
      status_kandidat: "LULUS",
      updated_at: now
    };
    if (codeJob) base.id_loker_pilihan = codeJob;
    if (row && row.id !== void 0) {
      for (const k of Object.keys(base)) if (base[k] === void 0) delete base[k];
      await supabaseJson("PATCH", "database_candidate", {
        query: { id: "eq." + row.id },
        body: base,
        headers: { Prefer: "return=minimal" }
      });
    } else if (codeJob) {
      base.id_kandidat = await nextCandidateId();
      base.no_wa = wa;
      base.password_kandidat = bcryptjs_default.hashSync(wa.slice(-4), 10);
      base.password_diubah = false;
      base.tahapan_seleksi = "LIST";
      base.tanggal_daftar = now;
      base.created_at = now;
      base.updated_at = now;
      await supabaseUpsert("database_candidate", base, ["no_wa"], {
        headers: { Prefer: "return=minimal" }
      });
    }
  } else if (status === "GAGAL" && row && row.id !== void 0) {
    const upd = { status_kandidat: "GAGAL", updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (codeJob && String(pick(row, ["id_loker_pilihan", "id_loker"]) || "") === codeJob) {
      upd.id_loker_pilihan = null;
    }
    await supabaseJson("PATCH", "database_candidate", {
      query: { id: "eq." + row.id },
      body: upd,
      headers: { Prefer: "return=minimal" }
    });
  }
}
async function handleReviewForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  return handleFormStatus((payload || [])[0], "REVIEW ADMIN", void 0);
}
async function handleApproveForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  return handleFormStatus((payload || [])[0], "LULUS", void 0);
}
async function handleRejectForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [, , reason] = payload || [];
  return handleFormStatus((payload || [])[0], "GAGAL", reason || "Lamaran ditolak");
}
async function handleDeleteForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  cacheClear();
  const idx = Number((payload || [])[0]);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: "Index form tidak valid." };
  }
  try {
    let f = await findFormByIndexFiltered(idx);
    if (f === void 0) {
      const forms = await findForms();
      f = forms[idx] || null;
    }
    if (!f) return { success: false, error: "Form tidak ditemukan." };
    await supabaseJson("DELETE", "database_asj_form", {
      query: { id: "eq." + f.id },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, rowIndex: idx };
  } catch (e) {
    return { success: false, error: "Gagal menghapus form. Silakan coba lagi." };
  }
}
async function handleTandaiDibacaForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const idx = Number((payload || [])[0]);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: "Index form tidak valid." };
  }
  try {
    let f = await findFormByIndexFiltered(idx);
    if (f === void 0) {
      const forms = await findForms();
      f = forms[idx] || null;
    }
    if (!f) return { success: false, error: "Form tidak ditemukan." };
    const fb = String(f.feedback_berkas || "");
    const m = fb.match(/\[\[PREV:([^\]]+)\]\]/);
    const prevStatus = m ? m[1].trim() : "MENUNGGU";
    const newFb = fb.replace(/\[\[PREV:[^\]]+\]\]\s*/, "").trim();
    await supabaseJson("PATCH", "database_asj_form", {
      query: { id: "eq." + f.id },
      body: { status: prevStatus, feedback_berkas: newFb, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
      headers: { Prefer: "return=minimal" }
    });
    f.status = prevStatus;
    f.feedback_berkas = newFb;
    return { success: true, form: mapForm(f, idx) };
  } catch (e) {
    return { success: false, error: "Gagal tandai dibaca: " + e.message };
  }
}
function mailStatusUntukUpdate(currentStatus) {
  const cur = String(currentStatus || "").toUpperCase();
  if (!cur || MAIL_PENDING_STATUS.includes(cur)) return "MENUNGGU";
  return "UPDATE";
}
function appendFeedback(prev, entry) {
  const items = String(prev || "").split("\xB7").map((s) => s.trim()).filter(Boolean);
  items.unshift(String(entry || "").trim());
  return items.slice(0, 3).join(" \xB7 ");
}
async function syncBiodataKeMail(wa, nama, labels) {
  const want = normalizeWa(wa);
  let rows = await findFormsByWa(wa);
  if (rows === void 0) rows = await findForms();
  const mine = rows.filter((r) => normalizeWa(String(r.no_wa || r.wa || "")) === want);
  if (!mine.length) return;
  for (const r of mine) {
    if (r.id === void 0 || r.id === null) continue;
    const isUpdate = mailStatusUntukUpdate(r.status) === "UPDATE";
    const entry = (isUpdate ? "[[PREV:" + String(r.status || "").toUpperCase() + "]] " : "") + "[BIODATA] " + (labels.length ? labels.join(", ") : "data diperbarui");
    const body = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      feedback_berkas: appendFeedback(r.feedback_berkas, entry)
    };
    if (isUpdate) body.status = "UPDATE";
    await supabaseJson("PATCH", "database_asj_form", {
      query: { id: "eq." + r.id },
      body,
      headers: { Prefer: "return=minimal" }
    });
  }
  if (labels && labels.length > 0) {
    try {
      const { notifyAdmins: notifyAdmins2 } = await Promise.resolve().then(() => (init_fcm_helpers(), fcm_helpers_exports));
      const notifyTitle = "Biodata Lengkap (CV) Diperbarui";
      const notifyBody = `Kandidat ${nama} (${wa}) memperbarui data: ${labels.join(", ")}.`;
      await notifyAdmins2(notifyTitle, notifyBody, "/admin.html");
    } catch (e) {
    }
  }
}
async function syncFormMailDariUpload(wa, nama, docLabel, url, jobCode) {
  const want = normalizeWa(wa);
  let rows = await findFormsByWa(wa);
  if (rows === void 0) {
    rows = await supabaseJson("GET", "database_asj_form", {
      query: { select: "*", limit: 500 }
    });
  }
  const all = Array.isArray(rows) ? rows : [];
  const label = String(docLabel || "DOKUMEN").trim().toUpperCase();
  const code = String(jobCode || "").trim();
  let targets = [];
  if (label === "CV" || label === "CV_REVISI") {
    if (code) {
      targets = all.filter(
        (r) => normalizeWa(String(r.no_wa || r.wa || "")) === want && String(r.code_job || "").trim() === code
      );
    }
    if (!targets.length) {
      targets = all.filter((r) => normalizeWa(String(r.no_wa || r.wa || "")) === want);
    }
  } else {
    targets = all.filter((r) => normalizeWa(String(r.no_wa || r.wa || "")) === want);
  }
  if (!targets.length) targets = [null];
  for (const existing of targets) {
    const docs = {};
    const raw = String(existing && existing.keterangan || "");
    raw.split(";").forEach((chunk) => {
      const i = chunk.indexOf(":");
      if (i > 0) docs[chunk.slice(0, i).trim().toUpperCase()] = chunk.slice(i + 1).trim();
    });
    docs[label] = String(url || "");
    const nextStatus = mailStatusUntukUpdate(existing && existing.status);
    const entry = (nextStatus === "UPDATE" && existing && existing.status ? "[[PREV:" + String(existing.status).toUpperCase() + "]] " : "") + "[UPLOAD " + label + "]";
    const keterangan = Object.entries(docs).filter(([, v]) => v).map(([k, v]) => k + ":" + v).join(";");
    const body = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      code_job: String(existing && existing.code_job || code || ""),
      nama_lengkap: String(nama || existing && existing.nama_lengkap || "KANDIDAT").toUpperCase(),
      no_wa: want,
      keterangan,
      status: nextStatus,
      feedback_berkas: appendFeedback(existing && existing.feedback_berkas, entry),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (label === "PAS_PHOTO" || label === "PHOTO") body.pas_photo = String(url || "");
    if (label === "CV" || label === "CV_REVISI") body.file_cv = String(url || "");
    if (label === "JFT") body.jft = String(url || "");
    if (label === "SSW") body.ssw = String(url || "");
    if (existing && existing.id !== void 0) {
      await supabaseJson("PATCH", "database_asj_form", {
        query: { id: "eq." + existing.id },
        body,
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await upsertFormRow(body);
    }
    if (label && targets.length > 0) {
      try {
        const { notifyAdmins: notifyAdmins2 } = await Promise.resolve().then(() => (init_fcm_helpers(), fcm_helpers_exports));
        const notifyTitle = "Dokumen Baru Diupload";
        const notifyBody = nama + " (" + want + ") mengupload " + label + ". Silakan review di Mail.";
        await notifyAdmins2(notifyTitle, notifyBody, "/admin.html#mail");
      } catch (e) {
      }
    }
  }
}
var MAIL_PENDING_STATUS;
var init_actions_mail = __esm({
  "netlify/functions/_lib/actions-mail.ts"() {
    "use strict";
    init_bcryptjs();
    init_client();
    init_candidates();
    init_berkas();
    init_actions_auth();
    init_candidate_helpers();
    init_actions_public();
    init_cache();
    init_fcm_server();
    init_forms();
    MAIL_PENDING_STATUS = ["MENUNGGU", "MAIL", "BARU", "PENDING"];
  }
});

// netlify/functions/_lib/ai/providers.ts
var providers_exports = {};
__export(providers_exports, {
  geminiGenerate: () => geminiGenerate,
  geminiParseFile: () => geminiParseFile,
  parseJsonLoose: () => parseJsonLoose
});
function trimTrailingModelTurn(contents) {
  const out = contents.slice();
  while (out.length > 1 && out[out.length - 1].role === "model") out.pop();
  return out;
}
async function fetchGemini(model, key, contents) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS)
    }
  );
  if (!res.ok) {
    throw new Error("Gemini HTTP " + res.status + " " + (await res.text()).slice(0, 120));
  }
  const j = await res.json();
  return j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts ? j.candidates[0].content.parts.map((p) => p.text || "").join("") : "";
}
async function geminiGenerate(systemPrompt, history) {
  const key = env("GEMINI_API_KEY");
  if (!key) {
    return {
      reply: "Maaf, asisten AI belum dikonfigurasi (GEMINI_API_KEY belum diisi). Data kamu tetap aman tersimpan ya!"
    };
  }
  const contents = [{ role: "user", parts: [{ text: systemPrompt }] }];
  for (const h of Array.isArray(history) ? history : []) {
    const role = h && h.role === "assistant" ? "model" : "user";
    if (h && h.content) contents.push({ role, parts: [{ text: String(h.content) }] });
  }
  const body = trimTrailingModelTurn(contents);
  let lastErr = null;
  for (const model of MODELS) {
    try {
      const text = await fetchGemini(model, key, body);
      if (text) return { reply: text };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Gemini tidak tersedia");
}
async function geminiParseFile(systemPrompt, file) {
  const key = env("GEMINI_API_KEY");
  if (!key) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi");
  }
  const contents = [
    {
      role: "user",
      parts: [{ inlineData: { mimeType: file.mimeType, data: file.data } }, { text: systemPrompt }]
    }
  ];
  let lastErr = null;
  for (const model of MODELS) {
    try {
      const text = await fetchGemini(model, key, contents);
      if (text) return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Gemini tidak tersedia");
}
function parseJsonLoose(text) {
  let t = String(text || "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch (e2) {
      }
    }
    throw e;
  }
}
var MODEL_TIMEOUT_MS, MODELS;
var init_providers = __esm({
  "netlify/functions/_lib/ai/providers.ts"() {
    "use strict";
    init_env();
    MODEL_TIMEOUT_MS = 7e3;
    MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"];
  }
});

// netlify/functions/_lib/actions-master.ts
async function autoTranslateToJp(idFields, existingJp) {
  const toTranslate = [];
  for (const [key, jpCol] of Object.entries(JP_TRANSLATE_MAP)) {
    const idText = String(idFields[key] || "").trim();
    if (!idText) continue;
    const existing = existingJp ? String(existingJp[jpCol] || "").trim() : "";
    if (existing) continue;
    toTranslate.push({ key, text: idText });
  }
  if (toTranslate.length === 0) return {};
  const NL = String.fromCharCode(10);
  const items = toTranslate.map((t, i) => i + 1 + ". " + t.text).join(NL);
  const prompt = "Terjemahkan Bahasa Indonesia ke Bahasa Jepang untuk CV kerja." + NL + "Kembalikan JSON: " + String.fromCharCode(123) + '"0":"jp0","1":"jp1",...' + String.fromCharCode(125) + " tanpa teks lain." + NL + NL + items;
  try {
    const { geminiGenerate: geminiGenerate2, parseJsonLoose: parseJsonLoose2 } = await Promise.resolve().then(() => (init_providers(), providers_exports));
    const r = await geminiGenerate2(prompt, []);
    const text = String(r && r.reply ? r.reply : "").trim();
    if (!text) return {};
    const parsed = parseJsonLoose2(text);
    if (!parsed || typeof parsed !== "object") return {};
    const result = {};
    for (let i = 0; i < toTranslate.length; i++) {
      const t = String(parsed[String(i)] || "").trim();
      if (t) result[toTranslate[i].key] = t;
    }
    return result;
  } catch (e) {
    console.error("[autoTranslate] error:", e && e.message ? e.message : e);
    return {};
  }
}
async function findMasterByWa(wa) {
  const want = normalizeWa(wa);
  let rows = await fetchMasterByWa([want]);
  if (rows === null) {
    rows = await supabaseJson("GET", "master_database_candidate", {
      query: { select: "*", limit: 500 }
    });
  }
  const arr = Array.isArray(rows) ? rows : [];
  return arr.find((r) => normalizeWa(String(r.no_wa || "")) === want) || null;
}
function buildAiOverflow(d) {
  const set = (obj, k, v) => {
    if (v !== void 0 && v !== null && String(v).trim() !== "") obj[k] = String(v).trim();
  };
  const out = {};
  const ken = {};
  set(ken, "nama_id", d.kenalanNama);
  set(ken, "hubungan_id", d.kenalanHubungan);
  set(ken, "pekerjaan_id", d.kenalanPekerjaan);
  set(ken, "usia", d.kenalanUsia);
  set(ken, "alamat_id", d.kenalanAlamat);
  if (Object.keys(ken).length) out.kenalan_jepang = ken;
  const pend = [];
  if (Array.isArray(d.pendidikan)) {
    for (let i = 0; i < 5; i++) {
      if (i === 2) continue;
      const p = d.pendidikan[i] || {};
      const jur = p.jurusan !== void 0 && p.jurusan !== null ? p.jurusan : p.jurusan_id;
      if (jur === void 0 || jur === null || String(jur).trim() === "") continue;
      const e = {};
      set(e, "tingkat", p.tingkat);
      set(e, "sekolah", p.nama_sekolah || p.namaSekolah || p.sekolah);
      set(e, "jurusan_id", jur);
      pend.push({ slot: i, entry: e });
    }
  }
  if (pend.length) out.pendidikan = pend;
  const pek = [];
  if (Array.isArray(d.pekerjaan)) {
    for (let i = 1; i < 3; i++) {
      const p = d.pekerjaan[i] || {};
      const gaji = p.gaji !== void 0 && p.gaji !== null ? p.gaji : p.pendapatan;
      if (gaji === void 0 || gaji === null || String(gaji).trim() === "") continue;
      const e = {};
      set(e, "perusahaan", p.nama_perusahaan || p.namaPt || p.perusahaan);
      set(e, "gaji", gaji);
      pek.push({ slot: i, entry: e });
    }
  }
  if (pek.length) out.pekerjaan = pek;
  const kel = [];
  if (Array.isArray(d.keluarga)) {
    for (let i = 0; i < 5; i++) {
      const p = d.keluarga[i] || {};
      const e = {};
      set(e, "nama", p.nama);
      set(e, "umur", p.usia !== void 0 && p.usia !== null ? p.usia : p.umur);
      set(e, "usia", p.usia !== void 0 && p.usia !== null ? p.usia : p.umur);
      set(e, "hubungan", p.hubungan);
      set(e, "pekerjaan", p.pekerjaan);
      set(e, "gaji", p.gaji !== void 0 && p.gaji !== null ? p.gaji : p.pendapatan);
      if (i === 0) {
        delete e.nama;
        delete e.umur;
        delete e.usia;
        delete e.hubungan;
        delete e.pekerjaan;
      }
      if (Object.keys(e).length) kel.push({ slot: i, entry: e });
    }
  }
  if (kel.length) out.keluarga = kel;
  return Object.keys(out).length ? out : null;
}
function mergeAiOverflow(ai, overflow) {
  ai = ai && typeof ai === "object" ? ai : {};
  const mergeObj = (base, patch) => {
    base = base && typeof base === "object" ? base : {};
    for (const [k, val] of Object.entries(patch || {})) {
      if (val !== void 0 && val !== null && String(val).trim() !== "") base[k] = val;
    }
    return base;
  };
  const setSlot = (listKey, patchList, keyOf) => {
    if (!Array.isArray(patchList) || !patchList.length) return;
    if (!Array.isArray(ai[listKey])) ai[listKey] = [];
    const arr = ai[listKey];
    for (const { slot, entry } of patchList) {
      const idx = arr.findIndex((e) => e && typeof e === "object" && keyOf(e) === keyOf(entry));
      if (idx === -1) {
        while (arr.length <= slot) arr.push({});
        mergeObj(arr[slot], entry);
      } else {
        mergeObj(arr[idx], entry);
      }
    }
  };
  if (overflow.kenalan_jepang) {
    ai.kenalan_jepang = mergeObj(ai.kenalan_jepang, overflow.kenalan_jepang);
  }
  if (overflow.pendidikan) {
    setSlot(
      "pendidikan",
      overflow.pendidikan,
      (e) => String((e.tingkat || "") + (e.sekolah || "")).toLowerCase().replace(/[^a-z0-9]/g, "")
    );
  }
  if (overflow.pekerjaan) {
    setSlot(
      "pekerjaan",
      overflow.pekerjaan,
      (e) => String(e.perusahaan || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    );
  }
  if (overflow.keluarga) {
    setSlot(
      "keluarga",
      overflow.keluarga,
      (e) => String((e.nama || "") + (e.hubungan || "")).toLowerCase().replace(/[^a-z0-9]/g, "")
    );
  }
  return ai;
}
function entryHasAny(entry, keys) {
  return keys.some((k) => {
    const val = entry[k];
    return val !== void 0 && val !== null && String(val).trim() !== "" && String(val).trim() !== "-";
  });
}
function mergeRiwayatArrays(columns, aiArr, keyFn) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const lists = [].concat(Array.isArray(columns) ? columns : [], Array.isArray(aiArr) ? aiArr : []);
  for (const e of lists) {
    if (!e || typeof e !== "object") continue;
    const k = keyFn(e);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}
function buildMasterNested(row) {
  const v = (col, fallback = "") => {
    const x = row[col];
    return x !== void 0 && x !== null && x !== "" ? toText(x) : fallback !== void 0 ? fallback : "";
  };
  let aiParsed = null;
  try {
    const raw = row.ai_data_json;
    if (typeof raw === "string" && raw.trim() && raw !== "-") aiParsed = JSON.parse(raw);
  } catch (e) {
    aiParsed = null;
  }
  const aiArrOf = (key) => aiParsed && Array.isArray(aiParsed[key]) ? aiParsed[key] : null;
  return {
    identitas: {
      nama_lengkap: v("nama_lengkap"),
      katakana: v("furigana"),
      panggilan: v("namapanggilan"),
      panggilan_katakana: v("panggilan_katakana"),
      tempat_lahir: v("tempat_lahir"),
      tempat_lahir_jp: v("tempat_lahir_jp"),
      tgl_lahir: v("tgl_lahir"),
      umur: v("usia"),
      gender: v("gender"),
      agama: v("agama"),
      agama_jp: v("agama_jp"),
      golongan_darah: v("golongan_darah"),
      status_nikah: v("status_pernikahan"),
      status_pernikahan_jp: v("status_pernikahan_jp"),
      anak: v("jumlah_anak"),
      email: v("email"),
      alamat: v("alamat_lengkap"),
      alamat_jp: v("alamat_jp"),
      hp: v("no_wa"),
      hp_darurat: v("kontak_darurat_wa"),
      ktp: v("nik"),
      paspor: v("no_paspor"),
      sim: v("driver_license"),
      status_eks_jepang: v("status_eks_jepang")
    },
    fisik: {
      tb: v("tb"),
      bb: v("bb"),
      topi: v("ukuran_topi"),
      baju: v("ukuranbaju"),
      sepatu: v("ukuransepatu"),
      tangan_dominan: v("tangandominan"),
      tahan_ac: v("tahan_ac")
    },
    medis: {
      mata_kiri: v("mata_kiri"),
      mata_kanan: v("mata_kanan"),
      kacamata: v("kacamata"),
      buta_warna: v("buta_warna"),
      tato: v("tato"),
      tindik: v("tindik"),
      rokok: v("merokok"),
      alkohol: v("minum_alkohol"),
      alergi_id: v("alergi"),
      alergi_jp: v("alergi_jp"),
      riwayat_medis_id: v("riwayat_penyakit"),
      riwayat_medis_jp: v("riwayat_medis_jp"),
      riwayat_kecelakaan_id: v("riwayat_kecelakaan"),
      riwayat_kecelakaan_jp: v("riwayat_kecelakaan_jp")
    },
    wawancara: {
      keinginan_id: v("keinginan_pribadi"),
      keinginan_jp: v("keinginan_pribadi_jp"),
      tujuan_ke_jepang: v("tujuan_ke_jepang"),
      tujuan_ke_jepang_jp: v("tujuan_ke_jepang_jp"),
      riwayat_jepang: v("status_eks_jepang"),
      promosi_id: v("promosi_diri"),
      promosi_jp: v("promosi_diri_jp"),
      kelebihan_id: v("kelebihan"),
      kelebihan_jp: v("kelebihan_jp"),
      kekurangan_id: v("kekurangan"),
      kekurangan_jp: v("kekurangan_jp"),
      hobi_id: v("hobi_dan_keterampilan"),
      hobi_jp: v("hobi_jp"),
      keahlian_khusus: v("keahlian_khusus"),
      keahlian_khusus_jp: v("keahlian_khusus_jp"),
      motivasi_ke_jepang: v("motivasi_ke_jepang"),
      motivasi_ke_jepang_jp: v("motivasi_ke_jepang_jp"),
      alasan_memilih_bidang: v("alasan_memilih_bidang"),
      alasan_memilih_bidang_jp: v("alasan_memilih_bidang_jp"),
      rencana_setelah_pulang: v("rencana_setelah_pulang"),
      rencana_setelah_pulang_jp: v("rencana_setelah_pulang_jp"),
      // Alias yang dibaca builder CV (10b_cv_builders.js).
      rencana_pulang_id: v("rencana_setelah_pulang"),
      rencana_pulang_jp: v("rencana_setelah_pulang_jp"),
      gaji_yen: v("harapan_gaji_yen"),
      tabungan: v("harapan_tabungan")
    },
    sertifikasi: {
      bahasa: v("bahasa"),
      jft: v("jft"),
      ssw: v("ssw"),
      bidang: v("bidangssw") || v("bidang"),
      // Alias yang dibaca builder CV (10b_cv_builders.js): JLPT row & Lain-lain row.
      bahasa_jepang: v("jft"),
      nilai: v("jft"),
      lisensi: v("ssw")
    },
    pendidikan: (function() {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const tingkat = row["pendidikan_" + i + "_tingkat"];
        if (tingkat === void 0 || tingkat === null) continue;
        arr.push({
          tingkat: toText(tingkat),
          sekolah: v("pendidikan_" + i + "_nama_sekolah"),
          nama_sekolah: v("pendidikan_" + i + "_nama_sekolah"),
          sekolah_jp: v("pendidikan_" + i + "_sekolah_jp"),
          jurusan_id: v("pendidikan_" + i + "_jurusan_id"),
          jurusan: v("pendidikan_" + i + "_jurusan_id"),
          jurusan_jp: v("pendidikan_" + i + "_jurusan_jp"),
          masuk: v("pendidikan_" + i + "_tahun_masuk"),
          tahun_masuk: v("pendidikan_" + i + "_tahun_masuk"),
          lulus: v("pendidikan_" + i + "_tahun_lulus"),
          tahun_lulus: v("pendidikan_" + i + "_tahun_lulus")
        });
      }
      return mergeRiwayatArrays(
        arr.filter(
          (e) => entryHasAny(e, [
            "tingkat",
            "sekolah",
            "nama_sekolah",
            "jurusan_id",
            "jurusan",
            "masuk",
            "lulus"
          ])
        ),
        aiArrOf("pendidikan"),
        (e) => cleanKey((e.tingkat || "") + (e.sekolah || e.sekolah_id || e.nama_sekolah || ""))
      );
    })(),
    pekerjaan: (function() {
      const arr = [];
      for (let i = 1; i <= 3; i++) {
        const nm = row["pekerjaan_" + i + "_nama_perusahaan"];
        if (nm === void 0 || nm === null) continue;
        arr.push({
          perusahaan: toText(nm),
          nama_perusahaan: toText(nm),
          perusahaan_jp: v("pekerjaan_" + i + "_perusahaan_jp"),
          jabatan: v("pekerjaan_" + i + "_jabatan"),
          jabatan_jp: v("pekerjaan_" + i + "_jabatan_jp"),
          masuk: v("pekerjaan_" + i + "_tahun_masuk"),
          tahun_masuk: v("pekerjaan_" + i + "_tahun_masuk"),
          keluar: v("pekerjaan_" + i + "_tahun_keluar"),
          tahun_keluar: v("pekerjaan_" + i + "_tahun_keluar"),
          gaji: v("pekerjaan_" + i + "_gaji")
        });
      }
      return mergeRiwayatArrays(
        arr.filter(
          (e) => entryHasAny(e, ["perusahaan", "nama_perusahaan", "jabatan", "masuk", "keluar"])
        ),
        aiArrOf("pekerjaan"),
        (e) => cleanKey(
          (e.perusahaan || e.perusahaan_id || e.nama_perusahaan || "") + (e.jabatan || e.jabatan_id || "")
        )
      );
    })(),
    keluarga: (function() {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const nm = row["keluarga_" + i + "_nama"];
        if (nm === void 0 || nm === null) continue;
        arr.push({
          nama: toText(nm),
          umur: v("keluarga_" + i + "_usia"),
          usia: v("keluarga_" + i + "_usia"),
          hubungan: v("keluarga_" + i + "_hubungan"),
          hubungan_jp: v("keluarga_" + i + "_hubungan_jp"),
          pekerjaan: v("keluarga_" + i + "_pekerjaan"),
          pekerjaan_jp: v("keluarga_" + i + "_pekerjaan_jp")
        });
      }
      return mergeRiwayatArrays(
        arr.filter((e) => entryHasAny(e, ["nama", "hubungan", "umur", "usia", "pekerjaan"])),
        aiArrOf("keluarga"),
        (e) => cleanKey(e.nama || "")
      );
    })(),
    // Kenalan: tabel HANYA punya kolom nama & hubungan — sisanya (pekerjaan,
    // usia, alamat, versi JP) hanya ada di ai_data_json → digabung fill-if-empty
    // supaya CV/nested tidak tampil kosong (bug: data terisi tapi preview CV &
    // auto-fill kosong).
    kenalan_jepang: (function() {
      const aiK = aiParsed && aiParsed.kenalan_jepang || {};
      const src = (col, aiKey) => {
        const c = v(col);
        const a = aiK[aiKey];
        return c !== "" ? c : a !== void 0 && a !== null ? toText(a) : "";
      };
      return {
        nama_id: src("kenalan_di_jepang_nama", "nama_id"),
        nama_jp: src("kenalan_di_jepang_nama_jp", "nama_jp"),
        hubungan_id: src("kenalan_di_jepang_hubungan", "hubungan_id"),
        hubungan_jp: src("kenalan_di_jepang_hubungan_jp", "hubungan_jp"),
        pekerjaan_id: src("kenalan_di_jepang_pekerjaan", "pekerjaan_id"),
        pekerjaan_jp: src("kenalan_di_jepang_pekerjaan_jp", "pekerjaan_jp"),
        usia: src("kenalan_di_jepang_usia", "usia"),
        alamat_id: src("kenalan_di_jepang_alamat", "alamat_id"),
        alamat_jp: src("kenalan_di_jepang_alamat_jp", "alamat_jp")
      };
    })(),
    uploads: {
      photo: row.pas_photo || "",
      cv: row.file_cv || "",
      jft: row.jft_url || "",
      ssw: row.ssw_url || "",
      ktp: row.ktp_url || "",
      kk: row.kk_url || "",
      ijazahSd: row.ijazah_sd_url || "",
      ijazahSmp: row.ijazah_smp_url || "",
      ijazahSma: row.ijazah_sma_url || "",
      univ: row.univ_url || "",
      sim: row.driver_license_url || row.sim_url || "",
      cert: row.cert_url || ""
    }
  };
}
async function handleGetMasterDataByWa(payload, sessionToken) {
  const wa = String(payload && payload[0] || "");
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  if (!wa) return { error: "Nomor WA wajib diisi." };
  try {
    const row = await findMasterByWa(wa);
    if (!row) return { error: "Data Master belum ada. Silakan isi form Master dulu." };
    const v = (col) => {
      const x = row[col];
      return x !== void 0 && x !== null ? toText(x) : "";
    };
    let aiParsed = null;
    try {
      const raw = row.ai_data_json;
      if (typeof raw === "string" && raw.trim() && raw !== "-") aiParsed = JSON.parse(raw);
    } catch (e) {
      aiParsed = null;
    }
    const aiKen = aiParsed && aiParsed.kenalan_jepang || {};
    const aiOf = (k) => {
      const x = aiKen[k];
      return x !== void 0 && x !== null ? toText(x) : "";
    };
    const out = {
      NAMA_LENGKAP: v("nama_lengkap"),
      FURIGANA: v("furigana"),
      NAMAPANGGILAN: v("namapanggilan"),
      PANGGILAN_KATAKANA: v("panggilan_katakana"),
      TEMPAT_LAHIR: v("tempat_lahir"),
      TEMPAT_LAHIR_JP: v("tempat_lahir_jp"),
      TGL_LAHIR: v("tgl_lahir"),
      GENDER: v("gender"),
      USIA: v("usia"),
      AGAMA: v("agama"),
      AGAMA_JP: v("agama_jp"),
      STATUS_PERNIKAHAN: v("status_pernikahan"),
      STATUS_NIKAH_JP: v("status_pernikahan_jp"),
      JUMLAH_ANAK: v("jumlah_anak"),
      NIK: v("nik"),
      DRIVER_LICENSE: v("driver_license"),
      ALAMAT_LENGKAP: v("alamat_lengkap"),
      ALAMAT_JP: v("alamat_jp"),
      EMAIL: v("email"),
      TT: v("tb"),
      TB: v("tb"),
      BB: v("bb"),
      GOLONGAN_DARAH: v("golongan_darah"),
      TANGANDOMINAN: v("tangandominan"),
      UKURANBAJU: v("ukuranbaju"),
      UKURANSEPATU: v("ukuransepatu"),
      UKURAN_TOPI: v("ukuran_topi"),
      TAHAN_AC: v("tahan_ac"),
      MATA_KIRI: v("mata_kiri"),
      MATA_KANAN: v("mata_kanan"),
      KACAMATA: v("kacamata"),
      BUTA_WARNA: v("buta_warna"),
      TATO: v("tato"),
      TINDIK: v("tindik"),
      MEROKOK: v("merokok"),
      MINUM_ALKOHOL: v("minum_alkohol"),
      RIWAYAT_PENYAKIT: v("riwayat_penyakit"),
      ALERGI: v("alergi"),
      RIWAYAT_KECELAKAAN: v("riwayat_kecelakaan"),
      LAMA_DI_JEPANG: v("status_eks_jepang"),
      HARAPAN_GAJI_YEN: v("harapan_gaji_yen"),
      HARAPAN_TABUNGAN: v("harapan_tabungan"),
      BAHASA: v("bahasa"),
      JFT: v("jft"),
      SSW: v("ssw"),
      BIDANGSSW: v("bidangssw"),
      PROMOSI_DIRI: v("promosi_diri"),
      KELEBIHAN: v("kelebihan"),
      KEKURANGAN: v("kekurangan"),
      KEAHLIAN_KHUSUS: v("keahlian_khusus"),
      "HOBI_&_KETERAMPILAN": v("hobi_dan_keterampilan"),
      HOBI_AND_KETERAMPILAN: v("hobi_dan_keterampilan"),
      HOBI_JP: v("hobi_jp"),
      KEAHLIAN_JP: v("keahlian_khusus_jp"),
      ALASAN_MEMILIH_BIDANG: v("alasan_memilih_bidang"),
      MOTIVASI_KE_JEPANG: v("motivasi_ke_jepang"),
      KEINGINAN_PRIBADI: v("keinginan_pribadi"),
      RENCANA_SETELAH_PULANG: v("rencana_setelah_pulang"),
      TUJUAN_KE_JEPANG: v("tujuan_ke_jepang"),
      STATUS_EKS_JEPANG: v("status_eks_jepang"),
      KONTAK_DARURAT_NAMA: v("kontak_darurat_nama"),
      KONTAK_DARURAT_HUBUNGAN: v("kontak_darurat_hubungan"),
      KONTAK_DARURAT_WA: v("kontak_darurat_wa"),
      KENALAN_DI_JEPANG_NAMA: v("kenalan_di_jepang_nama") || aiOf("nama_id"),
      KENALAN_DI_JEPANG_NAMA_JP: aiOf("nama_jp"),
      KENALAN_DI_JEPANG_HUBUNGAN: v("kenalan_di_jepang_hubungan") || aiOf("hubungan_id"),
      KENALAN_DI_JEPANG_HUBUNGAN_JP: aiOf("hubungan_jp"),
      KENALAN_DI_JEPANG_PEKERJAAN: aiOf("pekerjaan_id"),
      KENALAN_DI_JEPANG_PEKERJAAN_JP: aiOf("pekerjaan_jp"),
      KENALAN_DI_JEPANG_USIA: aiOf("usia"),
      KENALAN_DI_JEPANG_ALAMAT: aiOf("alamat_id"),
      KENALAN_DI_JEPANG_ALAMAT_JP: aiOf("alamat_jp"),
      NO_PASPORT: v("no_paspor"),
      TGL_TERBIT_PASPORT: v("tgl_terbit_pasport"),
      EXP_PASPORT: v("exp_pasport"),
      KOTA_TERBIT_PASPORT: v("kota_terbit_pasport"),
      NO_COE: v("no_coe"),
      PAS_PHOTO: v("pas_photo"),
      JFT_URL: v("jft_url"),
      SSW_URL: v("ssw_url"),
      FILE_CV: v("file_cv")
    };
    for (let i = 1; i <= 5; i++) {
      out["PENDIDIKAN_" + i + "_TINGKAT"] = v("pendidikan_" + i + "_tingkat");
      out["PENDIDIKAN_" + i + "_NAMA_SEKOLAH"] = v("pendidikan_" + i + "_nama_sekolah");
      out["PENDIDIKAN_" + i + "_JURUSAN"] = v("pendidikan_" + i + "_jurusan_id");
      out["PENDIDIKAN_" + i + "_JURUSAN_ID"] = v("pendidikan_" + i + "_jurusan_id");
      out["PENDIDIKAN_" + i + "_TAHUN_MASUK"] = v("pendidikan_" + i + "_tahun_masuk");
      out["PENDIDIKAN_" + i + "_TAHUN_LULUS"] = v("pendidikan_" + i + "_tahun_lulus");
    }
    for (let i = 1; i <= 3; i++) {
      out["PEKERJAAN_" + i + "_NAMA_PERUSAHAAN"] = v("pekerjaan_" + i + "_nama_perusahaan");
      out["PEKERJAAN_" + i + "_JABATAN"] = v("pekerjaan_" + i + "_jabatan");
      out["PEKERJAAN_" + i + "_TAHUN_MASUK"] = v("pekerjaan_" + i + "_tahun_masuk");
      out["PEKERJAAN_" + i + "_TAHUN_KELUAR"] = v("pekerjaan_" + i + "_tahun_keluar");
      out["PEKERJAAN_" + i + "_GAJI"] = v("pekerjaan_" + i + "_gaji");
    }
    for (let i = 1; i <= 5; i++) {
      out["KELUARGA_" + i + "_HUBUNGAN"] = v("keluarga_" + i + "_hubungan");
      out["KELUARGA_" + i + "_NAMA"] = v("keluarga_" + i + "_nama");
      out["KELUARGA_" + i + "_USIA"] = v("keluarga_" + i + "_usia");
      out["KELUARGA_" + i + "_PEKERJAAN"] = v("keluarga_" + i + "_pekerjaan");
      out["KELUARGA_" + i + "_PENDAPATAN"] = "";
    }
    return out;
  } catch (e) {
    return { error: "Gagal memuat data Master: " + e.message };
  }
}
async function handleGetDrafCvMaster(payload, sessionToken) {
  const wa = String(payload && payload[0] || "");
  try {
    const row = await findMasterByWa(wa);
    if (!row) {
      let nama = "";
      try {
        let c = await findCandidateByWaFiltered(wa);
        if (c === void 0) {
          const found = await findCandidates();
          const want = normalizeWa(wa);
          c = (found && found.rows || []).find(
            (r) => normalizeWa(String(pick(r, APPLY_WA_COLS) || "")) === want
          ) || null;
        }
        if (c) nama = String(pick(c, ["nama_lengkap", "nama"]) || "");
      } catch (e) {
      }
      return {
        error: "Data Master belum ada" + (nama ? " untuk " + nama : "") + " (" + wa + "). Isi Form Master dulu."
      };
    }
    const nested = buildMasterNested(row);
    const full = Object.assign(nested, {
      AIDATAJSON: row.ai_data_json || "",
      // Dipakai builder CV untuk nomor rirekisho (buildCvIdentitas → v('id_kandidat')).
      id_kandidat: row.id_kandidat || row.id || ""
    });
    if (isOwnerOrAdmin(sessionToken, wa)) return full;
    const i = nested.identitas || {};
    return {
      identitas: {
        // @ts-expect-error JS→TS migration
        nama_lengkap: i.nama_lengkap || "",
        // @ts-expect-error JS→TS migration
        katakana: i.katakana || "",
        // @ts-expect-error JS→TS migration
        gender: i.gender || "",
        // @ts-expect-error JS→TS migration
        tempat_lahir: i.tempat_lahir || "",
        // @ts-expect-error JS→TS migration
        tgl_lahir: i.tgl_lahir || "",
        // @ts-expect-error JS→TS migration
        umur: i.umur || ""
      },
      limited: true
    };
  } catch (e) {
    return { error: e.message };
  }
}
async function handleSubmitMasterForm(payload, sessionToken) {
  cacheClear();
  const d = payload && payload[0] || {};
  const wa = normalizeWa(String(d.wa || ""));
  const t = verifyToken(sessionToken);
  if (!t || t.role !== "kandidat" && t.role !== "admin") {
    return { success: false, sessionInvalid: true, message: "Sesi tidak valid" };
  }
  if (!wa) return { success: false, message: "Nomor WA wajib diisi." };
  try {
    let row = await findMasterByWa(wa);
    const nama = String(d.nama || "").trim().toUpperCase() || "KANDIDAT";
    const folder = "master/" + nama.replace(/[^A-Z0-9_-]/g, "_");
    const fileUrls = {};
    for (const [from, col] of Object.entries(MASTER_FILE_COLUMNS)) {
      if (d[from]) {
        const prefix = from.replace(/File$/, "").toUpperCase();
        const url = await resolveFileUrl(d[from], folder, prefix + ".jpg");
        if (url) fileUrls[col] = url;
      }
    }
    for (const [from, to] of Object.entries(SNAKE_TO_CAMEL)) {
      if (d[from] !== void 0 && d[from] !== null && d[from] !== "" && d[to] === void 0) {
        d[to] = d[from];
      }
    }
    for (const [from, to] of [
      ["jft_text", "nilai"],
      ["jftText", "nilai"],
      ["ssw_text", "lisensi"],
      ["sswText", "lisensi"]
    ]) {
      if (d[from] !== void 0 && d[from] !== null && d[from] !== "" && d[to] === void 0) {
        d[to] = d[from];
      }
    }
    const pendidikanStr = typeof d.pendidikan === "string" && d.pendidikan.trim() !== "" ? d.pendidikan.trim() : null;
    const body = { no_wa: wa, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    for (const [from, col] of Object.entries(MASTER_COLUMN_MAP)) {
      if (d[from] !== void 0 && d[from] !== null && d[from] !== "") body[col] = String(d[from]);
    }
    body.nama_lengkap = nama;
    Object.assign(body, fileUrls);
    if (pendidikanStr) body.pendidikan_1_tingkat = pendidikanStr;
    let jpTranslations = {};
    try {
      const existingJp = {};
      if (row) {
        for (const [fk, jc] of Object.entries(JP_TRANSLATE_MAP)) {
          const v = row[jc];
          if (v !== void 0 && v !== null && String(v).trim()) existingJp[jc] = String(v);
        }
      }
      jpTranslations = await autoTranslateToJp(d, existingJp);
      for (const [fk, jc] of Object.entries(JP_TRANSLATE_MAP)) {
        if (jpTranslations[fk]) body[jc] = jpTranslations[fk];
      }
    } catch (e) {
      console.error("[submitMaster] auto-translate error:", e && e.message ? e.message : e);
    }
    const changedLabels = [];
    for (const [from, col] of Object.entries(MASTER_COLUMN_MAP)) {
      if (d[from] === void 0 || d[from] === null || d[from] === "") continue;
      const oldVal = row && row[col] !== void 0 && row[col] !== null ? String(row[col]) : "";
      const newVal = String(d[from]);
      if (newVal !== oldVal) {
        const label = MASTER_FIELD_LABEL[col] || col;
        if (!changedLabels.includes(label)) changedLabels.push(label);
      }
    }
    const pickItem = (p, ...keys) => {
      for (const k of keys) {
        if (p[k] !== void 0 && p[k] !== null) return p[k];
      }
      return "";
    };
    if (Array.isArray(d.pendidikan)) {
      for (let i = 0; i < 5; i++) {
        const p = d.pendidikan[i] || {};
        const n = i + 1;
        body["pendidikan_" + n + "_tingkat"] = String(pickItem(p, "tingkat"));
        body["pendidikan_" + n + "_nama_sekolah"] = String(
          pickItem(p, "nama_sekolah", "namaSekolah", "sekolah")
        );
        body["pendidikan_" + n + "_jurusan_id"] = String(pickItem(p, "jurusan", "jurusan_id"));
        body["pendidikan_" + n + "_tahun_masuk"] = String(
          pickItem(p, "tahun_masuk", "tahunMasuk", "masuk")
        );
        body["pendidikan_" + n + "_tahun_lulus"] = String(
          pickItem(p, "tahun_lulus", "tahunLulus", "lulus")
        );
      }
    }
    if (Array.isArray(d.pekerjaan)) {
      for (let i = 0; i < 3; i++) {
        const p = d.pekerjaan[i] || {};
        const n = i + 1;
        body["pekerjaan_" + n + "_nama_perusahaan"] = String(
          pickItem(p, "nama_perusahaan", "namaPt", "namaPerusahaan", "perusahaan")
        );
        body["pekerjaan_" + n + "_jabatan"] = String(
          pickItem(p, "jabatan", "jabatan_id", "posisi")
        );
        body["pekerjaan_" + n + "_tahun_masuk"] = String(
          pickItem(p, "tahun_masuk", "tahunMasuk", "masuk")
        );
        body["pekerjaan_" + n + "_tahun_keluar"] = String(
          pickItem(p, "tahun_keluar", "tahunKeluar", "keluar")
        );
        body["pekerjaan_" + n + "_gaji"] = String(pickItem(p, "gaji", "pendapatan"));
      }
    }
    if (Array.isArray(d.keluarga)) {
      for (let i = 0; i < 5; i++) {
        const p = d.keluarga[i] || {};
        const n = i + 1;
        body["keluarga_" + n + "_hubungan"] = String(pickItem(p, "hubungan", "hubungan_id"));
        body["keluarga_" + n + "_nama"] = String(pickItem(p, "nama"));
        body["keluarga_" + n + "_usia"] = String(pickItem(p, "usia", "umur"));
        body["keluarga_" + n + "_pekerjaan"] = String(pickItem(p, "pekerjaan", "pekerjaan_id"));
        body["keluarga_" + n + "_gaji"] = String(pickItem(p, "gaji", "pendapatan"));
      }
    }
    for (const [key, label] of [
      ["pendidikan", "pendidikan"],
      ["pekerjaan", "pekerjaan"],
      ["keluarga", "keluarga"]
    ]) {
      if (Array.isArray(d[key]) && !changedLabels.includes(label)) {
        const oldRaw = row && row["pendidikan_1_tingkat"] !== void 0 ? JSON.stringify(d[key]) : null;
        if (oldRaw === null || d[key].some((p, i) => p && typeof p === "object")) {
          const slotPrefix = {
            pendidikan: "pendidikan_",
            pekerjaan: "pekerjaan_",
            keluarga: "keluarga_"
          }[key];
          const fields = key === "pendidikan" ? ["tingkat"] : key === "pekerjaan" ? ["nama_perusahaan"] : ["nama"];
          const slotKey = slotPrefix + "1_" + fields[0];
          const oldVal = row && row[slotKey] !== void 0 && row[slotKey] !== null ? String(row[slotKey]) : "";
          const first = d[key].find((p) => p && typeof p === "object");
          const newVal = first ? String(
            pickItem(first, ...key === "pekerjaan" ? ["nama_perusahaan", "namaPt"] : fields)
          ) : "";
          if (newVal !== oldVal) changedLabels.push(label);
        }
      }
    }
    for (const col of Object.keys(body)) {
      if (MASTER_COLUMN_MISSING.has(col)) delete body[col];
    }
    const aiOverflow = buildAiOverflow(d);
    if (row && row.id !== void 0) {
      await supabaseJson("PATCH", "master_database_candidate", {
        query: { id: "eq." + row.id },
        body,
        headers: { Prefer: "return=minimal" }
      });
    } else {
      const idKand = await nextCandidateId();
      body.id_kandidat = idKand;
      await supabaseUpsert("master_database_candidate", body, ["no_wa"], {
        headers: { Prefer: "return=minimal" }
      });
    }
    try {
      if (aiOverflow) {
        let aiBase = null;
        if (row && row.ai_data_json) {
          try {
            const parsed = JSON.parse(row.ai_data_json);
            if (parsed && typeof parsed === "object") aiBase = parsed;
          } catch (e) {
            aiBase = null;
          }
        }
        const aiNew = mergeAiOverflow(aiBase, aiOverflow);
        const aiPatch = {
          ai_data_json: JSON.stringify(aiNew),
          ai_updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (row && row.id !== void 0) {
          await supabaseJson("PATCH", "master_database_candidate", {
            query: { id: "eq." + row.id },
            body: aiPatch,
            headers: { Prefer: "return=minimal" }
          });
        } else {
          const rows2 = await supabaseJson("GET", "master_database_candidate", {
            query: { select: "*", no_wa: "eq." + wa, limit: 5 }
          });
          const r2 = (Array.isArray(rows2) ? rows2 : []).find(
            (r) => normalizeWa(String(r.no_wa || "")) === wa
          );
          if (r2 && r2.id !== void 0) {
            await supabaseJson("PATCH", "master_database_candidate", {
              query: { id: "eq." + r2.id },
              body: aiPatch,
              headers: { Prefer: "return=minimal" }
            });
          }
        }
      }
    } catch (e) {
    }
    try {
      let c = await findCandidateByWaFiltered(wa);
      if (c === void 0) {
        const candFound = await findCandidates();
        const want = normalizeWa(wa);
        c = candFound.rows.find((r) => normalizeWa(String(pick(r, APPLY_WA_COLS) || "")) === want) || null;
      }
      const candBody = {
        nama_lengkap: nama,
        gender: body.gender !== void 0 ? body.gender : void 0,
        usia: body.usia !== void 0 ? body.usia : void 0,
        tb: body.tb !== void 0 ? body.tb : void 0,
        bb: body.bb !== void 0 ? body.bb : void 0,
        nik: body.nik !== void 0 ? body.nik : void 0,
        email: body.email !== void 0 ? body.email : void 0,
        tempat_lahir: body.tempat_lahir !== void 0 ? body.tempat_lahir : void 0,
        tgl_lahir: body.tgl_lahir !== void 0 ? body.tgl_lahir : void 0,
        alamat_lengkap: body.alamat_lengkap !== void 0 ? body.alamat_lengkap : void 0,
        pas_photo: fileUrls.pas_photo !== void 0 ? fileUrls.pas_photo : void 0,
        jft: fileUrls.jft_url !== void 0 ? fileUrls.jft_url : void 0,
        ssw: fileUrls.ssw_url !== void 0 ? fileUrls.ssw_url : void 0,
        file_cv: fileUrls.file_cv !== void 0 ? fileUrls.file_cv : void 0,
        nilai_jft_text: body.jft !== void 0 ? body.jft : void 0,
        bidang_ssw_text: body.bidangssw !== void 0 ? body.bidangssw : void 0,
        pendidikan: pendidikanStr !== null ? pendidikanStr : void 0
      };
      for (const k of Object.keys(candBody)) if (candBody[k] === void 0) delete candBody[k];
      if (c && c.id !== void 0) {
        await supabaseJson("PATCH", "database_candidate", {
          query: { id: "eq." + c.id },
          body: candBody,
          headers: { Prefer: "return=minimal" }
        });
      }
      await syncBiodataKeMail(wa, nama, changedLabels);
    } catch (e) {
    }
    return { success: true, translationSkipped: Object.keys(jpTranslations).length === 0 };
  } catch (e) {
    return { success: false, message: "Gagal simpan Master: " + e.message };
  }
}
async function handleSimpanUpdateMaster(payload, sessionToken) {
  return handleSubmitMasterForm(payload, sessionToken);
}
var MASTER_FIELD_LABEL, MASTER_FILE_COLUMNS, MASTER_COLUMN_MAP, JP_TRANSLATE_MAP, SNAKE_TO_CAMEL, MASTER_COLUMN_MISSING, cleanKey;
var init_actions_master = __esm({
  "netlify/functions/_lib/actions-master.ts"() {
    "use strict";
    init_cv();
    init_client();
    init_candidates();
    init_master();
    init_session();
    init_actions_auth();
    init_actions_mail();
    init_candidate_helpers();
    init_cache();
    init_storage();
    MASTER_FIELD_LABEL = {
      nama_lengkap: "nama",
      furigana: "furigana",
      namapanggilan: "panggilan",
      panggilan_katakana: "panggilan katakana",
      gender: "gender",
      tempat_lahir: "tempat lahir",
      tgl_lahir: "tgl lahir",
      usia: "usia",
      agama: "agama",
      status_pernikahan: "status nikah",
      jumlah_anak: "anak",
      nik: "KTP/NIK",
      driver_license: "SIM",
      alamat_lengkap: "alamat",
      email: "email",
      tb: "tinggi",
      bb: "berat",
      no_pasport: "paspor",
      no_coe: "nomor COE",
      // Fisik & ukuran (form Master Lengkap / ai_form) — label dibaca admin di
      // mail inbox (feedback_berkas), jangan biarkan fallback nama kolom mentah.
      golongan_darah: "golongan darah",
      tangandominan: "tangan dominan",
      ukuranbaju: "ukuran baju",
      ukuransepatu: "ukuran sepatu",
      ukuran_topi: "ukuran topi",
      tahan_ac: "tahan AC",
      mata_kiri: "mata kiri",
      mata_kanan: "mata kanan",
      kacamata: "kacamata",
      buta_warna: "buta warna",
      tato: "tato",
      tindik: "tindik",
      merokok: "merokok",
      minum_alkohol: "alkohol",
      riwayat_penyakit: "penyakit",
      alergi: "alergi",
      riwayat_kecelakaan: "kecelakaan",
      promosi_diri: "promosi diri",
      kelebihan: "kelebihan",
      kekurangan: "kekurangan",
      keahlian_khusus: "keahlian khusus",
      hobi_dan_keterampilan: "hobi",
      alasan_memilih_bidang: "alasan bidang",
      motivasi_ke_jepang: "motivasi ke Jepang",
      keinginan_pribadi: "keinginan",
      rencana_setelah_pulang: "rencana pulang",
      tujuan_ke_jepang: "tujuan ke Jepang",
      status_eks_jepang: "status eks Jepang",
      kontak_darurat_nama: "kontak darurat",
      kontak_darurat_hubungan: "kontak darurat",
      kontak_darurat_wa: "kontak darurat",
      kenalan_di_jepang_nama: "kenalan di Jepang",
      kenalan_di_jepang_hubungan: "kenalan di Jepang",
      kenalan_di_jepang_pekerjaan: "kenalan di Jepang",
      kenalan_di_jepang_usia: "kenalan di Jepang",
      kenalan_di_jepang_alamat: "alamat kenalan di Jepang",
      harapan_gaji_yen: "harapan gaji",
      harapan_tabungan: "harapan tabungan",
      bahasa: "bahasa Jepang",
      jft: "JFT",
      bidangssw: "SSW",
      ssw: "SSW",
      tgl_terbit_pasport: "tgl terbit paspor",
      exp_pasport: "masa berlaku paspor",
      kota_terbit_pasport: "kota terbit paspor"
    };
    MASTER_FILE_COLUMNS = {
      photoFile: "pas_photo",
      jftFile: "jft_url",
      sswFile: "ssw_url",
      ijazahSdFile: "ijazah_sd_url",
      ijazahSmpFile: "ijazah_smp_url",
      ijazahSmaFile: "ijazah_sma_url",
      univFile: "univ_url",
      ktpFile: "ktp_url",
      kkFile: "kk_url",
      cvFile: "file_cv"
    };
    MASTER_COLUMN_MAP = {
      nama: "nama_lengkap",
      furigana: "furigana",
      panggilan: "namapanggilan",
      panggilanKatakana: "panggilan_katakana",
      gender: "gender",
      tempatLahir: "tempat_lahir",
      tglLahir: "tgl_lahir",
      usia: "usia",
      agama: "agama",
      statusNikah: "status_pernikahan",
      anak: "jumlah_anak",
      ktp: "nik",
      sim: "driver_license",
      alamat: "alamat_lengkap",
      email: "email",
      tb: "tb",
      bb: "bb",
      goldar: "golongan_darah",
      tangan: "tangandominan",
      baju: "ukuranbaju",
      sepatu: "ukuransepatu",
      topi: "ukuran_topi",
      tahanAc: "tahan_ac",
      mataKiri: "mata_kiri",
      mataKanan: "mata_kanan",
      kacamata: "kacamata",
      butaWarna: "buta_warna",
      tato: "tato",
      tindik: "tindik",
      merokok: "merokok",
      alkohol: "minum_alkohol",
      penyakit: "riwayat_penyakit",
      alergi: "alergi",
      laka: "riwayat_kecelakaan",
      promosi: "promosi_diri",
      kelebihan: "kelebihan",
      kekurangan: "kekurangan",
      keahlianKhusus: "keahlian_khusus",
      hobi: "hobi_dan_keterampilan",
      alasanBidang: "alasan_memilih_bidang",
      motivasiJepang: "motivasi_ke_jepang",
      keinginan: "keinginan_pribadi",
      rencanaPulang: "rencana_setelah_pulang",
      tujuanJepang: "tujuan_ke_jepang",
      eksJepang: "status_eks_jepang",
      daruratNama: "kontak_darurat_nama",
      daruratHubungan: "kontak_darurat_hubungan",
      daruratWa: "kontak_darurat_wa",
      kenalanNama: "kenalan_di_jepang_nama",
      kenalanHubungan: "kenalan_di_jepang_hubungan",
      kenalanPekerjaan: "kenalan_di_jepang_pekerjaan",
      kenalanUsia: "kenalan_di_jepang_usia",
      kenalanAlamat: "kenalan_di_jepang_alamat",
      lamaJepang: "status_eks_jepang",
      gajiYen: "harapan_gaji_yen",
      tabungan: "harapan_tabungan",
      bhsJepang: "bahasa",
      nilai: "jft",
      lisensi: "bidangssw",
      ssw: "ssw",
      noPaspor: "no_paspor",
      tglTerbitPaspor: "tgl_terbit_pasport",
      expPaspor: "exp_pasport",
      kotaPaspor: "kota_terbit_pasport",
      noCoe: "no_coe"
    };
    JP_TRANSLATE_MAP = {
      promosi: "promosi_diri_jp",
      kelebihan: "kelebihan_jp",
      kekurangan: "kekurangan_jp",
      hobi: "hobi_jp",
      keahlianKhusus: "keahlian_khusus_jp",
      alasanBidang: "alasan_memilih_bidang_jp",
      motivasiJepang: "motivasi_ke_jepang_jp",
      keinginan: "keinginan_pribadi_jp",
      rencanaPulang: "rencana_setelah_pulang_jp",
      tujuanJepang: "tujuan_ke_jepang_jp",
      penyakit: "riwayat_medis_jp",
      alergi: "alergi_jp",
      laka: "riwayat_kecelakaan_jp",
      tempatLahir: "tempat_lahir_jp",
      agama: "agama_jp",
      alamat: "alamat_jp"
    };
    SNAKE_TO_CAMEL = {
      tempat_lahir: "tempatLahir",
      tgl_lahir: "tglLahir",
      alamat_lengkap: "alamat",
      no_pasport: "noPaspor",
      no_coe: "noCoe",
      kota_pasport: "kotaPaspor",
      tgl_pasport: "tglTerbitPaspor",
      exp_pasport: "expPaspor"
    };
    MASTER_COLUMN_MISSING = /* @__PURE__ */ new Set([
      // jurusan: kolom HANYA ada di slot 3 (pendidikan_3_jurusan_id)
      "pendidikan_1_jurusan_id",
      "pendidikan_2_jurusan_id",
      "pendidikan_4_jurusan_id",
      "pendidikan_5_jurusan_id",
      // gaji pekerjaan: kolom HANYA ada di slot 1
      "pekerjaan_2_gaji",
      "pekerjaan_3_gaji",
      // keluarga: kolom HANYA slot 1 & TANPA kolom gaji sama sekali
      "keluarga_1_gaji",
      "keluarga_2_gaji",
      "keluarga_3_gaji",
      "keluarga_4_gaji",
      "keluarga_5_gaji",
      "keluarga_2_hubungan",
      "keluarga_2_nama",
      "keluarga_2_usia",
      "keluarga_2_pekerjaan",
      "keluarga_3_hubungan",
      "keluarga_3_nama",
      "keluarga_3_usia",
      "keluarga_3_pekerjaan",
      "keluarga_4_hubungan",
      "keluarga_4_nama",
      "keluarga_4_usia",
      "keluarga_4_pekerjaan",
      "keluarga_5_hubungan",
      "keluarga_5_nama",
      "keluarga_5_usia",
      "keluarga_5_pekerjaan",
      // kenalan di Jepang: kolom HANYA nama & hubungan
      "kenalan_di_jepang_pekerjaan",
      "kenalan_di_jepang_usia",
      "kenalan_di_jepang_alamat"
    ]);
    cleanKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
});

// netlify/functions/_lib/ai/cv.ts
async function findMasterByWa2(wa) {
  const want = normalizeWa(wa);
  const rows = await fetchMasterByWa([want]);
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => normalizeWa(String(r.no_wa || r.wa || r.whatsapp || "")) === want) || null;
}
function buildRingkasData(cur) {
  const id = cur && cur.identitas || {};
  const fs2 = cur && cur.fisik || {};
  const md = cur && cur.medis || {};
  const st = cur && cur.sertifikasi || {};
  const ww = cur && cur.wawancara || {};
  const lines = [];
  const add = (label, val) => {
    const s = val === void 0 || val === null ? "" : String(val).trim();
    if (s && s !== "" && s !== "-") lines.push(label + ": " + s);
  };
  add("Nama lengkap", id.nama_lengkap);
  add("Nama panggilan", id.panggilan);
  add("Katakana", id.katakana);
  add("Tempat lahir", id.tempat_lahir);
  add("Tanggal lahir", id.tgl_lahir);
  add("Umur", id.umur);
  add("Gender", id.gender);
  add("Agama", id.agama);
  add("Golongan darah", id.golongan_darah);
  add("Status pernikahan", id.status_nikah);
  add("No HP", id.hp);
  add("No HP darurat", id.hp_darurat);
  add("Alamat", id.alamat);
  add("Email", id.email);
  add("Tinggi badan", fs2.tb ? fs2.tb + " cm" : "");
  add("Berat badan", fs2.bb ? fs2.bb + " kg" : "");
  add("Ukuran topi", fs2.topi);
  add("Ukuran baju", fs2.baju);
  add("Ukuran sepatu", fs2.sepatu);
  add("Tangan dominan", fs2.tangan_dominan);
  add("Tahan AC", fs2.tahan_ac);
  add("Kacamata", md.kacamata);
  add("Buta warna", md.buta_warna);
  add("Tato", md.tato);
  add("Tindik", md.tindik);
  add("Rokok", md.rokok);
  add("Alkohol", md.alkohol);
  add("Alergi", md.alergi_id);
  add("Riwayat penyakit", md.riwayat_medis_id);
  add("Riwayat kecelakaan", md.riwayat_kecelakaan_id);
  add("NIK KTP", id.ktp);
  add("No. Paspor", id.paspor);
  add("SIM", id.sim);
  add("Pernah ke Jepang", id.status_eks_jepang);
  add("Bahasa Jepang (JLPT/JFT)", st.bahasa_jepang || st.jft || st.bahasa);
  add("SSW/Lisensi", st.lisensi || st.ssw);
  add("Bidang SSW", st.bidang);
  add("Hobi", ww.hobi_id);
  add("Kelebihan", ww.kelebihan_id);
  add("Kekurangan", ww.kekurangan_id);
  add("Motivasi ke Jepang", ww.motivasi_ke_jepang || ww.tujuan_ke_jepang);
  const pend = Array.isArray(cur && cur.pendidikan) ? cur.pendidikan : [];
  if (pend.length) {
    add(
      "Pendidikan",
      pend.map(
        (p) => [
          p.tingkat,
          p.sekolah || p.nama_sekolah,
          p.jurusan_id || p.jurusan,
          p.tahun_lulus ? p.tahun_lulus + " lulus" : ""
        ].filter(Boolean).join(" - ")
      ).join("; ")
    );
  }
  const pek = Array.isArray(cur && cur.pekerjaan) ? cur.pekerjaan : [];
  if (pek.length) {
    add(
      "Pengalaman kerja",
      pek.map(
        (p) => [
          p.perusahaan || p.nama_perusahaan,
          p.jabatan,
          p.tahun_masuk ? p.tahun_masuk + "-" + (p.tahun_keluar || "sekarang") : ""
        ].filter(Boolean).join(" - ")
      ).join("; ")
    );
  }
  const klg = Array.isArray(cur && cur.keluarga) ? cur.keluarga : [];
  if (klg.length) {
    add(
      "Keluarga",
      klg.map(
        (k) => [k.hubungan, k.nama, k.usia ? k.usia + " th" : "", k.pekerjaan].filter(Boolean).join(" - ")
      ).join("; ")
    );
  }
  return lines.join("\n");
}
async function handleGetAdminAiContext(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  const wa = String(d.wa || d.waTarget || "");
  try {
    let row = null;
    if (wa) row = await findMasterByWa2(wa);
    if (!row && (d.candidateId || d.idKandidat || d.wa)) {
      const id = String(d.candidateId || d.idKandidat || "");
      let cand = id ? await findCandidateByIdFiltered(id) : await findCandidateByWaFiltered(d.wa);
      if (cand === void 0) {
        const found = await findCandidates();
        cand = (found.rows || []).find(
          (r) => id ? String(pick(r, ["id_kandidat", "id"]) || "") === id : normalizeWa(String(pick(r, APPLY_WA_COLS) || "")) === normalizeWa(d.wa)
        ) || null;
      }
      if (cand) row = await findMasterByWa2(String(cand.no_wa || ""));
    }
    if (!row) return { success: true, data: null };
    return { success: true, data: buildMasterNested(row) };
  } catch (e) {
    return { success: false, error: "Terjadi kesalahan saat mengambil data kandidat." };
  }
}
async function handleBuildAdminAiCandidateSummary(payload, sessionToken) {
  const ctx = await handleGetAdminAiContext(payload, sessionToken);
  if (!ctx.success) return ctx;
  const data = ctx.data;
  const summary = data ? data.identitas.nama_lengkap + " | " + (data.identitas.umur || "-") + " th | " + (data.fisik.tb || "-") + "cm/" + (data.fisik.bb || "-") + "kg | JFT: " + (data.sertifikasi.jft || "-") : "Data kandidat belum lengkap.";
  return { success: true, summary, data };
}
async function handleSubmitDataAsj(payload, sessionToken) {
  const d = payload || {};
  const ctx = d.context || {};
  const identitas = d.identitas || {};
  const wa = normalizeWa(String(ctx.wa || identitas.hp || ""));
  if (!wa) return { success: false, message: "Nomor WA tidak ditemukan." };
  const adminGuard = requireRole(sessionToken, "admin");
  const kandidatGuard = requireRole(sessionToken, "kandidat");
  const isAdmin = !adminGuard.error;
  const isKandidat = !kandidatGuard.error;
  if (!isAdmin && !isKandidat) {
    return { success: false, message: "Sesi tidak valid. Silakan login ulang." };
  }
  const submittedBy = isAdmin ? "admin:" + (adminGuard.token?.name || "unknown") : "kandidat";
  const guard = kandidatGuard;
  try {
    const aiData = {
      identitas: d.identitas || {},
      fisik: d.fisik || {},
      medis: d.medis || {},
      pendidikan: d.pendidikan || {},
      pekerjaan: d.pekerjaan || {},
      sertifikasi: d.sertifikasi || {},
      keluarga: d.keluarga || {},
      wawancara: d.wawancara || {}
    };
    const AI_MANAGED_KEYS = /* @__PURE__ */ new Set([
      "identitas",
      "fisik",
      "medis",
      "pendidikan",
      "pekerjaan",
      "sertifikasi",
      "keluarga",
      "wawancara"
    ]);
    const nama = String(identitas.nama_lengkap || "").trim();
    const jobCode = String(ctx.job || ctx.jobCode || "");
    const body = {
      wa,
      nama_lengkap: nama,
      mode: "AI_MASTER",
      job_code: jobCode,
      status: "MENUNGGU",
      ai_data_json: JSON.stringify(aiData),
      ai_updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      photo_url: d.fotoFile || "",
      jft_url: d.jftFile || "",
      ssw_url: d.sswFile || "",
      submitted_via: "ai_form",
      submitted_by: submittedBy,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existingRows = await supabaseJson("GET", "ai_form_submissions", {
      query: { select: "*", wa: "eq." + wa, limit: "10" }
    });
    const existing = (Array.isArray(existingRows) ? existingRows : []).find(
      (r) => normalizeWa(String(r.wa || "")) === wa && String(r.submitted_via || "") === "ai_form"
    );
    if (existing && existing.id !== void 0) {
      await supabaseJson("PATCH", "ai_form_submissions", {
        query: { id: "eq." + existing.id },
        body,
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await supabaseJson("POST", "ai_form_submissions", {
        body: Object.assign({ created_at: (/* @__PURE__ */ new Date()).toISOString() }, body),
        headers: { Prefer: "return=minimal" }
      });
    }
    try {
      const m = await findMasterByWa2(wa);
      let aiOut = aiData;
      let prev = null;
      if (m && m.id !== void 0) {
        try {
          const prevRaw = m.ai_data_json;
          prev = typeof prevRaw === "string" && prevRaw.trim() && prevRaw !== "-" ? JSON.parse(prevRaw) : null;
          if (prev && typeof prev === "object") {
            aiOut = {};
            for (const k of Object.keys(prev)) {
              if (!AI_MANAGED_KEYS.has(k)) aiOut[k] = prev[k];
            }
            for (const k of Object.keys(aiData)) aiOut[k] = aiData[k];
          }
        } catch (e) {
          prev = null;
        }
      }
      const masterBody = {
        ai_data_json: JSON.stringify(aiOut),
        ai_updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (d.fotoFile) masterBody.pas_photo = d.fotoFile;
      if (d.kkFile) masterBody.kk_url = d.kkFile;
      if (d.ktpFile) masterBody.ktp_url = d.ktpFile;
      if (d.ijazahSdFile) masterBody.ijazah_sd_url = d.ijazahSdFile;
      if (d.ijazahSmpFile) masterBody.ijazah_smp_url = d.ijazahSmpFile;
      if (d.ijazahSmaFile) masterBody.ijazah_sma_url = d.ijazahSmaFile;
      if (d.univFile) masterBody.univ_url = d.univFile;
      if (d.jftFile) masterBody.jft_url = d.jftFile;
      if (d.sswFile) masterBody.ssw_url = d.sswFile;
      if (m && m.id !== void 0) {
        await supabaseJson("PATCH", "master_database_candidate", {
          query: { id: "eq." + m.id },
          body: masterBody,
          headers: { Prefer: "return=minimal" }
        });
      } else {
        const { nextCandidateId: nextCandidateId2 } = await Promise.resolve().then(() => (init_candidate_helpers(), candidate_helpers_exports));
        const { supabaseUpsert: supabaseUpsert2 } = await Promise.resolve().then(() => (init_client(), client_exports));
        masterBody.no_wa = wa;
        masterBody.nama_lengkap = nama;
        masterBody.id_kandidat = await nextCandidateId2();
        await supabaseUpsert2("master_database_candidate", masterBody, ["no_wa"], {
          headers: { Prefer: "return=minimal" }
        });
      }
      try {
        const candBody = {};
        if (d.fotoFile) candBody.pas_photo = d.fotoFile;
        if (d.jftFile) candBody.jft = d.jftFile;
        if (d.sswFile) candBody.ssw = d.sswFile;
        if (d.ktpFile) candBody.ktp_url = d.ktpFile;
        if (Object.keys(candBody).length > 0) {
          let c = await findCandidateByWaFiltered(wa);
          if (c === void 0) {
            const found = await findCandidates();
            c = found.rows.find((r) => normalizeWa(String(pick(r, APPLY_WA_COLS) || "")) === wa) || null;
          }
          if (c && c.id !== void 0) {
            await supabaseJson("PATCH", "database_candidate", {
              query: { id: "eq." + c.id },
              body: candBody,
              headers: { Prefer: "return=minimal" }
            });
          }
        }
      } catch (e) {
      }
      try {
        const idBody = {};
        if (identitas.nama_lengkap) idBody.nama_lengkap = identitas.nama_lengkap;
        if (identitas.gender) idBody.gender = identitas.gender;
        if (identitas.usia) idBody.usia = identitas.usia;
        if (identitas.tempat_lahir) idBody.tempat_lahir = identitas.tempat_lahir;
        if (identitas.tgl_lahir) idBody.tgl_lahir = identitas.tgl_lahir;
        if (identitas.hp) idBody.no_wa = wa;
        if (Object.keys(idBody).length > 0) {
          let c2 = await findCandidateByWaFiltered(wa);
          if (c2 === void 0) {
            const found2 = await findCandidates();
            c2 = found2.rows.find(
              (r) => normalizeWa(String(pick(r, APPLY_WA_COLS) || "")) === wa
            ) || null;
          }
          if (c2 && c2.id !== void 0) {
            await supabaseJson("PATCH", "database_candidate", {
              query: { id: "eq." + c2.id },
              body: idBody,
              headers: { Prefer: "return=minimal" }
            });
          }
        }
      } catch (e) {
      }
      try {
        if (d.ktpFile) {
          const want = normalizeWa(wa);
          const pRows = await findFormsByWa(wa);
          const pRow = Array.isArray(pRows) && pRows.find(
            (r) => normalizeWa(String(r.no_wa || r.wa || "")) === want
          );
          if (pRow && pRow.id !== void 0) {
            await supabaseJson("PATCH", "pemberkasan_checklist", {
              query: { id: "eq." + pRow.id },
              body: { ktp_url: d.ktpFile },
              headers: { Prefer: "return=minimal" }
            });
          }
        }
      } catch (e) {
      }
      if (m && m.id !== void 0) {
        try {
          const labels = [];
          for (const [key, label] of Object.entries(AI_SEKSI_LABEL)) {
            const oldVal = prev && typeof prev === "object" ? JSON.stringify(prev[key] || {}) : null;
            const newVal = JSON.stringify(aiData[key] || {});
            if (oldVal !== newVal) labels.push(label);
          }
          if (labels.length) {
            await syncBiodataKeMail(
              wa,
              String(identitas.nama_lengkap || identitas.nama || "").trim() || "KANDIDAT",
              labels
            );
          }
        } catch (e) {
        }
      } else {
        try {
          await syncBiodataKeMail(wa, nama, ["CV AI Baru"]);
        } catch (e) {
        }
      }
      try {
        const mailRows = await findFormsByWa(wa);
        const want = normalizeWa(wa);
        const hasMail = Array.isArray(mailRows) && mailRows.some(
          (r) => normalizeWa(String(r.no_wa || r.wa || "")) === want
        );
        if (!hasMail) {
          await syncFormMailDariUpload(
            wa,
            nama || "KANDIDAT",
            "AI_CV",
            d.fotoFile || "",
            jobCode
          );
        }
      } catch (e) {
      }
    } catch (e) {
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: "Gagal menyimpan data. Silakan coba lagi." };
  }
}
async function handleSimpanDataTtdNaitei(payload, sessionToken) {
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  const d = payload || {};
  const wa = normalizeWa(String(d.wa || ""));
  if (!wa) return { success: false, error: "Nomor WA tidak ditemukan." };
  try {
    const data = {
      wa,
      ttd1: d.ttd1 || "",
      nama1: d.nama1 || "",
      ttd2: d.ttd2 || "",
      nama2: d.nama2 || ""
    };
    try {
      const rows = await supabaseJson("GET", "esignatures", {
        query: { select: "*", wa: "eq." + wa, limit: "10" }
      });
      const existing = (Array.isArray(rows) ? rows : []).find(
        (r) => normalizeWa(String(r.wa || "")) === wa
      );
      if (existing && existing.id !== void 0) {
        await supabaseJson("PATCH", "esignatures", {
          query: { id: "eq." + existing.id },
          body: Object.assign(data, { updated_at: (/* @__PURE__ */ new Date()).toISOString() }),
          headers: { Prefer: "return=minimal" }
        });
      } else {
        await supabaseJson("POST", "esignatures", {
          body: Object.assign(data, {
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }),
          headers: { Prefer: "return=minimal" }
        });
      }
    } catch (e) {
      await supabaseJson("POST", "ai_form_submissions", {
        body: {
          wa,
          mode: "ttd",
          status: "TTD",
          ai_data_json: JSON.stringify(data),
          submitted_via: "esign"
        },
        headers: { Prefer: "return=minimal" }
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: "Terjadi kesalahan saat menyimpan tanda tangan." };
  }
}
var AI_SEKSI_LABEL, APPLY_WA_COLS;
var init_cv = __esm({
  "netlify/functions/_lib/ai/cv.ts"() {
    "use strict";
    init_client();
    init_actions_auth();
    init_actions_master();
    init_actions_mail();
    init_master();
    init_forms();
    init_candidates();
    AI_SEKSI_LABEL = {
      identitas: "identitas",
      fisik: "fisik & ukuran",
      medis: "medis",
      pendidikan: "pendidikan",
      pekerjaan: "pekerjaan",
      sertifikasi: "sertifikasi",
      keluarga: "keluarga",
      wawancara: "wawancara"
    };
    APPLY_WA_COLS = ["no_wa", "wa", "whatsapp"];
  }
});

// netlify/functions/_lib/ai/chat.ts
function getNested(obj, path2) {
  let cur = obj;
  for (const k of path2) {
    if (!cur || typeof cur !== "object") return "";
    cur = cur[k];
  }
  return cur !== void 0 && cur !== null ? String(cur) : "";
}
function setNested(obj, path2, val) {
  let cur = obj;
  for (let i = 0; i < path2.length - 1; i++) {
    if (!cur[path2[i]] || typeof cur[path2[i]] !== "object") cur[path2[i]] = {};
    cur = cur[path2[i]];
  }
  cur[path2[path2.length - 1]] = val;
}
async function autoTranslateMissingJp(data) {
  const NL = String.fromCharCode(10);
  const pairs = [];
  for (let i = 0; i < AI_ID_JP_PAIRS.length; i++) {
    const pair = AI_ID_JP_PAIRS[i];
    const idVal = getNested(data, pair.idPath).trim();
    const jpVal = getNested(data, pair.jpPath).trim();
    if (idVal && !jpVal) {
      pairs.push({ index: pairs.length, idText: idVal, jpPath: pair.jpPath });
    }
  }
  const arrayFieldPairs = [
    { type: "pendidikan", idKey: "sekolah", jpKey: "sekolah_jp" },
    { type: "pendidikan", idKey: "jurusan_id", jpKey: "jurusan_jp" },
    { type: "pekerjaan", idKey: "perusahaan", jpKey: "perusahaan_jp" },
    { type: "pekerjaan", idKey: "jabatan", jpKey: "jabatan_jp" },
    { type: "keluarga", idKey: "hubungan_id", jpKey: "hubungan_jp" },
    { type: "keluarga", idKey: "pekerjaan", jpKey: "pekerjaan_jp" }
  ];
  for (const afp of arrayFieldPairs) {
    const arr = Array.isArray(data[afp.type]) ? data[afp.type] : [];
    for (let i = 0; i < arr.length; i++) {
      const idVal = String(arr[i] && arr[i][afp.idKey] || "").trim();
      const jpVal = String(arr[i] && arr[i][afp.jpKey] || "").trim();
      if (idVal && !jpVal) {
        pairs.push({ index: pairs.length, idText: idVal, jpPath: [afp.type, String(i), afp.jpKey] });
      }
    }
  }
  if (pairs.length === 0) return;
  console.log("[autoTranslate] Translating " + pairs.length + " fields: " + pairs.map((p) => p.jpPath.join(".")).join(", "));
  const lines = pairs.map((p) => p.index + 1 + ". " + p.idText).join(NL);
  const prompt = "Terjemahkan Bahasa Indonesia ke Bahasa Jepang untuk CV kerja." + NL + "Kembalikan JSON: " + String.fromCharCode(123) + '"0":"jp0","1":"jp1",...' + String.fromCharCode(125) + " tanpa teks lain." + NL + NL + lines;
  try {
    const r = await geminiGenerate(prompt, []);
    const text = String(r && r.reply ? r.reply : "").trim();
    if (!text) {
      console.log("[autoTranslate] Empty response from Gemini");
      return;
    }
    const parsed = parseJsonLoose(text);
    if (!parsed || typeof parsed !== "object") return;
    for (let i = 0; i < pairs.length; i++) {
      const jp = String(parsed[String(i)] || "").trim();
      if (jp) setNested(data, pairs[i].jpPath, jp);
    }
  } catch (e) {
    console.error("[autoTranslateMissingJp] error:", e && e.message ? e.message : e);
  }
}
function isVipCatatan(catatan) {
  const c = String(catatan || "");
  return c.includes("[VIP]") || /\[(?:KELAS\s*[A-Z0-9]+|[A-Z0-9]+)\]/i.test(c);
}
async function handleProcessAIChat(payload, sessionToken) {
  const p = payload || {};
  const flow = String(p.flow || "master");
  if (flow === "master") {
    const guard = requireRole(sessionToken, "admin");
    const isAdmin = !guard.error;
    if (!isAdmin) {
      const currentData = p.currentData && typeof p.currentData === "object" ? p.currentData : {};
      const identitas = currentData.identitas && typeof currentData.identitas === "object" ? currentData.identitas : {};
      const wa = normalizeWa(String(identitas.hp || ""));
      if (wa) {
        let lookupError = false;
        let catatan = "";
        try {
          const cand = await findCandidateByWaFiltered(wa);
          if (cand) {
            catatan = String(cand.catatan_internal || cand.catatan_int || cand.catatan_admin || "");
          } else {
            const m = await findMasterByWa2(wa);
            catatan = m ? String(m.catatan_internal || m.catatan_int || m.catatan || m.catatan_admin || "") : "";
          }
        } catch (e) {
          lookupError = true;
        }
        if (!lookupError && !isVipCatatan(catatan)) {
          return {
            success: false,
            error: "Fitur AI CV Master eksklusif untuk Siswa ASJ (VIP / Kelas LPK). Hubungi Admin untuk akses."
          };
        }
      }
    }
  }
  const history = Array.isArray(p.history) ? p.history : [];
  const lang = String(p.lang || "id");
  const ringkas = buildRingkasData(p.currentData);
  const system = "Kamu adalah Qween Jeklin, HRD Virtual LPK ASJ (PT Amanah Sakura Japan), perusahaan penyalur kerja ke Jepang. Tugasmu membantu kandidat melengkapi data Master (identitas, fisik, medis, pendidikan, pekerjaan, keluarga, sertifikasi, wawancara) untuk CV kerja Jepang. Balas ramah & singkat dalam bahasa " + (lang === "jp" ? "Jepang" : "Indonesia") + ". Jika kandidat memberi data baru, konfirmasi dan minta data berikutnya yang kurang. Flow aktif: " + flow + "." + (ringkas ? "\n\nDATA KANDIDAT SAAT INI (sudah terisi di database):\n" + ringkas + "\n\nAturan: JANGAN menanyakan ulang data yang sudah terisi di atas, dan jangan mengaku data itu kosong. Kalau kandidat bertanya tentang data yang sudah ada, jawab pakai data tersebut. Tanyakan hanya data yang TIDAK tercantum di atas." : "") + AI_FORM_DATA_INSTRUCTION;
  try {
    const r = await geminiGenerate(system, history);
    const text = String(r && r.reply ? r.reply : "").trim();
    if (text) {
      try {
        const parsed = parseJsonLoose(text);
        if (parsed && typeof parsed === "object" && parsed.reply) {
          const aiData = parsed.data && typeof parsed.data === "object" ? parsed.data : void 0;
          await autoTranslateMissingJp(p.currentData);
          if (aiData) {
            for (const pair of AI_ID_JP_PAIRS) {
              const jpVal = getNested(p.currentData, pair.jpPath);
              if (jpVal && !getNested(aiData, pair.jpPath)) {
                setNested(aiData, pair.jpPath, jpVal);
              }
            }
          }
          return {
            reply: String(parsed.reply),
            data: aiData || {}
          };
        }
      } catch (e) {
      }
      return { reply: text };
    }
    return r;
  } catch (e) {
    console.error("[AI] processAIChat error:", e && e.message ? e.message : e);
    return { reply: "Maaf, asisten AI sedang sibuk. Coba lagi beberapa saat ya!" };
  }
}
async function handleProcessAdminAIChat(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  const history = (d.history || []).concat([{ role: "user", content: d.message || "" }]);
  const system = "Kamu adalah Jeklin, asisten HRD admin ASJ (PT Amanah Sakura Japan). Admin: " + String(d.adminName || "") + ". Kandidat yang sedang dibahas ID: " + String(d.candidateId || "-") + ". Bantu analisis data kandidat, saran rekrutmen, dan jawaban profesional. Balas singkat & jelas dalam Bahasa Indonesia.";
  try {
    const r = await geminiGenerate(system, history);
    return { success: true, reply: r.reply, suggestedActions: [], analysis: null };
  } catch (e) {
    console.error("[AI] processAdminAIChat error:", e && e.message ? e.message : e);
    return { success: false, error: "Asisten AI sedang sibuk. Coba lagi beberapa saat ya!" };
  }
}
async function handleProcessSiswaAIChat(payload) {
  const p = payload || {};
  const system = 'Kamu adalah Dede Jeklin, asisten pendaftaran siswa baru LPK ASJ. Bantu siswa/orang tua melengkapi form (nama, TTL, gender, agama, alamat, email, pendidikan, WA siswa, WA ortu). Balas ramah dan singkat dalam Bahasa Indonesia.\nPENTING \u2014 jawab SELALU dalam SATU objek JSON valid (tanpa teks lain, tanpa ```):\n{"reply": "<balasan ramah>", "data": {"nama": "...", "ttl": "...", "gender": "LAKI-LAKI atau PEREMPUAN", "agama": "...", "alamat": "...", "email": "...", "pendidikan": "...", "wa_siswa": "...", "wa_ortu": "..."}}\nIsi hanya field yang diketahui dari percakapan; yang belum diketahui biarkan "" (string kosong). Normalisasi gender SELALU ke "LAKI-LAKI" atau "PEREMPUAN" (jangan L/P).';
  try {
    const r = await geminiGenerate(system, Array.isArray(p.history) ? p.history : []);
    const text = String(r && r.reply ? r.reply : "").trim();
    if (text) {
      try {
        const parsed = parseJsonLoose(text);
        if (parsed && typeof parsed === "object" && parsed.reply) {
          return {
            reply: String(parsed.reply),
            data: parsed.data && typeof parsed.data === "object" ? parsed.data : void 0
          };
        }
      } catch (e) {
      }
      return { reply: text };
    }
    return r;
  } catch (e) {
    return { reply: "Maaf, jaringan AI sedang sibuk. Coba lagi ya!" };
  }
}
function normalizeBidang(raw) {
  const s = String(raw || "").toLowerCase();
  if (!s) return null;
  if (/kaigo|kaig|caregiver|perawat.?lansia|care.?giving/.test(s)) return BIDANG_INTERVIEW.kaigo;
  if (/shokuhin|syokuhin|food|makanan|ryouri|seizou/.test(s)) return BIDANG_INTERVIEW.shokuhin;
  if (/nougyou|noukou|agricultur|pertanian|sawah|farming/.test(s)) return BIDANG_INTERVIEW.nougyou;
  if (/kensetsu|konstruksi|construction|bangunan/.test(s)) return BIDANG_INTERVIEW.kensetsu;
  if (/jidousha|seibi|otomotif|automotif|auto.?maint/.test(s)) return BIDANG_INTERVIEW.jidousha;
  if (/binbou|cleaning|kebersihan|sapu|bencah/.test(s)) return BIDANG_INTERVIEW.binbou;
  if (/sougou|service|pelayanan|omotenashi|restoran|hotel/.test(s)) return BIDANG_INTERVIEW.sougou;
  return null;
}
async function resolveProfilKandidat(wa) {
  const want = normalizeWa(String(wa || ""));
  if (!want) return null;
  let nama = "";
  let bidangRaw = "";
  try {
    const m = await findMasterByWa2(want);
    if (m) {
      nama = String(m.nama_lengkap || "");
      bidangRaw = String(m.bidangssw || m.ssw || m.bidang || m.lisensi || "");
    }
  } catch (e) {
  }
  if (!nama || !bidangRaw) {
    try {
      let c = await findCandidateByWaFiltered(want);
      if (c === void 0) {
        const found = await findCandidates();
        c = (found.rows || []).find(
          (r) => normalizeWa(String(pick(r, APPLY_WA_COLS) || "")) === want
        ) || null;
      }
      if (c) {
        if (!nama) nama = String(c.nama || c.nama_lengkap || "");
        if (!bidangRaw) bidangRaw = String(c.bidang || c.ssw || c.bidangssw || "");
      }
    } catch (e2) {
    }
  }
  return { wa: want, nama, bidang: normalizeBidang(bidangRaw) || BIDANG_DEFAULT, bidangRaw };
}
function buildInterviewSystem(profil, kota) {
  const b = profil.bidang || BIDANG_DEFAULT;
  const lines = [
    "Kamu adalah Jeklin Sensei, pewawancara kerja (mensetsu) Jepang untuk LPK ASJ (PT Amanah Sakura Japan).",
    "Kandidat: " + (profil.nama || "Kandidat") + "-san. Bidang SSW: " + b.label + ".",
    "Kota penempatan: " + (kota || "belum ditentukan") + ".",
    "LAKUKAN WAWANCARA SEPERTI PEWAWANCARA ASLI (bukan kuesioner, bukan dokumen isian):",
    "- Buka dengan sapaan hangat singkat, lalu minta perkenalan singkat (jikoshoukai).",
    '- Tanyakan SATU pertanyaan per pesan dengan bahasa alami; untuk kalimat kunci, tambahkan romaji singkat dalam kurung (mis. "Hobi kamu apa? (shumi wa nandesu ka?)").',
    "- DENGARKAN jawaban kandidat, beri reaksi natural (puji/klarifikasi), lalu follow-up untuk menggali lebih dalam bila perlu.",
    '- JANGAN PERNAH menampilkan nomor pertanyaan, daftar/urutan, atau format "1. 2. 3.".',
    "- Wajib gali topik berikut secara alami bila belum terjawab (dalam urutan wajar seperti pewawancara sungguhan):",
    "  \u2022 Perkenalan & alasan melamar (kenapa bidang " + b.label + ").",
    "  \u2022 Hobi / aktivitas fisik.",
    "  \u2022 Pengalaman kerja terkait bidang (detail!).",
    "  \u2022 Kelebihan & kekurangan.",
    "  \u2022 Motivasi ke Jepang, berapa lama ingin bekerja (target 5 tahun+, sertifikat/bahasa).",
    "  \u2022 Pengetahuan tentang kota penempatan.",
    "  \u2022 Pengetahuan tentang pekerjaan " + b.label + " dan hal terberatnya.",
    "  \u2022 Rencana setelah pulang ke Indonesia.",
    "  \u2022 Pertanyaan balik untuk perusahaan.",
    "Topik khas bidang " + b.label + " (tanyakan dengan santai):"
  ];
  lines.push.apply(
    lines,
    b.extra.map((q, i) => "  \u2022 " + (i + 1) + ") " + q)
  );
  lines.push(
    "TUTUP wawancara dengan sopan (doumo arigatou gozaimasu + semangat) ketika semua topik inti sudah terjawab ATAU kandidat menutup pembicaraan.",
    'Di pesan PENUTUP, setelah teks terima kasih, tambahkan baris persis "===HASIL===" lalu JSON TUNGGAL tanpa teks lain:',
    '{ "score": 0-10, "nilai": "A/B/C", "rekomendasi": "...", "biodata": { kunci camelCase \u2014 hanya field yang KANDIDAT sebutkan: nama, furigana, tempatLahir, tglLahir, alamat, email, gender, hobi, kelebihan, kekurangan, motivasiJepang, tujuanJepang, keinginan, rencanaPulang, promosi, keahlianKhusus, eksJepang, gajiYen, tabungan, bhsJepang, nilai, lisensi, ssw, noPaspor, noCoe, daruratNama, daruratWa, pendidikan: [{tingkat, namaSekolah, jurusan, tahunMasuk, tahunLulus}], pekerjaan: [{namaPerusahaan, jabatan, tahunMasuk, tahunKeluar}] }, "catatan": "..." }',
    "Balas dalam Bahasa Indonesia, ramah dan profesional seperti sensei asli."
  );
  return lines.join("\n");
}
async function handleProcessAiInterview(payload, sessionToken) {
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  const p = payload || {};
  const profil = await resolveProfilKandidat(p.wa || p.waTarget || "");
  const system = buildInterviewSystem(
    profil || { nama: p.candidateName, bidang: normalizeBidang(p.bidang) || BIDANG_DEFAULT },
    p.kota || p.jobKota
  );
  try {
    return await geminiGenerate(system, Array.isArray(p.history) ? p.history : []);
  } catch (e) {
    return { reply: "Maaf, jaringan AI sedang sibuk. Coba lagi ya!" };
  }
}
async function handleGenerateWawancaraModel(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  let wa = normalizeWa(String(d.wa || ""));
  if (!wa && d.candidateId) {
    let cand = await findCandidateByIdFiltered(String(d.candidateId));
    if (cand === void 0) {
      const found = await findCandidates();
      cand = (found.rows || []).find(
        (r) => String(pick(r, ["id_kandidat", "id"]) || "") === String(d.candidateId)
      ) || null;
    }
    if (cand) wa = normalizeWa(String(cand.no_wa || ""));
  }
  if (!wa) {
    return {
      success: false,
      error: "Nomor WA kandidat tidak ditemukan \u2014 pilih kandidat dulu atau isi nomor WA."
    };
  }
  const profil = await resolveProfilKandidat(wa);
  const b = normalizeBidang(d.bidang) || profil && profil.bidang || BIDANG_DEFAULT;
  const kota = String(d.kota || d.jobKota || "");
  const system = "Kamu adalah Jeklin, asisten HRD LPK ASJ (PT Amanah Sakura Japan).Buatkan MODEL WAWANCARA KERJA JEPANG untuk kandidat " + (profil && profil.nama || "kandidat") + " (bidang SSW: " + b.label + (kota ? ", kota penempatan: " + kota : "") + '), format PERSIS seperti dokumen isian yang dibagikan tim ke kandidat:\n- 14 pertanyaan bernomor 1-14.\n- Setiap pertanyaan: judul Bahasa Indonesia + pertanyaan romaji dalam kurung (contoh: "Hobi kamu apa? (shumi wa nandesu ka?)").\n- Di bawahnya: "jawaban translate kanji alfabet (watashiwa):" lalu panduan jawaban romaji, kemudian arti Indonesia.\n- Untuk kalimat kunci sertakan kanji di akhir sebagai catatan "kanji wajib di isi boleh menyusul".\n- Masukkan pertanyaan khusus bidang ' + b.label + ' (pengalaman kerja bidang, hal terberat, pengetahuan pekerjaan, kenapa memilih bidang ini).\n- Nomor 14: pertanyaan ke perusahaan (2 pertanyaan) + penutup (doumo arigatou gozaimasu + ojigi).\n- Tambahkan juga instruksi di awal dokumen: "SILAHKAN ISI DI DRIVE INI (TANPA DOWNLOAD FILE)" dan catatan bahwa jawaban akan diperbaiki sensei.\nKembalikan HANYA teks dokumen lengkap siap salin, tanpa penjelasan tambahan.';
  try {
    const r = await geminiGenerate(system, []);
    return {
      success: true,
      model: r.reply,
      bidang: b.label,
      nama: profil && profil.nama || "",
      wa
    };
  } catch (e) {
    console.error("[AI] generateWawancaraModel error:", e && e.message ? e.message : e);
    return {
      success: false,
      error: "Gagal membuat model wawancara. Coba lagi beberapa saat ya!"
    };
  }
}
async function handleSelesaikanWawancara(payload, sessionToken) {
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  const profil = await resolveProfilKandidat(d.wa || "");
  const b = profil && profil.bidang || BIDANG_DEFAULT;
  const history = Array.isArray(d.history) ? d.history : [];
  const transkrip = history.map((h) => {
    const role = h && h.role === "assistant" ? "Jeklin" : "Kandidat";
    return role + ": " + String(h && h.content || "");
  }).join("\n");
  const system = "Kamu adalah Jeklin Sensei, pewawancara kerja Jepang untuk LPK ASJ. Kandidat: " + (profil && profil.nama ? profil.nama + "-san" : "kandidat") + ", bidang SSW: " + b.label + ".\nDi bawah ini TRANSCRIPT wawancara:\n---\n" + (transkrip || "(kandidat belum menjawab apa pun)") + '\n---\nBuat RINGKASAN HASIL WAWANCARA dalam JSON TUNGGAL (tanpa teks lain):\n{ "score": 0-10, "nilai": "A/B/C", "rekomendasi": "saran perbaikan singkat", "biodata": { kunci camelCase \u2014 HANYA data yang kandidat SEBUTKAN: nama, furigana, tempatLahir, tglLahir, alamat, email, gender, hobi, kelebihan, kekurangan, motivasiJepang, tujuanJepang, keinginan, rencanaPulang, promosi, keahlianKhusus, eksJepang, gajiYen, tabungan, bhsJepang, nilai, lisensi, ssw, noPaspor, noCoe, daruratNama, daruratWa, pendidikan: [{tingkat, namaSekolah, jurusan, tahunMasuk, tahunLulus}], pekerjaan: [{namaPerusahaan, jabatan, tahunMasuk, tahunKeluar}] }, "catatan": "hal yang perlu diperbaiki kandidat" }';
  try {
    const r = await geminiGenerate(system, []);
    const hasil = parseJsonLoose(r.reply);
    if (!hasil || typeof hasil !== "object" || Array.isArray(hasil)) {
      return { success: false, error: "AI gagal merangkum hasil wawancara. Coba lagi." };
    }
    return { success: true, hasil };
  } catch (e) {
    console.error("[AI] selesaikanWawancara error:", e && e.message ? e.message : e);
    return {
      success: false,
      error: "Gagal merangkum hasil wawancara. Coba lagi beberapa saat ya!"
    };
  }
}
async function handleSimpanHasilWawancara(payload, sessionToken) {
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  const wa = normalizeWa(String(d.wa || ""));
  if (!wa) return { success: false, error: "Nomor WA tidak ditemukan." };
  const hasil = d.hasil || {};
  if (!hasil || typeof hasil !== "object" || Array.isArray(hasil)) {
    return { success: false, error: "Hasil wawancara kosong/tidak valid." };
  }
  try {
    const rows = await supabaseJson("GET", "ai_form_submissions", {
      query: { select: "*", limit: 100 }
    });
    const existing = (Array.isArray(rows) ? rows : []).find(
      (r) => normalizeWa(String(r.wa || "")) === wa && String(r.submitted_via || "") === "interview"
    );
    const bio = (hasil.biodata || {}).nama || "";
    const body = {
      wa,
      mode: "AI_MASTER",
      job_code: "UMUM",
      bidang: "-",
      status: "MENUNGGU",
      submitted_via: "interview",
      ai_data_json: JSON.stringify(hasil),
      nama_lengkap: bio,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existing && existing.id !== void 0) {
      await supabaseJson("PATCH", "ai_form_submissions", {
        query: { id: "eq." + existing.id },
        body,
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await supabaseJson("POST", "ai_form_submissions", {
        body: Object.assign({ created_at: (/* @__PURE__ */ new Date()).toISOString() }, body),
        headers: { Prefer: "return=minimal" }
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: "Gagal menyimpan hasil wawancara. Silakan coba lagi." };
  }
}
async function handleGetHasilWawancara(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  let wa = normalizeWa(String(d.wa || ""));
  if (!wa && d.candidateId) {
    let cand = await findCandidateByIdFiltered(String(d.candidateId));
    if (cand === void 0) {
      const found = await findCandidates();
      cand = (found.rows || []).find(
        (r) => String(pick(r, ["id_kandidat", "id"]) || "") === String(d.candidateId)
      ) || null;
    }
    if (cand) wa = normalizeWa(String(cand.no_wa || ""));
  }
  if (!wa) {
    return {
      success: false,
      error: "Nomor WA kandidat tidak ditemukan \u2014 pilih kandidat dulu atau isi nomor WA."
    };
  }
  try {
    const rows = await supabaseJson("GET", "ai_form_submissions", {
      query: { select: "*", limit: 100 }
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => normalizeWa(String(r.wa || "")) === wa && String(r.submitted_via || "") === "interview"
    );
    if (!row) return { success: true, hasil: null };
    let hasil = {};
    try {
      hasil = JSON.parse(row.ai_data_json || "{}");
    } catch (e) {
      hasil = { catatan: String(row.ai_data_json || "").slice(0, 2e3) };
    }
    return {
      success: true,
      hasil,
      wa,
      updatedAt: String(row.updated_at || ""),
      nama: String(row.nama_lengkap || hasil.biodata && hasil.biodata.nama || "")
    };
  } catch (e) {
    return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
var AI_ID_JP_PAIRS, AI_FORM_DATA_INSTRUCTION, BIDANG_INTERVIEW, BIDANG_DEFAULT;
var init_chat = __esm({
  "netlify/functions/_lib/ai/chat.ts"() {
    "use strict";
    init_client();
    init_actions_auth();
    init_cv();
    init_providers();
    init_candidates();
    AI_ID_JP_PAIRS = [
      // medis
      { idPath: ["medis", "alergi_id"], jpPath: ["medis", "alergi_jp"] },
      { idPath: ["medis", "riwayat_medis_id"], jpPath: ["medis", "riwayat_medis_jp"] },
      { idPath: ["medis", "riwayat_kecelakaan_id"], jpPath: ["medis", "riwayat_kecelakaan_jp"] },
      // wawancara — keys must match buildMasterNested output exactly
      { idPath: ["wawancara", "promosi_id"], jpPath: ["wawancara", "promosi_jp"] },
      { idPath: ["wawancara", "kelebihan_id"], jpPath: ["wawancara", "kelebihan_jp"] },
      { idPath: ["wawancara", "kekurangan_id"], jpPath: ["wawancara", "kekurangan_jp"] },
      { idPath: ["wawancara", "hobi_id"], jpPath: ["wawancara", "hobi_jp"] },
      { idPath: ["wawancara", "keahlian_id"], jpPath: ["wawancara", "keahlian_jp"] },
      { idPath: ["wawancara", "motivasi_id"], jpPath: ["wawancara", "motivasi_jp"] },
      { idPath: ["wawancara", "motivasi_ke_jepang"], jpPath: ["wawancara", "motivasi_ke_jepang_jp"] },
      { idPath: ["wawancara", "alasan_bidang_id"], jpPath: ["wawancara", "alasan_bidang_jp"] },
      { idPath: ["wawancara", "alasan_memilih_bidang"], jpPath: ["wawancara", "alasan_memilih_bidang_jp"] },
      { idPath: ["wawancara", "rencana_pulang_id"], jpPath: ["wawancara", "rencana_pulang_jp"] },
      { idPath: ["wawancara", "rencana_setelah_pulang"], jpPath: ["wawancara", "rencana_setelah_pulang_jp"] },
      { idPath: ["wawancara", "keinginan_id"], jpPath: ["wawancara", "keinginan_jp"] },
      { idPath: ["wawancara", "tujuan_ke_jepang"], jpPath: ["wawancara", "tujuan_ke_jepang_jp"] },
      // identitas
      { idPath: ["identitas", "tempat_lahir"], jpPath: ["identitas", "tempat_lahir_jp"] },
      { idPath: ["identitas", "agama"], jpPath: ["identitas", "agama_jp"] },
      { idPath: ["identitas", "status_nikah"], jpPath: ["identitas", "status_nikah_jp"] },
      { idPath: ["identitas", "alamat"], jpPath: ["identitas", "alamat_jp"] },
      // kenalan_jepang
      { idPath: ["kenalan_jepang", "nama_id"], jpPath: ["kenalan_jepang", "nama_jp"] },
      { idPath: ["kenalan_jepang", "hubungan_id"], jpPath: ["kenalan_jepang", "hubungan_jp"] },
      { idPath: ["kenalan_jepang", "pekerjaan_id"], jpPath: ["kenalan_jepang", "pekerjaan_jp"] },
      { idPath: ["kenalan_jepang", "alamat_id"], jpPath: ["kenalan_jepang", "alamat_jp"] }
    ];
    AI_FORM_DATA_INSTRUCTION = '\n\nPENTING \u2014 jawab SELALU dalam SATU objek JSON valid (tanpa teks lain, tanpa ```):\n{"reply": "<balasan ramah untuk kandidat, dalam bahasa percakapan>", "data": <objek data di bawah>}\ndata harus berisi SEMUA data kandidat yang diketahui dari SELURUH percakapan, dengan kunci persis:\n{"identitas": {"nama_lengkap","katakana","panggilan","panggilan_katakana","tempat_lahir","tgl_lahir","umur","gender","agama","golongan_darah","status_nikah","anak","email","alamat","hp","hp_darurat","ktp","paspor","sim"}, "fisik": {"tb","bb","topi","baju","sepatu","tangan_dominan","tahan_ac"}, "medis": {"mata_kiri","mata_kanan","kacamata","buta_warna","tato","rokok","alkohol","alergi_id","alergi_jp","riwayat_medis_id","riwayat_medis_jp","riwayat_kecelakaan_id","riwayat_kecelakaan_jp"}, "sertifikasi": {"bahasa_jepang","nilai","lisensi"}, "wawancara": {"keinginan_id","keinginan_jp","tujuan_ke_jepang","tujuan_ke_jepang_jp","riwayat_jepang","promosi_id","promosi_jp","kelebihan_id","kelebihan_jp","kekurangan_id","kekurangan_jp","hobi_id","hobi_jp","keahlian_id","keahlian_jp","motivasi_id","motivasi_jp","alasan_bidang_id","alasan_bidang_jp","rencana_pulang_id","rencana_pulang_jp","lama_di_jepang","harapan_gaji","harapan_tabungan"}, "kenalan_jepang": {"nama_id","nama_jp","hubungan_id","hubungan_jp","pekerjaan_id","pekerjaan_jp","usia","alamat_id","alamat_jp"}, "pendidikan": [{"tingkat","sekolah_id","sekolah_jp","jurusan_id","jurusan_jp","masuk","lulus"}], "pekerjaan": [{"perusahaan_id","perusahaan_jp","jabatan_id","jabatan_jp","masuk","keluar","gaji"}], "keluarga": [{"hubungan_id","hubungan_jp","nama","katakana","umur","pekerjaan_id","pekerjaan_jp","gaji"}]}\nAturan data: isi hanya field yang benar-benar diketahui dari percakapan (nilai bukan null, string kosong "" untuk yang belum); gender SELALU dinormalisasi ke "LAKI-LAKI" atau "PEREMPUAN"; JANGAN menebak/mengarang data yang tidak disebut kandidat; sertakan juga data yang sudah ada di DATA KANDIDAT SAAT INI.\nAturan bahasa field: field berakhiran "_id" = Bahasa Indonesia, field berakhiran "_jp" = Bahasa Jepang. Contoh: kelebihan_id = "Disiplin" (ID), kelebihan_jp = "\u57FA\u6E96\u304C\u3042\u308B" (JP). PROMOSI, KEBERHASILAN, KELEBIHAN, KEKURANGAN, HOBI, KEAHLIAN, MOTIVASI, ALASAN BIDANG, RENCANA PULANG: WAJIB isi KEDUANYA (_id DAN _jp) \u2014 jangan kosongkan salah satu.\nTERJEMAHAN: Jika kandidat meminta terjemahkan/translate, WAJIB kembalikan JSON dengan SEMUA field _jp terisi dari _id. Contoh: kelebihan_id = "Disiplin" \u2192 kelebihan_jp = "\u5EFA\u5C40\u304C\u3042\u308B". Untuk array (pendidikan, pekerjaan, keluarga): terjemahkan SEMUA baris.\n';
    BIDANG_INTERVIEW = {
      kaigo: {
        label: "Kaigo (\u4ECB\u8B77)",
        extra: [
          "Apa saja tugas utama seorang kaigo / caregiver? Jelaskan dengan contoh.",
          "Bagaimana cara menghadapi lansia yang sedang marah, bingung, atau susah diatur?",
          "Apa yang kamu ketahui tentang sertifikat Kaigo Fukushishi / ujian Kouka Shiken di Jepang?",
          "Apakah kamu punya pengalaman merawat anggota keluarga yang lanjut usia? Ceritakan."
        ]
      },
      shokuhin: {
        label: "Shokuhin Seizou (\u98DF\u54C1\u88FD\u9020)",
        extra: [
          "Pernahkah kamu bekerja di produksi/pengolahan makanan? Ceritakan pengalamanmu.",
          "Apa yang kamu ketahui tentang kebersihan dan keamanan pangan (food safety)?",
          "Bagaimana perasaanmu bekerja shift malam atau lembur?",
          "Apakah kamu bisa bekerja cepat, teliti, dan mengikuti SOP dengan disiplin?"
        ]
      },
      nougyou: {
        label: "Nougyou (\u8FB2\u696D)",
        extra: [
          "Apakah kamu pernah bekerja di sawah/ladang? Ceritakan pengalamanmu.",
          "Bagaimana perasaanmu bekerja di luar ruangan dengan cuaca panas/dingin?",
          "Apakah fisikmu kuat untuk kerja lapangan yang berat?",
          "Apa yang kamu ketahui tentang teknologi pertanian Jepang?"
        ]
      },
      kensetsu: {
        label: "Kensetsu (\u5EFA\u8A2D)",
        extra: [
          "Apakah kamu pernah bekerja di proyek bangunan? Ceritakan pengalamanmu.",
          "Apa yang kamu ketahui tentang keselamatan kerja (anzen) di lokasi konstruksi?",
          "Bagaimana perasaanmu bekerja di ketinggian atau di luar ruangan?",
          "Apakah kamu bisa bekerja dengan alat berat / mesin?"
        ]
      },
      jidousha: {
        label: "Jidousha Seibi (\u81EA\u52D5\u8ECA\u6574\u5099)",
        extra: [
          "Apakah kamu punya pengalaman di bengkel atau perawatan kendaraan? Ceritakan.",
          "Apa yang kamu ketahui tentang alat-alat bengkel dan keselamatan kerjanya?",
          "Apakah kamu teliti dan sabar mengerjakan detail mekanik?",
          "Apakah kamu bisa membaca manual / mengikuti instruksi teknis?"
        ]
      },
      binbou: {
        label: "Binbou (\u30D3\u30EB\u30AF\u30EA\u30FC\u30CB\u30F3\u30B0)",
        extra: [
          "Apakah kamu pernah bekerja cleaning service? Ceritakan pengalamanmu.",
          "Apa yang kamu ketahui tentang cara membersihkan bangunan/gedung secara profesional?",
          "Apakah kamu teliti dan bertanggung jawab dengan detail kecil?",
          "Bagaimana perasaanmu bekerja sendiri di malam hari?"
        ]
      },
      sougou: {
        label: "Sougou Service (\u7DCF\u5408\u30B5\u30FC\u30D3\u30B9)",
        extra: [
          "Apakah kamu punya pengalaman melayani pelanggan? Ceritakan.",
          "Bagaimana cara kamu menghadapi pelanggan yang sedang komplain?",
          "Apa itu omotenashi? Bagaimana kamu menerapkannya?",
          "Apakah kamu bisa ramah dan sopan dalam bahasa Jepang?"
        ]
      }
    };
    BIDANG_DEFAULT = {
      label: "SSW (Tokutei Ginou)",
      extra: [
        "Apakah kamu punya pengalaman kerja di bidang ini? Ceritakan secara detail.",
        "Apa yang kamu ketahui tentang pekerjaan SSW yang kamu lamar?",
        "Menurutmu apa yang paling berat dari bidang ini? Bagaimana kamu mengatasinya?",
        "Kenapa kamu memilih bidang pekerjaan ini?"
      ]
    };
  }
});

// netlify/functions/_lib/ai/classify.ts
async function handleParseDokumenBiodata(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  const file = d.file || {};
  const name = String(file.name || "").trim();
  const mimeType = String(file.mimeType || file.type || "").trim();
  const data = String(file.data || "").trim();
  if (!name || !data) return { success: false, error: "File belum dipilih." };
  let buf;
  try {
    buf = Buffer.from(data, "base64");
  } catch (e) {
    return { success: false, error: "File tidak bisa dibaca." };
  }
  if (buf.length > PARSE_MAX_BYTES) {
    return { success: false, error: "File terlalu besar (maks 8 MB)." };
  }
  if (!PARSE_ALLOWED_MIME.has(mimeType)) {
    return {
      success: false,
      error: "Format tidak didukung: " + (name.split(".").pop() || mimeType || "?") + ". Gunakan PDF/Excel/Word/CSV/TXT/gambar."
    };
  }
  let wa = normalizeWa(String(d.wa || ""));
  if (!wa && d.candidateId) {
    let cand = await findCandidateByIdFiltered(String(d.candidateId));
    if (cand === void 0) {
      const found = await findCandidates();
      cand = (found.rows || []).find(
        (r) => String(pick(r, ["id_kandidat", "id"]) || "") === String(d.candidateId)
      ) || null;
    }
    if (cand) wa = normalizeWa(String(cand.no_wa || ""));
  }
  if (!wa) {
    return {
      success: false,
      error: "Nomor WA kandidat tidak ditemukan \u2014 pilih kandidat dulu atau isi nomor WA."
    };
  }
  let namaSekarang = "";
  try {
    const m = await findMasterByWa2(wa);
    if (m) namaSekarang = String(m.nama_lengkap || "");
  } catch (e) {
  }
  try {
    const reply = await geminiParseFile(PARSE_SYSTEM_PROMPT, { mimeType, data });
    const parsed = parseJsonLoose(reply);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        success: false,
        error: "AI tidak bisa mengekstrak data dari file ini. Coba file lain."
      };
    }
    if (parsed.gender) {
      const g = normalizeGender(parsed.gender);
      if (g) parsed.gender = g;
    }
    const fields = Object.keys(parsed).filter(
      (k) => k !== "pendidikan" && k !== "pekerjaan" && k !== "keluarga"
    );
    return {
      success: true,
      wa,
      namaSekarang,
      fileName: name,
      data: parsed,
      fieldCount: fields.length,
      riwayat: {
        pendidikan: Array.isArray(parsed.pendidikan) ? parsed.pendidikan.length : 0,
        pekerjaan: Array.isArray(parsed.pekerjaan) ? parsed.pekerjaan.length : 0,
        keluarga: Array.isArray(parsed.keluarga) ? parsed.keluarga.length : 0
      }
    };
  } catch (e) {
    console.error("[AI] parseDokumenBiodata error:", e && e.message ? e.message : e);
    return {
      success: false,
      error: "Gagal parse dokumen: " + (e && e.message ? e.message : "AI sibuk")
    };
  }
}
var PARSE_MAX_BYTES, PARSE_ALLOWED_MIME, PARSE_SYSTEM_PROMPT;
var init_classify = __esm({
  "netlify/functions/_lib/ai/classify.ts"() {
    "use strict";
    init_client();
    init_candidates();
    init_actions_auth();
    init_cv();
    init_providers();
    PARSE_MAX_BYTES = 8 * 1024 * 1024;
    PARSE_ALLOWED_MIME = /* @__PURE__ */ new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // xlsx
      "application/vnd.ms-excel",
      // xls
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      // docx
      "application/msword",
      // doc
      "text/csv",
      "text/plain",
      "text/html",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
      // hasil scan foto CV
    ]);
    PARSE_SYSTEM_PROMPT = [
      "Kamu adalah asisten HRD ASJ (PT Amanah Sakura Japan).",
      "Admin mengupload dokumen biodata/CV kandidat kerja ke Jepang.",
      "Ekstrak semua data yang bisa kamu baca ke JSON MURNI (tanpa teks lain, tanpa markdown fence).",
      "Hanya isi field yang benar-benar ada di dokumen \u2014 yang tidak ada, OMIT (jangan null/string kosong).",
      "Normalisasi: nama dalam HURUF KAPITAL, tanggal lahir format YYYY-MM-DD, nomor HP/WA tanpa spasi.",
      "Kunci yang diizinkan (persis, camelCase):",
      "nama, furigana, panggilan, panggilanKatakana, gender, tempatLahir, tglLahir, usia, agama, statusNikah,",
      "anak, ktp, sim, alamat, email, tb, bb, goldar, tangan, baju, sepatu, topi, tahanAc,",
      "mataKiri, mataKanan, kacamata, butaWarna, tato, tindik, merokok, alkohol, penyakit, alergi, laka,",
      "promosi, kelebihan, kekurangan, keahlianKhusus, hobi, alasanBidang, motivasiJepang, keinginan,",
      "rencanaPulang, tujuanJepang, eksJepang, daruratNama, daruratHubungan, daruratWa,",
      "kenalanNama, kenalanHubungan, kenalanPekerjaan, kenalanUsia, kenalanAlamat, lamaJepang,",
      "gajiYen, tabungan, bhsJepang, nilai, lisensi, ssw, noPaspor, tglTerbitPaspor, expPaspor, kotaPaspor, noCoe.",
      'gender: Laki-laki/L/P/MALE \u2192 "L", Perempuan/P/FEMALE \u2192 "P".',
      "Riwayat sebagai ARRAY (maks 5 pendidikan, 3 pekerjaan, 5 keluarga):",
      "pendidikan: [{ tingkat, namaSekolah, jurusan, tahunMasuk, tahunLulus }]",
      "pekerjaan: [{ namaPerusahaan, jabatan, tahunMasuk, tahunKeluar, gaji }]",
      "keluarga: [{ nama, usia, hubungan, pekerjaan }]",
      "Bahasa Jepang pada dokumen (nama katakana, alamat jp, dll) tetap disalin apa adanya.",
      "Kembalikan HANYA objek JSON valid."
    ].join(" ");
  }
});

// netlify/functions/_lib/actions-candidate.ts
async function handleUpdateCatatanKandidat(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  cacheClear();
  const [id, intNote, extNote] = payload || [];
  if (!id) return { success: false, error: "ID kandidat tidak ditemukan." };
  try {
    await supabaseJson("PATCH", "database_candidate", {
      query: { id_kandidat: "eq." + id },
      body: {
        catatan_internal: intNote || "",
        catatan_external: extNote || ""
      },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal simpan catatan: " + e.message };
  }
}
async function handleUpdateKandidatSuper(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  cacheClear();
  const data = payload && payload[0] || {};
  if (!data.wa) return { success: false, error: "Nomor WA tidak ditemukan." };
  const body = {
    gender: data.gender !== void 0 ? data.gender : void 0,
    usia: data.usia !== void 0 ? data.usia : void 0,
    tempat_lahir: data.tempatLahir !== void 0 ? data.tempatLahir : void 0,
    tgl_lahir: data.tglLahir !== void 0 ? data.tglLahir : void 0,
    tb: data.tb !== void 0 ? data.tb : void 0,
    bb: data.bb !== void 0 ? data.bb : void 0,
    nilai_jft_text: data.jftText !== void 0 ? data.jftText : void 0,
    bidang_ssw_text: data.sswText !== void 0 ? data.sswText : void 0,
    // Multi-apply: admin bisa set job utama kandidat (id_loker_pilihan).
    id_loker_pilihan: data.idLoker !== void 0 && data.idLoker !== null ? String(data.idLoker).trim() : void 0
  };
  for (const k of Object.keys(body)) if (body[k] === void 0) delete body[k];
  try {
    const row = await findCandidateByWa(data.wa);
    if (!row) return { success: false, error: "Kandidat tidak ditemukan." };
    await supabaseJson("PATCH", "database_candidate", {
      query: { id: "eq." + row.id },
      body,
      headers: { Prefer: "return=minimal" }
    });
    try {
      const labels = [];
      for (const k of Object.keys(body)) {
        const label = SUPER_MAIL_LABELS[k];
        if (!label) continue;
        const oldVal = row[k] !== void 0 && row[k] !== null ? String(row[k]).trim() : "";
        const newVal = String(body[k] === null || body[k] === void 0 ? "" : body[k]).trim();
        if (newVal !== oldVal) labels.push(label);
      }
      if (labels.length) {
        await syncBiodataKeMail(
          data.wa,
          String(row.nama_lengkap || row.nama || "KANDIDAT"),
          labels
        );
      }
    } catch (e) {
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal update kandidat: " + e.message };
  }
}
async function handleGetCandidatesPage(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const opts = payload && payload[0] || {};
  const page = Number(opts.page) || 1;
  const pageSize = Number(opts.pageSize) || 50;
  try {
    const { rows: candRows, total } = await loadCandidatesUnik(opts.q || "", {
      page,
      pageSize
    });
    const cands = stripRaw(candRows.map(mapCandidate));
    const waList = cands.map((c) => normalizeWa(String(c.wa || ""))).filter(Boolean);
    let allForms;
    await Promise.all([
      attachBerkasBio(cands),
      findFormsByWaList(waList).then((r) => {
        allForms = r;
      })
    ]);
    if (allForms === void 0) allForms = await findForms();
    attachApplications(cands, allForms);
    return { success: true, candidates: cands, total };
  } catch (e) {
    return { success: false, error: "Gagal memuat kandidat: " + e.message };
  }
}
var SUPER_MAIL_LABELS;
var init_actions_candidate = __esm({
  "netlify/functions/_lib/actions-candidate.ts"() {
    "use strict";
    init_client();
    init_forms();
    init_candidates();
    init_berkas();
    init_actions_auth();
    init_candidate_helpers();
    init_actions_public();
    init_cache();
    init_actions_mail();
    SUPER_MAIL_LABELS = {
      gender: "gender",
      usia: "usia",
      tempat_lahir: "tempat lahir",
      tgl_lahir: "tgl lahir",
      tb: "tinggi",
      bb: "berat",
      nilai_jft_text: "JFT",
      bidang_ssw_text: "SSW",
      id_loker_pilihan: "loker"
    };
  }
});

// netlify/functions/_lib/actions-upload.ts
function fireIngest(payload, sessionToken) {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "";
  const target = baseUrl ? `${baseUrl}/.netlify/functions/ingest` : "/.netlify/functions/ingest";
  const body = JSON.stringify({ action: "processUploadDoc", payload, sessionToken });
  fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  }).then((r) => r.json()).then((j) => console.log("[Smart Ingest] result:", JSON.stringify(j).slice(0, 200))).catch((e) => console.warn("[Smart Ingest] HTTP call failed:", e.message));
}
function pickPrefill(data) {
  const safe = {};
  for (const k of Object.keys(data || {})) {
    if (PUBLIC_PREFILL_FIELDS.has(k)) safe[k] = data[k];
  }
  return safe;
}
async function handleGetUploadUrls(payload, sessionToken) {
  if (!hasBackend()) return { success: false, error: "Backend belum dikonfigurasi." };
  const body = payload && payload[0] || payload || {};
  const files = Array.isArray(body.files) ? body.files : [];
  const folder = String(body.folder || "misc").replace(/^\/+|\/+$/g, "");
  if (files.length === 0) return { success: false, error: "Tidak ada file untuk diupload." };
  const urls = {};
  try {
    for (const f of files) {
      const key = String(f.key || "").trim();
      if (!key) continue;
      const prefix = String(f.prefix || key).trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "FILE";
      const ext = String(f.ext || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
      const path2 = (folder ? folder + "/" : "") + prefix + "." + ext;
      await hapusJenisVarian(folder, prefix);
      const res = await storageRequest("POST", "object/upload/sign/" + bucket() + "/" + path2, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 120 })
      });
      const rel = res && res.url ? String(res.url) : "/object/upload/sign/" + bucket() + "/" + path2;
      urls[key] = {
        signedUrl: supabaseUrl().replace(/\/$/, "") + "/storage/v1" + (rel.startsWith("/") ? rel : "/" + rel),
        publicUrl: publicUrl(path2)
      };
    }
    return { success: true, urls };
  } catch (e) {
    return { success: false, error: "Gagal membuat link upload. Silakan coba lagi." };
  }
}
async function findFormByWa(wa) {
  const want = normalizeWa(wa);
  let rows = await findFormsByWa(wa);
  if (rows === void 0) rows = await findForms();
  return rows.find((r) => normalizeWa(String(r.no_wa || r.wa || "")) === want) || null;
}
async function findFormByWaJob(wa, code) {
  const want = normalizeWa(wa);
  let rows = await findFormsByWa(wa);
  if (rows === void 0) rows = await findForms();
  return rows.find(
    (r) => normalizeWa(String(r.no_wa || r.wa || "")) === want && String(r.code_job || "").trim() === String(code || "").trim()
  ) || null;
}
async function handleCekDataPelamar(payload) {
  const wa = String(payload && payload[0] || "");
  if (!wa) return { found: false, applications: [] };
  try {
    let rows = await findFormsByWa(wa);
    if (rows === void 0) rows = await findForms();
    const want = normalizeWa(wa);
    const apps = rows.filter((r) => normalizeWa(String(r.no_wa || r.wa || "")) === want).map((r) => ({
      code: toText(r.code_job || ""),
      status: toText(r.status || "MENUNGGU"),
      timestamp: toText(r.timestamp || r.created_at || "")
    })).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    const myRows = rows.filter((r) => normalizeWa(String(r.no_wa || r.wa || "")) === want);
    if (!myRows.length) {
      try {
        const cands = await findCandidates();
        const candRow = (Array.isArray(cands?.rows) ? cands.rows : []).find(
          (r) => normalizeWa(String(pick(r, ["no_wa", "wa", "whatsapp"]) || "")) === want
        );
        if (candRow) {
          const cPhoto = toText(pick(candRow, ["pas_photo", "pasPhoto", "photo"]));
          const cJft = toText(pick(candRow, ["jft", "file_jft"]));
          const cSsw = toText(pick(candRow, ["ssw", "file_ssw"]));
          return {
            found: true,
            nama: toText(pick(candRow, ["nama_lengkap", "nama"])),
            gender: toText(pick(candRow, ["gender", "jenis_kelamin"])),
            usia: toText(pick(candRow, ["usia", "umur"])),
            tb: toText(pick(candRow, ["tb"])),
            bb: toText(pick(candRow, ["bb"])),
            pasPhoto: cPhoto && cPhoto !== "-" ? cPhoto : "-",
            photoUrl: cPhoto && cPhoto !== "-" ? cPhoto : "-",
            jftUrl: cJft && cJft !== "-" ? cJft : "-",
            sswUrl: cSsw && cSsw !== "-" ? cSsw : "-",
            email: toText(pick(candRow, ["email"])),
            applications: apps
          };
        }
      } catch {
      }
      return { found: false, applications: apps };
    }
    const first = myRows[0];
    const pickFirstNonEmpty = (fields) => {
      for (const r of myRows) {
        const v = toText(pick(r, fields));
        if (v && v !== "-" && v !== "null" && v !== "undefined") return v;
      }
      return "-";
    };
    const bestPasPhoto = pickFirstNonEmpty(["pas_photo", "pasPhoto", "photo"]);
    const bestJft = pickFirstNonEmpty(["jft", "jft_url"]);
    const bestSsw = pickFirstNonEmpty(["ssw", "ssw_url"]);
    const extraFilesMap = {};
    myRows.forEach((r) => {
      const ket = toText(pick(r, ["keterangan"])) || "";
      ket.split(";").forEach((p) => {
        const parts = p.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim().toUpperCase();
          const val = parts.slice(1).join(":").trim();
          if (key && val.startsWith("http") && !extraFilesMap[key]) {
            extraFilesMap[key] = val;
          }
        }
      });
    });
    let finalPhoto = bestPasPhoto;
    let finalJft = bestJft;
    let finalSsw = bestSsw;
    let finalEmail = "";
    try {
      const cands = await findCandidates();
      const candRow = (Array.isArray(cands?.rows) ? cands.rows : []).find(
        (r) => normalizeWa(String(pick(r, ["no_wa", "wa", "whatsapp"]) || "")) === want
      );
      if (candRow) {
        finalEmail = toText(pick(candRow, ["email"]));
        if (finalPhoto === "-") {
          const cPhoto = toText(pick(candRow, ["pas_photo", "pasPhoto", "photo"]));
          if (cPhoto && cPhoto !== "-") finalPhoto = cPhoto;
        }
        if (finalJft === "-") {
          const cJft = toText(pick(candRow, ["jft", "file_jft"]));
          if (cJft && cJft !== "-") finalJft = cJft;
        }
        if (finalSsw === "-") {
          const cSsw = toText(pick(candRow, ["ssw", "file_ssw"]));
          if (cSsw && cSsw !== "-") finalSsw = cSsw;
        }
      }
    } catch {
    }
    return {
      found: true,
      nama: toText(pick(first, ["nama_lengkap", "nama"])),
      gender: toText(pick(first, ["gender", "jenis_kelamin"])),
      usia: toText(pick(first, ["usia", "umur"])),
      tb: toText(pick(first, ["tb"])),
      bb: toText(pick(first, ["bb"])),
      pasPhoto: finalPhoto,
      photoUrl: finalPhoto,
      jftUrl: finalJft,
      sswUrl: finalSsw,
      email: finalEmail,
      applications: apps
    };
  } catch (e) {
    return { found: false, applications: [] };
  }
}
async function handleIsJobRequiresCv(payload) {
  const code = String(payload && payload[0] || "");
  try {
    let job = await findJobByCodeFiltered(code);
    if (job === void 0) {
      const found = await findJobs();
      job = found.rows.find((r) => String(pick(r, ["code_job", "code"]) || "") === code) || null;
    }
    if (!job) return { success: false, error: "Kode loker tidak ditemukan." };
    const share = String(pick(job, ["dokumen_share", "format_cv"]) || "").toUpperCase();
    return { success: true, requiresCv: share.includes("CV") };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
async function handleSubmitApply(payload) {
  cacheClear();
  const d = payload && payload[0] || {};
  const wa = normalizeWa(String(d.wa || ""));
  const code = String(d.job || "").trim();
  if (!wa || !code || !d.nama) return { success: false, message: "Data lamaran tidak lengkap." };
  try {
    let job = await findJobByCodeFiltered(code);
    if (job === void 0) {
      const found = await findJobs();
      job = found.rows.find((r) => String(pick(r, ["code_job", "code"]) || "") === code) || null;
    }
    if (!job) return { success: false, message: "Kode loker tidak ditemukan: " + code };
    const share = String(pick(job, ["dokumen_share"]) || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const have = /* @__PURE__ */ new Set();
    if (d.cvFile || d.oldCv) have.add("CV");
    if (d.jftFile || d.oldJft) have.add("JFT");
    if (d.sswFile || d.oldSsw) have.add("SSW");
    (d.extraFiles || []).forEach((x) => have.add(String(x && x.name || "").toUpperCase()));
    const missing = share.filter(
      (req) => !have.has(req) && !["CV", "JFT", "SSW"].includes(req) && req !== "-"
    );
    const missingCore = share.filter((req) => ["CV", "JFT", "SSW"].includes(req) && !have.has(req));
    if (missingCore.length || missing.length) {
      return {
        success: false,
        message: "Berkas belum lengkap. Harap upload: " + [...missingCore, ...missing].join(", ")
      };
    }
    const jobBidang = String(pick(job, ["kategori", "category", "bidang", "sektor"]) || "");
    const body = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      code_job: code,
      kategory: String(d.bidang || jobBidang || ""),
      nama_lengkap: String(d.nama || "").trim().toUpperCase(),
      no_wa: wa,
      email: String(d.email || "").trim(),
      gender: String(d.gender || ""),
      usia: String(d.usia || ""),
      tb: String(d.tb || ""),
      bb: String(d.bb || ""),
      pas_photo: d.photoFile || d.oldPhoto || "",
      jft: d.jftFile || d.oldJft || "",
      ssw: d.sswFile || d.oldSsw || "",
      file_cv: d.cvFile || d.oldCv || "",
      status: "MENUNGGU",
      keterangan: (d.extraFiles || []).map((x) => String(x && x.name || "") + ":" + String(x && x.url || "")).join(";")
    };
    const existing = await findFormByWaJob(wa, code);
    if (existing && existing.id !== void 0) {
      await supabaseJson("PATCH", "database_asj_form", {
        query: { id: "eq." + existing.id },
        body,
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await upsertFormRow(body);
    }
    try {
      const candRow = await findCandidateByWaFiltered(wa);
      if (candRow && candRow.id !== void 0) {
        const candPatch = {};
        const photoVal = String(body.pas_photo || "").trim();
        if (photoVal && photoVal !== "-") candPatch.pas_photo = photoVal;
        const jftVal = String(body.jft || "").trim();
        if (jftVal && jftVal !== "-") candPatch.jft = jftVal;
        const sswVal = String(body.ssw || "").trim();
        if (sswVal && sswVal !== "-") candPatch.ssw = sswVal;
        const cvVal = String(body.file_cv || "").trim();
        if (cvVal && cvVal !== "-") candPatch.file_cv = cvVal;
        if (Object.keys(candPatch).length) {
          await supabaseJson("PATCH", "database_candidate", {
            query: { id: "eq." + candRow.id },
            body: candPatch,
            headers: { Prefer: "return=minimal" }
          });
        }
      }
    } catch {
    }
    try {
      const mRow = await findMasterByWa(wa);
      if (mRow && mRow.id !== void 0) {
        const masterPatch = {};
        (d.extraFiles || []).forEach((x) => {
          const label = String(x && x.name || "").trim().toUpperCase();
          const url = String(x && x.url || "").trim();
          if (!label || !url) return;
          const map = fileLabelKey(label) ? FILE_LABEL_COLUMNS[fileLabelKey(label)] : null;
          if (map && map.master) masterPatch[map.master] = url;
        });
        if (Object.keys(masterPatch).length) {
          await supabaseJson("PATCH", "master_database_candidate", {
            query: { id: "eq." + mRow.id },
            body: masterPatch,
            headers: { Prefer: "return=minimal" }
          });
        }
      }
    } catch (e) {
    }
    try {
      notifyAdmins(
        "Lamaran Baru!",
        `${d.nama || "Kandidat"} baru saja melamar posisi ${code}.`,
        "/admin.html"
      );
    } catch (_) {
    }
    const PARSEABLE_EXTS = /* @__PURE__ */ new Set(["pdf", "docx", "xlsx", "xls", "csv", "txt"]);
    const ingestFiles = [];
    const collectIngest = (fileUrl, label) => {
      if (!fileUrl) return;
      const ext = String(fileUrl).split(".").pop().split("?")[0].toLowerCase();
      if (PARSEABLE_EXTS.has(ext)) ingestFiles.push({ fileUrl, fileType: ext });
    };
    collectIngest(d.cvFile || d.oldCv, "CV");
    collectIngest(d.jftFile || d.oldJft, "JFT");
    collectIngest(d.sswFile || d.oldSsw, "SSW");
    (d.extraFiles || []).forEach((x) => collectIngest(x && x.url, x && x.name));
    if (ingestFiles.length && wa) {
      fireIngest(
        ingestFiles.map((f) => ({ ...f, wa })),
        void 0
      );
    }
    return { success: true, message: "Lamaran berhasil dikirim. Terima kasih." };
  } catch (e) {
    return { success: false, message: "Gagal simpan lamaran: " + e.message };
  }
}
async function handleGetExistingCandidateJsonByWa(payload, sessionToken) {
  const wa = String(payload && payload[0] || "");
  try {
    let row = await findCandidateByWaFiltered(wa);
    if (row === void 0) {
      const found = await findCandidates();
      const want = normalizeWa(wa);
      row = found.rows.find((r) => normalizeWa(String(pick(r, APPLY_WA_COLS2) || "")) === want) || null;
    }
    if (!row) return { success: false, error: "Kandidat tidak ditemukan." };
    const data = mapCandidate(row);
    if (isOwnerOrAdmin(sessionToken, wa)) return { success: true, data };
    return { success: true, data: pickPrefill(data), limited: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function fileLabelKey(label) {
  const l = String(label || "").trim().toUpperCase();
  return FILE_LABEL_COLUMNS[l] ? l : null;
}
async function handleSimpanKandidatDanUpload(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  cacheClear();
  const d = payload && payload[0] || {};
  const wa = normalizeWa(String(d.wa || ""));
  if (!d.nama || !wa) return { success: false, error: "Nama dan nomor WA wajib diisi." };
  if (wa.length < 12 || wa.length > 13) {
    return {
      success: false,
      error: "Nomor WA tidak valid (" + wa + "). Harus 62 + 10/11 digit (total 12-13 digit). Periksa nomor kembali."
    };
  }
  try {
    const nama = String(d.nama).trim().toUpperCase();
    let existing = null;
    try {
      existing = await findCandidateByWaFiltered(wa);
    } catch {
    }
    if (!existing) {
      try {
        const found = await findCandidates();
        existing = found.rows.find(
          (r) => normalizeWa(
            pick(r, ["no_wa", "wa", "whatsapp", "telepon", "phone", "no_hp"]) || ""
          ) === wa
        ) || null;
      } catch {
        existing = null;
      }
    }
    const idKand = existing ? String(pick(existing, ["id_kandidat", "id"]) || "") : await nextCandidateId();
    const folder = "master/" + nama.replace(/[^A-Z0-9_-]/g, "_");
    const uploaded = [];
    const files = Array.isArray(d.files) ? d.files : [];
    const fileUrls = {};
    for (const f of files) {
      if (!f) continue;
      const label = String(f.label || "").toUpperCase();
      let url = String(f.url || "").trim();
      if (!url && f.data) {
        const ext = String(f.name || "file").split(".").pop() || "jpg";
        url = await uploadBase64(f.data, folder, (label || "FILE") + "." + ext);
      }
      if (url) {
        fileUrls[label] = url;
        uploaded.push(label);
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const pass = wa.slice(-4);
    const hash2 = bcryptjs_default.hashSync(pass, 10);
    const candBody = {
      id_kandidat: idKand,
      nama_lengkap: nama,
      gender: String(d.gender || ""),
      usia: String(d.usia || ""),
      tb: String(d.tb || ""),
      bb: String(d.bb || ""),
      pendidikan: String(d.pendidikan || ""),
      no_wa: wa,
      id_loker_pilihan: String(d.loker || ""),
      tahapan_seleksi: "LIST",
      status_kandidat: "",
      tanggal_daftar: now,
      pas_photo: fileUrls.PAS_PHOTO || "",
      jft: fileUrls.JFT || "",
      ssw: fileUrls.SSW || "",
      file_cv: fileUrls.CV || "",
      password_kandidat: hash2,
      password_diubah: false,
      created_at: now,
      updated_at: now
    };
    const masterBody = {
      id_kandidat: idKand,
      nama_lengkap: nama,
      gender: candBody.gender,
      usia: candBody.usia,
      tb: candBody.tb,
      bb: candBody.bb,
      no_wa: wa,
      pas_photo: candBody.pas_photo,
      jft_url: fileUrls.JFT || "",
      ssw_url: fileUrls.SSW || "",
      file_cv: fileUrls.CV || ""
    };
    const formBody = {
      timestamp: now,
      code_job: String(d.loker || ""),
      nama_lengkap: nama,
      no_wa: wa,
      gender: candBody.gender,
      usia: candBody.usia,
      tb: candBody.tb,
      bb: candBody.bb,
      pas_photo: candBody.pas_photo,
      jft: fileUrls.JFT || "",
      ssw: fileUrls.SSW || "",
      file_cv: fileUrls.CV || "",
      status: "MENUNGGU"
    };
    if (existing && existing.id !== void 0) {
      const upd = Object.assign({}, candBody);
      delete upd.id_kandidat;
      delete upd.password_kandidat;
      delete upd.password_diubah;
      delete upd.tanggal_daftar;
      delete upd.tahapan_seleksi;
      delete upd.status_kandidat;
      delete upd.created_at;
      await supabaseJson("PATCH", "database_candidate", {
        query: { id: "eq." + existing.id },
        body: upd,
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await supabaseUpsert("database_candidate", candBody, ["no_wa"], {
        headers: { Prefer: "return=minimal" }
      });
    }
    const mRow = await findMasterByWa(wa);
    if (mRow && mRow.id !== void 0) {
      await supabaseJson("PATCH", "master_database_candidate", {
        query: { id: "eq." + mRow.id },
        body: Object.assign({}, masterBody, { updated_at: now }),
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await supabaseUpsert(
        "master_database_candidate",
        Object.assign({ created_at: now, updated_at: now }, masterBody),
        ["no_wa"],
        { headers: { Prefer: "return=minimal" } }
      );
    }
    const fRow = await findFormByWa(wa);
    if (fRow && fRow.id !== void 0) {
      await supabaseJson("PATCH", "database_asj_form", {
        query: { id: "eq." + fRow.id },
        body: Object.assign({}, formBody, { updated_at: now }),
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await upsertFormRow(Object.assign({ created_at: now, updated_at: now }, formBody));
    }
    const PARSEABLE_EXTS = /* @__PURE__ */ new Set(["pdf", "docx", "xlsx", "xls", "csv", "txt"]);
    const ingestFiles = [];
    for (const f of files) {
      if (!f) continue;
      const fUrl = String(f.url || "").trim();
      if (!fUrl) continue;
      const ext = fUrl.split(".").pop().split("?")[0].toLowerCase();
      if (PARSEABLE_EXTS.has(ext)) ingestFiles.push({ fileUrl: fUrl, fileType: ext });
    }
    if (ingestFiles.length && wa) {
      fireIngest(
        ingestFiles.map((f) => ({ ...f, wa })),
        sessionToken
      );
    }
    return { success: true, uploaded };
  } catch (e) {
    return { success: false, error: "Gagal simpan kandidat: " + e.message };
  }
}
async function handleSimpanBerkasTahapan(payload, sessionToken) {
  cacheClear();
  const d = payload && payload[0] || {};
  const t = verifyToken(sessionToken);
  if (!t || t.role !== "admin" && t.role !== "kandidat") {
    return { success: false, sessionInvalid: true, message: "Sesi tidak valid" };
  }
  if (t.role === "kandidat") {
    const dWa = normalizeWa(String(d.wa || ""));
    if (dWa && normalizeWa(String(t.wa || "")) !== dWa) {
      return { success: false, error: "Nomor WA tidak sesuai sesi." };
    }
  }
  const wa = normalizeWa(String(d.wa || ""));
  const jenis = String(d.jenisBerkas || "").trim().toUpperCase();
  const f = d.file || {};
  const directUrl = String(d.fileUrl || f && f.url || "").trim();
  if (!wa || !directUrl && !f.data) return { success: false, error: "Data tidak lengkap." };
  try {
    const nama = String(d.nama || "KANDIDAT").trim().toUpperCase();
    const folder = "master/" + nama.replace(/[^A-Z0-9_-]/g, "_");
    const ext = String(f.name || "file").split(".").pop() || "jpg";
    let fileName = (jenis || "DOKUMEN") + "." + ext;
    const isCv = jenis === "CV" || jenis === "CV_REVISI";
    let candRow = null;
    const want = normalizeWa(wa);
    try {
      candRow = await findCandidateByWaFiltered(wa);
      if (candRow === void 0) {
        const candFound = await findCandidates();
        candRow = candFound.rows.find((r) => normalizeWa(String(pick(r, APPLY_WA_COLS2) || "")) === want) || null;
      }
    } catch (e) {
    }
    if (isCv && candRow) {
      const jobCode = String(pick(candRow, ["id_loker_pilihan", "id_loker"]) || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
      if (jobCode) fileName = "JOB" + jobCode + "_CV." + ext;
    }
    let url = directUrl;
    if (!url) {
      url = await uploadBase64(f.data, folder, fileName);
      if (!url) return { success: false, error: "Upload gagal." };
    }
    try {
      await syncFormMailDariUpload(
        wa,
        nama,
        jenis,
        url,
        candRow ? String(pick(candRow, ["id_loker_pilihan", "id_loker"]) || "") : ""
      );
    } catch (e) {
    }
    const labelKey = fileLabelKey(jenis);
    const map = labelKey ? FILE_LABEL_COLUMNS[labelKey] : null;
    if (map) {
      const c = candRow;
      if (c && c.id !== void 0 && map.cand) {
        await supabaseJson("PATCH", "database_candidate", {
          query: { id: "eq." + c.id },
          body: { [map.cand]: url },
          headers: { Prefer: "return=minimal" }
        });
      }
      const m = await findMasterByWa(wa);
      if (m && m.id !== void 0 && map.master) {
        await supabaseJson("PATCH", "master_database_candidate", {
          query: { id: "eq." + m.id },
          body: { [map.master]: url },
          headers: { Prefer: "return=minimal" }
        });
      }
      if (map.pemberkasan) {
        await supabaseJson("POST", "pemberkasan_checklist", {
          query: { on_conflict: "wa,tahap" },
          body: {
            wa,
            nama_lengkap: nama,
            tahap: 1,
            updated_at: (/* @__PURE__ */ new Date()).toISOString(),
            [map.pemberkasan]: url
          },
          headers: { Prefer: "return=minimal,resolution=merge-duplicates" }
        });
      }
    }
    const PARSEABLE_EXTS = /* @__PURE__ */ new Set(["pdf", "docx", "xlsx", "xls", "csv", "txt"]);
    const fileExt = ext.toLowerCase();
    if (PARSEABLE_EXTS.has(fileExt) && url && wa) {
      fireIngest([{ fileUrl: url, fileType: fileExt, wa }], sessionToken);
    }
    try {
      notifyAdmins(
        "Berkas Baru!",
        `${nama || "Kandidat"} mengunggah ${jenis || "dokumen"}.`,
        "/admin.html"
      );
    } catch (_) {
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal menyimpan berkas. Silakan coba lagi." };
  }
}
async function handleSimpanRevisiKandidat(payload, sessionToken) {
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  cacheClear();
  const wa = String(payload && payload[0] || "");
  const f = payload && payload[1] || {};
  const directUrl = String(f.url || f.fileUrl || "").trim();
  if (!wa || !directUrl && !f.data) return { success: false, error: "Data tidak lengkap." };
  try {
    const row = await findMasterByWa(wa);
    const nama = row && row.nama_lengkap ? String(row.nama_lengkap).toUpperCase() : "KANDIDAT";
    const folder = "master/" + nama.replace(/[^A-Z0-9_-]/g, "_");
    const ext = String(f.name || "file").split(".").pop() || "jpg";
    let fileName = "CV_REVISI." + ext;
    let cvJobCode = "";
    try {
      let candRow = await findCandidateByWaFiltered(wa);
      if (candRow === void 0) {
        const candFound = await findCandidates();
        const want = normalizeWa(wa);
        candRow = candFound.rows.find((r) => normalizeWa(String(pick(r, APPLY_WA_COLS2) || "")) === want) || null;
      }
      if (candRow) {
        const jobCode = String(pick(candRow, ["id_loker_pilihan", "id_loker"]) || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
        if (jobCode) fileName = "JOB" + jobCode + "_CV." + ext;
        cvJobCode = jobCode;
      }
    } catch (e) {
    }
    let url = directUrl;
    if (!url) {
      url = await uploadBase64(f.data, folder, fileName);
      if (!url) return { success: false, error: "Upload gagal." };
    }
    try {
      await syncFormMailDariUpload(wa, nama, "CV", url, cvJobCode);
    } catch (e) {
    }
    let c = await findCandidateByWaFiltered(wa);
    if (c === void 0) {
      const candFound = await findCandidates();
      const want = normalizeWa(wa);
      c = candFound.rows.find((r) => normalizeWa(String(pick(r, APPLY_WA_COLS2) || "")) === want) || null;
    }
    if (c && c.id !== void 0) {
      await supabaseJson("PATCH", "database_candidate", {
        query: { id: "eq." + c.id },
        body: { file_cv: url },
        headers: { Prefer: "return=minimal" }
      });
    }
    if (row && row.id !== void 0) {
      await supabaseJson("PATCH", "master_database_candidate", {
        query: { id: "eq." + row.id },
        body: { file_cv: url },
        headers: { Prefer: "return=minimal" }
      });
    }
    const PARSEABLE_EXTS = /* @__PURE__ */ new Set(["pdf", "docx", "xlsx", "xls", "csv", "txt"]);
    if (url && PARSEABLE_EXTS.has(ext.toLowerCase()) && wa) {
      fireIngest([{ fileUrl: url, fileType: ext.toLowerCase(), wa }], sessionToken);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal upload revisi: " + e.message };
  }
}
var PUBLIC_PREFILL_FIELDS, APPLY_WA_COLS2, FILE_LABEL_COLUMNS;
var init_actions_upload = __esm({
  "netlify/functions/_lib/actions-upload.ts"() {
    "use strict";
    init_bcryptjs();
    init_client();
    init_jobs();
    init_forms();
    init_candidates();
    init_session();
    init_actions_auth();
    init_actions_master();
    init_cache();
    init_storage();
    init_actions_mail();
    init_candidate_helpers();
    init_fcm_server();
    init_fcm_helpers();
    PUBLIC_PREFILL_FIELDS = /* @__PURE__ */ new Set([
      "idKandidat",
      "id",
      "nama",
      "wa",
      "gender",
      "usia",
      "tb",
      "bb",
      "tbBb",
      "ttl",
      "pendidikan",
      "pasPhoto",
      "email",
      "tempatLahir",
      "tglLahir",
      "alamat",
      "jftText",
      "sswText",
      "jft",
      "ssw",
      "fileCv",
      "idLoker",
      "tahapan",
      "status"
    ]);
    APPLY_WA_COLS2 = ["no_wa", "wa", "whatsapp"];
    FILE_LABEL_COLUMNS = {
      PAS_PHOTO: { cand: "pas_photo", master: "pas_photo", pemberkasan: null },
      CV: { cand: "file_cv", master: "file_cv", pemberkasan: null },
      CV_REVISI: { cand: "file_cv", master: "file_cv", pemberkasan: null },
      JFT: { cand: "jft", master: "jft_url", pemberkasan: null },
      SSW: { cand: "ssw", master: "ssw_url", pemberkasan: null },
      KTP: { cand: null, master: "ktp_url", pemberkasan: "ktp_url" },
      "KARTU KELUARGA": { cand: null, master: "kk_url", pemberkasan: "kk_url" },
      KK: { cand: null, master: "kk_url", pemberkasan: "kk_url" },
      "IJAZAH SD": { cand: null, master: "ijazah_sd_url", pemberkasan: "sd_url" },
      "IJAZAH SMP": { cand: null, master: "ijazah_smp_url", pemberkasan: "smp_url" },
      "IJAZAH SMA": { cand: null, master: "ijazah_sma_url", pemberkasan: "sma_url" },
      UNIVERSITAS: { cand: null, master: "univ_url", pemberkasan: "univ_url" },
      AKTE: { cand: null, master: null, pemberkasan: "akte_url" },
      PASPORT: { cand: null, master: null, pemberkasan: "pasport_url" },
      PASSPORT: { cand: null, master: null, pemberkasan: "pasport_url" },
      MCU: { cand: null, master: null, pemberkasan: "mcu_url" },
      KONTRAK: { cand: null, master: null, pemberkasan: "kontrak_url" },
      SERTIFIKAT: { cand: null, master: null, pemberkasan: "cert_url" },
      "FOTO 2X3": { cand: null, master: null, pemberkasan: "foto2_url" },
      "IZIN ORTU": { cand: null, master: null, pemberkasan: "ijinortu_url" },
      CPMI: { cand: null, master: null, pemberkasan: "cpmi_url" },
      "BUKU NIKAH": { cand: null, master: null, pemberkasan: "kawin_url" },
      "SURAT SEHAT": { cand: null, master: null, pemberkasan: "sehat_url" },
      BPJS: { cand: null, master: null, pemberkasan: "bpjs_url" },
      PSIKOTES: { cand: null, master: null, pemberkasan: "psikotes_url" }
    };
  }
});

// netlify/functions/_lib/actions-schedule.ts
async function handleSimpanJadwalBaru(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  if (!d.nama) return { success: false, error: "Nama agenda wajib diisi." };
  const idJadwal = "JDW" + Date.now();
  try {
    await supabaseJson("POST", "database_schedule", {
      body: {
        id_jadwal: idJadwal,
        nama_agenda: String(d.nama),
        id_loker_terkait: String(d.loker || "-"),
        tanggal_waktu: String(d.waktu || ""),
        lokasi_link: String(d.link || d.lokasi || "-"),
        daftar_kandidat: String(d.kandidat || "-"),
        tsk: String(d.tsk || ""),
        status_jadwal: "AKTIF",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      headers: { Prefer: "return=minimal" }
    });
    return {
      success: true,
      schedule: {
        idJadwal,
        namaAgenda: String(d.nama),
        idLoker: String(d.loker || "-"),
        waktu: String(d.waktu || ""),
        link: String(d.link || d.lokasi || "-"),
        kandidat: String(d.kandidat || "-"),
        tsk: String(d.tsk || "")
      }
    };
  } catch (e) {
    return { success: false, error: "Gagal simpan jadwal: " + e.message };
  }
}
async function handleHapusJadwal(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const id = String(payload && payload[0] || "");
  if (!id) return { success: false, error: "ID jadwal tidak ditemukan." };
  try {
    const rows = await supabaseJson("GET", "database_schedule", {
      query: { select: "*", limit: 500 }
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_jadwal || "") === id || String(r.id || "") === id
    );
    if (!row || row.id === void 0 || row.id === null) {
      return { success: false, error: "Jadwal tidak ditemukan." };
    }
    await supabaseJson("DELETE", "database_schedule", {
      query: { id: "eq." + row.id },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, id };
  } catch (e) {
    return { success: false, error: "Gagal hapus jadwal: " + e.message };
  }
}
async function handleTambahTugasBaru(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const nama = String(payload && payload[0] || "").trim();
  const admin = String(payload && payload[1] || "");
  if (!nama) return { success: false, error: "Nama tugas wajib diisi." };
  const idTugas = "TGS" + Date.now();
  const waktuDibuat = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await supabaseJson("POST", "database_tugas", {
      body: {
        id_tugas: idTugas,
        nama_tugas: nama,
        dibuat_oleh: admin,
        waktu_dibuat: waktuDibuat,
        status: "BARU",
        created_at: waktuDibuat,
        updated_at: waktuDibuat
      },
      headers: { Prefer: "return=minimal" }
    });
    return {
      success: true,
      tugas: { id: idTugas, task: nama, status: "BARU", dibuatOleh: admin, waktuDibuat }
    };
  } catch (e) {
    return { success: false, error: "Gagal tambah tugas: " + e.message };
  }
}
async function handleSetTugasStatus(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const id = String(payload && payload[0] || "");
  const st = String(payload && payload[1] || "");
  if (!id || !st) return { success: false, error: "Data tidak lengkap." };
  try {
    const rows = await supabaseJson("GET", "database_tugas", {
      query: { select: "*", limit: 500 }
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_tugas || "") === id || String(r.id || "") === id
    );
    if (!row || row.id === void 0 || row.id === null) {
      return { success: false, error: "Tugas tidak ditemukan." };
    }
    const body = { status: st, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (st === "SELESAI") body.waktu_selesai = (/* @__PURE__ */ new Date()).toISOString();
    await supabaseJson("PATCH", "database_tugas", {
      query: { id: "eq." + row.id },
      body,
      headers: { Prefer: "return=minimal" }
    });
    return {
      success: true,
      tugas: {
        id: String(row.id_tugas || row.id || ""),
        task: toText(row.nama_tugas || ""),
        status: st,
        dibuatOleh: toText(row.dibuat_oleh || ""),
        waktuDibuat: toText(row.waktu_dibuat || "")
      }
    };
  } catch (e) {
    return { success: false, error: "Gagal update status tugas: " + e.message };
  }
}
async function handleHapusTugas(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const id = String(payload && payload[0] || "");
  if (!id) return { success: false, error: "ID tugas tidak ditemukan." };
  try {
    const rows = await supabaseJson("GET", "database_tugas", {
      query: { select: "*", limit: 500 }
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_tugas || "") === id || String(r.id || "") === id
    );
    if (!row || row.id === void 0 || row.id === null) {
      return { success: false, error: "Tugas tidak ditemukan." };
    }
    await supabaseJson("DELETE", "database_tugas", {
      query: { id: "eq." + row.id },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, id };
  } catch (e) {
    return { success: false, error: "Gagal hapus tugas: " + e.message };
  }
}
async function handleCheckAndSendAgendaReminders(payload, sessionToken) {
  let sent = 0;
  let errors = 0;
  try {
    const now = Date.now();
    const { rows: schedules } = await supabaseJson("GET", "database_schedule", {
      query: {
        select: "*",
        status_jadwal: "eq.AKTIF",
        limit: 100
      }
    });
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return { success: true, sent: 0, checked: 0 };
    }
    const parseTime = (waktu) => {
      if (!waktu) return 0;
      try {
        if (waktu.includes("/")) {
          const [datePart, timePart] = waktu.split(" ");
          const [dd, mm, yyyy] = datePart.split("/");
          const [hh, mi] = (timePart || "00:00").split(":");
          return new Date(
            Number(yyyy),
            Number(mm) - 1,
            Number(dd),
            Number(hh),
            Number(mi)
          ).getTime();
        }
        return new Date(waktu).getTime();
      } catch {
        return 0;
      }
    };
    const parseWaList = (raw) => {
      return String(raw || "").split(/[\n,;]+/).map((x) => {
        const d = x.replace(/\D/g, "");
        if (d.startsWith("628") && d.length >= 13) return d;
        if (d.startsWith("08") && d.length >= 10) return "62" + d.slice(1);
        return "";
      }).filter(Boolean);
    };
    const sendToWaList = async (waList, title, body) => {
      for (const wa of waList) {
        try {
          const { rows: tokens } = await supabaseJson("GET", "fcm_tokens", {
            query: { select: "token", wa: "eq." + wa, limit: 5 }
          });
          if (Array.isArray(tokens) && tokens.length > 0) {
            const tokenList = tokens.map((t) => t.token).filter(Boolean);
            if (tokenList.length > 0) {
              await sendMulticast(tokenList, title, body, "/");
              sent++;
            }
          }
        } catch {
          errors++;
        }
      }
    };
    const WINDOWS = [
      {
        key: "h7",
        field: "reminder_h7_sent",
        minMs: 6 * 864e5,
        maxMs: 8 * 864e5,
        label: "7 hari"
      },
      {
        key: "h1",
        field: "reminder_h1_sent",
        minMs: 20 * 36e5,
        maxMs: 28 * 36e5,
        label: "besok"
      },
      { key: "h0", field: "reminder_sent", minMs: 0, maxMs: 60 * 6e4, label: "mulai" }
    ];
    for (const s of schedules) {
      const schedTime = parseTime(s.tanggal_waktu);
      if (!schedTime || isNaN(schedTime)) continue;
      const diffMs = schedTime - now;
      const agenda = s.nama_agenda || "Jadwal";
      const lokasi = s.lokasi_link || "";
      const waList = parseWaList(s.daftar_kandidat);
      if (waList.length === 0) continue;
      for (const w of WINDOWS) {
        if (s[w.field] === true || s[w.field] === "true") continue;
        if (diffMs < w.minMs || diffMs > w.maxMs) continue;
        let title, body;
        if (w.key === "h0") {
          const mins = Math.round(diffMs / 6e4);
          title = "\u23F0 " + agenda;
          body = agenda + (mins > 0 ? " dalam " + mins + " menit" : " dimulai sekarang") + (lokasi ? " di " + lokasi : "");
        } else if (w.key === "h1") {
          title = "\u{1F4C5} Jadwal besok: " + agenda;
          body = agenda + " dijadwalkan besok" + (lokasi ? " di " + lokasi : "");
        } else {
          title = "\u{1F4C5} Jadwal 7 hari lagi: " + agenda;
          body = agenda + " dijadwalkan 7 hari lagi" + (lokasi ? " di " + lokasi : "");
        }
        await sendToWaList(waList, title, body);
        try {
          const schedId = s.id || s.id_jadwal;
          if (schedId) {
            await supabaseJson("PATCH", "database_schedule", {
              query: { id: "eq." + schedId },
              body: { [w.field]: true, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
              headers: { Prefer: "return=minimal" }
            });
          }
        } catch {
        }
      }
    }
    return { success: true, sent, errors, checked: schedules.length };
  } catch (e) {
    return { success: false, error: e.message || "Gagal check reminders" };
  }
}
var init_actions_schedule = __esm({
  "netlify/functions/_lib/actions-schedule.ts"() {
    "use strict";
    init_client();
    init_actions_auth();
    init_fcm_server();
  }
});

// netlify/functions/_lib/actions-wa.ts
async function handleSimpanWaTemplate(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const id = String(payload && payload[0] || "");
  const nama = String(payload && payload[1] || "").trim();
  const isi = String(payload && payload[2] || "");
  if (!nama) return { success: false, error: "Nama template wajib diisi." };
  try {
    if (id && id !== "") {
      await supabaseJson("PATCH", "wa_templates", {
        query: { id: "eq." + id },
        body: { nama, isi, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
        headers: { Prefer: "return=minimal" }
      });
    } else {
      await supabaseJson("POST", "wa_templates", {
        body: {
          id: "WA" + Date.now(),
          nama,
          isi,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        },
        headers: { Prefer: "return=minimal" }
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal simpan template: " + e.message };
  }
}
async function handleHapusWaTemplate(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const id = String(payload && payload[0] || "");
  if (!id) return { success: false, error: "ID template tidak ditemukan." };
  try {
    await supabaseJson("DELETE", "wa_templates", {
      query: { id: "eq." + id },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal hapus template: " + e.message };
  }
}
async function fonnteSend(target, message) {
  const token = env("FONNTE_TOKEN") || env("FONNTE_API_KEY");
  if (!token) throw new Error("FONNTE_TOKEN belum dikonfigurasi");
  const params = new URLSearchParams();
  params.set("target", String(target));
  params.set("message", String(message));
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  const text = await res.text();
  if (!res.ok) throw new Error("Fonnte HTTP " + res.status + " " + text.slice(0, 200));
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
async function handleKirimSatuPesanFonnte(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const wa = String(payload && payload[0] || "");
  const message = String(payload && payload[1] || "");
  if (!wa || !message) return { success: false, error: "Nomor WA dan pesan wajib diisi." };
  try {
    const result = await fonnteSend(normalizeWa(wa), message);
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function applyTemplatePlaceholders(text, nama, jobCode, linkGrup) {
  return String(text || "").replace(/\{nama\}/g, nama).replace(/<<NAMA>>/gi, nama).replace(/\{job_code\}/g, jobCode).replace(/\{job\}/g, jobCode).replace(/<<JOB>>/gi, jobCode).replace(/\{link_grup\}/g, linkGrup).replace(/\{link\}/g, linkGrup).replace(/<<LINK>>/gi, linkGrup);
}
function buildPesanTawaranMassal(variants, templateIsi, nama, jobCode, linkGrup, index) {
  if (variants.length) {
    return applyTemplatePlaceholders(variants[index % variants.length], nama, jobCode, linkGrup);
  }
  if (templateIsi) {
    return applyTemplatePlaceholders(templateIsi, nama, jobCode, linkGrup);
  }
  return "Halo " + nama + "! Anda terpilih untuk Lowongan " + jobCode + ". Silakan bergabung ke grup resmi kami: " + linkGrup;
}
async function handleKirimTawaranMassal(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  const cands = Array.isArray(d.candidates) ? d.candidates : [];
  if (cands.length === 0) return { success: false, error: "Tidak ada kandidat." };
  const jobCode = String(d.jobCode || "");
  const linkGrup = String(d.linkGrup || "");
  const interval = Math.max(Number(d.interval) || 5, 1);
  const results = [];
  const variants = String(d.customMessage || "").split(/^---\s*$/m).map((s) => s.trim()).filter(Boolean);
  try {
    let templateIsi = null;
    try {
      const rows = await supabaseJson("GET", "wa_templates", {
        query: { select: "*", limit: 100 }
      });
      const tpl = (Array.isArray(rows) ? rows : []).find(
        (r) => String(r.nama || "").toLowerCase().includes("grup") || String(r.nama || "").toLowerCase().includes("undang")
      );
      if (tpl) templateIsi = String(tpl.isi || "");
    } catch (e) {
    }
    for (let i = 0; i < cands.length; i += 1) {
      const c = cands[i];
      const wa = normalizeWa(String(c.wa || ""));
      const nama = String(c.nama || "Kandidat");
      const message = buildPesanTawaranMassal(variants, templateIsi, nama, jobCode, linkGrup, i);
      try {
        await fonnteSend(wa, message);
        results.push({ wa: c.wa, nama, success: true });
      } catch (e) {
        results.push({ wa: c.wa, nama, success: false, error: e.message });
      }
      if (interval > 0) await new Promise((r) => setTimeout(r, interval * 1e3));
    }
    return { success: true, results };
  } catch (e) {
    return { success: false, error: e.message, results };
  }
}
var init_actions_wa = __esm({
  "netlify/functions/_lib/actions-wa.ts"() {
    "use strict";
    init_client();
    init_env();
    init_actions_auth();
  }
});

// netlify/functions/_lib/actions-config.ts
async function handleUpdateSysConfig(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const key = String(payload && payload[0] || "");
  const arr = payload && payload[1] || [];
  if (!key) return { success: false, error: "Key konfigurasi tidak valid." };
  const type = CONFIG_TYPE_MAP[key] || key;
  const items = Array.isArray(arr) ? arr.map((x) => String(x)) : [String(arr)];
  try {
    const settings = await findSettings();
    const rows = Array.isArray(settings.rows) ? settings.rows : [];
    const toDelete = rows.filter((r) => String(r.config_type || "") === type).map((r) => r.id);
    for (const id of toDelete) {
      await supabaseJson("DELETE", "sys_config", {
        query: { id: "eq." + id },
        headers: { Prefer: "return=minimal" }
      });
    }
    for (const item of items) {
      if (!item) continue;
      await supabaseJson("POST", "sys_config", {
        body: {
          config_type: type,
          config_value: item,
          is_active: true,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        },
        headers: { Prefer: "return=minimal" }
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: "Gagal simpan konfigurasi: " + e.message };
  }
}
async function handleGetRincianPresets() {
  try {
    const rows = await supabaseJson("GET", "rincian_presets", {
      query: { select: "*", limit: 500 }
    });
    const presets = { include: [], exclude: [], benefit: [], persyaratan: [] };
    for (const r of Array.isArray(rows) ? rows : []) {
      const cat = String(r.kategori || "").toLowerCase();
      if (presets[cat]) presets[cat].push({ id: r.id, item: String(r.item || "") });
    }
    return { success: true, presets };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
async function handleSaveRincianPreset(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = payload && payload[0] || {};
  const cat = String(d.kategori || "");
  const items = Array.isArray(d.item) ? d.item.map((x) => String(x)) : [String(d.item || "")];
  if (!cat || !items[0]) return { success: false, error: "Kategori dan item wajib diisi." };
  try {
    let lastId = null;
    for (const item of items) {
      if (!item) continue;
      const rows = await supabaseJson("POST", "rincian_presets", {
        body: { kategori: cat, item, created_at: (/* @__PURE__ */ new Date()).toISOString() },
        headers: { Prefer: "return=representation" }
      });
      if (Array.isArray(rows) && rows[0]) lastId = rows[0].id;
    }
    return { success: true, id: lastId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
async function handleDeleteRincianPreset(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const id = String(payload && payload[0] && payload[0].id || "");
  if (!id) return { success: false, error: "ID preset tidak ditemukan." };
  try {
    await supabaseJson("DELETE", "rincian_presets", {
      query: { id: "eq." + id },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
async function handleRunMigration(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  try {
    const rows = await supabaseJson("GET", "meta_rev", {
      query: { select: "*", limit: 10 }
    });
    const cur = (Array.isArray(rows) ? rows : []).find((r) => String(r.domain || "") === "migration") || null;
    await supabaseJson("POST", "meta_rev", {
      body: {
        domain: "migration",
        rev: cur ? Number(cur.rev || 0) + 1 : 1,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true, results: [{ id: "migration", status: "OK" }], pendingSql: [] };
  } catch (e) {
    return { success: false, error: e.message, results: [], pendingSql: [] };
  }
}
var CONFIG_TYPE_MAP;
var init_actions_config = __esm({
  "netlify/functions/_lib/actions-config.ts"() {
    "use strict";
    init_client();
    init_misc();
    init_actions_auth();
    CONFIG_TYPE_MAP = {
      kategori: "list_kategori",
      gender: "list_gender",
      tahapan: "list_tahapan",
      tsk: "tsk",
      lokasi: "list_lokasi",
      syarat: "list_syarat",
      lokasiZoom: "lokasi__link_zoom",
      statusLoker: "list_status_loker",
      statusForm: "status_form",
      statusLamaran: "list_status_lamaran",
      broadcast: "broadcast",
      pengumuman: "broadcast"
    };
  }
});

// netlify/functions/_lib/actions-register.ts
async function handleGetDaftarSiswaBaru(payload, sessionToken) {
  try {
    const rows = await supabaseJson("GET", "respon_siswa_baru", {
      query: {
        select: "id,nama_lengkap,jenis_kelamin,alamat_lengkap",
        limit: 500,
        order: "created_at.desc"
      }
    });
    const data = (Array.isArray(rows) ? rows : []).map((r) => {
      const g = normalizeGender(r.jenis_kelamin || r.gender);
      return {
        id: r.id,
        nama_lengkap: r.nama_lengkap || "",
        alamat_lengkap: r.alamat_lengkap || "",
        jenis_kelamin: g === "LAKI-LAKI" ? "L" : g === "PEREMPUAN" ? "P" : ""
      };
    });
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
async function handleSubmitDaftarSiswa(payload) {
  cacheClear();
  const d = payload || {};
  const nama = String(d.nama || "").trim();
  if (!nama) return { success: false, message: "Nama wajib diisi." };
  try {
    await supabaseJson("POST", "respon_siswa_baru", {
      body: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        nama_lengkap: nama,
        alamat_email: String(d.email || ""),
        jenis_kelamin: String(d.gender || ""),
        alamat_lengkap: String(d.alamat || ""),
        tempat_tanggal_lahir: String(d.ttl || ""),
        agama: String(d.agama || ""),
        nomor_wa_peserta: String(d.wa_siswa || ""),
        nomor_wa_orangtua: String(d.wa_ortu || ""),
        pendidikan_terakhir: String(d.pendidikan || ""),
        file_ktp: String(d.ktp || ""),
        file_kk: String(d.kk || ""),
        file_ijazah: String(d.ijazah || ""),
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      headers: { Prefer: "return=minimal" }
    });
    return { success: true };
  } catch (e) {
    return { success: false, message: "Gagal mendaftar: " + e.message };
  }
}
function siteBase() {
  return (env("NETLIFY_SITE_URL") || "https://asjportal.netlify.app").replace(/\/$/, "");
}
async function handleGetLinkSiswaBaru() {
  return { url: siteBase() + "/siswa-baru.html", formUrl: siteBase() + "/siswa-baru.html" };
}
async function handleGenerateFormBridge(payload) {
  const code = String(payload && payload[0] || "");
  const bidang = String(payload && payload[1] || "");
  const wa = String(payload && payload[2] || "");
  const nama = String(payload && payload[3] || "");
  const req = String(payload && payload[4] || "");
  const formUrl = siteBase() + "/apply-full.html?job=" + encodeURIComponent(code) + "&bidang=" + encodeURIComponent(bidang) + "&wa=" + encodeURIComponent(wa) + "&nama=" + encodeURIComponent(nama) + "&req=" + encodeURIComponent(req);
  return { formUrl };
}
async function handleGenerateLegacyMasterBridge(payload) {
  const wa = String(payload && payload[0] || "");
  const nama = String(payload && payload[1] || "");
  const formUrl = siteBase() + "/master-full.html?wa=" + encodeURIComponent(wa) + "&nama=" + encodeURIComponent(nama);
  return { formUrl };
}
async function handleGenerateAiFormBridge(payload) {
  const flow = String(payload && payload[0] || "");
  const job = String(payload && payload[1] || "");
  const bidang = String(payload && payload[2] || "");
  const wa = String(payload && payload[3] || "");
  const nama = String(payload && payload[4] || "");
  const formUrl = siteBase() + "/ai_form.html?flow=" + encodeURIComponent(flow) + "&job=" + encodeURIComponent(job) + "&bidang=" + encodeURIComponent(bidang) + "&wa=" + encodeURIComponent(wa) + "&nama=" + encodeURIComponent(nama);
  return { formUrl };
}
var init_actions_register = __esm({
  "netlify/functions/_lib/actions-register.ts"() {
    "use strict";
    init_client();
    init_env();
    init_cache();
  }
});

// netlify/functions/_lib/actions-download.ts
async function fetchBuffer(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1e4) });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}
function extFromUrl(url) {
  const m = url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  return m ? m[1].toLowerCase() : "bin";
}
function filenameFromUrl(url, label) {
  const ext = extFromUrl(url);
  return label.replace(/[^a-zA-Z0-9_-]/g, "_") + "." + ext;
}
function safeFolderName(name) {
  return name.replace(/[^a-zA-Z0-9 _-]/g, "_").substring(0, 60) || "KANDIDAT";
}
async function handleDownloadJobDocs(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const code = String(payload && payload[0] || "").trim();
  if (!code) return { success: false, error: "Kode job wajib diisi." };
  try {
    let candidates = await findCandidatesByJobFiltered(code);
    if (!candidates || !candidates.length) {
      const all = await findCandidates();
      candidates = (all.rows || []).filter(
        (c) => String(pick(c, ["id_loker_pilihan", "id_loker"]) || "") === code
      );
    }
    if (!candidates.length) {
      return {
        success: false,
        error: "Tidak ada kandidat untuk job " + code + ". Pastikan kandidat sudah terdaftar di job ini."
      };
    }
    console.log("[download] Found", candidates.length, "candidates for job", code);
    const waList = candidates.map((c) => normalizeWa(String(pick(c, ["no_wa", "wa", "whatsapp"]) || ""))).filter(Boolean);
    console.log("[download] WA list:", waList.length, "entries");
    const masterRows = waList.length ? await fetchMasterByWa(waList) : [];
    const masterByWa = /* @__PURE__ */ new Map();
    if (Array.isArray(masterRows)) {
      for (const row of masterRows) {
        const wa = normalizeWa(String(row.no_wa || ""));
        if (wa) masterByWa.set(wa, row);
      }
    }
    const downloads = [];
    for (const cand of candidates) {
      if (!cand || typeof cand !== "object") continue;
      const wa = normalizeWa(String(pick(cand, ["no_wa", "wa", "whatsapp"]) || ""));
      const nama = safeFolderName(
        String(pick(cand, ["nama_lengkap", "nama"]) || "KANDIDAT").toUpperCase()
      );
      const master = wa ? masterByWa.get(wa) : null;
      for (const [label, cols] of DOC_COLUMNS) {
        let url = "";
        if (master) {
          for (const col of cols) {
            const v = toText(master[col] || "");
            if (v && v !== "-" && v.startsWith("http")) {
              url = v;
              break;
            }
          }
        }
        if (cand && !url) {
          for (const col of cols) {
            const v = toText(cand[col] || "");
            if (v && v !== "-" && v.startsWith("http")) {
              url = v;
              break;
            }
          }
        }
        if (url) {
          downloads.push({ url, folder: nama, label });
        }
      }
    }
    if (!downloads.length) {
      return {
        success: false,
        error: "Tidak ada dokumen yang bisa di-download untuk " + candidates.length + " kandidat. Pastikan data master sudah dilengkapi."
      };
    }
    console.log(
      "[download] Found",
      downloads.length,
      "files to download from",
      candidates.length,
      "candidates"
    );
    const archiverMod = await import("archiver");
    const ZipClass = archiverMod.ZipArchive;
    const ArchiveClass = ZipClass || archiverMod.Archiver || archiverMod.default;
    return new Promise((resolve) => {
      const chunks = [];
      const archive = ZipClass ? new ZipClass("zip", { zlib: { level: 6 } }) : typeof ArchiveClass === "function" ? new ArchiveClass("zip", { zlib: { level: 6 } }) : archiverMod("zip", { zlib: { level: 6 } });
      archive.on("data", (chunk) => chunks.push(chunk));
      archive.on("end", () => {
        const zipBuf = Buffer.concat(chunks);
        resolve({
          success: true,
          zipBase64: zipBuf.toString("base64"),
          fileName: "Dokumen_" + code + ".zip",
          totalFiles: downloads.length,
          totalSize: zipBuf.length,
          candidateCount: candidates.length
        });
      });
      archive.on("error", (err) => {
        resolve({ success: false, error: "Gagal membuat ZIP: " + err.message });
      });
      let processed = 0;
      const total = downloads.length;
      async function processNext() {
        try {
          if (processed >= total) {
            archive.finalize();
            return;
          }
          const d = downloads[processed];
          processed++;
          const buf = await fetchBuffer(d.url);
          if (buf) {
            const fileName = filenameFromUrl(d.url, d.label);
            archive.append(buf, { name: d.folder + "/" + fileName });
          } else {
            console.warn("[download] Skip file (fetch failed):", d.url.substring(0, 80));
          }
          await processNext();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[download] processNext error:", msg);
          archive.abort();
        }
      }
      processNext().catch((err) => {
        console.error("[download] processNext uncaught:", err);
        archive.abort();
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[download] downloadJobDocs error:", msg);
    return { success: false, error: "Gagal download dokumen: " + msg };
  }
}
var DOC_COLUMNS;
var init_actions_download = __esm({
  "netlify/functions/_lib/actions-download.ts"() {
    "use strict";
    init_client();
    init_candidates();
    init_master();
    init_actions_auth();
    DOC_COLUMNS = [
      ["CV", ["file_cv"]],
      ["JFT", ["jft_url", "jft"]],
      ["SSW", ["ssw_url", "ssw"]],
      ["PasFoto", ["pas_photo"]],
      ["KTP", ["ktp_url"]],
      ["KK", ["kk_url"]],
      ["IjazahSD", ["ijazah_sd_url"]],
      ["IjazahSMP", ["ijazah_smp_url"]],
      ["IjazahSMA", ["ijazah_sma_url"]],
      ["Universitas", ["univ_url"]],
      ["Sertifikat", ["cert_url"]],
      ["SIM", ["driver_license_url", "sim_url"]]
    ];
  }
});

// netlify/functions/_lib/action-registry.ts
var ACTION_HANDLERS, LOGIN_ACTIONS, AI_ACTIONS, FONNTE_ACTIONS;
var init_action_registry = __esm({
  "netlify/functions/_lib/action-registry.ts"() {
    "use strict";
    init_actions_public();
    init_actions_diagnostics();
    init_actions_auth();
    init_actions_job();
    init_chat();
    init_classify();
    init_actions_candidate();
    init_actions_mail();
    init_actions_upload();
    init_actions_master();
    init_actions_schedule();
    init_actions_wa();
    init_actions_config();
    init_actions_register();
    init_cv();
    init_actions_download();
    ACTION_HANDLERS = {
      // Data publik & diagnostik
      getAppData: handleGetAppData,
      getMonthlyReport: handleGetMonthlyReport,
      getAppConfig: handleGetAppConfig,
      reportWebVital: handleReportWebVital,
      // Auth
      checkAdminMaster: handleCheckAdminMaster,
      checkAdminPersonal: handleCheckAdminPersonal,
      refreshAdminSession: handleRefreshAdminSession,
      refreshKandidatSession: handleRefreshKandidatSession,
      loginKandidat: handleLoginKandidat,
      daftarKandidat: handleDaftarKandidat,
      gantiPasswordKandidat: handleGantiPasswordKandidat,
      registerFcmToken,
      logout: () => ({ success: true }),
      // Kelola lowongan
      simpanJobBaru: handleSimpanJobBaru,
      editLokerFull: handleEditLokerFull,
      ubahStatusJob: handleUbahStatusJob,
      hapusJobData: handleHapusJobData,
      updateTahapanDbJob: handleUpdateTahapanDbJob,
      updateDokumenShare: handleUpdateDokumenShare,
      tandaiGagalJob: handleTandaiGagalJob,
      // Kelola kandidat
      updateCatatanKandidat: handleUpdateCatatanKandidat,
      updateKandidatSuper: handleUpdateKandidatSuper,
      getCandidatesPage: handleGetCandidatesPage,
      // Mail inbox
      reviewForm: handleReviewForm,
      approveForm: handleApproveForm,
      rejectForm: handleRejectForm,
      deleteForm: handleDeleteForm,
      tandaiDibacaForm: handleTandaiDibacaForm,
      // Upload & file
      getUploadUrls: handleGetUploadUrls,
      // Lamaran publik (apply-full.html)
      cekDataPelamar: handleCekDataPelamar,
      isJobRequiresCv: handleIsJobRequiresCv,
      submitApply: handleSubmitApply,
      getExistingCandidateJsonByWa: handleGetExistingCandidateJsonByWa,
      // Master data (master-full.html, CV)
      getMasterDataByWa: handleGetMasterDataByWa,
      getDrafCvMaster: handleGetDrafCvMaster,
      submitMasterForm: handleSubmitMasterForm,
      simpanBiodataLengkap: handleSubmitMasterForm,
      simpanUpdateMaster: handleSimpanUpdateMaster,
      simpanKandidatDanUpload: handleSimpanKandidatDanUpload,
      simpanBerkasTahapan: handleSimpanBerkasTahapan,
      simpanRevisiKandidat: handleSimpanRevisiKandidat,
      // Jadwal & tugas
      simpanJadwalBaru: handleSimpanJadwalBaru,
      hapusJadwal: handleHapusJadwal,
      tambahTugasBaru: handleTambahTugasBaru,
      setTugasStatus: handleSetTugasStatus,
      hapusTugas: handleHapusTugas,
      checkAndSendAgendaReminders: handleCheckAndSendAgendaReminders,
      // Template & kirim WA (Fonnte)
      simpanWaTemplate: handleSimpanWaTemplate,
      hapusWaTemplate: handleHapusWaTemplate,
      kirimSatuPesanFonnte: handleKirimSatuPesanFonnte,
      kirimTawaranMassal: handleKirimTawaranMassal,
      // Konfigurasi sistem
      updateSysConfig: handleUpdateSysConfig,
      // Preset rincian biaya
      getRincianPresets: handleGetRincianPresets,
      saveRincianPreset: handleSaveRincianPreset,
      deleteRincianPreset: handleDeleteRincianPreset,
      runMigration: handleRunMigration,
      // Siswa baru
      getDaftarSiswaBaru: handleGetDaftarSiswaBaru,
      submitDaftarSiswa: handleSubmitDaftarSiswa,
      // Link & bridge (QR / form)
      getLinkSiswaBaru: handleGetLinkSiswaBaru,
      generateFormBridge: handleGenerateFormBridge,
      generateLegacyMasterBridge: handleGenerateLegacyMasterBridge,
      generateAiFormBridge: handleGenerateAiFormBridge,
      // AI (Gemini) & submit AI form
      processAIChat: handleProcessAIChat,
      processAdminAIChat: handleProcessAdminAIChat,
      processSiswaAIChat: handleProcessSiswaAIChat,
      processAiInterview: handleProcessAiInterview,
      generateWawancaraModel: handleGenerateWawancaraModel,
      simpanHasilWawancara: handleSimpanHasilWawancara,
      selesaikanWawancara: handleSelesaikanWawancara,
      getHasilWawancara: handleGetHasilWawancara,
      parseDokumenBiodata: handleParseDokumenBiodata,
      getAdminAiContext: handleGetAdminAiContext,
      buildAdminAiCandidateSummary: handleBuildAdminAiCandidateSummary,
      // Smart Ingestion dipindah ke function terpisah (ingest.js)
      // untuk mengurangi ukuran bundle 19 function lainnya (~2.2MB per function).
      // Routing: api-client.ts → processUploadDoc: 'ingest' → /.netlify/functions/ingest
      processUploadDoc: () => ({
        success: false,
        message: "processUploadDoc has been moved to /ingest function"
      }),
      // Download dokumen kandidat per job (ZIP)
      downloadJobDocs: handleDownloadJobDocs,
      submitDataAsj: handleSubmitDataAsj,
      simpanDataTtdNaitei: handleSimpanDataTtdNaitei
    };
    LOGIN_ACTIONS = /* @__PURE__ */ new Set([
      "checkAdminMaster",
      "checkAdminPersonal",
      "refreshAdminSession",
      "refreshKandidatSession",
      "loginKandidat",
      "daftarKandidat"
    ]);
    AI_ACTIONS = /* @__PURE__ */ new Set([
      "processAIChat",
      "processSiswaAIChat",
      "processAdminAIChat",
      "processAiInterview",
      "parseDokumenBiodata",
      "processUploadDoc",
      "generateWawancaraModel"
    ]);
    FONNTE_ACTIONS = /* @__PURE__ */ new Set(["kirimSatuPesanFonnte", "kirimTawaranMassal"]);
  }
});

// netlify/functions/_lib/actions-share.ts
var init_actions_share = __esm({
  "netlify/functions/_lib/actions-share.ts"() {
    "use strict";
    init_client();
    init_jobs();
    init_forms();
    init_candidates();
    init_berkas();
  }
});

// netlify/functions/_lib/handlers.ts
function sessionIdentity(sessionToken) {
  const t = verifyToken(sessionToken);
  if (!t) return null;
  return t.role === "admin" ? "admin:" + String(t.name || "") : "kandidat:" + String(t.wa || "");
}
function rateLimitChecks(action, meta, sessionToken) {
  const ip = meta && meta.ip && String(meta.ip).trim() || "anon";
  const ident = sessionIdentity(sessionToken);
  const adminKey = ident && ident.indexOf("admin:") === 0 ? ident : null;
  if (action === "checkAdminMaster" || action === "checkAdminPersonal") {
    return [
      {
        key: "adminLogin:" + ip,
        opts: { limit: 5, windowMs: 6e4, lockoutAfter: 10, lockoutMs: 3e5 }
      }
    ];
  }
  if (action === "loginKandidat" || action === "daftarKandidat") {
    return [
      {
        key: "kandidatLogin:" + ip,
        opts: { limit: 10, windowMs: 6e4, lockoutAfter: 15, lockoutMs: 3e5 }
      }
    ];
  }
  if (AI_ACTIONS.has(action)) {
    return [
      { key: "ai:" + (ident || ip), opts: { limit: 10, windowMs: 6e4 } },
      { key: "aiGlobal:" + ip, opts: { limit: 60, windowMs: 6e4 } }
    ];
  }
  if (FONNTE_ACTIONS.has(action)) {
    return [{ key: "fonnte:" + (adminKey || ip), opts: { limit: 2, windowMs: 6e4 } }];
  }
  if (adminKey) {
    return [{ key: "adminCrud:" + adminKey, opts: { limit: 120, windowMs: 6e4 } }];
  }
  return [];
}
async function handleAction(action, payload, sessionToken, meta) {
  if (action === "ping") {
    return { statusCode: 200, body: "pong" };
  }
  const checks = rateLimitChecks(action, meta, sessionToken);
  for (const c of checks) {
    const r = check(c.key, c.opts);
    if (!r.ok) {
      return {
        success: false,
        error: "Terlalu banyak permintaan. Coba lagi dalam " + r.retryAfter + " detik.",
        rateLimited: true,
        retryAfter: r.retryAfter
      };
    }
  }
  const out = await dispatchAction(action, payload, sessionToken);
  if (out && out.success === false && !out.rateLimited && LOGIN_ACTIONS.has(action)) {
    for (const c of checks) {
      if (c.opts.lockoutAfter) fail(c.key, c.opts);
    }
  }
  return out;
}
async function dispatchAction(action, payload, sessionToken) {
  const handler = ACTION_HANDLERS[action];
  if (!handler) {
    return { success: false, message: NOT_IMPLEMENTED + " (action: " + action + ")" };
  }
  try {
    return await handler(payload, sessionToken);
  } catch (err) {
    console.error(
      "[handler-error] action=" + action + " error=" + (err && err.message ? err.message : err)
    );
    return { success: false, message: "Terjadi kesalahan saat memproses permintaan." };
  }
}
var NOT_IMPLEMENTED;
var init_handlers = __esm({
  "netlify/functions/_lib/handlers.ts"() {
    "use strict";
    init_session();
    init_rate_limit();
    init_action_registry();
    init_actions_share();
    NOT_IMPLEMENTED = "Fungsi ini belum diimplementasi di backend rebuild (repo GitHub hanya berisi frontend).";
  }
});

// netlify/functions/_lib/netlify-wrapper.ts
var netlify_wrapper_exports = {};
__export(netlify_wrapper_exports, {
  makeHandler: () => makeHandler
});
function clientIp(event) {
  const h = event && event.headers || {};
  const fwd = h["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return h["client-ip"] || h["x-real-ip"] || null;
}
function makeHandler() {
  return async (event) => {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
    }
    if (!body.action) {
      const q = event && event.queryStringParameters || {};
      body.action = body.action || q.action || void 0;
      if (body.action) {
        body.payload = body.payload || q.payload || void 0;
      }
    }
    let out;
    try {
      out = await handleAction(body.action, body.payload, body.sessionToken, {
        ip: clientIp(event)
      });
    } catch (e) {
      out = { success: false, message: "Error internal: " + e.message };
    }
    const baseHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    };
    if (out && typeof out === "object" && typeof out.statusCode === "number" && out.body !== void 0) {
      return {
        statusCode: out.statusCode,
        headers: baseHeaders,
        body: String(out.body)
      };
    }
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify(out)
    };
  };
}
var init_netlify_wrapper = __esm({
  "netlify/functions/_lib/netlify-wrapper.ts"() {
    "use strict";
    init_handlers();
  }
});

// netlify/functions/run-migration.cjs
var { makeHandler: makeHandler2 } = (init_netlify_wrapper(), __toCommonJS(netlify_wrapper_exports));
exports.handler = makeHandler2();
