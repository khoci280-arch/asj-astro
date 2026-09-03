import { env } from '../env.ts';
import { normalizeWa } from '../../shared/wa-rules';
import { request, requestJson, BUDGETS } from '../kernel/http.ts';
// db/client.js — klien REST Supabase (PostgREST) + normalisasi data.
// perilaku TIDAK berubah.

// Aturan WA (normalisasi + gate) — satu sumber kebenaran: shared/wa-rules.js
// (dipakai frontend js/04_auth.js juga). Jangan definisikan ulang di sini.

/** @typedef {{ query?: Record<string, string | number>, headers?: Record<string, string>, body?: unknown }} JsonOpts */
/** @typedef {{ rows: Record<string, unknown>[], total: number }} PagedResult */
/** @typedef {{ table: string | null, rows: Record<string, unknown>[] }} FindTableResult */
/** @typedef {{ paths?: Record<string, unknown>, components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> } }} OpenApiSpec */

/** @returns {string} */
function supabaseUrl() {
  return env('SUPABASE_URL');
}

/** @returns {string} */
function supabaseKey() {
  return env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_ANON_KEY') || env('SUPABASE_KEY');
}

/** @returns {boolean} */
function hasBackend() {
  return !!(supabaseUrl() && supabaseKey());
}

/** @param {string} method @param {string} pathname @param {JsonOpts} [opts] @returns {Promise<unknown>} */
async function supabaseJson(
  method: string,
  pathname: string,
  opts: {
    query?: Record<string, string | number>;
    headers?: Record<string, string>;
    body?: unknown;
    overrideKey?: string;
    overrideAuthKey?: string;
  } = {},
) {
  const url = supabaseUrl();
  const overrideKey = opts.overrideKey;
  const overrideAuthKey = opts.overrideAuthKey;
  const key = overrideKey || supabaseKey();
  if (!url || !key) throw new Error('SUPABASE_URL / key belum dikonfigurasi');

  // P13 fix: Don't duplicate breaker/bulkhead here — request() already
  // applies them for all PostgREST calls (reads AND writes). Acquiring
  // them here AND in request() double-counted against the limits.

  const qs = opts.query
    ? '?' +
      new URLSearchParams(Object.entries(opts.query).map(([k, v]) => [k, String(v)])).toString()
    : '';
  const res = await request(url.replace(/\$/, '') + '/rest/v1/' + pathname + qs, {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + (overrideAuthKey || key),
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    budgetKey: opts.body ? 'postgrest_write' : 'postgrest_read',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(pathname + ' → HTTP ' + res.status + ' ' + text.slice(0, 200));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
// UPSERT via PostgREST: INSERT dengan resolution=merge-duplicates + on_conflict.
// Kalau baris dengan kolom konflik sudah ada (unique index), UPDATE baris lama
// alih-alih error 409 duplicate key — duplikasi tidak mungkin & user tidak
// melihat error. Butuh unique index di kolom konflik (lihat
// migrations/20260825_index_antiduplikat.sql SECTION 4).
/** @param {string} table @param {Record<string, unknown>} row @param {string[]} conflictCols @param {JsonOpts} [opts] @returns {Promise<unknown>} */
async function supabaseUpsert(
  table: string,
  row: Record<string, unknown>,
  conflictCols: string[],
  opts: {
    query?: Record<string, string | number>;
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
): Promise<unknown> {
  const cols = conflictCols.join(',');
  try {
    return await supabaseJson('POST', table, {
      ...opts,
      body: row,
      query: { ...(opts.query || {}), on_conflict: cols },
      // Gabung Prefer pemanggil (mis. return=minimal) dengan resolution upsert.
      headers: {
        ...(opts.headers || {}),
        Prefer:
          ((opts.headers && opts.headers.Prefer) || 'return=minimal') +
          ',resolution=merge-duplicates',
      },
    });
  } catch (e) {
    // 42P10 = unique index di kolom konflik belum ada di DB
    // (migrations/20260825_index_antiduplikat.sql SECTION 4 belum dijalankan).
    // P25 fix: Check for SQLSTATE code in multiple formats — PostgREST may
    // embed it in the message, the hint, or as a separate field.
    const errStr = String((e as { message?: unknown } | null)?.message ?? '') + ' ' + String((e && (e as any).hint) || '');
    if (!errStr.includes('42P10') && !errStr.includes('does not exist')) throw e;
    return supabaseJson('POST', table, {
      ...opts,
      body: row,
      headers: { ...(opts.headers || {}), Prefer: 'return=minimal' },
    });
  }
}

// Query paginated via header Range + total dari Content-Range. Tempat TUNGGAL
// untuk fetch REST dengan Range — pemakai: fetchPagedAll (candidates.js) &
// queryPaged (misc.js). supabaseJson biasa tidak bisa dipakai di sini (butuh
// header Range/Prefer + baca Content-Range, bukan auto-JSON + throw).
/** @param {string} table @param {string} [qs] @param {{ start?: number, end?: number }} [range] @returns {Promise<PagedResult>} */
// @ts-expect-error JS→TS migration
async function supabasePaged(table, qs, { start, end } = {}) {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) throw new Error('SUPABASE_URL / key belum dikonfigurasi');
  // P2 fix: Route through request() for timeout + circuit breaker.
  const res = await request(url.replace(/\/$/, '') + '/rest/v1/' + table + (qs ? '?' + qs : ''), {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      Range: start + '-' + end,
      Prefer: 'count=exact',
    },
    budgetKey: 'postgrest_read',
  });
  if (!res.ok) {
    throw new Error(table + ' → HTTP ' + res.status + ' ' + (await res.text()).slice(0, 150));
  }
  const rows = await res.json();
  const cr = res.headers.get('content-range') || '';
  const total = parseInt(String(cr).split('/')[1] || '0', 10) || rows.length;
  return { rows, total };
}

// Coba daftar nama tabel sampai satu yang benar-benar ada & mengembalikan baris.
/** @param {string[]} candidates @param {number} [limit] @returns {Promise<FindTableResult>} */
async function findTable(candidates: string[], limit = 1) {
  // P3 fix: Use limit=1 (was 300) — callers only need to know which table exists.
  // Stop on first hit instead of trying all candidates.
  for (const t of candidates) {
    try {
      const rows = await supabaseJson('GET', t, {
        query: { select: '*', limit },
      });
      if (Array.isArray(rows) && rows.length > 0) return { table: t, rows };
    } catch {
      /* coba tabel berikutnya */
    }
  }
  return { table: null, rows: [] };
}

/** @param {Record<string, unknown>} row @param {string[]} keys @returns {unknown} */
function pick<T extends object>(row: T, keys: string[]): unknown {
  const rowAny = row as Record<string, unknown>;
  for (const k of keys) {
    if (rowAny[k] !== undefined && rowAny[k] !== null && rowAny[k] !== '') return rowAny[k];
  }
  return null;
}

/** @param {unknown} v @returns {string} */
function toText(v: unknown) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Normalisasi nomor WA Indonesia: "0821..." -> "62821...", "+62821..." -> "62821...".
// Status asli di DB campur: "✅ OPEN", "❌ CLOSE", "SELESAI / CLOSE",
// "PENCARIAN KANDIDAT", "PEMBERKASAN", "APPROVED", "" — yang berarti masih
// rekrutmen hanya yang eksplisit tertutup; sisanya dianggap OPEN.
/** @param {unknown} v @returns {'OPEN'|'CLOSE'|'URGENT'} */
function normalizeStatus(v: unknown) {
  const s = toText(v).toUpperCase();
  if (s.includes('URGENT')) return 'URGENT';
  if (s === '') return 'CLOSE';
  if (s.includes('CLOSE') || s.includes('TUTUP') || s.includes('SELESAI')) {
    return 'CLOSE';
  }
  return 'OPEN';
}

// SATU-SATUNYA normalisasi gender backend — disamakan dengan kanonikal situs
// lama (normalizeGenderValue di js/03_candidate.js): LAKI-LAKI / PEREMPUAN.
// CV AI dan render L/P mengecek format ini (includes('PEREMPUAN') dsb), jadi
// jangan tambah varian normalisasi lain di jalur mana pun.
/** @param {unknown} v @returns {'LAKI-LAKI'|'PEREMPUAN'|''} */
function normalizeGender(v: unknown) {
  const s = toText(v).trim().toUpperCase();
  if (!s || s === '-') return '';
  if (s === 'L' || s === 'LK' || s === 'M' || s === 'PRIA' || s === 'MALE' || s.includes('LAKI'))
    return 'LAKI-LAKI';
  if (
    s === 'P' ||
    s === 'PR' ||
    s === 'F' ||
    s === 'W' ||
    s === 'FEMALE' ||
    s === 'WANITA' ||
    s === 'CEWEK' ||
    s.includes('PEREMPUAN') ||
    s.includes('女')
  )
    return 'PEREMPUAN';
  return '';
}

// Baca skema OpenAPI (daftar tabel + kolom) — dipakai untuk penemuan tabel
// adaptif saat nama tabel tidak cocok dengan tebakan.
/** @returns {Promise<OpenApiSpec | null>} */
async function getSchema() {
  if (!hasBackend()) return null;
  try {
    return await supabaseJson('GET', '', {});
  } catch {
    return null;
  }
}

/** @param {OpenApiSpec} spec @returns {string[]} */
function tablesFromSchema(spec: { paths?: Record<string, unknown> }) {
  if (!spec || !spec.paths) return [];
  return Object.keys(spec.paths)
    .map((p) => p.replace(/^\//, ''))
    .filter(Boolean);
}

/** @param {OpenApiSpec} spec @param {string} table @returns {string[]} */
// Kolom WA pada row apply/candidate: no_wa | wa | whatsapp — selalu dibaca lewat
// pick(r, APPLY_WA_COLS) lalu dinormalisasi. Satu sumber: dipakai cv.js & service master-data.
const APPLY_WA_COLS = ['no_wa', 'wa', 'whatsapp'];

function columnsFromSchema(spec: { components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> } }, table: string) {
  if (!spec || !spec.components || !spec.components.schemas) return [];
  const s = spec.components.schemas[table];
  return s && s.properties ? Object.keys(s.properties) : [];
}

export {
  supabaseUrl,
  supabaseKey,
  hasBackend,
  supabaseJson,
  supabaseUpsert,
  supabasePaged,
  findTable,
  pick,
  APPLY_WA_COLS,
  toText,
  normalizeWa,
  normalizeStatus,
  normalizeGender,
  getSchema,
  tablesFromSchema,
  columnsFromSchema,
};
