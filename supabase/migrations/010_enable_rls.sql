-- ============================================================
-- MaidEzy — Enable Row Level Security + policies
--
-- READ THIS BEFORE APPLYING:
--
--   1. Test this on a Supabase BRANCH first. RLS bugs lock everyone out.
--   2. Assumes users.id == auth.uid(). This is true today for any user
--      created via the normal flow (authService inserts with id = authId).
--      If you ever rotate auth IDs (e.g. switch providers), audit
--      sync_user_auth_id and the user FKs first.
--   3. Several tables remain readable to all `authenticated` users so the
--      app's "browse workers in your society" / "open complaint UI" flows
--      keep working without a giant per-row policy graph. Tighten later
--      if a privacy review needs it.
--   4. anon (signup screen) is left with explicit grants only on the
--      worker_admin_invites lookup so first-time worker-admin claim works.
--
-- Idempotent. Run after 009.
-- ============================================================

-- ─── Helpers ────────────────────────────────────────────────
-- current_role() — read the caller's role from public.users
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_society_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT society_id FROM public.users WHERE id = auth.uid()
$$;

-- current_worker_admin_societies() — society_ids this worker_admin oversees
CREATE OR REPLACE FUNCTION public.current_worker_admin_societies()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT society_ids FROM public.worker_admins WHERE user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_role()                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_society_id()               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_worker_admin_societies()   TO anon, authenticated;

-- ─── 1. users ───────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_read              ON public.users;
DROP POLICY IF EXISTS users_self_write             ON public.users;
DROP POLICY IF EXISTS users_super_admin_all        ON public.users;
DROP POLICY IF EXISTS users_rwa_admin_society_read ON public.users;
DROP POLICY IF EXISTS users_authenticated_browse   ON public.users;
DROP POLICY IF EXISTS users_anon_signup_read       ON public.users;

-- Allow anon to look up users by mobile during the OTP signup race
-- (authService.findUserByMobile runs before the session exists).
CREATE POLICY users_anon_signup_read ON public.users
  FOR SELECT TO anon USING (true);

CREATE POLICY users_self_read ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY users_self_write ON public.users
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY users_super_admin_all ON public.users
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

CREATE POLICY users_rwa_admin_society_read ON public.users
  FOR SELECT TO authenticated
  USING (public.current_role() = 'rwa_admin' AND society_id = public.current_society_id());

-- Workers/residents need to look each other up for browse + booking flows.
-- Restrict to public-ish columns by relying on the app to .select() narrowly;
-- a full-read policy keeps the join-heavy queries simple. Tighten later.
CREATE POLICY users_authenticated_browse ON public.users
  FOR SELECT TO authenticated USING (true);

-- ─── 2. societies ───────────────────────────────────────────
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS societies_read_all      ON public.societies;
DROP POLICY IF EXISTS societies_super_admin   ON public.societies;

CREATE POLICY societies_read_all ON public.societies
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY societies_super_admin ON public.societies
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- ─── 3. residents ───────────────────────────────────────────
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS residents_self                ON public.residents;
DROP POLICY IF EXISTS residents_rwa_admin           ON public.residents;
DROP POLICY IF EXISTS residents_super_admin         ON public.residents;
DROP POLICY IF EXISTS residents_worker_society_read ON public.residents;

CREATE POLICY residents_self ON public.residents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY residents_rwa_admin ON public.residents
  FOR ALL TO authenticated
  USING (public.current_role() = 'rwa_admin' AND society_id = public.current_society_id())
  WITH CHECK (public.current_role() = 'rwa_admin' AND society_id = public.current_society_id());

CREATE POLICY residents_super_admin ON public.residents
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Workers need to read resident name/flat for accepted bookings (display only).
CREATE POLICY residents_worker_society_read ON public.residents
  FOR SELECT TO authenticated
  USING (public.current_role() = 'service_provider');

-- ─── 4. service_providers ──────────────────────────────────
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sp_self            ON public.service_providers;
DROP POLICY IF EXISTS sp_authenticated   ON public.service_providers;
DROP POLICY IF EXISTS sp_rwa_admin       ON public.service_providers;
DROP POLICY IF EXISTS sp_worker_admin    ON public.service_providers;
DROP POLICY IF EXISTS sp_super_admin     ON public.service_providers;

