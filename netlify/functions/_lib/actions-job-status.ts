/**
 * actions-job-status.ts — Job status polling for background functions
 *
 * WHY THIS EXISTS
 * ---------------
 * Phase 5 converts ai, ingest, notify to background functions that return
 * 202 + jobId. The client needs to poll for completion. This module provides
 * the getJobStatus action that returns the current state of a job.
 *
 * USAGE
 * -----
 *   const result = await handleGetJobStatus([jobId], sessionToken);
 *   // { success: true, job: { id, status, result?, error? } }
 */

import { getJob } from './kernel/job-queue';
import { log } from './kernel/log';
import { Errors } from './kernel/errors';

export async function handleGetJobStatus(
  payload: unknown[],
  sessionToken?: string,
): Promise<unknown> {
  const [jobId] = payload as [string];

  if (!jobId || typeof jobId !== 'string') {
    throw Errors.validation('jobId harus diisi');
  }

  log.info('job-status.start', { jobId });

  const job = await getJob(jobId);

  if (!job) {
    return {
      success: true,
      status: 'not_found',
      message: 'Job tidak ditemukan',
    };
  }

  return {
    success: true,
    status: job.status,
    jobId: job.id,
    type: job.type,
    attempts: job.attempts,
    maxAttempts: job.max_attempts,
    lastError: job.last_error,
    createdAt: job.created_at,
    // Result is in the payload if status is 'done'
    result: job.status === 'done' ? job.payload : undefined,
  };
}
