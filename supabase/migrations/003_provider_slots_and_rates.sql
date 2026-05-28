-- ============================================================
-- MaidEzy — Multiple availability slots + dual rate model
-- Run after 002. Idempotent.
-- ============================================================

-- ─── Add new columns ─────────────────────────────────────────
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS availability_slots JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS hourly_rate        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monthly_rate       NUMERIC(10,2);

-- ─── Backfill from old columns (if they exist) ────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_providers' AND column_name='timing_start'
  ) THEN
    UPDATE public.service_providers
    SET availability_slots = jsonb_build_array(
          jsonb_build_object(
            'start', to_char(timing_start, 'HH24:MI'),
            'end',   to_char(timing_end,   'HH24:MI')
          )
        )
    WHERE timing_start IS NOT NULL
      AND timing_end IS NOT NULL
      AND availability_slots = '[]'::JSONB;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_providers' AND column_name='rate'
  ) THEN
    UPDATE public.service_providers
    SET monthly_rate = rate
    WHERE rate IS NOT NULL AND monthly_rate IS NULL;
  END IF;
END $$;

-- ─── Drop old columns ────────────────────────────────────────
ALTER TABLE public.service_providers
  DROP COLUMN IF EXISTS timing_start,
  DROP COLUMN IF EXISTS timing_end,
  DROP COLUMN IF EXISTS rate;

-- ─── Constraint: at least one rate must be set ───────────────
ALTER TABLE public.service_providers
  DROP CONSTRAINT IF EXISTS sp_at_least_one_rate;
ALTER TABLE public.service_providers
  ADD CONSTRAINT sp_at_least_one_rate
  CHECK (hourly_rate IS NOT NULL OR monthly_rate IS NOT NULL);