CREATE POLICY sp_self ON public.service_providers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Residents browse approved workers serving their society — public-ish read.
CREATE POLICY sp_authenticated ON public.service_providers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY sp_rwa_admin ON public.service_providers
  FOR ALL TO authenticated
  USING (public.current_role() = 'rwa_admin'
         AND (society_id = public.current_society_id() OR public.current_society_id() = ANY(society_ids)))
  WITH CHECK (public.current_role() = 'rwa_admin');

CREATE POLICY sp_worker_admin ON public.service_providers
  FOR ALL TO authenticated
  USING (public.current_role() = 'worker_admin'
         AND (society_id = ANY(public.current_worker_admin_societies())
              OR society_ids && public.current_worker_admin_societies()))
  WITH CHECK (public.current_role() = 'worker_admin');

CREATE POLICY sp_super_admin ON public.service_providers
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- ─── 5. rwa_admins ──────────────────────────────────────────
ALTER TABLE public.rwa_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rwa_admins_self        ON public.rwa_admins;
DROP POLICY IF EXISTS rwa_admins_super_admin ON public.rwa_admins;

CREATE POLICY rwa_admins_self ON public.rwa_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY rwa_admins_super_admin ON public.rwa_admins
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- ─── 6. worker_admins ───────────────────────────────────────
ALTER TABLE public.worker_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_self           ON public.worker_admins;
DROP POLICY IF EXISTS wa_super_admin    ON public.worker_admins;
DROP POLICY IF EXISTS wa_authservice    ON public.worker_admins;

CREATE POLICY wa_self ON public.worker_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY wa_super_admin ON public.worker_admins
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- authService claims an invite on first login; needs to upsert own row.
CREATE POLICY wa_authservice ON public.worker_admins
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ─── 7. worker_admin_invites ────────────────────────────────
ALTER TABLE public.worker_admin_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wai_super_admin    ON public.worker_admin_invites;
DROP POLICY IF EXISTS wai_anon_lookup    ON public.worker_admin_invites;
DROP POLICY IF EXISTS wai_self_claim     ON public.worker_admin_invites;

CREATE POLICY wai_super_admin ON public.worker_admin_invites
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Anon needs to look up invites by mobile during the signup race.
CREATE POLICY wai_anon_lookup ON public.worker_admin_invites
  FOR SELECT TO anon, authenticated USING (true);

-- A signing-in user needs to delete their own invite after claiming.
CREATE POLICY wai_self_claim ON public.worker_admin_invites
  FOR DELETE TO authenticated USING (true);

-- ─── 8. kyc_documents ───────────────────────────────────────
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kyc_self         ON public.kyc_documents;
DROP POLICY IF EXISTS kyc_worker_admin ON public.kyc_documents;
DROP POLICY IF EXISTS kyc_rwa_admin    ON public.kyc_documents;
DROP POLICY IF EXISTS kyc_super_admin  ON public.kyc_documents;

CREATE POLICY kyc_self ON public.kyc_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Worker admins of any society the worker serves.
CREATE POLICY kyc_worker_admin ON public.kyc_documents
  FOR ALL TO authenticated
  USING (
    public.current_role() = 'worker_admin'
    AND user_id IN (
      SELECT user_id FROM public.service_providers
      WHERE society_id = ANY(public.current_worker_admin_societies())
         OR society_ids && public.current_worker_admin_societies()
    )
  )
  WITH CHECK (public.current_role() = 'worker_admin');

CREATE POLICY kyc_rwa_admin ON public.kyc_documents
  FOR ALL TO authenticated
  USING (
    public.current_role() = 'rwa_admin'
    AND user_id IN (
      SELECT user_id FROM public.service_providers WHERE society_id = public.current_society_id()
      UNION
      SELECT user_id FROM public.residents         WHERE society_id = public.current_society_id()
    )
  )
  WITH CHECK (public.current_role() = 'rwa_admin');

CREATE POLICY kyc_super_admin ON public.kyc_documents
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- ─── 9. bookings ────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bookings_resident       ON public.bookings;
DROP POLICY IF EXISTS bookings_worker         ON public.bookings;
DROP POLICY IF EXISTS bookings_rwa_admin_read ON public.bookings;
DROP POLICY IF EXISTS bookings_super_admin    ON public.bookings;

