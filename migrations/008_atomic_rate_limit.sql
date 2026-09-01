-- Migration: Atomic rate limit increment
-- B6 fix: Replace non-atomic read-modify-write with atomic increment
-- Run this in Supabase SQL Editor or via migration system

-- Create function for atomic rate limit check + increment
CREATE OR REPLACE FUNCTION rate_limit_check(
  p_bucket TEXT,
  p_limit INT,
  p_window_ms BIGINT
) RETURNS TABLE (
  ok BOOLEAN,
  retry_after INT,
  locked BOOLEAN
) AS $$
DECLARE
  v_now BIGINT := EXTRACT(EPOCH FROM NOW()) * 1000;
  v_window_start BIGINT;
  v_count INT;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Check if bucket exists and is within window
  SELECT window_start, count, locked_until 
  INTO v_window_start, v_count, v_locked_until
  FROM rate_counters 
  WHERE bucket = p_bucket;
  
  -- Check lockout
  IF v_locked_until IS NOT NULL AND v_now < EXTRACT(EPOCH FROM v_locked_until) * 1000 THEN
    RETURN QUERY SELECT 
      FALSE, 
      CEIL((EXTRACT(EPOCH FROM v_locked_until) * 1000 - v_now) / 1000)::INT,
      TRUE;
    RETURN;
  END IF;
  
  -- Window expired or new bucket
  IF v_window_start IS NULL OR v_now >= v_window_start + p_window_ms THEN
    INSERT INTO rate_counters (bucket, window_start, count, fails, locked_until)
    VALUES (p_bucket, NOW(), 1, 0, NULL)
    ON CONFLICT (bucket) DO UPDATE 
    SET window_start = NOW(), count = 1, fails = 0, locked_until = NULL;
    
    RETURN QUERY SELECT TRUE, NULL::INT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  -- Within window — atomic increment
  UPDATE rate_counters 
  SET count = count + 1
  WHERE bucket = p_bucket
  RETURNING count INTO v_count;
  
  IF v_count > p_limit THEN
    -- Rate limited
    RETURN QUERY SELECT 
      FALSE, 
      CEIL((v_window_start + p_window_ms - v_now) / 1000)::INT,
      FALSE;
  ELSE
    RETURN QUERY SELECT TRUE, NULL::INT, NULL::BOOLEAN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function for atomic failure recording with lockout
CREATE OR REPLACE FUNCTION rate_limit_fail(
  p_bucket TEXT,
  p_lockout_after INT,
  p_lockout_ms BIGINT
) RETURNS VOID AS $$
DECLARE
  v_now BIGINT := EXTRACT(EPOCH FROM NOW()) * 1000;
  v_fails INT;
BEGIN
  -- Increment fails atomically
  UPDATE rate_counters 
  SET fails = fails + 1
  WHERE bucket = p_bucket
  RETURNING fails INTO v_fails;
  
  -- Apply lockout if threshold reached
  IF v_fails >= p_lockout_after THEN
    UPDATE rate_counters 
    SET locked_until = NOW() + (p_lockout_ms || ' milliseconds')::INTERVAL,
        fails = 0
    WHERE bucket = p_bucket;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to anon (for PostgREST)
GRANT EXECUTE ON FUNCTION rate_limit_check TO anon;
GRANT EXECUTE ON FUNCTION rate_limit_fail TO anon;
