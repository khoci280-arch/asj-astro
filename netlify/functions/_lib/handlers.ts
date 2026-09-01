import * as session from './session';
import * as rateLimit from './kernel/rate-limit';
import { ACTION_HANDLERS, LOGIN_ACTIONS, AI_ACTIONS, FONNTE_ACTIONS } from './action-registry';
import * as shareActions from './actions-share';
import { toErrorResponse } from './kernel/errors';
import { log, runWithContext } from './kernel/log';
import { SURFACE_HANDLERS } from '../surfaces/index';
import { supabaseJson } from './db/client';
import { handleGetJobStatus } from './actions-job-status';
// handlers.js — dispatcher pusat backend rebuild.
//
// Frontend mengirim { action, payload, sessionToken } ke /.netlify/functions/*
// (lihat api-client.js). Di Netlify production, request masuk lewat file wrapper
// per-fungsi (get-app-data.js, auth.js, ...) yang memanggil handleAction() ini.
// Di preview Freebuff, serve-static.mjs memanggil handleAction() langsung.
//
// Sebagian besar action belum diimplementasi ulang (skema Supabase asli belum
// diketahui) — handler default membalas pesan yang jelas, bukan error mentah.

// Kontrak action (nama → handler + grup rate limit) — satu sumber kebenaran:
// action-registry.js. Dispatcher di bawah memakai tabel, bukan switch.

const NOT_IMPLEMENTED =
  'Fungsi ini belum diimplementasi di backend rebuild (repo GitHub hanya berisi frontend).';

// sys_config.config_type -> key dropdown yang dikirim ke frontend
// (kunci ekstra statusLoker/lokasiZoom/dst. ikut dikirim persis seperti
// backend asli, walau UI utama hanya memakai 6 key pertama).
// Fase 1.1 (2026-08-16): DROPDOWN_MAP, parseConfigList, stripRaw, loadSchedules,
// loadTugas, loadWaTemplates, dedupeKandidatRaw, saringKandidatUnik,
// loadCandidatesUnik & handleGetAppData dipindah ke actions-public.js
// (modul data publik + cache TTL). stripRaw/loadCandidatesUnik di-import
// di atas karena masih dipakai handler lain di file ini.
// ---------------------------------------------------------------------------
// getAppConfig — diagnostik koneksi (TIDAK membocorkan secret)
// ---------------------------------------------------------------------------
// Fase 1.1d (2026-08-16): handleGetAppConfig dipindah ke
// actions-diagnostics.js (diagnostik backend, wajib sesi admin).

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
// Fase 1.1b (2026-08-16): kluster auth (masterPins, requireAdmin, isValidWaFormat,
// handleCheckAdminMaster/Personal, handleLoginKandidat, handleDaftarKandidat,
// handleGantiPasswordKandidat) dipindah ke actions-auth.js. findCandidateByWa
// & CAND_WA_COLS dipindah ke candidate-helpers.js (dipakai lintas domain).

// ---------------------------------------------------------------------------
// Admin: kelola lowongan (job_database) & kandidat (database_candidate)
// ---------------------------------------------------------------------------
// Pemetaan payload frontend -> kolom tabel job_database (snake_case).
// Fase 1.1c (2026-08-16): domain LOWONGAN (JOB_COLUMNS, mapJobPayloadToRow,
// nextJobCode, handleSimpanJobBaru, handleEditLokerFull, getJobMapped,
// handleUbahStatusJob, handleHapusJobData, handleUpdateTahapanDbJob,
// handleUpdateDokumenShare, handleTandaiGagalJob) dipindah ke
// actions-job.js — dispatcher tinggal memetakan action → jobActions.*.

// Fase 1.1c: domain KANDIDAT (handleUpdateCatatanKandidat,
// handleUpdateKandidatSuper, handleGetCandidatesPage) dipindah ke
// actions-candidate.js — dispatcher tinggal memetakan action →
// candidateActions.*.

