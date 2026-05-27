-- ============================================================
-- MaidEzy — Initial Schema
-- Run this in Supabase: SQL Editor → New Query → paste → Run
-- ============================================================

-- ─── Societies ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.societies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  address    TEXT NOT NULL,
  city       TEXT NOT NULL,
  state      TEXT NOT NULL,
  pincode    TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users (mirrors auth.users, adds app-level profile) ──────
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mobile     TEXT NOT NULL UNIQUE,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'resident'
               CHECK (role IN ('super_admin', 'rwa_admin', 'service_provider', 'resident')),
  society_id UUID REFERENCES public.societies(id),
  avatar_url TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RWA Admins ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rwa_admins (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  society_id  UUID NOT NULL REFERENCES public.societies(id),
  designation TEXT,
  kyc_status  TEXT NOT NULL DEFAULT 'pending'
                CHECK (kyc_status IN ('pending', 'approved', 'rejected'))
);

-- ─── Service Providers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_providers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  society_id   UUID NOT NULL REFERENCES public.societies(id),
  service_type TEXT NOT NULL
                 CHECK (service_type IN ('maid','cook','driver','car_cleaner','home_cleaner','laundry')),
  kyc_status   TEXT NOT NULL DEFAULT 'pending'
                 CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  availability BOOLEAN NOT NULL DEFAULT TRUE,
  timing_start TIME,
  timing_end   TIME,
  rate         NUMERIC(10,2),
  rating       NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── KYC Documents ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  aadhaar_url TEXT,
  photo_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Residents ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.residents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  flat_no    TEXT NOT NULL,
  block      TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending'
               CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Bookings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  UUID NOT NULL REFERENCES public.residents(id),
  provider_id  UUID NOT NULL REFERENCES public.service_providers(id),
  service_type TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','active','completed','cancelled')),
  amount       NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Complaints ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id),
  society_id  UUID NOT NULL REFERENCES public.societies(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_mobile      ON public.users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_role        ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_society     ON public.users(society_id);
CREATE INDEX IF NOT EXISTS idx_sp_society        ON public.service_providers(society_id);
CREATE INDEX IF NOT EXISTS idx_sp_service_type   ON public.service_providers(service_type);
CREATE INDEX IF NOT EXISTS idx_bookings_resident ON public.bookings(resident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_society ON public.complaints(society_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- ─── RLS: disabled for development ───────────────────────────
-- TODO: Enable RLS + add role-based policies before production.
ALTER TABLE public.societies        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rwa_admins       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    DISABLE ROW LEVEL SECURITY;

-- ─── API role grants ─────────────────────────────────────────
-- Required for Supabase's REST API (PostgREST) to access tables.
-- Without these, you get: "permission denied for schema public" (42501).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- ─── Seed: super admin user ───────────────────────────────────
-- After running this SQL, log in via the app with your mobile number,
-- then run the query below (replace the mobile with yours) to grant super_admin role:
--
-- UPDATE public.users SET role = 'super_admin' WHERE mobile = '9899139053';
