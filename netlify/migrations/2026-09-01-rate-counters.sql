-- =============================================================================
-- 2026-09-01 — Rate limiting table (shared across Netlify instances)
-- =============================================================================
-- Replaces the in-memory Map rate limiter which was bypassable across instances.
-- One row per rate-limit bucket (e.g. "adminLogin:203.0.113.9").
--
-- ATOMIC INCREMENT:
--   Use upsert with on_conflict to atomically increment the counter.
--   PostgreSQL's INSERT ... ON CONFLICT UPDATE is atomic — no race condition.
--
-- CLEANUP:
--   Rows older than 1 hour are pruned by the application (lazy cleanup on read).
--   For production, add a cron job: DELETE FROM rate_counters
--     WHERE window_start < now() - interval '1 hour' AND locked_until < now();
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_counters (
  bucket        text PRIMARY KEY,
  window_start  timestamptz NOT NULL DEFAULT now(),
  count         int NOT NULL DEFAULT 0,
  fails         int NOT NULL DEFAULT 0,
  locked_until  timestamptz
);

-- Index for cleanup queries (find expired rows)
CREATE INDEX IF NOT EXISTS idx_rate_counters_window
ON rate_counters(window_start)
WHERE locked_until IS NULL;

-- Index for lockout queries
CREATE INDEX IF NOT EXISTS idx_rate_counters_locked
ON rate_counters(locked_until)
WHERE locked_until IS NOT NULL;
