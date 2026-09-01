-- =============================================================================
-- 2026-09-01 — Phase 5: Async & Scale-Out
-- =============================================================================
-- 1. Postgres sequence for atomic candidate ID allocation (fixes TOCTOU race)
-- 2. Idempotency keys table (prevent duplicate writes on retry)
-- 3. Dependency calls table (observability — track external call performance)
-- =============================================================================

-- ── 1. Candidate ID sequence ─────────────────────────────────────────────────
-- Replaces MAX(id)+1 pattern which has TOCTOU race condition.
-- Format: ASJ + lpad(n, 5, '0') → ASJ00001, ASJ00002, etc.
-- Start at 10001 to leave room for any manually-created lower IDs.

CREATE SEQUENCE IF NOT EXISTS candidate_id_seq START WITH 10001;

-- ── 2. Idempotency keys ─────────────────────────────────────────────────────
-- Client sends Idempotency-Key header on mutations.
-- Server stores {key, result, created_at}. Replays return the stored result.
-- TTL: expire rows after 24h via scheduled cleanup.

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key         TEXT PRIMARY KEY,
  result      JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast cleanup of expired keys (TTL 24h)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created
ON idempotency_keys(created_at);

-- ── 3. Dependency calls log ──────────────────────────────────────────────────
-- Tracks every external call (PostgREST, Gemini, Fonnte, FCM, Storage).
-- Enables: "Is the 39ms RTT from local the same from Netlify?"
-- Sampled: only store if duration > threshold or on error.

CREATE TABLE IF NOT EXISTS dependency_calls (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts              TIMESTAMPTZ NOT NULL DEFAULT now(),
  dep             TEXT NOT NULL,            -- 'postgrest' | 'gemini' | 'fonnte' | 'fcm' | 'storage'
  action          TEXT NOT NULL,            -- handler action name
  budget_ms       INT NOT NULL,
  duration_ms     INT NOT NULL,
  outcome         TEXT NOT NULL,            -- 'ok' | 'timeout' | 'http_error' | 'network_error'
  status_code     INT,                      -- HTTP status if applicable
  attempts        INT NOT NULL DEFAULT 1,
  breaker_state   TEXT                      -- 'closed' | 'open' | 'half-open' (future)
);

-- Query by time range + dependency for dashboards
CREATE INDEX IF NOT EXISTS idx_dependency_calls_ts_dep
ON dependency_calls(ts, dep);

-- Recent errors for alerting
CREATE INDEX IF NOT EXISTS idx_dependency_calls_errors
ON dependency_calls(ts)
WHERE outcome != 'ok';
