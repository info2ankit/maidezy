# PROJECT_CONTEXT.md — Hyperlocal Services Marketplace (working title: TBD)

> **What this file is:** the complete brief for an India-first hyperlocal services
> marketplace, starting with domestic workers (maids) in housing societies. Any
> AI assistant or developer joining this project should read this file end-to-end
> before writing code, generating designs, or proposing changes.
>
> **How to use it:** treat the *decisions* as locked unless explicitly revisited.
> The "Open Decisions" section at the bottom lists what is still in flux.
>
> **Last updated:** initial brief. Update the changelog at the bottom on every revision.

---

## 1. Vision

A self-serve marketplace where residents of housing societies in India book
trusted domestic workers — initially maids, eventually cooks, drivers,
electricians, plumbers, and other home services. The platform replaces the
existing WhatsApp-group method of finding household help with a verified,
reviewable, reliable alternative.

**Growth model:** anyone can self-register their society. Workers serve multiple
nearby societies, creating a shared pool that becomes more valuable to every
society as more onboard. Network effects live in the worker pool, not in any
single society.

**North-star promise:** "trusted help for your home, vouched for by your
neighbors."

---

## 2. Product Overview

### Three constituencies

1. **Residents** (primary revenue/engagement driver) — mostly women aged
   25–65, mixed tech fluency. They book workers, leave reviews, pay (in cash
   or via the platform).
2. **Workers** (the constrained side of the marketplace) — often women aged
   25–55, low-end Android devices, may share a phone, often more comfortable
   in Hindi than English, frequently more comfortable in WhatsApp than apps.
3. **Society admins** (managers/RWA members) — verify workers in their
   society, manage their society's listing, may pay a subscription.

### What is being built

- A **mobile-first PWA** (single Next.js codebase serving all three personas
  via segmented routes).
- A **shared backend** (Supabase) with strict tenant isolation via Row Level
  Security.
- A **WhatsApp Business API integration** for worker-side notifications and
  confirmations — workers will not install a separate app early on.
- An **admin console** for society admins (web).
- Future (Phase 4+): native mobile via Expo, sharing code with the PWA.

### What is **not** being built

- Native iOS/Android apps in Phase 1.
- Microservices. The system is a **modular monolith** until proven otherwise.
- Payment processing in Phase 1 (cash flows offline, we only track status).
- A super-app. This is a focused vertical until it works.

---

## 3. Architecture

### 3.1 Pattern: modular monolith

A single Next.js application with clearly bounded modules. Each module owns
its data, its routes, its components. Modules communicate via well-defined
internal APIs (server actions / typed functions), not by reaching into each
other's tables.

**Modules:**

- `identity` — auth, users, roles, sessions
- `tenancy` — societies, society membership, society admin
- `directory` — workers, services, search, geographic visibility
- `verification` — KYC, endorsements, background checks, badges
- `bookings` — booking lifecycle, recurring sessions, state machine
- `reviews` — ratings, comments, society-tagged reputation
- `payments` — billing (Phase 2+), transaction tracking (Phase 1)
- `notifications` — WhatsApp, SMS, in-app, email
- `admin` — society admin tools, platform admin tools

**Rule:** if a feature spans modules, it goes through a service layer, never
direct database access across module boundaries.

### 3.2 Multi-tenancy: single database, RLS-enforced

- One Postgres database (Supabase).
- Every domain table has a `society_id` column.
- Supabase Row Level Security policies enforce isolation. A user can never
  see another society's data, even if application code has a bug.
- Workers are a partial exception (see section 6: Worker Mobility).

**Why this approach:** retrofitting multi-tenancy is brutal. We pay the small
upfront cost of designing for it from commit zero, even though MVP has one
society.

### 3.3 What we are explicitly avoiding

- **Microservices** — premature for this stage. The tax is high, the benefit
  is zero until we have load that justifies it.
- **Separate database per tenant** — operations nightmare, no real benefit.
- **Hardcoding "maid"** — the schema and code treat domestic workers as one
  `service_category`. Future categories (cook, driver, plumber, electrician)
  must require zero schema changes, only new rows.

---

## 4. Tech Stack

