-- ============================================================
-- MaidEzy — Workers can serve multiple societies
-- Adds society_ids UUID[] alongside the existing single society_id.
-- Old society_id stays (made nullable) for back-compat with queries that
-- filter by it. New code reads from society_ids; legacy code keeps working.
-- Idempotent. Run after 006.
-- ============================================================

ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS society_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

-- Backfill: copy existing single society_id into the array
UPDATE public.service_providers
SET society_ids = ARRAY[society_id]
WHERE society_id IS NOT NULL
  AND (society_ids IS NULL OR array_length(society_ids, 1) IS NULL);

-- Allow society_id to be null (wizard-created profiles use society_ids[0] only as a mirror)
ALTER TABLE public.service_providers
  ALTER COLUMN society_id DROP NOT NULL;

-- GIN index for fast "any worker serving society X" lookups (used by RWA listings)
CREATE INDEX IF NOT EXISTS idx_sp_society_ids_gin
  ON public.service_providers USING GIN (society_ids);

NOTIFY pgrst, 'reload schema';
