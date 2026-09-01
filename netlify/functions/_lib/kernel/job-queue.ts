/**
 * kernel/job-queue.ts — Durable job queue backed by Postgres
 *
 * WHY THIS EXISTS
 * ---------------
 * Long-running work (AI parsing, bulk WA, document ingestion) currently
 * executes synchronously within the 10 s Netlify function budget. This
 * module provides at-least-once job execution via Postgres SKIP LOCKED:
 *
 *   1. Enqueue: INSERT INTO job_queue (type, payload, idempotency_key)
 *   2. Claim:   UPDATE ... FOR UPDATE SKIP LOCKED LIMIT 1
 *   3. Execute: route by job.type, then complete or fail
 *   4. Dead-letter: after max_attempts, status → 'dead'
 *
 * USAGE
 * -----
 *   import { enqueue, claimJob, completeJob, failJob } from '../kernel/job-queue';
 *   const jobId = await enqueue('ai.parse', { wa, docUrl });
 *   // In a background function or cron sweep:
 *   const job = await claimJob();  // null if nothing pending
 *   if (job) {
 *     try { await processJob(job); await completeJob(job.id); }
 *     catch (e) { await failJob(job.id, e); }
 *   }
 */

import { supabaseJson } from '../db/client';
import { log } from './log';

const TABLE = 'job_queue';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  run_after: string;
  locked_until: string | null;
  last_error: string | null;
  created_at: string;
}

/**
 * Enqueue a new job. Returns the job ID.
 * If idempotencyKey is provided and a job with that key already exists,
 * returns the existing job ID (dedup).
 */
export async function enqueue(
  type: string,
  payload: Record<string, unknown>,
  opts: { idempotencyKey?: string; runAfter?: Date } = {},
): Promise<string> {
  const row: Record<string, unknown> = {
    type,
    payload,
    status: 'pending',
    run_after: opts.runAfter?.toISOString() ?? new Date().toISOString(),
  };
  if (opts.idempotencyKey) {
    row.idempotency_key = opts.idempotencyKey;
  }

  const rows = await supabaseJson('POST', TABLE, {
    query: { on_conflict: 'idempotency_key' },
    body: row,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  });

  const inserted = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  const jobId = inserted?.id;

  if (!jobId) {
    throw new Error(`Failed to enqueue job type=${type}`);
  }

  log.info('job.enqueued', { jobId, type });
  return jobId as string;
}

/**
 * Claim the next pending job (SKIP LOCKED).
 * Returns null if no jobs are ready.
 *
 * B5 fix: Use atomic RPC function instead of non-atomic SELECT + PATCH.
 * The claim_next_job function atomically updates and returns the claimed job.
 */
export async function claimJob(): Promise<Job | null> {
  try {
    // B5 fix: Use atomic RPC function for job claiming
    const result = await supabaseJson('POST', 'rpc/claim_next_job', {
      body: {},
    });

    if (!result || !Array.isArray(result) || result.length === 0) {
      return null;
    }

    const job = result[0] as Job;
    log.info('job.claimed', { jobId: job.id, type: job.type, attempt: job.attempts });
    return job;
  } catch (err) {
    log.error('job.claim-failed', { err: String(err) });
    return null;
  }
}

/**
 * Mark a job as completed.
 */
export async function completeJob(jobId: string): Promise<void> {
  try {
    await supabaseJson('PATCH', TABLE, {
      query: { id: 'eq.' + jobId },
      body: { status: 'done', locked_until: null, last_error: null },
      headers: { Prefer: 'return=minimal' },
    });
    log.info('job.completed', { jobId });
  } catch (err) {
    log.error('job.complete-failed', { jobId, err: String(err) });
  }
}

/**
 * Mark a job as failed. If max_attempts exceeded, auto-promotes to 'dead'.
 */
export async function failJob(jobId: string, error: unknown): Promise<void> {
  const errMsg = String(error).slice(0, 500);
  log.error('job.failed', { jobId, err: errMsg });

  // The claim function handles dead-letter logic on next claim attempt.
  // Here we just set status='failed' and store the error.
  try {
    await supabaseJson('PATCH', TABLE, {
      query: { id: 'eq.' + jobId },
      body: {
        status: 'failed',
        locked_until: null,
        last_error: errMsg,
      },
      headers: { Prefer: 'return=minimal' },
    });
  } catch (err) {
    log.error('job.fail-write-error', { jobId, err: String(err) });
  }
}

/**
 * Get job status by ID (for client polling).
 */
export async function getJob(jobId: string): Promise<Job | null> {
  try {
    const rows = await supabaseJson('GET', TABLE, {
      query: { select: '*', id: 'eq.' + jobId, limit: '1' },
    });
    if (Array.isArray(rows) && rows.length > 0) return rows[0] as Job;
    return null;
  } catch {
    return null;
  }
}

/**
 * Cleanup expired idempotency keys (call from cron).
 * Deletes keys older than 24 hours.
 */
export async function cleanupIdempotencyKeys(): Promise<number> {
  const cutoff = new Date(Date.now() - 86_400_000).toISOString();
  try {
    // P4 fix: Batch delete with a single DELETE WHERE instead of N+1 sequential
    // DELETE calls (was up to 100 HTTP round trips, now 1).
    const result = await supabaseJson('DELETE', 'idempotency_keys', {
      query: { created_at: 'lt.' + cutoff },
      headers: { Prefer: 'return=minimal' },
    });
    // PostgREST returns the deleted rows, so count them.
    return Array.isArray(result) ? result.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Sweep the job queue: claim and process pending jobs.
 * Returns the number of jobs processed.
 */
export async function sweepQueue(processFn: (job: Job) => Promise<void>): Promise<number> {
  let processed = 0;
  // Process up to 5 jobs per sweep
  for (let i = 0; i < 5; i++) {
    const job = await claimJob();
    if (!job) break;
    try {
      await processFn(job);
      await completeJob(job.id);
      processed++;
    } catch (err) {
      await failJob(job.id, err);
    }
  }
  return processed;
}
