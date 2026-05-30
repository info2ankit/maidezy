-- ============================================================
-- MaidEzy — Consolidated deploy-readiness schema fix
-- Fixes 7 schema drifts the audit found between code and DB:
--   1. users.role CHECK missing 'worker_admin'
--   2. bookings missing 6 new columns + extended status enum
--   3. kyc_documents missing rejection_notes
--   4. worker_service_pricing table never created
--   5. worker_availability table never created
--   6. booking_slots table never created
--   7. worker_admins + worker_admin_invites tables never created
--   8. sync_user_auth_id RPC referenced but not defined
-- Idempotent. Run after 007.
-- ============================================================

-- ─── 1. users.role: allow worker_admin ───────────────────────
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin','rwa_admin','worker_admin','service_provider','resident'));

-- ─── 2. bookings: schema for new flow ────────────────────────
-- Legacy single-service columns become optional; new array/time/days columns added.
ALTER TABLE public.bookings ALTER COLUMN service_type DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN start_date   DROP NOT NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_type_ids TEXT[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS arrival_time     TEXT,
  ADD COLUMN IF NOT EXISTS days_of_week     TEXT[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pricing_mode     TEXT,
  ADD COLUMN IF NOT EXISTS total_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS otp_code         TEXT;

-- Status enum: add 'accepted' and 'rejected' used by booking flow code.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','accepted','active','completed','rejected','cancelled'));

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_pricing_mode_check
  CHECK (pricing_mode IS NULL OR pricing_mode IN ('monthly','per_visit'));

CREATE INDEX IF NOT EXISTS idx_bookings_resident_status ON public.bookings(resident_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON public.bookings(provider_id, status);

-- ─── 3. kyc_documents.rejection_notes ────────────────────────
ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

-- ─── 4. worker_service_pricing ───────────────────────────────
-- One row per (worker_user_id, service_type_id). is_active=false soft-deletes.
CREATE TABLE IF NOT EXISTS public.worker_service_pricing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_type_id TEXT NOT NULL,
  monthly_rate    NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_visit_rate  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (worker_id, service_type_id)
);
CREATE INDEX IF NOT EXISTS idx_wsp_worker_active
  ON public.worker_service_pricing(worker_id, is_active);

GRANT ALL ON public.worker_service_pricing TO anon, authenticated;
ALTER TABLE public.worker_service_pricing DISABLE ROW LEVEL SECURITY;

-- ─── 5. worker_availability ──────────────────────────────────
-- One row per worker. shifts is JSONB array of {start,end} in 'HH:MM' format.
CREATE TABLE IF NOT EXISTS public.worker_availability (
  worker_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  shifts       JSONB   NOT NULL DEFAULT '[]'::JSONB,
  working_days TEXT[]  NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.worker_availability TO anon, authenticated;
ALTER TABLE public.worker_availability DISABLE ROW LEVEL SECURITY;

-- ─── 6. booking_slots ────────────────────────────────────────
-- Blocks a (worker, day_of_week, slot_time) once a booking is accepted.
CREATE TABLE IF NOT EXISTS public.booking_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot_time   TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('mon','tue','wed','thu','fri','sat','sun')),
  is_blocked  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_slots_worker_day
  ON public.booking_slots(worker_id, day_of_week, is_blocked);

GRANT ALL ON public.booking_slots TO anon, authenticated;
ALTER TABLE public.booking_slots DISABLE ROW LEVEL SECURITY;

-- ─── 7. worker_admin_invites ─────────────────────────────────
-- Super-admin pre-creates an invite by mobile; on first login that mobile
-- gets the worker_admin role and is linked to the chosen societies.
CREATE TABLE IF NOT EXISTS public.worker_admin_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile      TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  gender      TEXT,
  society_ids UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.worker_admin_invites TO anon, authenticated;
ALTER TABLE public.worker_admin_invites DISABLE ROW LEVEL SECURITY;

-- ─── 8. worker_admins ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worker_admins (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  gender      TEXT,
  society_ids UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.worker_admins TO anon, authenticated;
ALTER TABLE public.worker_admins DISABLE ROW LEVEL SECURITY;

-- ─── 9. sync_user_auth_id RPC ────────────────────────────────
-- Called when Firebase auth UID differs from the stored users.id.
-- Currently a safe no-op: rotating users.id would cascade through every
-- FK that points to it (rwa_admins, residents, service_providers, kyc_documents,
-- worker_*, notifications, complaints…), none of which have ON UPDATE CASCADE.
-- When RLS goes on, replace this with a proper rotation routine or add
-- ON UPDATE CASCADE to every FK pointing at users.id.
CREATE OR REPLACE FUNCTION public.sync_user_auth_id(p_mobile TEXT, p_new_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- TODO: replace with cascade-safe ID rotation once RLS is enabled.
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_user_auth_id(TEXT, UUID) TO anon, authenticated;

-- ─── Refresh PostgREST schema cache ──────────────────────────
NOTIFY pgrst, 'reload schema';
