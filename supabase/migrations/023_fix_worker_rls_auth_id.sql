-- ============================================================
-- MaidEzy — Fix worker RLS policies to resolve via auth_id
--
-- Background: service_provider accounts can be pre-created in
-- public.users with a UUID that differs from the Supabase auth
-- UID (auth.uid()). Migration 022 added users.auth_id and
-- authService now writes auth_id at login, but the RLS policies
-- on booking_slots and worker_availability still only check
-- worker_id = auth.uid(), which fails for these accounts.
--
-- Also fixes the current_role() / current_society_id() helpers
-- so policies that call them also work for pre-created workers.
--
-- Idempotent. Run after 022.
-- ============================================================

BEGIN;

-- ─── Helper functions ────────────────────────────────────────
-- Resolve the caller's public.users.id regardless of whether
-- auth.uid() matches users.id directly (resident/normal worker)
-- or via users.auth_id (pre-created service_provider).

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.users WHERE id       = auth.uid() LIMIT 1),
    (SELECT id FROM public.users WHERE auth_id  = auth.uid() LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = public.current_user_id()
$$;

CREATE OR REPLACE FUNCTION public.current_society_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT society_id FROM public.users WHERE id = public.current_user_id()
$$;

CREATE OR REPLACE FUNCTION public.current_worker_admin_societies()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT society_ids FROM public.worker_admins WHERE user_id = public.current_user_id()
$$;

GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon, authenticated;

-- ─── booking_slots ───────────────────────────────────────────

DROP POLICY IF EXISTS bs_worker ON public.booking_slots;

CREATE POLICY bs_worker ON public.booking_slots
  FOR ALL TO authenticated
  USING (
    worker_id = auth.uid()
    OR worker_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    worker_id = auth.uid()
    OR worker_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ─── worker_availability ─────────────────────────────────────

DROP POLICY IF EXISTS wav_self ON public.worker_availability;

CREATE POLICY wav_self ON public.worker_availability
  FOR ALL TO authenticated
  USING (
    worker_id = auth.uid()
    OR worker_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    worker_id = auth.uid()
    OR worker_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ─── users self-write ────────────────────────────────────────
-- Allow workers to write their own auth_id during login resolution.

DROP POLICY IF EXISTS users_self_write ON public.users;

CREATE POLICY users_self_write ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR auth_id = auth.uid()
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
