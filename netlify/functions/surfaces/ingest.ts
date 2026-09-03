/**
 * surfaces/ingest.ts — Document ingestion surface
 *
 * Phase 5: Document parsing can take 5-60s — always enqueued as background.
 * Returns 202 + jobId. Client polls via getJobStatus.
 */
import { enqueue } from '../_lib/kernel/job-queue';
import { log } from '../_lib/kernel/log';

export const INGEST_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  parseDokumenBiodata: async (p: unknown[], s?: string) => {
    // Document parsing is slow — enqueue as background job
    const jobId = await enqueue('ingest.parse', { payload: p, sessionToken: s });
    log.info('ingest.background-enqueued', { jobId });
    return { success: true, status: 'accepted', jobId, message: 'Dokumen sedang diproses. Gunakan getJobStatus untuk mengecek.' };
  },
};
