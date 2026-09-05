> **Last updated:** 2026-09-03 — Analysis may not reflect recent code changes.

# AI Admin Chat - Deep Analysis

> AI HR Copilot untuk admin panel. Chat only, no persist.

## Flow: Admin -> bridge-links/processAdminAIChat -> Gemini -> reply
## Guard: requireRole('admin')
## No DB writes, no auto-translate
