-- ============================================================
-- MaidEzy — Society-scoped worker activation
--
-- Lets a Worker Admin remove / restore a worker from a single society
-- without touching the worker's global is_active or other societies.
--
-- Adds:
--   1. service_providers.removed_society_ids  — UUID[] history of societies
--      the worker was removed from (restorable).
--   2. worker_society_actions table           — audit log of every
--      remove/restore action with admin, society, reason, timestamp.
--
-- Idempotent. Run after 015.
-- ============================================================

BEGIN;

-- 1. Track removed societies (history; restorable) ------------------------------
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS removed_society_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

CREATE INDEX IF NOT EXISTS idx_sp_removed_society_ids_gin
  ON public.service_providers USING GIN (removed_society_ids);

-- 2. Audit log ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_society_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  society_id  UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES public.users(id)     ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN ('removed', 'restored')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wsa_worker_society
  ON public.worker_society_actions (worker_id, society_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wsa_admin
  ON public.worker_society_actions (admin_id, created_at DESC);

-- Match the project's current RLS posture (other admin-managed tables are
-- explicitly disabled; auth is enforced at the service layer).
ALTER TABLE public.worker_society_actions DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

COMMIT;
