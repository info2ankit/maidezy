-- ============================================================
-- MaidEzy — New atomic service catalog + per-visit pricing
-- Self-contained: works whether 004 ran or not.
-- ============================================================

-- ─── Ensure table exists (creates it if 004 was skipped) ─────
CREATE TABLE IF NOT EXISTS public.provider_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  monthly_rate NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_type     ON public.provider_services(service_type);

GRANT ALL ON public.provider_services TO anon, authenticated;
ALTER TABLE public.provider_services DISABLE ROW LEVEL SECURITY;

-- ─── Wipe existing rows (option 1 — fresh start) ─────────────
DELETE FROM public.provider_services;

-- ─── Drop any old constraints that reference outdated values ──
ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS provider_services_service_type_check;

ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS provider_services_check;

ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS provider_services_at_least_one_rate;

-- ─── Migrate column: hourly_rate → per_visit_rate ─────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='provider_services' AND column_name='hourly_rate'
  ) THEN
    ALTER TABLE public.provider_services RENAME COLUMN hourly_rate TO per_visit_rate;
  END IF;

  -- If neither hourly_rate nor per_visit_rate exists (fresh CREATE above), add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='provider_services' AND column_name='per_visit_rate'
  ) THEN
    ALTER TABLE public.provider_services ADD COLUMN per_visit_rate NUMERIC(10,2);
  END IF;
END $$;

-- ─── Apply new CHECK constraints ──────────────────────────────
ALTER TABLE public.provider_services
  ADD CONSTRAINT provider_services_service_type_check
  CHECK (service_type IN (
    'maid',
    'jhadu_pocha',
    'bartan',
    'cooking_1_meal',
    'cooking_2_meals',
    'car_cleaning',
    'laundry',
    'deep_cleaning',
    'child_care',
    'elder_care',
    'driver'
  ));

ALTER TABLE public.provider_services
  ADD CONSTRAINT provider_services_at_least_one_rate
  CHECK (per_visit_rate IS NOT NULL OR monthly_rate IS NOT NULL);
