> **Last updated:** 2026-09-03 — Analysis may not reflect recent code changes.

# AI Wawancara - Deep Analysis

## Candidate: Start (VIP guard) -> processAiInterview -> Gemini 14 questions
## Candidate: Chat -> processAiInterview (20 msg trim) -> follow-up
## Candidate: Finish -> selesaikanWawancara -> extract score/biodata -> simpanHasilWawancara
## Admin: Generate Model -> generateWawancaraModel -> Gemini 14 questions
## Admin: View Results -> getHasilWawancara -> read ai_form_submissions

## Handlers: ai-chat.ts (processAiInterview, selesaikanWawancara, simpanHasilWawancara, getHasilWawancara)
##           admin-ai-context.ts (generateWawancaraModel)