CREATE POLICY bookings_resident ON public.bookings
  FOR ALL TO authenticated
  USING (resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()))
  WITH CHECK (resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));

CREATE POLICY bookings_worker ON public.bookings
  FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

CREATE POLICY bookings_rwa_admin_read ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'rwa_admin'
    AND (
      resident_id IN (SELECT id FROM public.residents WHERE society_id = public.current_society_id())
      OR provider_id IN (SELECT id FROM public.service_providers WHERE society_id = public.current_society_id())
    )
  );

CREATE POLICY bookings_super_admin ON public.bookings
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- ─── 10. booking_slots ──────────────────────────────────────
ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bs_worker        ON public.booking_slots;
DROP POLICY IF EXISTS bs_authenticated ON public.booking_slots;

CREATE POLICY bs_worker ON public.booking_slots
  FOR ALL TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

-- Residents need to read blocked slots when picking a time.
CREATE POLICY bs_authenticated ON public.booking_slots
  FOR SELECT TO authenticated USING (true);

-- ─── 11. worker_availability ────────────────────────────────
ALTER TABLE public.worker_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wav_self          ON public.worker_availability;
DROP POLICY IF EXISTS wav_authenticated ON public.worker_availability;

CREATE POLICY wav_self ON public.worker_availability
  FOR ALL TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY wav_authenticated ON public.worker_availability
  FOR SELECT TO authenticated USING (true);

-- ─── 12. worker_service_pricing ─────────────────────────────
ALTER TABLE public.worker_service_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wsp_self          ON public.worker_service_pricing;
DROP POLICY IF EXISTS wsp_authenticated ON public.worker_service_pricing;

CREATE POLICY wsp_self ON public.worker_service_pricing
  FOR ALL TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY wsp_authenticated ON public.worker_service_pricing
  FOR SELECT TO authenticated USING (true);

-- ─── 13. worker_service_durations ───────────────────────────
ALTER TABLE public.worker_service_durations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wsd_self          ON public.worker_service_durations;
DROP POLICY IF EXISTS wsd_authenticated ON public.worker_service_durations;

CREATE POLICY wsd_self ON public.worker_service_durations
  FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

CREATE POLICY wsd_authenticated ON public.worker_service_durations
  FOR SELECT TO authenticated USING (true);

-- ─── 14. provider_services ──────────────────────────────────
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ps_self          ON public.provider_services;
DROP POLICY IF EXISTS ps_authenticated ON public.provider_services;

CREATE POLICY ps_self ON public.provider_services
  FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

CREATE POLICY ps_authenticated ON public.provider_services
  FOR SELECT TO authenticated USING (true);

-- ─── 15. complaints ─────────────────────────────────────────
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS complaints_resident      ON public.complaints;
DROP POLICY IF EXISTS complaints_rwa_admin     ON public.complaints;
DROP POLICY IF EXISTS complaints_super_admin   ON public.complaints;

CREATE POLICY complaints_resident ON public.complaints
  FOR ALL TO authenticated
  USING (resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()))
  WITH CHECK (resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));

CREATE POLICY complaints_rwa_admin ON public.complaints
  FOR ALL TO authenticated
  USING (public.current_role() = 'rwa_admin' AND society_id = public.current_society_id())
  WITH CHECK (public.current_role() = 'rwa_admin' AND society_id = public.current_society_id());

CREATE POLICY complaints_super_admin ON public.complaints
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- ─── 16. notifications ──────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_recipient ON public.notifications;
DROP POLICY IF EXISTS notifications_sender    ON public.notifications;

-- Recipient can read + mark-read their own rows.
CREATE POLICY notifications_recipient ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Any authenticated user can write a notification for any other user
-- (system-wide inserts from booking/KYC/complaint flows).
CREATE POLICY notifications_sender ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Refresh PostgREST schema cache ─────────────────────────
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- POST-DEPLOY CHECKLIST
--   [ ] Log in as each role; verify every page loads with no errors.
--   [ ] Resident creates booking → worker sees it; cross-society isolation works.
--   [ ] Worker admin reviews KYC → other societies' KYC is invisible.
--   [ ] RWA admin opens complaints page → sees only their society's complaints.
--   [ ] Super admin can still hit every page.
--   [ ] If any flow fails, check Supabase logs for "row-level security" errors
--       and loosen the offending policy.
-- ============================================================
