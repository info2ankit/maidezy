-- ============================================================
-- MaidEzy — Booking reschedule (worker counter-proposes a different time)
--
-- Worker (or their worker_admin) can propose new arrival_time / days_of_week
-- instead of accepting outright. Resident then accepts (proposed becomes
-- actual + status = accepted) or declines (status = cancelled).
--
-- Idempotent. Run after 011.
-- ============================================================

-- ─── 1. New booking status ──────────────────────────────────
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'accepted',
    'reschedule_requested',
    'active',
    'completed',
    'rejected',
    'cancelled'
  ));

-- ─── 2. Proposal columns ────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS proposed_arrival_time TEXT,
  ADD COLUMN IF NOT EXISTS proposed_days_of_week TEXT[],
  ADD COLUMN IF NOT EXISTS proposed_note         TEXT,
  ADD COLUMN IF NOT EXISTS proposed_by           UUID REFERENCES public.users(id);

NOTIFY pgrst, 'reload schema';
