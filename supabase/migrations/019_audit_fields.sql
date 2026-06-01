-- ============================================================
-- MaidEzy — Universal audit fields
--
-- Adds six audit columns to every user-data table and a single
-- BEFORE INSERT/UPDATE trigger that keeps them honest:
--
--   created_at  TIMESTAMPTZ NOT NULL  → set on INSERT, immutable
--   updated_at  TIMESTAMPTZ NOT NULL  → set on INSERT, refreshed on UPDATE
--   created_by  UUID                  → auth.uid() at INSERT, immutable
--   updated_by  UUID                  → auth.uid() at UPDATE, app-overridable
--   deleted_at  TIMESTAMPTZ           → soft-delete marker (NULL = live)
--   deleted_by  UUID                  → auto-set when deleted_at flips
--                                       NULL → NOT NULL, cleared on restore
--
-- All FKs to public.users(id) use ON DELETE SET NULL so deleting an
-- actor preserves audit history.
--
-- The trigger is idempotent and reusable: applied once here, attached
-- to every table. Any new table created later just needs the column
-- additions and the trigger attach — no service-layer code changes
-- because Supabase clients see the new fields automatically.
--
-- Idempotent. Run after 018.
-- ============================================================

BEGIN;

-- ─── 1. Trigger function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id UUID;
BEGIN
  -- auth.uid() is NULL when running as service_role or before sign-in
  -- (e.g. bootstrap inserts). The NULL is preserved gracefully via the
  -- ON DELETE SET NULL FK semantics.
  actor_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := COALESCE(NEW.updated_at, NEW.created_at);
    NEW.created_by := COALESCE(NEW.created_by, actor_id);
    NEW.updated_by := COALESCE(NEW.updated_by, NEW.created_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Immutable after insert
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;

    -- Bump updated_at unless the row is identical (avoids no-op churn)
    IF NEW IS DISTINCT FROM OLD THEN
      NEW.updated_at := NOW();
      -- Take the actor from auth context unless the app explicitly set
      -- updated_by in the UPDATE (rare — e.g. system-job attribution).
      IF NEW.updated_by IS NOT DISTINCT FROM OLD.updated_by THEN
        NEW.updated_by := COALESCE(actor_id, OLD.updated_by);
      END IF;
    END IF;

    -- Soft-delete attribution
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      NEW.deleted_by := COALESCE(NEW.deleted_by, actor_id);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      -- Restore: clear the deletion attribution
      NEW.deleted_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 2. Reusable helper: add audit columns + attach trigger ───
-- Adds the six audit columns (idempotent) and attaches the trigger
-- to the given table. The partial "live rows" index uses the table's
-- primary key column(s) dynamically, since some tables use `id` while
-- others (worker_admins, rwa_admins, worker_availability, ...) use
-- composite PKs or user_id / worker_id.
CREATE OR REPLACE FUNCTION public.apply_audit_fields(tbl regclass)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  tname        TEXT := tbl::TEXT;            -- 'public.foo' or 'foo' depending on search_path
  short_name   TEXT;                          -- bare table name, e.g. 'foo'
  pk_cols      TEXT;
BEGIN
  -- regclass::text strips the schema when it's already on search_path,
  -- so split_part(..., '.', 2) can be empty. Read the bare name directly
  -- from pg_class to be robust.
  SELECT relname INTO short_name FROM pg_class WHERE oid = tbl;
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', tname);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', tname);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL', tname);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL', tname);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tname);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL', tname);

  -- Resolve the table's primary-key columns (comma-joined) so the
  -- partial index works for both `id`-PK and composite-PK tables.
  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(c.conkey, a.attnum))
    INTO pk_cols
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = tbl AND c.contype = 'p';

  IF pk_cols IS NOT NULL THEN
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_live ON %s (%s) WHERE deleted_at IS NULL',
      short_name, tname, pk_cols
    );
  END IF;

  -- Trigger (drop + create for idempotency)
  EXECUTE format('DROP TRIGGER IF EXISTS audit_fields_trg ON %s', tname);
  EXECUTE format(
    'CREATE TRIGGER audit_fields_trg BEFORE INSERT OR UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields()',
    tname
  );
END;
$$;

-- ─── 3. Apply to every user-data table ────────────────────────
-- Tables intentionally excluded:
--   • public.users — special case below (audit columns yes, but FK to
--     itself for created_by/updated_by/deleted_by, no trigger override
--     for created_by on self-signup bootstrap).
SELECT public.apply_audit_fields('public.societies');
SELECT public.apply_audit_fields('public.service_providers');
SELECT public.apply_audit_fields('public.residents');
SELECT public.apply_audit_fields('public.rwa_admins');
SELECT public.apply_audit_fields('public.worker_admins');
SELECT public.apply_audit_fields('public.worker_admin_invites');
SELECT public.apply_audit_fields('public.bookings');
SELECT public.apply_audit_fields('public.booking_slots');
SELECT public.apply_audit_fields('public.complaints');
SELECT public.apply_audit_fields('public.kyc_documents');
SELECT public.apply_audit_fields('public.notifications');
SELECT public.apply_audit_fields('public.provider_services');
SELECT public.apply_audit_fields('public.worker_availability');
SELECT public.apply_audit_fields('public.worker_service_pricing');
SELECT public.apply_audit_fields('public.worker_service_durations');
SELECT public.apply_audit_fields('public.worker_society_actions');
SELECT public.apply_audit_fields('public.resident_saved_addresses');

-- ─── 4. users table — same columns, FKs target itself ─────────
-- We can't use apply_audit_fields() because public.users.created_by etc.
-- would create a cyclic FK during the helper's CREATE INDEX. So we
-- inline the same column adds + trigger, but skip the partial index
-- (the table is small and auth lookups go by id anyway).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS audit_fields_trg ON public.users;
CREATE TRIGGER audit_fields_trg
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

NOTIFY pgrst, 'reload schema';

COMMIT;
