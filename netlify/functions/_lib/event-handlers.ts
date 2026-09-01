/**
 * event-handlers.ts — Register domain event handlers
 *
 * WHY THIS EXISTS
 * ---------------
 * Context services emit domain events (candidate.stageChanged, application.approved, etc.)
 * but nothing was listening. This module registers handlers that:
 *   1. Log structured events via kernel/log.ts
 *   2. Serve as integration points for future WhatsApp/FCM notifications
 *   3. Ensure events don't fire into void
 *
 * DESIGN RULES (from kernel/events.ts):
 *   - Handlers may NEVER throw into the emitter (caught automatically)
 *   - Handlers may NEVER assume they run before the response is returned
 *   - This file is imported for side effects — calling initEventHandlers() registers all handlers
 */

import { on } from './kernel/events';
import { log } from './kernel/log';

/**
 * Initialize all event handlers.
 * Call once at module load time (side-effect import in handlers.ts).
 */
export function initEventHandlers(): void {
  // ── Candidate stage changes ──────────────────────────────────────────────
  on('candidate.stageChanged', async (event) => {
    log.info('event.candidate.stageChanged', {
      wa: event.wa.slice(0, 4) + '****' + event.wa.slice(-3), // Partially mask PII
      from: event.from,
      to: event.to,
      at: event.at,
    });

    // Future: send WhatsApp notification to candidate
    // if (event.to === 'INTERVIEW') {
    //   await sendWaNotification(event.wa, 'Selamat! Anda lolos ke tahap wawancara.');
    // } else if (event.to === 'LULUS') {
    //   await sendWaNotification(event.wa, 'Selamat! Anda diterima.');
    // }
  });

  // ── Application submitted ────────────────────────────────────────────────
  on('application.submitted', async (event) => {
    log.info('event.application.submitted', {
      wa: event.wa.slice(0, 4) + '****' + event.wa.slice(-3),
      jobCode: event.jobCode,
      at: event.at,
    });

    // Future: send FCM push notification to admin
    // await notifyAdmins('Lamaran Baru', `Pelamar ${event.wa.slice(-4)} mendaftar ke ${event.jobCode}`, '/admin.html');
  });

  // ── Application approved ─────────────────────────────────────────────────
  on('application.approved', async (event) => {
    log.info('event.application.approved', {
      wa: event.wa.slice(0, 4) + '****' + event.wa.slice(-3),
      jobCode: event.jobCode,
      at: event.at,
    });

    // Future: send WhatsApp congratulation to candidate
    // await sendWaNotification(event.wa, `Selamat! Lamaran Anda untuk ${event.jobCode} telah disetujui.`);
  });

  // ── Application rejected ─────────────────────────────────────────────────
  on('application.rejected', async (event) => {
    log.info('event.application.rejected', {
      wa: event.wa.slice(0, 4) + '****' + event.wa.slice(-3),
      jobCode: event.jobCode,
      reason: event.reason || 'Tidak disebutkan',
      at: event.at,
    });

    // Future: send WhatsApp feedback to candidate
    // await sendWaNotification(event.wa, `Lamaran Anda untuk ${event.jobCode} perlu revisi: ${event.reason || 'Silakan perbaiki dokumen.'}`);
  });

  // ── Document uploaded ────────────────────────────────────────────────────
  on('document.uploaded', async (event) => {
    log.info('event.document.uploaded', {
      wa: event.wa.slice(0, 4) + '****' + event.wa.slice(-3),
      kind: event.kind,
      path: event.path.split('/').pop(), // Only log filename, not full path
      at: event.at,
    });

    // Future: index document for search / trigger AI parsing
    // if (['PDF', 'DOCX', 'XLSX'].includes(event.kind)) {
    //   await triggerDocumentParsing(event.wa, event.path, event.kind);
    // }
  });

  // ── Job status changed ───────────────────────────────────────────────────
  on('job.statusChanged', async (event) => {
    log.info('event.job.statusChanged', {
      jobCode: event.jobCode,
      from: event.from,
      to: event.to,
      at: event.at,
    });

    // Future: invalidate public job board cache
    // cache.invalidatePrefix('public-appdata');
  });

  // ── Config changed ───────────────────────────────────────────────────────
  on('config.changed', async (event) => {
    log.info('event.config.changed', {
      key: event.key,
      at: event.at,
    });

    // Future: invalidate config cache
    // cache.invalidatePrefix('config');
  });

  // ── Reminder due ─────────────────────────────────────────────────────────
  on('reminder.due', async (event) => {
    log.info('event.reminder.due', {
      jadwalId: event.jadwalId,
      tugasId: event.tugasId,
      at: event.at,
    });

    // Future: send FCM reminder to admin
    // await notifyAdmins('Pengingat', `Tugas ${event.tugasId} sudah jatuh tempo.`, '/admin.html');
  });
}
