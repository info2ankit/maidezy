-- ============================================================
-- MaidEzy — Reschedule negotiation: track which side proposed
--
-- Adds proposed_by_role so the UI can tell who made the latest proposal
-- (worker / worker_admin act as one side; resident is the other).
-- That side sees "Waiting…" + Withdraw; the other side sees Accept/Decline/Counter.
--
-- Idempotent. Run after 012.
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS proposed_by_role TEXT;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_proposed_by_role_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_proposed_by_role_check
  CHECK (proposed_by_role IS NULL OR proposed_by_role IN ('worker','worker_admin','resident'));

-- Backfill existing reschedule rows: any non-null proposed_by from before 013
-- came from the worker side (resident side didn't exist as a proposer yet).
UPDATE public.bookings
SET proposed_by_role = 'worker'
WHERE proposed_by IS NOT NULL
  AND proposed_by_role IS NULL;

NOTIFY pgrst, 'reload schema';