// ---------------------------------------------------------------------------
// Admin: Mail inbox (database_asj_form) — review/approve/reject/delete
// ---------------------------------------------------------------------------
// Frontend mengirim rowIndex (posisi di array formInbox). Urutan harus sama
// Fase 1.1c: domain MAIL INBOX (handleFormStatus, nextCandidateId,
// syncCandidateDariForm, handleReviewForm/ApproveForm/RejectForm/DeleteForm/
// TandaiDibacaForm) dipindah ke actions-mail.js — dispatcher tinggal
// memetakan action → mailActions.*.

// ---------------------------------------------------------------------------
// Rate limit (REVIEW.md M3) — lapisan proteksi di dispatcher supaya semua
// endpoint (Netlify wrapper & preview server) kebagian, tanpa mengubah tiap
// handler. Nilai mengikuti definisi di REVIEW.md: login admin 5/menit/IP +
// lockout 5 menit setelah 10 gagal, AI 10/menit per identitas + 60/menit/IP,
// Fonnte 2×/menit per admin, aksi CRUD admin 120/menit sebagai jaring pengaman.
// ---------------------------------------------------------------------------
// LOGIN_ACTIONS / AI_ACTIONS / FONNTE_ACTIONS diimpor dari action-registry.

function sessionIdentity(sessionToken) {
  const t = session.verifyToken(sessionToken);
  if (!t) return null;
  return t.role === 'admin' ? 'admin:' + String(t.name || '') : 'kandidat:' + String(t.wa || '');
}

