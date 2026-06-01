-- ============================================================
-- MaidEzy — Soft delete convention
--
-- Adds `deleted_at TIMESTAMPTZ` columns to all tables that currently
-- support user-initiated DELETE. The application layer treats
--   `deleted_at IS NULL`  → live row
--   `deleted_at IS NOT NULL` → archived (hidden from queries, restorable)
--
-- This migration covers the tables that have user-facing delete actions:
--   1. resident_saved_addresses
--   2. worker_admin_invites
--
-- Other tables (workers, residents, bookings) already use status-based
-- archival (`status`, `is_active`, `removed_society_ids` etc) — those
-- patterns stay as-is.
--
-- Idempotent. Run after 017.
-- ============================================================

BEGIN;

-- 1. resident_saved_addresses ---------------------------------------------------
ALTER TABLE public.resident_saved_addresses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rsa_resident_live
  ON public.resident_saved_addresses (resident_id)
  WHERE deleted_at IS NULL;

-- 2. worker_admin_invites -------------------------------------------------------
ALTER TABLE public.worker_admin_invites
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wai_live
  ON public.worker_admin_invites (mobile)
  WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
