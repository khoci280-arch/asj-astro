-- ============================================================
-- Phase 8: Enable RLS on key tables (§5.3) — SAFE VERSION
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
--
-- SAFE VERSION: checks table existence, checks current RLS state,
-- and verifies after enabling.
-- ============================================================

-- ── Helper function ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _check_table_exists(tbl text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = tbl
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _check_rls_enabled(tbl text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = tbl AND rowsecurity = true
  );
END;
$$ LANGUAGE plpgsql;

-- ── 1. database_candidate ────────────────────────────────────────
DO $$
BEGIN
  IF NOT _check_table_exists('database_candidate') THEN
    RAISE NOTICE 'SKIP: table database_candidate does not exist';
    RETURN;
  END IF;

  IF _check_rls_enabled('database_candidate') THEN
    RAISE NOTICE 'SKIP: RLS already enabled on database_candidate';
  ELSE
    ALTER TABLE database_candidate ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'ENABLED: RLS on database_candidate';
  END IF;

  -- Drop and recreate policy (idempotent)
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
  RAISE NOTICE 'POLICY: candidate_own_wa created on database_candidate';
END $$;

-- ── 2. master_database_candidate ─────────────────────────────────
DO $$
BEGIN
  IF NOT _check_table_exists('master_database_candidate') THEN
    RAISE NOTICE 'SKIP: table master_database_candidate does not exist';
    RETURN;
  END IF;

  IF _check_rls_enabled('master_database_candidate') THEN
    RAISE NOTICE 'SKIP: RLS already enabled on master_database_candidate';
  ELSE
    ALTER TABLE master_database_candidate ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'ENABLED: RLS on master_database_candidate';
  END IF;

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
  RAISE NOTICE 'POLICY: master_own_wa created on master_database_candidate';
END $$;

-- ── 3. database_asj_form ────────────────────────────────────────
DO $$
BEGIN
  IF NOT _check_table_exists('database_asj_form') THEN
    RAISE NOTICE 'SKIP: table database_asj_form does not exist';
    RETURN;
  END IF;

  IF _check_rls_enabled('database_asj_form') THEN
    RAISE NOTICE 'SKIP: RLS already enabled on database_asj_form';
  ELSE
    ALTER TABLE database_asj_form ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'ENABLED: RLS on database_asj_form';
  END IF;

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
  RAISE NOTICE 'POLICY: form_own_wa created on database_asj_form';
END $$;

-- ── Verification ─────────────────────────────────────────────────
-- Run this after to confirm RLS is active:
SELECT
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('database_candidate', 'master_database_candidate', 'database_asj_form')
ORDER BY tablename;

-- ── Cleanup helper functions ─────────────────────────────────────
DROP FUNCTION IF EXISTS _check_table_exists(text);
DROP FUNCTION IF EXISTS _check_rls_enabled(text);
