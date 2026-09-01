/**
 * sweep-queue.ts — Netlify scheduled function for job queue processing
 *
 * WHY THIS EXISTS
 * ---------------
 * Phase 5 added a Postgres-backed job queue (job_queue table) for async work
 * (AI parsing, bulk WA, document ingestion). The queue needs a periodic sweep
 * to claim and execute pending jobs. This scheduled function runs every 2 minutes
 * via Netlify's scheduled functions feature.
 *
 * HOW IT WORKS
 * ------------
 * 1. Claims up to 5 pending jobs per sweep (SKIP LOCKED)
 * 2. Routes each job by type to the appropriate handler
 * 3. Marks jobs as completed or failed
 * 4. Dead-letters jobs that exceed max_attempts
 *
 * NETLIFY CONFIG (netlify.toml):
 *   [functions."sweep-queue"]
 *     schedule = "@every 2m"
 *
 * HANDLER REGISTRATION:
 *   Each job type maps to a function that receives the payload and executes it.
 *   New job types should be added to the HANDLERS map below.
 */

import { claimJob, completeJob, failJob, cleanupIdempotencyKeys } from './_lib/kernel/job-queue';
import { log } from './_lib/kernel/log';
import type { Job } from './_lib/kernel/job-queue';

// ── Job type handlers ─────────────────────────────────────────────────────────
// Each handler receives the job payload and executes the actual work.
// Import from the same contexts the surfaces use.

const HANDLERS: Record<string, (payload: Record<string, unknown>) => Promise<unknown>> = {
  'ai.interview': async (payload) => {
    const { handleProcessAiInterview } = await import('./_lib/ai/chat');
    const p = payload.payload as unknown[];
    const s = payload.sessionToken as string;
    return handleProcessAiInterview(p, s);
  },

  'ingest.parse': async (payload) => {
    const { handleParseDokumenBiodata } = await import('./_lib/actions-ingest');
    const p = payload.payload as unknown[];
    const s = payload.sessionToken as string;
    return handleParseDokumenBiodata(p, s);
  },

  'wa.broadcast': async (payload) => {
    const { handleKirimTawaranMassal } = await import('./_lib/actions-wa');
    const p = payload.payload as unknown[];
    const s = payload.sessionToken as string;
    return handleKirimTawaranMassal(p, s);
  },
};

// ── Sweep logic ───────────────────────────────────────────────────────────────

async function processJob(job: Job): Promise<void> {
  const handler = HANDLERS[job.type];
  if (!handler) {
    throw new Error(`No handler registered for job type: ${job.type}`);
  }
  log.info('sweep.processing', { jobId: job.id, type: job.type, attempt: job.attempts });
  await handler(job.payload);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const handler = async () => {
  const startTime = Date.now();
  let processed = 0;
  let failed = 0;

  log.info('sweep.start', {});

  // Process up to 5 jobs per sweep
  for (let i = 0; i < 5; i++) {
    const job = await claimJob();
    if (!job) break;

    try {
      await processJob(job);
      await completeJob(job.id);
      processed++;
    } catch (err) {
      await failJob(job.id, err);
      failed++;
    }
  }

  // Cleanup expired idempotency keys (run once per sweep)
  const cleaned = await cleanupIdempotencyKeys();

  const durationMs = Date.now() - startTime;
  log.info('sweep.complete', { processed, failed, cleaned, durationMs });

  return {
    statusCode: 200,
    body: JSON.stringify({
      processed,
      failed,
      cleaned,
      durationMs,
    }),
  };
};
