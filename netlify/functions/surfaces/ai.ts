/**
 * surfaces/ai.ts — AI surface (chat, interview, CV)
 */
import * as ai from '../contexts/ai-orchestration';
export const AI_ACTIONS: Record<string, Function> = {
  processAIChat: (p, s) => ai.handleProcessAIChat(p, s),
  processSiswaAIChat: (p, s) => ai.handleProcessSiswaAIChat(p, s),
  processAiInterview: (p, s) => ai.handleProcessAiInterview(p, s),
};
