-- ============================================================
-- MaidEzy — Per-service pricing
-- A provider can offer multiple services (maid + cook + cleaner)
-- with independent hourly/monthly rates for each.
-- Idempotent. Run after 003.
-- ============================================================

-- ─── New table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.provider_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL
                 CHECK (service_type IN ('maid','cook','driver','car_cleaner','home_cleaner','laundry')),
  hourly_rate  NUMERIC(10,2),
  monthly_rate NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, service_type),
  CHECK (hourly_rate IS NOT NULL OR monthly_rate IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_type     ON public.provider_services(service_type);

-- Grants (same as schema 001 — needed for new table)
GRANT ALL ON public.provider_services TO anon, authenticated;
ALTER TABLE public.provider_services DISABLE ROW LEVEL SECURITY;

-- ─── Backfill from old single-service columns (if they exist) ─
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_providers' AND column_name='service_type'
  ) THEN
    INSERT INTO public.provider_services (provider_id, service_type, hourly_rate, monthly_rate)
    SELECT id, service_type, hourly_rate, monthly_rate
    FROM public.service_providers
    WHERE service_type IS NOT NULL
      AND (hourly_rate IS NOT NULL OR monthly_rate IS NOT NULL)
    ON CONFLICT (provider_id, service_type) DO NOTHING;
  END IF;
END $$;

-- ─── Drop old columns + the previous CHECK + the type index ──
ALTER TABLE public.service_providers
  DROP CONSTRAINT IF EXISTS sp_at_least_one_rate;

DROP INDEX IF EXISTS idx_sp_service_type;

ALTER TABLE public.service_providers
  DROP COLUMN IF EXISTS service_type,
  DROP COLUMN IF EXISTS hourly_rate,
  DROP COLUMN IF EXISTS monthly_rate;
