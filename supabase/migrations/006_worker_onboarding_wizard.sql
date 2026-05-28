-- ============================================================
-- MaidEzy — Worker onboarding wizard schema
--
-- Adds worker-preference columns to service_providers, extends
-- provider_services with per-row pricing dimensions (home_size,
-- family_size, meals_count), and creates worker_service_durations.
--
-- Idempotent. Run after migration 005.
-- ============================================================

-- ─── 1. Extend service_providers with worker preferences ─────
-- All nullable — legacy rows stay valid.
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS home_size_preference TEXT[],
  ADD COLUMN IF NOT EXISTS cooking_max_family   TEXT,
  ADD COLUMN IF NOT EXISTS cooking_max_meals    INT,
  ADD COLUMN IF NOT EXISTS buffer_minutes       INT,
  ADD COLUMN IF NOT EXISTS max_bookings_per_day INT;

-- Drop CHECKs first so re-runs are clean
ALTER TABLE public.service_providers
  DROP CONSTRAINT IF EXISTS sp_cooking_max_family_check,
  DROP CONSTRAINT IF EXISTS sp_cooking_max_meals_check,
  DROP CONSTRAINT IF EXISTS sp_buffer_minutes_check,
  DROP CONSTRAINT IF EXISTS sp_max_bookings_check,
  DROP CONSTRAINT IF EXISTS sp_home_size_preference_check;

ALTER TABLE public.service_providers
  ADD CONSTRAINT sp_cooking_max_family_check
    CHECK (cooking_max_family IS NULL OR cooking_max_family IN ('small','medium','large')),
  ADD CONSTRAINT sp_cooking_max_meals_check
    CHECK (cooking_max_meals IS NULL OR cooking_max_meals IN (1, 2)),
  ADD CONSTRAINT sp_buffer_minutes_check
    CHECK (buffer_minutes IS NULL OR buffer_minutes IN (15, 30, 45)),
  ADD CONSTRAINT sp_max_bookings_check
    CHECK (max_bookings_per_day IS NULL OR max_bookings_per_day IN (2, 3, 4, 5)),
  ADD CONSTRAINT sp_home_size_preference_check
    CHECK (home_size_preference IS NULL
           OR home_size_preference <@ ARRAY['small','medium','large']::TEXT[]);

-- ─── 2. Extend provider_services with pricing dimensions ─────

-- Drop the legacy "one row per (provider, service)" UNIQUE constraint —
-- wizard writes multiple rows per service (one per home_size or cooking combo).
ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS provider_services_provider_id_service_type_key;
DROP INDEX IF EXISTS provider_services_provider_id_service_type_key;

-- Update service_type CHECK to include 'cooking' (new wizard ID).
-- Older IDs (cooking_1_meal, cooking_2_meals, maid, driver) kept for
-- back-compat with rows created by the legacy editor.
ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS provider_services_service_type_check;
ALTER TABLE public.provider_services
  ADD CONSTRAINT provider_services_service_type_check
    CHECK (service_type IN (
      'maid','jhadu_pocha','bartan',
      'cooking','cooking_1_meal','cooking_2_meals',
      'car_cleaning','laundry','deep_cleaning',
      'child_care','elder_care','driver'
    ));

-- New dimension columns (all nullable)
ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS home_size   TEXT,
  ADD COLUMN IF NOT EXISTS family_size TEXT,
  ADD COLUMN IF NOT EXISTS meals_count INT;

ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS provider_services_home_size_check,
  DROP CONSTRAINT IF EXISTS provider_services_family_size_check,
  DROP CONSTRAINT IF EXISTS provider_services_meals_count_check;

ALTER TABLE public.provider_services
  ADD CONSTRAINT provider_services_home_size_check
    CHECK (home_size IS NULL OR home_size IN ('small','medium','large')),
  ADD CONSTRAINT provider_services_family_size_check
    CHECK (family_size IS NULL OR family_size IN ('small','medium','large')),
  ADD CONSTRAINT provider_services_meals_count_check
    CHECK (meals_count IS NULL OR meals_count IN (1, 2));

-- New UNIQUE index — allows multiple rows per service when dimensions differ.
-- COALESCE so NULLs collapse to a single bucket per service for non-dim services.
DROP INDEX IF EXISTS provider_services_unique_dim_idx;
CREATE UNIQUE INDEX provider_services_unique_dim_idx
  ON public.provider_services (
    provider_id,
    service_type,
    COALESCE(home_size,   ''),
    COALESCE(family_size, ''),
    COALESCE(meals_count,  0)
  );

-- ─── 3. New table — worker_service_durations ──────────────────
CREATE TABLE IF NOT EXISTS public.worker_service_durations (
  provider_id      UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  service_type_id  TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, service_type_id)
);

ALTER TABLE public.worker_service_durations
  DROP CONSTRAINT IF EXISTS wsd_service_type_check,
  DROP CONSTRAINT IF EXISTS wsd_duration_minutes_check;

ALTER TABLE public.worker_service_durations
  ADD CONSTRAINT wsd_service_type_check
    CHECK (service_type_id IN (
      'maid','jhadu_pocha','bartan',
      'cooking','cooking_1_meal','cooking_2_meals',
      'car_cleaning','laundry','deep_cleaning',
      'child_care','elder_care','driver'
    )),
  ADD CONSTRAINT wsd_duration_minutes_check
    CHECK (duration_minutes IN (30, 45, 60, 90));

CREATE INDEX IF NOT EXISTS idx_wsd_provider ON public.worker_service_durations(provider_id);

-- Grants + RLS off (dev mode — same pattern as existing tables)
GRANT ALL ON public.worker_service_durations TO anon, authenticated;
ALTER TABLE public.worker_service_durations DISABLE ROW LEVEL SECURITY;

-- ─── 4. Refresh PostgREST schema cache ────────────────────────
NOTIFY pgrst, 'reload schema';
