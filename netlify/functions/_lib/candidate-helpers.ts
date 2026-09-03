import { normalizeWa, pick, supabaseJson } from './db/client';
// candidate-helpers.js — helper kandidat SHARED (dipakai lintas domain:
// auth, job, form). Dipisah dari handlers.js (Fase 1.1b) supaya tidak ada
// saling-require antar modul action.

import { findCandidateByWaFiltered, findCandidates } from './db/candidates';

// Kolom WA yang dikenali di tabel kandidat (urutan prioritas).
const CAND_WA_COLS = ['no_wa', 'wa', 'whatsapp', 'telepon', 'phone', 'no_hp'];

// ── Atomic candidate ID allocation via Postgres sequence ──────────────────────
// Phase 5: Replaced MAX(id)+1 pattern (TOCTOU race) with a Postgres sequence.
// Sequence: candidate_id_seq (created in 2026-09-01-phase5-async-scale.sql)
// Fallback: if sequence doesn't exist yet, fall back to the old MAX+1 pattern.

async function nextCandidateId(): Promise<string> {
  try {
    // Atomic: nextval is safe under concurrent access — no race.
    const rows = await supabaseJson('GET', 'rpc/nextval', {
      query: { seqname: 'candidate_id_seq' },
    }).catch(() => null);
    if (rows != null) {
      const n = typeof rows === 'number' ? rows : Number(rows);
      if (!isNaN(n) && n > 0) return 'ASJ' + String(n).padStart(5, '0');
    }
  } catch {
    // Sequence doesn't exist yet — fall back to legacy pattern
  }
  // Legacy fallback: MAX(id) + 1 pattern
  const { maxCandidateIdNumber } = await import('./db/candidates');
  const fastMax = await maxCandidateIdNumber();
  if (fastMax !== undefined) return 'ASJ' + String(fastMax + 1).padStart(5, '0');
  return 'ASJ' + String(10001).padStart(5, '0');
}

// Cari baris kandidat berdasarkan WA (format fleksibel 0xx / 62xx).
async function findCandidateByWa(wa: string) {
  const want = normalizeWa(wa);
  // Jalur cepat: query server-side (filter kolom WA) — tanpa tarik 300 baris.
  const hit = await findCandidateByWaFiltered(want);
  if (hit !== undefined) return hit;
  // Fallback: scan penuh (skema kolom WA tidak dikenal).
  const found = await findCandidates();
  return found.rows.find((r: any) => normalizeWa(pick(r, CAND_WA_COLS) || '') === want) || null;
}

export { CAND_WA_COLS, findCandidateByWa, nextCandidateId };