| Layer            | Choice                                          | Rationale                                                                 |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Frontend         | Next.js 14+ (App Router)                        | Founder familiarity; single codebase for residents/workers/admin via routes |
| Language         | TypeScript                                      | Type safety; founder familiarity                                          |
| Styling          | TailwindCSS                                     | Founder familiarity; fast iteration                                       |
| Auth             | Supabase Auth (phone OTP)                       | Phone OTP is non-negotiable in India                                      |
| Database         | Supabase Postgres + PostGIS                     | RLS for tenancy; PostGIS for geo radius queries                           |
| Storage          | Supabase Storage                                | KYC docs, profile photos                                                  |
| Realtime         | Supabase Realtime                               | Live booking status updates                                               |
| Server actions   | Next.js Server Actions / Supabase Edge Funcs    | Stay in-stack                                                             |
| Background jobs  | Vercel Cron + Supabase Edge Functions           | Reminders, recurring booking session generation, payouts                  |
| Notifications    | WhatsApp Business API (via Gupshup/Interakt)    | Workers live in WhatsApp                                                  |
| SMS fallback     | Twilio or MSG91                                 | For users without WhatsApp                                                |
| Payments (P2+)   | Razorpay (with Razorpay Routes when escrow on)  | UPI is mandatory in India                                                 |
| KYC              | DigiLocker / Karza / Hyperverge / IDfy          | Aadhaar verification, automatable                                         |
| Background check | AuthBridge or SpringVerify                      | Paid tier for premium verification                                        |
| Hosting          | Vercel                                          | Founder familiarity; Next.js native                                       |

### Required Postgres extensions

- `postgis` — geographic radius queries (required from day 1, even though
  MVP has one society)
- `pg_trgm` — fuzzy text search for worker names
- `uuid-ossp` — UUID generation

---

## 5. Domain Model

### 5.1 Tables (with key columns)

```
societies
  id (uuid, pk)
  name (text)
  address (text)
  pincode (text)
  location (geography(POINT)) -- PostGIS
  is_verified (boolean)
  created_by_user_id (uuid)
  subscription_status (enum: trial / active / past_due / cancelled)
  created_at, updated_at

users
  id (uuid, pk) -- supabase auth id
  phone (text, unique)
  full_name (text)
  email (text, optional)
  preferred_language (enum: en / hi)
  created_at, updated_at

user_roles
  user_id (uuid, fk)
  society_id (uuid, fk, nullable for super_admin)
  role (enum: resident / worker / society_admin / super_admin)
  -- a single user can have multiple rows (e.g., resident in society A,
  --   worker visible to society A and B, admin of society A)

service_categories
  id (uuid, pk)
  slug (text, unique) -- "maid", "cook", "driver", "electrician", "plumber"
  display_name (jsonb) -- {en: "Maid", hi: "मेड"}
  icon (text)
  is_active (boolean)
  sort_order (int)

worker_profiles
  id (uuid, pk)
  user_id (uuid, fk to users)
  home_location (geography(POINT))
  service_radius_km (int) -- how far this worker will travel
  bio (text)
  languages (text[])
  profile_photo_url (text)
  is_active (boolean)
  created_at, updated_at

worker_services
  id (uuid, pk)
  worker_profile_id (uuid, fk)
  service_category_id (uuid, fk)
  hourly_rate (int) -- in paise (₹100 = 10000)
  experience_years (int)

verification_status
  worker_profile_id (uuid, pk, fk)
  phone_verified_at (timestamp, nullable)
  id_verified_at (timestamp, nullable) -- DigiLocker / Karza success
  id_verification_provider (text)
  id_verification_ref (text) -- provider reference id
  background_check_at (timestamp, nullable)
  background_check_provider (text)
  background_check_ref (text)
  track_record_tier (int default 0) -- 0..n, auto-granted after thresholds
  updated_at

verification_audit_log
  id, worker_profile_id, event_type, event_data (jsonb), created_at

endorsements
  id (uuid, pk)
  worker_profile_id (uuid, fk)
  society_id (uuid, fk)
  endorsed_by_user_id (uuid, fk) -- must be society_admin of that society
  status (enum: endorsed / blocklisted)
  reason (text, nullable)
  created_at, updated_at

bookings
  id (uuid, pk)
  society_id (uuid, fk) -- tenant
  resident_user_id (uuid, fk)
  worker_profile_id (uuid, fk)
  service_category_id (uuid, fk)
  booking_type (enum: one_time / recurring_weekly / recurring_daily)
  recurrence_config (jsonb, nullable) -- {days_of_week: [1,3,5], start_time: "08:00", duration_min: 60}
  start_date (date)
  end_date (date, nullable for indefinite recurring)
  address_text (text)
  address_location (geography(POINT))
  special_instructions (text)
  status (enum: requested / confirmed / active / completed / cancelled / disputed)
  cancellation_reason (text, nullable)
  total_estimated_price (int) -- paise
  created_at, updated_at

booking_sessions
  id (uuid, pk)
  booking_id (uuid, fk)
  scheduled_at (timestamp)
  actual_start_at (timestamp, nullable)
  actual_end_at (timestamp, nullable)
  status (enum: scheduled / worker_confirmed / in_progress / completed / no_show / cancelled)
  payment_status (enum: pending / marked_paid_resident / confirmed_received_worker / disputed)
  price (int) -- paise

reviews
  id (uuid, pk)
  booking_id (uuid, fk)
  reviewer_user_id (uuid, fk) -- resident
  worker_profile_id (uuid, fk) -- denormalized for fast queries
  society_id (uuid, fk) -- the society where this review was earned
  rating (int 1-5)
  tags (text[]) -- ["punctual", "thorough", "friendly"]
  comment (text)
  created_at

incident_reports
  id (uuid, pk)
  reporter_user_id (uuid, fk)
  worker_profile_id (uuid, fk)
  booking_id (uuid, fk, nullable)
  category (enum: theft / harassment / damage / no_show / other)
  description (text)
  status (enum: reported / under_review / resolved / dismissed)
  freezes_worker (boolean) -- if true, worker is auto-hidden
  created_at, resolved_at

notifications
  id (uuid, pk)
  user_id (uuid, fk)
  channel (enum: whatsapp / sms / push / email / in_app)
  template_id (text)
  payload (jsonb)
  status (enum: pending / sent / delivered / read / failed)
  sent_at, delivered_at, read_at

payments (Phase 2+)
  id, user_id, society_id, type (subscription / booking / payout),
  amount, currency, gateway, gateway_ref, status, created_at
```

