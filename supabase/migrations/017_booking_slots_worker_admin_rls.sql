-- ============================================================
-- MaidEzy — Worker Admin can write booking_slots on behalf of
-- workers in societies they manage.
--
-- Background: the previous policy (010_enable_rls.sql, `bs_worker`)
-- only allowed `worker_id = auth.uid()`. When a Worker Admin
-- accepts/rejects a booking, the insert into booking_slots is done
-- under the admin's auth, not the worker's — so the policy blocked it.
--
-- This migration adds a second policy `bs_worker_admin` that allows
-- a Worker Admin to INSERT / UPDATE / DELETE booking_slots whose
-- worker_id belongs to a service_provider serving ANY society the
-- admin manages. Reads stay covered by the existing `bs_authenticated`
-- SELECT policy.
--
-- Idempotent. Run after 016.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS bs_worker_admin ON public.booking_slots;

CREATE POLICY bs_worker_admin ON public.booking_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.worker_admins wa
      JOIN public.service_providers sp ON sp.user_id = booking_slots.worker_id
      WHERE wa.user_id = auth.uid()
        AND sp.society_ids && wa.society_ids
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.worker_admins wa
      JOIN public.service_providers sp ON sp.user_id = booking_slots.worker_id
      WHERE wa.user_id = auth.uid()
        AND sp.society_ids && wa.society_ids
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
