/**
 * surfaces/ai.ts — AI surface (chat, interview, CV)
 *
 * Phase 5: Actions that exceed 10s budget are enqueued as background jobs.
 * Returns 202 + jobId. Client polls via getJobStatus.
 */
import { enqueue, handleGetJobStatus } from '../_lib/kernel/job-queue';
import { log } from '../_lib/kernel/log';

/** Actions that must run in background (> 10s budget) */
const BACKGROUND_ACTIONS = new Set(['processAiInterview']);

export const AI_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  processAIChat: async (p: unknown[], s?: string) => {
    const ai = await import('../contexts/ai-orchestration');
    return ai.handleProcessAIChat(p, s);
  },
  processSiswaAIChat: async (p: unknown[], s?: string) => {
    const ai = await import('../contexts/ai-orchestration');
    return ai.handleProcessSiswaAIChat(p);
  },
  processAiInterview: async (p: unknown[], s?: string) => {
    const jobId = await enqueue('ai.interview', { payload: p, sessionToken: s });
    log.info('ai.background-enqueued', { jobId });
    return { success: true, status: 'accepted', jobId, message: 'Interview sedang diproses. Gunakan getJobStatus untuk mengecek.' };
  },
  processAdminAIChat: async (p: unknown[], s?: string) => {
    const { handleProcessAdminAIChat } = await import('../_lib/ai/chat');
    return handleProcessAdminAIChat(p, s);
  },
  generateWawancaraModel: async (p: unknown[], s?: string) => {
    const { handleGenerateWawancaraModel } = await import('../_lib/ai/chat');
    return handleGenerateWawancaraModel(p, s);
  },
  simpanHasilWawancara: async (p: unknown[], s?: string) => {
    const { handleSimpanHasilWawancara } = await import('../_lib/ai/chat');
    return handleSimpanHasilWawancara(p, s);
  },
  selesaikanWawancara: async (p: unknown[], s?: string) => {
    const { handleSelesaikanWawancara } = await import('../_lib/ai/chat');
    return handleSelesaikanWawancara(p, s);
  },
  getHasilWawancara: async (p: unknown[], s?: string) => {
    const { handleGetHasilWawancara } = await import('../_lib/ai/chat');
    return handleGetHasilWawancara(p, s);
  },
  getAdminAiContext: async (p: unknown[], s?: string) => {
    const { handleGetAdminAiContext } = await import('../_lib/ai/cv');
    return handleGetAdminAiContext(p, s);
  },
  buildAdminAiCandidateSummary: async (p: unknown[], s?: string) => {
    const { handleBuildAdminAiCandidateSummary } = await import('../_lib/ai/cv');
    return handleBuildAdminAiCandidateSummary(p, s);
  },
  submitDataAsj: async (p: unknown[], s?: string) => {
    const { handleSubmitDataAsj } = await import('../_lib/ai/cv');
    return handleSubmitDataAsj(p, s);
  },
  simpanDataTtdNaitei: async (p: unknown[], s?: string) => {
    const { handleSimpanDataTtdNaitei } = await import('../_lib/ai/cv');
    return handleSimpanDataTtdNaitei(p, s);
  },
  saveSignature: async (p: unknown[], s?: string) => {
    const { handleSaveSignature } = await import('../_lib/ai/cv');
    return handleSaveSignature(p, s);
  },
  processUploadDoc: async () => ({
    success: false,
    message: 'processUploadDoc has been moved to /ingest function',
  }),
  getJobStatus: async (p: unknown[], s?: string) => handleGetJobStatus(p, s),
};
