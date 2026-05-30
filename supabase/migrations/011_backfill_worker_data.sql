-- ============================================================
-- MaidEzy — Backfill legacy worker data into the new tables
--
-- Migration 008 created worker_service_pricing and worker_availability,
-- but workers onboarded earlier wrote to:
--   - provider_services (pricing, may have home_size/family_size dim rows)
--   - service_providers.availability_slots (JSONB array of shifts)
--
-- This migration copies that data forward so the new resident browse +
-- booking flow can see existing workers. Skips rows that already exist.
--
-- Idempotent. Run after 008 (or after 010 — order with 009/010 doesn't matter).
-- ============================================================

-- ─── 1. Pricing: provider_services → worker_service_pricing ──
-- Collapse multi-dimension rows (home_size / family_size / meals_count)
-- to a single row per (worker, service_type) using the MIN rate so the
-- cheapest variant shows. Workers can edit afterwards.
INSERT INTO public.worker_service_pricing (worker_id, service_type_id, monthly_rate, per_visit_rate, is_active)
SELECT
  sp.user_id                      AS worker_id,
  ps.service_type                 AS service_type_id,
  COALESCE(MIN(ps.monthly_rate),   0) AS monthly_rate,
  COALESCE(MIN(ps.per_visit_rate), 0) AS per_visit_rate,
  TRUE                            AS is_active
FROM public.provider_services ps
JOIN public.service_providers sp ON sp.id = ps.provider_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.worker_service_pricing wsp
  WHERE wsp.worker_id = sp.user_id AND wsp.service_type_id = ps.service_type
)
GROUP BY sp.user_id, ps.service_type;

-- ─── 2. Availability: service_providers.availability_slots → worker_availability ──
-- Old rows have shifts in availability_slots (JSONB) but no day list, so we
-- default to Mon–Sat (DEFAULT_WORKING_DAYS in code) for back-compat.
INSERT INTO public.worker_availability (worker_id, shifts, working_days)
SELECT
  sp.user_id              AS worker_id,
  sp.availability_slots   AS shifts,
  ARRAY['mon','tue','wed','thu','fri','sat']::TEXT[] AS working_days
FROM public.service_providers sp
WHERE sp.user_id IS NOT NULL
  AND sp.availability_slots IS NOT NULL
  AND jsonb_array_length(sp.availability_slots) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.worker_availability wa WHERE wa.worker_id = sp.user_id
  );

NOTIFY pgrst, 'reload schema';
