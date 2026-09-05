> **Last updated:** 2026-09-03 — Analysis may not reflect recent code changes.

# master.astro - Deep Analysis

> Form master biodata 5 langkah + login gate. 154 kolom.

## Component: MasterFullForm.tsx (5-step wizard + login gate)
## Actions: loginKandidat (bridge-links/auth), submitMasterForm (bridge-links/master-data)
## DB: master_database_candidate (154 cols), database_candidate (sync)
## Login Gate: localStorage session -> bcrypt verify -> HMAC token -> auto-fill
## Auto-Translate: 24 ID/JP pairs via Gemini
