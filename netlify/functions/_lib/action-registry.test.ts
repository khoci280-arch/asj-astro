// ==========================================
// TESTS: action-registry — kontrak action backend.
// Registry (action-registry.ts) adalah SATU-SATUNYA sumber kebenaran nama
// action. Test ini menjaga:
//   1. setiap handler terdaftar benar-benar fungsi;
//   2. grup rate limit hanya berisi action yang terdaftar;
//   3. SETIAP action yang dipanggil frontend (src/) ADA di registry —
//      typo nama action gagal di sini, bukan di runtime produksi.
//
// MIGRASI 2026-08-31: test ini sebelumnya memindai direktori `js/` dan file
// `api-client.ts` di root (layout pra-Astro) sehingga SELALU gagal ENOENT dan
// tidak pernah berjalan. Sekarang memindai `src/` sesuai arsitektur baru.
//
// Pengecekan ADMIN_ACTIONS / NETLIFY_FUNCTIONS dihapus: keduanya sudah tidak
// ada di src/lib/apiClient.ts. Dulu diperlukan karena tiap action dipetakan ke
// function Netlify terpisah; sekarang SEMUA action lewat satu dispatcher
// (/.netlify/functions/bridge-links) dan sessionToken dikirim untuk setiap
// action secara default (requireAuth: true), jadi regresi yang dijaga test itu
// tidak mungkin terjadi lagi.
// ==========================================
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ACTION_HANDLERS, LOGIN_ACTIONS, AI_ACTIONS, FONNTE_ACTIONS } from './action-registry';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');

// Pola 1: lewat apiClient terpusat — apiClient.call("x") / api.get("x") / api.secure("x")
const API_RE = /\b(?:apiClient|api)\s*(?:\.\s*(?:call|get|secure)\s*)?\(\s*["']([A-Za-z][A-Za-z0-9_]*)["']/g;
// Pola 2: fetch mentah ke bridge-links — body: JSON.stringify({ action: "x", ... })
const RAW_RE = /action\s*:\s*["']([A-Za-z][A-Za-z0-9_]*)["']/g;

function walkSrc(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const abs = join(dir, f);
    if (statSync(abs).isDirectory()) {
      if (!/node_modules|dist|\.netlify-built/.test(abs)) walkSrc(abs, out);
    } else if (/\.(ts|tsx|astro)$/.test(f) && !f.includes('.test.')) {
      out.push(abs);
    }
  }
  return out;
}

/** Semua literal nama action yang dipanggil frontend, dari dua pola pemanggilan. */
function frontendActions(): string[] {
  const found = new Set<string>();
  for (const f of walkSrc(SRC_DIR)) {
    const src = readFileSync(f, 'utf8');
    for (const re of [API_RE, RAW_RE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) found.add(m[1]);
    }
  }
  return [...found].sort();
}

describe('ACTION_HANDLERS — isi registry', () => {
  it('semua nilai adalah fungsi (handler terdaftar benar)', () => {
    for (const [name, h] of Object.entries(ACTION_HANDLERS)) {
      expect(typeof h, `handler '${name}' harus fungsi`).toBe('function');
    }
  });

  it('tidak kosong dan tidak ada nama duplikat', () => {
    const names = Object.keys(ACTION_HANDLERS);
    expect(names.length).toBeGreaterThan(50);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('grup rate limit ⊆ registry', () => {
  for (const [label, set] of [
    ['LOGIN', LOGIN_ACTIONS],
    ['AI', AI_ACTIONS],
    ['FONNTE', FONNTE_ACTIONS],
  ]) {
    it(`${label}_ACTIONS hanya berisi action terdaftar`, () => {
      for (const a of set) {
        expect(ACTION_HANDLERS[a], `'${a}' harus ada di ACTION_HANDLERS`).toBeDefined();
      }
    });
  }
});

describe('kontrak frontend → registry', () => {
  const front = frontendActions();

  it('menemukan action yang dipanggil frontend (sanity)', () => {
    expect(front.length).toBeGreaterThan(15);
  });

  it('setiap action yang dipanggil frontend ADA di registry backend', () => {
    const missing = front.filter((a) => !(a in ACTION_HANDLERS));
    expect(
      missing,
      'action dipanggil frontend tapi tidak terdaftar — fitur akan gagal diam-diam ' +
        '(dispatcher mengembalikan "not implemented"): ' +
        missing.join(', '),
    ).toEqual([]);
  });
});

// ─── REGRESI: action frontend yang pernah hilang dari registry ─────────────
// Kedua action ini dipanggil dari src/ tetapi tidak terdaftar, sehingga
// dispatcher menolaknya. Test ini mengunci perbaikannya.
describe('regresi — action yang pernah tidak terdaftar', () => {
  it('submitFormPelamar (ApplyFullForm) terdaftar', () => {
    expect(typeof ACTION_HANDLERS.submitFormPelamar).toBe('function');
  });

  it('saveSignature (CandidateDash) terdaftar', () => {
    expect(typeof ACTION_HANDLERS.saveSignature).toBe('function');
  });
});
