-- ============================================================
-- MaidEzy — Push notification subscriptions
--
-- Stores one row per (user, device) where the user has opted into
-- push notifications. The `token` is an FCM registration token
-- issued by Firebase to that device.
--
-- A user can have multiple rows (phone + desktop + tablet etc).
-- A token can rotate / become invalid; the edge function cleans up
-- stale tokens when FCM returns NOT_REGISTERED.
--
-- Schema follows the project's standard audit pattern (migration 019).
--
-- Idempotent. Run after 019.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  user_agent  TEXT,
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per device (token). If a user re-grants permission on the
-- same device, we update last_seen rather than duplicating.
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_subscriptions_token
  ON public.push_subscriptions (token);

-- Standard audit fields + trigger (adds deleted_at, etc.)
-- Must run BEFORE any index that references deleted_at.
SELECT public.apply_audit_fields('public.push_subscriptions');

-- Fast lookup: "all live tokens for this user"
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_live
  ON public.push_subscriptions (user_id, last_seen DESC)
  WHERE deleted_at IS NULL;

-- ─── RLS ─────────────────────────────────────────────────────
-- A user can manage their own subscriptions. The edge function
-- (running with the service role key) can read everyone's.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ps_self ON public.push_subscriptions;
CREATE POLICY ps_self ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';

COMMIT;