### 5.2 RLS policy patterns

Every domain table gets a base policy:

```sql
-- Residents see only their society's data
CREATE POLICY society_isolation_select
  ON {table_name} FOR SELECT
  USING (society_id IN (
    SELECT society_id FROM user_roles WHERE user_id = auth.uid()
  ));

-- Workers are visible across societies (handled separately, see Section 6)
```

Workers, worker_services, reviews need cross-society read policies — see
Section 6.

---

## 6. Worker Mobility & Network Effects (CRITICAL)

**This is the most important architectural decision in the project.** Workers
are not siloed to a single society. They are a shared pool with geographic
visibility.

### Rules

1. A worker has a **home location** (lat/lng) and a **service radius**.
2. A society has a lat/lng.
3. A worker is visible to a society if:
   `ST_DWithin(worker.home_location, society.location, worker.service_radius_km * 1000)`
   AND there is no `endorsements` row with `status = 'blocklisted'` for that
   worker+society.
4. A society admin can independently **endorse** workers (gives them a
   per-society verified badge) or **blocklist** them (hides them from that
   society's residents only).
5. Reviews are **global to a worker** but **tagged with the society** where
   they were earned. Worker detail screens show both: aggregate ("4.6 across
   38 bookings") and society-specific ("12 reviews from your society").

### Why this matters

If workers are siloed per society, the platform has no network effect — it's
N disconnected mini-apps. The moment a second society in the same
neighborhood onboards and instantly has access to the existing worker pool,
the platform becomes more valuable than the WhatsApp group it replaces.

### Cold start handling

When a new society self-registers, the home screen must show nearby workers
immediately (via the geo query), not an empty state. An empty home screen on
day one kills onboarding.

---

## 7. Trust & Verification System

A **progressive ladder**, not a binary gate. Workers earn higher tiers over
time; residents can filter by minimum tier.

### Tiers

| Tier | Name              | How earned                                       | Badge                |
| ---- | ----------------- | ------------------------------------------------ | -------------------- |
| 0    | New               | Phone OTP only                                   | "New on platform"    |
| 1    | ID Verified       | Aadhaar + selfie liveness (DigiLocker / Karza)   | "ID Verified"        |
| 2    | Society Endorsed  | At least one society admin endorsement          | "Endorsed by [name]" |
| 3    | Background Checked| Paid third-party check (AuthBridge etc.)        | "Police Verified"    |
| 4    | Track Record      | Auto-granted: ≥20 completed bookings, ≥4.5 avg  | "Top Rated"          |

### Key principle

The platform never depends on the founder personally verifying anyone. All
verification is either automated (KYC API), distributed (society admin
endorsement), paid third-party (background check), or earned (track record).

### Data shape

Verification is **not** a single boolean. Store independent flags with
timestamps and audit trail. Never display verification as a single binary —
always show which badges have been earned.

---

## 8. Money Flow Strategy

### Phase 1: platform stays out of money path

- Bookings happen in-app.
- Money moves offline between resident and worker (cash / UPI direct).
- The platform tracks payment status only: `marked_paid_resident`,
  `confirmed_received_worker`.
- No GST / TDS / marketplace compliance obligations.

### Phase 2: monetize the society, not the transaction

- Society subscription: ₹500–₹2,000/month.
- Buys: admin dashboard, branded experience, analytics, priority support,
  ability to endorse higher tiers, custom rules.
- Billed to the society admin, not residents or workers.

### Phase 3 (optional): escrow as a premium upgrade

- Razorpay Routes integration.
- Residents can opt into platform-routed payment for trust guarantees.
- Platform takes 5–10% commission.
- Cash-mode bookings continue to work in parallel. This is a **paid trust
  upgrade**, not a forced rail.

### Hard rule: never charge workers

Never charge workers for visibility, listing, or featured placement. They
are the constrained side of the marketplace and almost always cash-poor.
This rule is non-negotiable for both ethical and strategic reasons.

---

## 9. Communication & Notifications

### WhatsApp is a first-class UI

Workers will not install a separate app early on. WhatsApp Business API
(via Gupshup or Interakt) is the primary worker-facing surface for:

- New booking notifications ("New booking request from Sunita ji, Sector 56,
  tomorrow 8am, 2 hours, ₹400. Reply YES to accept.")
- Reminders ("Booking with Sunita ji starts in 1 hour")
- Cancellation notices
- Payment confirmations
- Weekly summaries

### Channel matrix

| Recipient   | Channel priority                             |
| ----------- | -------------------------------------------- |
| Resident    | Push (PWA) → In-app → SMS → WhatsApp         |
| Worker      | WhatsApp → SMS → Push (if PWA installed)     |
| Society admin| Email → In-app → WhatsApp                   |

### Implementation

- Notifications module exposes a single `send(userId, templateId, payload)`
  function.
- The module decides the channel based on user preferences and recipient
  type.
- All notifications are logged in `notifications` table with delivery status.
- Templates are versioned and bilingual (English + Hindi at minimum).

---

## 10. Booking State Machine

```
[draft] (optional, for save-as-you-go)
    ↓
[requested]  ← resident submits, waiting for worker
    ↓
[confirmed]  ← worker accepted via WhatsApp/app
    ↓
[active]     ← first session has started
    ↓
[completed]  ← end_date reached or marked complete
    ↓
[reviewable] (window of 7 days to leave review)

Branches at any point:
- [cancelled] (with cancellation_reason: resident_cancelled / worker_cancelled / no_show)
- [disputed]  (triggers incident_reports flow, may freeze worker)
```

For recurring bookings, `booking_sessions` has its own state machine per
visit:

```
[scheduled] → [worker_confirmed] → [in_progress] → [completed]
            → [no_show] / [cancelled]
```

A scheduled background job generates `booking_sessions` rows from the
parent booking's `recurrence_config` for the next N days.

---

## 11. Design Principles

### Visual direction

- **Mobile-first PWA**, 360–414px target viewport.
- **Trust signals are the hero** — verification badges, ratings, society
  endorsements, review counts must be prominent on every worker card.
- **Calm and reassuring**, not flashy. "Trustworthy neighborhood service,"
  not "tech startup hype."
- **Generous touch targets** (≥44px), 16px+ base font, high contrast for
  older readers.
- **Bilingual ready** — Hindi strings can be ~1.3× longer than English; UI
  must accommodate.
- **Indian context** — ₹ pricing, realistic Indian names, real sector/area
  names, no generic SaaS aesthetic.

### Component patterns

- Worker cards always show: photo, name, primary services, hourly rate,
  distance, rating + review count, top 3 verification badges (+ "more" link),
  "endorsed by your society" pill if applicable.
- Booking flow is 3 steps maximum: service+schedule → address+instructions →
  confirm. Never more.
- Empty states never look broken — for cold-start societies, show "Workers
  nearby" pulled from the geo radius even if zero workers are home-located
  in this exact society.

### Accessibility

- WCAG AA contrast at minimum.
- Screen reader labels on all icons and badges.
- Keyboard navigation on the admin console (residents/workers mostly touch).

---

## 12. Phased Delivery Plan

### Phase 1 — Single Society MVP (target: 4–6 weeks)

- One society, manually entered.
- Founder personally onboards first 5–10 workers (KYC manually verified).
- Resident PWA: discovery, worker detail, booking, my bookings, reviews.
- Worker WhatsApp flow: booking notifications, accept/decline, reminders.
- Cash-only money flow.
- No society admin role yet — founder acts as the admin.
- Goal: prove people will use it over their existing WhatsApp group.

### Phase 2 — Multi-Society Self-Service (8–10 weeks)

- Society self-registration with verification step (RWA letter / utility
  bill / N-resident approval).
- Society admin role + admin dashboard.
- Worker self-onboarding flow with KYC API (DigiLocker / Karza).
- Endorsement / blocklist tools for society admins.
- Society subscription billing (Razorpay subscription, not transaction).

### Phase 3 — Categories + Optional Escrow (8–10 weeks)

- Activate cook, driver, electrician, plumber service categories.
- Razorpay Routes for opt-in escrow + commission.
- Background check tier integration (AuthBridge / SpringVerify).
- Dispute resolution workflow.

### Phase 4 — Scale (ongoing)

- Native mobile app via Expo (sharing logic with PWA).
- Multi-city expansion.
- Analytics, recommendations, advanced search.
- Possible extraction of high-load modules to separate services.

---

## 13. Critical Decisions Made (with rationale)

| Decision                                          | Rationale                                                      |
| ------------------------------------------------- | -------------------------------------------------------------- |
| Modular monolith (not microservices)              | Premature optimization tax for current scale                   |
| Multi-tenant from commit zero                     | Retrofitting tenancy is brutal                                 |
| Shared worker pool across societies               | Network effects live here; siloed = no platform value          |
| WhatsApp as first-class worker UI                 | Workers won't install apps early on                            |
| Cash-flow stays offline in Phase 1                | Avoid GST/TDS/marketplace compliance until product proven       |
| Society pays subscription, not residents/workers   | Extract from B2B with budgets, not cash-poor workers           |
| Progressive verification ladder, not binary gate  | Scales without founder being bottleneck                        |
| ServiceCategory as first-class entity from day 1  | Future cook/driver/plumber require zero schema changes         |
| PostGIS from day 1, even with one society         | Geo queries are fundamental; can't bolt on later cleanly       |
| PWA before native app                             | Faster to ship; sufficient for India early-stage               |

---

## 14. Anti-Patterns (DO NOT)

- ❌ **Do not hardcode "maid" anywhere.** Use `service_category_id`. The
   first row in `service_categories` happens to be `slug = 'maid'`, but
   nothing in code should reference that slug.
- ❌ **Do not put money through the platform in Phase 1.** Track payment
   status; do not collect or disburse.
- ❌ **Do not charge workers** for visibility, listing, or featured
   placement, ever.
- ❌ **Do not silo workers per society.** Every architectural shortcut that
   does this destroys the network effect.
- ❌ **Do not introduce microservices** until at least one module's load
   demands extraction and the team agrees in writing.
- ❌ **Do not store verification as a single boolean.** Use independent flags
   per tier.
- ❌ **Do not bypass RLS** with service-role keys in user-facing code paths.
   Service role is for background jobs only.
- ❌ **Do not skip WhatsApp** for worker notifications. Sending app push only
   = workers don't get notified.
- ❌ **Do not ship without an incident reporting flow.** Even a basic
   "report → freeze worker → human review" must exist from day one.
- ❌ **Do not let society admins be self-declared without proof.** Spoofed
   societies will appear before scale does.
- ❌ **Do not optimize for a name.** Ship under any working name and rename
   later. Every successful Indian startup did this (Swiggy was Bundl, Meesho
   was Fashnear).

---

## 15. Recommended Folder Structure (Next.js App Router)

```
/app
  /(marketing)               # public landing, society discovery
    page.tsx
  /(resident)                # resident persona
    /home
    /workers/[id]
    /book
    /my-bookings
    /reviews
  /(worker)                  # worker persona (PWA, mostly redirects to WhatsApp)
    /profile
    /availability
  /(society-admin)           # society admin console
    /dashboard
    /workers
    /endorsements
    /settings
  /(platform-admin)          # super admin
    /societies
    /incidents
    /support
  /api                       # webhooks only (Razorpay, WhatsApp, KYC providers)
    /webhooks
      /razorpay/route.ts
      /whatsapp/route.ts
      /kyc/route.ts

/modules                     # the bounded contexts
  /identity
    /server                  # server-only logic, db queries
    /shared                  # types, schemas (zod)
    /ui                      # components used in app/ for this module
  /tenancy
  /directory
  /verification
  /bookings
  /reviews
  /payments
  /notifications
  /admin

/lib
  /db                        # supabase client setup
  /auth                      # supabase auth helpers
  /geo                       # PostGIS query helpers
  /i18n                      # bilingual string handling
  /utils

/components/ui               # shared design-system primitives
/styles                      # global tailwind config

/supabase
  /migrations                # numbered SQL migrations
  /seed                      # seed data including initial service_categories
  /functions                 # edge functions
```

**Module boundary rule:** code in `/modules/X/` may import from `/modules/Y/shared/`
(types/schemas) but never from `/modules/Y/server/` directly. Cross-module
behavior happens through service functions in `/modules/Y/server/index.ts`.

---

## 16. Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only, NEVER expose to client

# WhatsApp Business API (Gupshup / Interakt)
WHATSAPP_API_KEY=
WHATSAPP_API_URL=
WHATSAPP_BUSINESS_NUMBER=

# SMS fallback
MSG91_AUTH_KEY=
MSG91_SENDER_ID=

# KYC (Phase 2)
KARZA_API_KEY=
KARZA_API_URL=

# Background check (Phase 3)
AUTHBRIDGE_CLIENT_ID=
AUTHBRIDGE_CLIENT_SECRET=

# Payments (Phase 2+)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=
NODE_ENV=
```

---

## 17. Open Decisions (still in flux — do not assume)

These have **not** been finalized. Surface them when relevant, propose
options, do not silently pick one.

1. **Brand name and domain.** Working title only. Final brand will be
   decided before public launch.
2. **Society verification mechanism for self-registration.** Three
   candidates: RWA letter upload, utility bill at the address, or N-resident
   approval quorum. Likely a combination, but exact requirement TBD.
3. **Society admin selection on self-registration.** First-to-register
   becomes admin pending challenge, OR community vote, OR RWA proof. Default
   for now: first-to-register + a "challenge admin" mechanism if other
   residents dispute.
4. **Cold-start strategy details.** Empty societies need workers visible from
   nearby — but exact radius and ranking algorithm TBD.
5. **Incident SLA.** What's the response time commitment from platform when
   a theft/harassment is reported? Needs defining before launch.
6. **Pricing for society subscription.** ₹500–2,000/month range, exact tier
   structure TBD based on what societies will actually pay.
7. **Localization scope at launch.** English + Hindi confirmed. Tamil/Telugu/
   Bengali on the roadmap but exact timing TBD.

---

## 18. Glossary (India-specific terms)

- **Society / RWA (Resident Welfare Association)** — gated housing community,
  typically 50–500 households, managed by an elected resident committee.
- **Maid / Bai / Didi** — common terms for a domestic worker, usually female,
  handling cleaning/cooking/childcare.
- **PWA** — Progressive Web App; installable from browser without an app
  store.
- **KYC** — Know Your Customer; identity verification.
- **UPI** — Unified Payments Interface; India's dominant payment rail.
- **DigiLocker** — Government digital document wallet, used for Aadhaar
  verification.
- **Aadhaar** — India's 12-digit national ID.
- **Razorpay** — Dominant Indian payment gateway.
- **Razorpay Routes** — Razorpay's marketplace product for split payments /
  escrow.
- **GST** — Goods and Services Tax.
- **TDS 194-O** — Tax deduction at source for e-commerce / marketplace
  operators paying out to sellers.
- **MyGate / NoBrokerHood** — Existing competitors in the society-management
  space (not direct service marketplace competitors, but adjacent).

---

## 19. How to Use This Document with an AI Assistant

1. Paste this entire file as the **first message** in a new AI session.
2. Then state the specific task ("design the worker detail screen,"
   "write the bookings module's state machine in TypeScript," "draft the
   RLS policies for the bookings table").
3. Reference sections by number when correcting the AI ("Section 6 says
   workers are shared across societies — your code is siloing them, fix
   that").
4. When a decision changes, update this file and note the change in the
   changelog. Then re-share with the AI in future sessions.

---

## Changelog

| Date          | Author  | Change                                              |
| ------------- | ------- | --------------------------------------------------- |
| Initial draft | Founder + Claude | First version after architecture conversation |

---

*End of PROJECT_CONTEXT.md*
