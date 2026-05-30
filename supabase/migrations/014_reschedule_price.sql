-- ============================================================
-- MaidEzy — Reschedule: include price in the proposal
--
-- Worker (or worker_admin / resident counter) can adjust the price
-- as part of a reschedule proposal. When the other side accepts,
-- proposed_price moves into total_price.
--
-- Idempotent. Run after 013.
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS proposed_price NUMERIC(10,2);

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_proposed_price_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_proposed_price_check
  CHECK (proposed_price IS NULL OR proposed_price > 0);

NOTIFY pgrst, 'reload schema';
