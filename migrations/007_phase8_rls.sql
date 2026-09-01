-- ============================================================
-- Phase 8: Enable RLS on key tables (§5.3)
--
-- Defence in depth: RLS policies ensure that even if a handler
-- bug leaks a session token, the DB blocks cross-user reads.
--
-- Policy: no_wa = current_setting('request.jwt.claims', true)::json->>'wa'
-- This works with Supabase PostgREST: the JWT's `wa` claim is
-- set by the auth middleware when a candidate logs in.
--
-- For admin/service-role requests, RLS is bypassed (service role
-- key doesn't go through RLS). This is intentional: admins need
-- cross-user access, and the service-role key is server-side only.
-- ============================================================

-- 1. database_candidate — candidate lifecycle
ALTER TABLE IF EXISTS database_candidate ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS candidate_own_wa ON database_candidate;

CREATE POLICY candidate_own_wa ON database_candidate
  FOR ALL
  USING (
    no_wa = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wa',
      ''
    )
  )
  WITH CHECK (
    no_wa = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wa',
      ''
    )
  );

-- 2. master_database_candidate — master biodata/CV
ALTER TABLE IF EXISTS master_database_candidate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_own_wa ON master_database_candidate;

CREATE POLICY master_own_wa ON master_database_candidate
  FOR ALL
  USING (
    no_wa = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wa',
      ''
    )
  )
  WITH CHECK (
    no_wa = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wa',
      ''
    )
  );

-- 3. database_asj_form — application forms (mail inbox)
ALTER TABLE IF EXISTS database_asj_form ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS form_own_wa ON database_asj_form;

CREATE POLICY form_own_wa ON database_asj_form
  FOR ALL
  USING (
    no_wa = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wa',
      ''
    )
  )
  WITH CHECK (
    no_wa = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wa',
      ''
    )
  );

-- Note: Admin operations use the service-role key which bypasses RLS.
-- This is correct: admins need cross-user access.
-- Candidate operations use the user JWT which has the `wa` claim.
-- The policy ensures candidates can only read/write their own rows.
