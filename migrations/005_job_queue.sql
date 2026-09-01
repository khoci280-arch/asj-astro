-- =============================================================================
-- 2026-09-01 — Job queue for async work (Phase 5)
-- =============================================================================
-- Replaces in-process async work with durable, retryable jobs.
-- Claim with: UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL,          -- 'wa.broadcast' | 'ai.parse' | 'reminder.sweep'
  payload         jsonb NOT NULL,
  idempotency_key text UNIQUE,
  status          text NOT NULL DEFAULT 'pending',   -- pending|running|done|failed|dead
  attempts        int  NOT NULL DEFAULT 0,
  max_attempts    int  NOT NULL DEFAULT 5,
  run_after       timestamptz NOT NULL DEFAULT now(),
  locked_until    timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup for pending/failed jobs ready to run
CREATE INDEX IF NOT EXISTS idx_job_queue_pending
ON job_queue(status, run_after)
WHERE status IN ('pending', 'failed');

-- Cleanup old completed jobs
CREATE INDEX IF NOT EXISTS idx_job_queue_completed
ON job_queue(created_at)
WHERE status = 'done';

-- Dead letter alerting
CREATE INDEX IF NOT EXISTS idx_job_queue_dead
ON job_queue(created_at)
WHERE status = 'dead';
