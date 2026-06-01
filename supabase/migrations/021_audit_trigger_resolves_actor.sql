-- ============================================================
-- MaidEzy — Audit trigger: resolve auth.uid() to public.users.id
--
-- Background: this project intentionally keeps auth.users.id and
-- public.users.id distinct (see migration 008 / sync_user_auth_id
-- RPC + the per-(mobile,role) identity convention in authService.ts).
-- Many flows therefore have auth.uid() pointing at an auth user that
-- has no matching row in public.users.
--
-- The original audit trigger (migration 019) wrote auth.uid() straight
-- into created_by / updated_by / deleted_by, which all FK public.users.
-- For admin flows this produced 23503 foreign-key violations on every
-- write (e.g. PATCH /bookings → 409 Conflict).
--
-- This migration replaces the trigger function with one that:
--   1. Reads auth.uid()
--   2. Verifies the id exists in public.users
--   3. If yes → use it as the actor
--   4. If no  → leave the audit field NULL (the FKs are ON DELETE SET
--      NULL so NULL is always acceptable). Writes succeed; attribution
--      is recorded only when it's resolvable.
--
-- Idempotent. Run after 020.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  raw_actor      UUID;
  resolved_actor UUID;
BEGIN
  raw_actor := auth.uid();

  -- Only attribute the change if auth.uid() actually exists in public.users.
  -- Cheap PK lookup; NULL when the auth identity has no public counterpart
  -- (e.g. admin flows where auth.users.id ≠ public.users.id).
  IF raw_actor IS NOT NULL THEN
    SELECT id INTO resolved_actor
    FROM public.users
    WHERE id = raw_actor
    LIMIT 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := COALESCE(NEW.updated_at, NEW.created_at);
    -- COALESCE preserves any value the app explicitly set, falls back to
    -- the resolved actor, then NULL.
    NEW.created_by := COALESCE(NEW.created_by, resolved_actor);
    NEW.updated_by := COALESCE(NEW.updated_by, NEW.created_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Immutable after insert
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;

    IF NEW IS DISTINCT FROM OLD THEN
      NEW.updated_at := NOW();
      -- Take the actor from the resolved auth context unless the app
      -- explicitly set updated_by. If the actor can't be resolved, fall
      -- back to OLD.updated_by rather than NULLing out prior attribution.
      IF NEW.updated_by IS NOT DISTINCT FROM OLD.updated_by THEN
        NEW.updated_by := COALESCE(resolved_actor, OLD.updated_by);
      END IF;
    END IF;

    -- Soft-delete attribution
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
