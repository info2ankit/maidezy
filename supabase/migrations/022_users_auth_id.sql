-- ============================================================
-- MaidEzy — Add auth_id to public.users + fix audit trigger
--
-- Background: admin accounts in this project use a synthetic
-- Supabase auth identity (email: {mobile}-admin@firebase.maidezy.app).
-- The resulting auth.users.id (auth.uid()) differs from the
-- pre-created public.users.id assigned when the invite was set up.
--
-- This mismatch causes:
--   1. 406 on app load — App.tsx looks up session.user.id in
--      public.users by PK; no row found → "0 rows" → 406.
--   2. Audit trigger writes NULL for actor on every admin mutation
--      because migration 021 verifies auth.uid() = public.users.id,
--      which never matches for admins.
--
-- Fix: add public.users.auth_id UUID UNIQUE.
--   - authService.ts writes auth_id = supabase_auth_uid after
--     every successful admin login (first and subsequent).
--   - App.tsx: on session restore, look up by id first (residents/
--     workers where id = auth.uid()), then by auth_id (admins).
--   - Trigger: resolve auth.uid() via auth_id first, then id.
--
-- Idempotent. Run after 021.
-- ============================================================

BEGIN;

-- 1. Add the auth_id column (idempotent)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Index for fast auth_id lookup (trigger + App.tsx session restore)
CREATE INDEX IF NOT EXISTS users_auth_id_idx ON public.users (auth_id)
  WHERE auth_id IS NOT NULL;

-- 2. Replace audit trigger to resolve actor via auth_id first
CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  raw_actor      UUID;
  resolved_actor UUID;
BEGIN
  raw_actor := auth.uid();

  IF raw_actor IS NOT NULL THEN
    -- Admin flows: auth_id stores the Supabase auth UID separately
    -- from public.users.id (the two are distinct by design).
    SELECT id INTO resolved_actor
    FROM public.users
    WHERE auth_id = raw_actor
    LIMIT 1;

    -- Resident/worker flows: public.users.id = auth.uid() directly,
    -- so auth_id is not populated; fall back to the PK lookup.
    IF resolved_actor IS NULL THEN
      SELECT id INTO resolved_actor
      FROM public.users
      WHERE id = raw_actor
      LIMIT 1;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := COALESCE(NEW.updated_at, NEW.created_at);
    NEW.created_by := COALESCE(NEW.created_by, resolved_actor);
    NEW.updated_by := COALESCE(NEW.updated_by, NEW.created_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;

    IF NEW IS DISTINCT FROM OLD THEN
      NEW.updated_at := NOW();
      IF NEW.updated_by IS NOT DISTINCT FROM OLD.updated_by THEN
        NEW.updated_by := COALESCE(resolved_actor, OLD.updated_by);
      END IF;
    END IF;

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      NEW.deleted_by := COALESCE(NEW.deleted_by, resolved_actor);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      NEW.deleted_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
