-- Migration: Atomic job claim with SKIP LOCKED
-- B5 fix: Replace non-atomic SELECT + PATCH with atomic UPDATE ... FOR UPDATE SKIP LOCKED
-- Run this in Supabase SQL Editor or via migration system

-- Create function for atomic job claiming
CREATE OR REPLACE FUNCTION claim_next_job()
RETURNS TABLE (
  id UUID,
  type TEXT,
  payload JSONB,
  idempotency_key TEXT,
  status TEXT,
  attempts INT,
  max_attempts INT,
  run_after TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue
  SET 
    status = 'running',
    attempts = attempts + 1,
    locked_until = NOW() + INTERVAL '5 minutes'
  WHERE id = (
    SELECT jq.id
    FROM job_queue jq
    WHERE jq.status IN ('pending', 'failed')
      AND (jq.run_after <= NOW() OR jq.status = 'failed')
      AND (jq.status != 'failed' OR jq.attempts < jq.max_attempts)
    ORDER BY jq.run_after ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING 
    job_queue.id,
    job_queue.type,
    job_queue.payload,
    job_queue.idempotency_key,
    job_queue.status,
    job_queue.attempts,
    job_queue.max_attempts,
    job_queue.run_after,
    job_queue.locked_until,
    job_queue.last_error,
    job_queue.created_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to reclaim stuck jobs (orphaned running jobs)
CREATE OR REPLACE FUNCTION reclaim_stuck_jobs()
RETURNS INT AS $$
DECLARE
  v_reclaimed INT;
BEGIN
  UPDATE job_queue
  SET 
    status = 'failed',
    locked_until = NULL,
    last_error = 'Timeout: job exceeded lock duration'
  WHERE status = 'running'
    AND locked_until < NOW();
  
  GET DIAGNOSTICS v_reclaimed = ROW_COUNT;
  RETURN v_reclaimed;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to anon (for PostgREST)
GRANT EXECUTE ON FUNCTION claim_next_job TO anon;
GRANT EXECUTE ON FUNCTION reclaim_stuck_jobs TO anon;
