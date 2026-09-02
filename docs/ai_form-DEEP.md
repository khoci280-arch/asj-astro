> **Last updated:** 2026-09-03 — Analysis may not reflect recent code changes.

# ai-cv.astro - Deep Analysis

> AI CV (Qween Jeklin) - Chat AI + Form CV Bilingual.

## Component: AiCvForm.tsx (split: chat 35% + form 65%)
## Actions: processAIChat (bridge-links/ai-chat), submitDataAsj (ai-form-submit)
## DB: master_database_candidate (READ/WRITE), database_candidate (SYNC), ai_form_submissions (UPSERT)
## Chat: message -> Gemini -> reply + data -> merge -> form auto-fill
## Save: validate -> upload Cloudinary -> upsert 3 tables
## Auto-translate: 24 ID->JP pairs
