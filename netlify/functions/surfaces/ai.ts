/**
 * surfaces/ai.ts — AI surface (chat, interview, CV)
 *
 * Phase 5: Actions that exceed 10s budget are enqueued as background jobs.
 * Returns 202 + jobId. Client polls via getJobStatus.
 */
import { enqueue } from '../_lib/kernel/job-queue';
import { log } from '../_lib/kernel/log';

/** Actions that must run in background (> 10s budget) */
const BACKGROUND_ACTIONS = new Set(['processAiInterview']);

export const AI_ACTIONS: Record<string, Function> = {
  processAIChat: async (p: unknown[], s?: string) => {
    // AI chat is fast (< 10s) — run synchronously
    const ai = await import('../contexts/ai-orchestration');
    return ai.handleProcessAIChat(p, s);
  },
  processSiswaAIChat: async (p: unknown[], s?: string) => {
    const ai = await import('../contexts/ai-orchestration');
    return ai.handleProcessSiswaAIChat(p, s);
  },
  processAiInterview: async (p: unknown[], s?: string) => {
    // Interview is slow — enqueue as background job
    const jobId = await enqueue('ai.interview', { payload: p, sessionToken: s });
    log.info('ai.background-enqueued', { jobId });
    return { success: true, status: 'accepted', jobId, message: 'Interview sedang diproses. Gunakan getJobStatus untuk mengecek.' };
  },
};