function rateLimitChecks(action, meta, sessionToken) {
  const ip = (meta && meta.ip && String(meta.ip).trim()) || 'anon';
  const ident = sessionIdentity(sessionToken);
  const adminKey = ident && ident.indexOf('admin:') === 0 ? ident : null;

  if (action === 'checkAdminMaster' || action === 'checkAdminPersonal') {
    return [
      {
        key: 'adminLogin:' + ip,
        opts: { limit: 5, windowMs: 60000, lockoutAfter: 10, lockoutMs: 300000 },
      },
    ];
  }
  if (action === 'loginKandidat' || action === 'daftarKandidat') {
    return [
      {
        key: 'kandidatLogin:' + ip,
        opts: { limit: 10, windowMs: 60000, lockoutAfter: 15, lockoutMs: 300000 },
      },
    ];
  }
  if (AI_ACTIONS.has(action)) {
    // Per identitas (WA/admin; anonim → IP): 10 req/menit. Global per IP: 60.
    return [
      { key: 'ai:' + (ident || ip), opts: { limit: 10, windowMs: 60000 } },
      { key: 'aiGlobal:' + ip, opts: { limit: 60, windowMs: 60000 } },
    ];
  }
  if (FONNTE_ACTIONS.has(action)) {
    return [{ key: 'fonnte:' + (adminKey || ip), opts: { limit: 2, windowMs: 60000 } }];
  }
  if (adminKey) {
    // Jaring pengaman aksi CRUD admin — kerja normal tidak boleh terhambat.
    return [{ key: 'adminCrud:' + adminKey, opts: { limit: 120, windowMs: 60000 } }];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Dispatcher utama
// ---------------------------------------------------------------------------
async function handleAction(action, payload, sessionToken, meta) {
  const requestId = (globalThis as any).__requestId || String(Date.now());
  return runWithContext({ requestId, action }, async () => {
  // Anti cold-start / keep-warm (2026-08-17): action 'ping' dilayani PALING
  // awal — sebelum rate limit, dispatch, inisialisasi koneksi Supabase, atau
  // kerja apa pun. .github/workflows/keep-alive.yml menembak endpoint ini tiap
  // 5 menit supaya fungsi Netlify tidak tertidur. Bentuk respons RAW
  // {statusCode, body} diteruskan apa adanya oleh netlify-wrapper.js &
  // serve-static.mjs (lihat keduanya).
  if (action === 'ping') {
    return { statusCode: 200, body: 'pong' };
  }

  const checks = rateLimitChecks(action, meta, sessionToken);
  for (const c of checks) {
    const r = await rateLimit.check(c.key, c.opts);
    if (!r.ok) {
      return {
        success: false,
        error: 'Terlalu banyak permintaan. Coba lagi dalam ' + r.retryAfter + ' detik.',
        rateLimited: true,
        retryAfter: r.retryAfter,
      };
    }
  }
  log.info('handler.start', { action, ip: meta?.ip });
  const out = await dispatchAction(action, payload, sessionToken);
  log.info('handler.end', { action, success: out?.success });
  // Lockout login: catat kegagalan (PIN/WA/password salah) sesuai REVIEW M3.
  if (out && out.success === false && !out.rateLimited && LOGIN_ACTIONS.has(action)) {
    for (const c of checks) {
      // @ts-expect-error JS→TS migration
      if (c.opts.lockoutAfter) await rateLimit.fail(c.key, c.opts);
    }
  }
  return out;
  });
}

async function dispatchAction(action, payload, sessionToken) {
  // ── Idempotency check (Phase 5) ──────────────────────────────────────────
  // For mutating actions, check Idempotency-Key header (passed via meta).
  const idempotencyKey = (globalThis as any).__idempotencyKey as string | undefined;
  if (idempotencyKey && isMutatingAction(action)) {
    try {
      const existing = await supabaseJson('GET', 'idempotency_keys', {
        query: { select: '*', key: 'eq.' + idempotencyKey, limit: '1' },
      }).catch(() => null);
      if (Array.isArray(existing) && existing.length > 0) {
        log.info('idempotency.hit', { action, key: idempotencyKey.slice(0, 8) });
        return existing[0].result;
      }
    } catch {
      // If idempotency table doesn't exist yet, proceed normally
    }
  }

  let result: unknown;

  // Try surface registry first (new architecture), fall back to old registry
  const surfaceHandler = SURFACE_HANDLERS[action];
  if (surfaceHandler) {
    try {
      result = await surfaceHandler(payload, sessionToken);
    } catch (err) {
      log.error('surface.error', { action, err: String(err) });
      return toErrorResponse(err);
    }
  } else {
    const handler = ACTION_HANDLERS[action];
    if (!handler) {
      return { success: false, message: NOT_IMPLEMENTED + ' (action: ' + action + ')' };
    }
    try {
      result = await handler(payload, sessionToken);
    } catch (err) {
      log.error('handler.error', { action, err: String(err) });
      return toErrorResponse(err);
    }
  }

  // ── Store idempotency result (Phase 5) ────────────────────────────────────
  if (idempotencyKey && isMutatingAction(action) && result && (result as any).success !== false) {
    try {
      await supabaseJson('POST', 'idempotency_keys', {
        query: { on_conflict: 'key' },
        body: { key: idempotencyKey, result, created_at: new Date().toISOString() },
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      }).catch(() => {});
    } catch {
      // Storage failure must not affect the response
    }
  }

  return result;
}

/** Actions that should be idempotent (mutations only) */
function isMutatingAction(action: string): boolean {
  const MUTATING = new Set([
    'daftarKandidat', 'gantiPasswordKandidat', 'loginKandidat',
    'handleSimpanJobBaru', 'handleEditLokerFull', 'handleUbahStatusJob',
    'handleHapusJobData', 'handleUpdateTahapanDbJob', 'handleUpdateDokumenShare',
    'handleTandaiGagalJob', 'handleReviewForm', 'handleApproveForm',
    'handleRejectForm', 'handleDeleteForm', 'handleUpdateCatatanKandidat',
    'handleUpdateKandidatSuper', 'handleSimpanWaTemplate', 'handleHapusWaTemplate',
    'kirimSatuPesanFonnte', 'kirimTawaranMassal', 'handleSubmitMasterForm',
    'handleSetTugasStatus', 'handleHapusJadwal', 'handleSimpanJadwal',
    'handleUpdateSysConfig', 'processUploadDoc', 'processAiFormSubmit',
  ]);
  return MUTATING.has(action);
}

// Fase 1.1d (2026-08-16): handleShareData, docTypeOf, docAge, TYPE_ALIAS,
// TYPE_TOKENS dipindah ke actions-share.js (viewer TSK publik via GET).
// share-data.js & serve-static.mjs tetap kompat via re-export di bawah.

// handleShareData & docTypeOf di-re-export dari actions-share supaya wrapper
// lama (netlify/functions/share-data.js, serve-static.mjs) tetap kompat.
export { handleAction, NOT_IMPLEMENTED };
export const handleShareData = shareActions.handleShareData;
export const docTypeOf = shareActions.docTypeOf;
