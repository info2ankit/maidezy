-- Migration: allow same mobile to register as both Resident AND Service Provider.
-- Each (mobile, role) combination becomes its own users row with its own auth identity.
-- Admins (rwa_admin, worker_admin, super_admin) move to email+password and may keep
-- mobile NULL — the per-role uniqueness still holds for them.

BEGIN;

-- 1. Drop the legacy single-column uniqueness on mobile.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_mobile_key;

-- 2. Allow mobile to be NULL (admins authenticate via email).
ALTER TABLE public.users ALTER COLUMN mobile DROP NOT NULL;

-- 3. Add an email column for admin authentication. NULL for residents/workers.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key
  ON public.users(email)
  WHERE email IS NOT NULL;

-- 4. New uniqueness: one row per (mobile, role). Same mobile may now appear as
--    both 'resident' and 'service_provider', but not twice within a role.
CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_role_key
  ON public.users(mobile, role)
  WHERE mobile IS NOT NULL;

COMMIT;
