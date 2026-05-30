-- ============================================================
-- MaidEzy — Notifications: add type + deep-link
-- type lets us filter/group (booking, kyc, complaint, system).
-- link is a relative route to navigate on tap (e.g. "/resident/bookings").
-- Idempotent. Run after 008.
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS link TEXT;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('booking','kyc','complaint','system'));

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

GRANT ALL ON public.notifications TO anon, authenticated;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
