# Deploy Readiness Tracker

Audit date: 2026-05-29.

Live log of what's shipped, what's left, and the plan for each remaining item. New audit findings go under a new "Audit YYYY-MM-DD" heading at the top — older entries stay as the trail.

---

## ✅ Shipped (pass 2 — 2026-05-29 PM)

### Notifications module (in-app)
- Schema: `supabase/migrations/009_notifications_metadata.sql` adds `type` + `link` columns, type CHECK enum, and an unread-first index.
- Service: [src/shared/services/notificationService.ts](src/shared/services/notificationService.ts) — `createNotification`, `fetchInbox`, `fetchUnreadCount`, `markRead`, `markAllRead`.
- Hook: [src/shared/hooks/useNotifications.ts](src/shared/hooks/useNotifications.ts) — subscribes to `notifications` table via Supabase realtime for the current user, optimistic mark-read.
- UI: [src/shared/components/NotificationsInbox.tsx](src/shared/components/NotificationsInbox.tsx) bottom sheet (relative time, per-type icon, tap-through deep-link) + [NotificationsBell.tsx](src/shared/components/NotificationsBell.tsx) with `light`/`dark` variants.
- Wired into all 5 portals: SuperAdmin, RwaAdmin, WorkerAdmin, ServiceProvider (top bar), Resident (gradient header).
- Wired into flows:
  - Resident creates booking → worker notified (bookingService.ts).
  - Worker accepts/rejects booking → resident notified.
  - Resident cancels booking → worker notified (residentPortalService.ts).
  - Worker submits KYC → all worker_admins + RWA admins of the worker's societies notified (kycService.ts).
  - Worker_admin approves/rejects KYC → worker notified with reason (workerAdminService.ts).
  - Resident files complaint → RWA admins of that society notified.
  - RWA admin updates complaint status → resident notified.

### Resident complaints UI
- Service additions: `createComplaint`, `fetchComplaintsByResident`, plus notifier hooks on status change ([complaintService.ts](src/shared/services/complaintService.ts)).
- Page: [src/modules/resident/pages/ResidentComplaintsPage.tsx](src/modules/resident/pages/ResidentComplaintsPage.tsx) — list with status pills, file-new button, error surface.
- Modal: [src/modules/resident/components/ComplaintFormModal.tsx](src/modules/resident/components/ComplaintFormModal.tsx) — bottom sheet with title (80 char) + description (500 char) + submit-disabled until valid.
- 4th tab "Complaints" in [ResidentLayout.tsx](src/modules/resident/ResidentLayout.tsx) bottom nav.

### KYC rejection UX
- [src/shared/types/index.ts](src/shared/types/index.ts) — `KycDocument` adds `rejection_notes: string | null`.
- [src/modules/service-provider/pages/KycPage.tsx](src/modules/service-provider/pages/KycPage.tsx) — when `provider.kyc_status === 'rejected'`, shows a danger-toned banner with the reason from `kyc_documents.rejection_notes` and a re-upload prompt. Falls back to a generic message if no notes were saved.
- Notification already wired in pass-2 above.

### Real platform reports
- [src/shared/services/dashboardService.ts](src/shared/services/dashboardService.ts) — added `fetchPlatformReports()` returning booking totals by status, 7-day booking count, platform-wide pending KYC + open complaints, and per-society breakdown.
- [src/modules/super-admin/pages/ReportsPage.tsx](src/modules/super-admin/pages/ReportsPage.tsx) — fully built: bookings tiles, attention tiles, per-society table. Replaces the "coming soon" placeholder.

### Vercel SPA fallback
- [vercel.json](vercel.json) — single rewrite to `/index.html` so deep-link refresh works.

### .env audit
- `.env.example` already lists every `VITE_*` actually read by the code (Supabase URL/anon key, Firebase API key / auth domain / project ID / app ID, app name/env). No drift.
- `.env` confirmed gitignored — only `.env.example` is tracked.

### RLS-on migration (draft, ready to apply on a branch)
- [supabase/migrations/010_enable_rls.sql](supabase/migrations/010_enable_rls.sql).
- Adds three `SECURITY DEFINER` helpers: `current_role()`, `current_society_id()`, `current_worker_admin_societies()`.
- Enables RLS + policies on 16 tables covering self-access, role-based access (super_admin / rwa_admin / worker_admin / service_provider / resident), cross-role browse where the app needs it (workers, societies), and anon access for the signup-race lookups (`users` by mobile, `worker_admin_invites` claim).
- File ends with a POST-DEPLOY CHECKLIST so the rollout has a defined acceptance test.

### Verified already implemented (no work needed)
- Super-admin → RWA admin assignment UI: [AdminsPage.tsx](src/modules/super-admin/pages/AdminsPage.tsx) already has "Assign Admin" wired via [AssignAdminModal.tsx](src/modules/super-admin/components/AssignAdminModal.tsx) using `assignAsRwaAdmin`.
- Super-admin dashboard counts and RWA dashboard counts: already pulled from real Supabase counts via `fetchSuperAdminStats` and `fetchRwaDashboardStats`. Audit had flagged them as placeholders but the code was already real.

`npx tsc --noEmit` passes clean after all changes.

---

## ✅ Shipped (pass 1 — 2026-05-29 AM)

### Schema (consolidated migration)
[supabase/migrations/008_consolidated_schema_fix.sql](supabase/migrations/008_consolidated_schema_fix.sql) — idempotent. Adds `worker_admin` to `users.role`, bookings columns + extended status enum, `kyc_documents.rejection_notes`, creates `worker_service_pricing` / `worker_availability` / `booking_slots` / `worker_admin_invites` / `worker_admins`, declares `sync_user_auth_id` as a documented no-op.

### Code drift
- [src/shared/types/index.ts](src/shared/types/index.ts) — `BookingStatus` includes `accepted`/`rejected`; `Booking` interface has the new columns.
- [src/modules/service-provider/pages/BookingsPage.tsx](src/modules/service-provider/pages/BookingsPage.tsx) — worker bookings page falls back to `total_price`, handles null `start_date`, accepts new statuses in filters + badges.
- [src/modules/resident/ResidentLayout.tsx](src/modules/resident/ResidentLayout.tsx) — pending-count fetch logs errors instead of swallowing silently.
- [src/shared/components/ErrorBoundary.tsx](src/shared/components/ErrorBoundary.tsx) + [src/main.tsx](src/main.tsx) — tree-root error boundary with reload.

---

## 🟡 Pending — small fixes before production deploy

### PWA icons
Still needed: drop two PNGs at `public/icon-192.png` and `public/icon-512.png` (and `public/apple-touch-icon.png` 180×180 if you want iOS home-screen). Manifest at [vite.config.ts:18](vite.config.ts#L18) references these. Build still succeeds without them; PWA install prompt and Lighthouse installability audit will fail. **Requires a design asset — no code change.**

### Auth ID rotation (RPC currently no-op) — **HARD BLOCKER for RLS**
[supabase/migrations/008_consolidated_schema_fix.sql:122](supabase/migrations/008_consolidated_schema_fix.sql#L122) — `sync_user_auth_id` is a deliberate no-op. And [authService.ts:121](src/shared/services/authService.ts#L121) currently returns the *stored* `users.id`, not `authId`, to keep dev working with RLS off.

The day RLS is enabled (migration 010), policies that compare `auth.uid() = users.id` will silently return `[]` for every user whose Firebase UID drifted from their stored `users.id` — exact same symptom as the dev "blank worker portal" bug, but in production.

**Two paths to fix before applying 010**:

**A. Rotate IDs (recommended)**
1. New migration: add `ON UPDATE CASCADE` to every FK pointing at `users.id` (rwa_admins, residents, service_providers, kyc_documents, worker_admins, worker_service_pricing, worker_availability, booking_slots, notifications, plus residents-mediated complaints).
2. Replace `sync_user_auth_id` body with: `UPDATE public.users SET id = p_new_id WHERE mobile = p_mobile AND id <> p_new_id;`
3. Restore `authService.ts:121` to `return { ...byMobile, id: authId } as User`.
4. Then apply 010.

**B. Match on mobile via JWT** (less invasive)
- Rewrite 010 policies to use `auth.jwt() ->> 'phone'` against `users.mobile`.
- Couples RLS to Firebase JWT shape; survives no auth provider change.

Until one of these lands, do not flip RLS on in production.

### Apply migration 010 + acceptance test
The RLS migration is *drafted*, not applied. Test on a Supabase branch first. Use the checklist at the bottom of the file (log in as each of the 5 roles, walk every page, verify cross-society isolation). Tighten or loosen specific policies based on what you see.

**Watch for inconsistent state**: an earlier dev session left some tables with `rowsecurity = true` and no permissive policy, which silently returns `[]` on every read (looked like missing data to the worker portal). Check state with:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

For dev, all should be `false`. For production, all should be `true` *with policies from migration 010 applied*. Half-state is what bites.

---

## ⚪ Forgotten features — deferred

### Booking completion lifecycle
Bookings can move `pending → accepted → active` but never auto-transition to `completed`. The OTP-verify-on-arrival flow is the natural completion trigger, but **deferred per your testing constraint** (Firebase OTP only). When ready:
- Add a "Complete visit" button on the worker booking detail.
- `bookingService.completeBooking(bookingId, otp)` validates `otp_code` and sets `status = 'completed'`.
- Notify resident of completion (reuse `notifyResidentOfBookingDecision`).

### "Dev mode" auth copy
[src/locales/en/auth.json:18](src/locales/en/auth.json#L18) and the Hindi equivalent still say "Dev mode — any 6-digit OTP works". Update both strings when Firebase phone auth goes live. **Tied to the OTP flow — deferred.**

### FCM web push (optional)
`firebase` is in `package.json` but no FCM token is registered. If you want push notifications outside the tab:
1. Register a service worker (`public/firebase-messaging-sw.js`).
2. Call `getToken()` on App mount and store the result in a new `users.fcm_token` column.
3. Have a Supabase edge function fire on `notifications` insert and push via FCM REST API.

Not blocking — in-app inbox + realtime is enough for v1.

### Bigger reports
The platform Reports page now has booking totals and per-society breakdown. If you want trends (line chart of bookings/week, KYC throughput, RWA admin activity), add aggregated queries and a charting library (`recharts` is the usual pick).

---

## How to use this file

- When something lands, move it from 🟡 to the "Shipped (pass N)" section with the date.
- New audit findings go under a new "Audit YYYY-MM-DD" heading at the top of this file. Don't rewrite older entries — the trail makes regressions easier to spot.
- Each remaining bullet has the file paths it touches; pick any one up by opening the listed files.
