# SocietyServe — Project Tracker

> **Last Updated**: Session 2 — Phase 1 Project Setup Complete  
> **Current Phase**: Phase 2 — Authentication Module  
> **Next Task**: Auth UI — mobile number screen + OTP screen + bypass logic

---

## Legend

- ✅ Done
- 🔄 In Progress
- ⏳ Pending
- 🔒 Blocked

---

## Phase 0: Architecture & Planning ✅

| Task                       | Status | Notes                                |
| -------------------------- | ------ | ------------------------------------ |
| Requirements gathering     | ✅     | Completed in session 1               |
| Tech stack decision        | ✅     | React + Vite + Supabase + Tailwind   |
| Architecture design        | ✅     | Module-based, services layer pattern |
| Database schema design     | ✅     | 9 core tables defined                |
| Design system definition   | ✅     | Navy + Saffron, Sora + Nunito        |
| Auth strategy              | ✅     | Mobile OTP bypass mode               |
| MASTER_PROMPT.md created   | ✅     | Session continuity file              |
| PROJECT_TRACKER.md created | ✅     | This file                            |

---

## Phase 1: Project Setup ⏳

| Task                                      | Status | Notes                       |
| ----------------------------------------- | ------ | --------------------------- |
| Vite + React + TypeScript scaffold        | ✅     | Session 2                   |
| Tailwind SCSS v3 config                   | ✅     | Custom theme tokens         |
| Folder structure setup                    | ✅     | Per architecture doc        |
| Supabase project creation guide           | ⏳     | Manual step for user        |
| Supabase client setup (`lib/supabase.ts`) | ✅     | Session 2                   |
| Environment variables setup               | ✅     | `.env.example` created      |
| Base layout components                    | ⏳     | MobileLayout, DesktopLayout |
| React Router setup                        | ✅     | Role-based route guards     |
| Zustand store setup                       | ✅     | Auth store with persist     |
| Global type definitions                   | ✅     | `shared/types/index.ts`     |
| logo                                      | ⏳     | `images/logo/logo.png`      |

---

## Phase 2: Authentication Module ⏳

| Task                            | Status | Notes                       |
| ------------------------------- | ------ | --------------------------- |
| Auth UI — mobile number screen  | ⏳     |                             |
| Auth UI — OTP screen            | ⏳     |                             |
| Bypass OTP logic                | ⏳     | Any 6-digit code works      |
| Auth Zustand store              | ⏳     | user, role, isAuthenticated |
| Role-based redirect after login | ⏳     | 4 roles → 4 portals         |
| Protected route component       | ⏳     |                             |
| Logout flow                     | ⏳     |                             |

---

## Module 1: Super Admin ⏳

### Dashboard

| Task                                                  | Status | Notes |
| ----------------------------------------------------- | ------ | ----- |
| Super admin layout + sidebar                          | ⏳     |       |
| Stats cards (societies, admins, providers, residents) | ⏳     |       |
| Recent activity feed                                  | ⏳     |       |

### Society Management

| Task                          | Status | Notes                               |
| ----------------------------- | ------ | ----------------------------------- |
| Society list page             | ⏳     |                                     |
| Register society form         | ⏳     | Name, address, pincode, city, state |
| Assign RWA admin to society   | ⏳     |                                     |
| Society detail view           | ⏳     |                                     |
| Activate / deactivate society | ⏳     |                                     |

### Admin Management

| Task                        | Status | Notes |
| --------------------------- | ------ | ----- |
| Admin list page             | ⏳     |       |
| Invite / create admin       | ⏳     |       |
| View admin details          | ⏳     |       |
| Activate / deactivate admin | ⏳     |       |

### Reports

| Task                   | Status | Notes |
| ---------------------- | ------ | ----- |
| Society-wise stats     | ⏳     |       |
| Provider count by type | ⏳     |       |

---

## Module 2: RWA Admin ⏳

### Dashboard Tab

| Task                | Status | Notes |
| ------------------- | ------ | ----- |
| Summary cards       | ⏳     |       |
| Recent KYC requests | ⏳     |       |
| Recent complaints   | ⏳     |       |

### Residents Portal Tab

| Task                         | Status | Notes |
| ---------------------------- | ------ | ----- |
| Resident list                | ⏳     |       |
| Resident detail + KYC status | ⏳     |       |
| KYC approve/reject           | ⏳     |       |

### Service Portal Tab

| Task                             | Status | Notes |
| -------------------------------- | ------ | ----- |
| Provider list with filters       | ⏳     |       |
| Provider detail view             | ⏳     |       |
| KYC approve/reject for providers | ⏳     |       |
| Toggle provider availability     | ⏳     |       |

### Complaints Tab

| Task                             | Status | Notes |
| -------------------------------- | ------ | ----- |
| Complaint list                   | ⏳     |       |
| Complaint detail + status update | ⏳     |       |

### Settings Tab

| Task                 | Status | Notes |
| -------------------- | ------ | ----- |
| Society profile edit | ⏳     |       |
| Admin profile edit   | ⏳     |       |

---

## Module 3: Service Provider ⏳

| Task                | Status | Notes                               |
| ------------------- | ------ | ----------------------------------- |
| Onboarding flow     | ⏳     | Society select, name, service type  |
| Dashboard           | ⏳     | Today's bookings                    |
| KYC upload          | ⏳     | Aadhaar + selfie → Supabase Storage |
| Profile edit        | ⏳     | Timing, rate, services              |
| Availability toggle | ⏳     | On/off for the day                  |
| Booking history     | ⏳     |                                     |

---

## Module 4: Resident ⏳

| Task                             | Status | Notes                     |
| -------------------------------- | ------ | ------------------------- |
| Onboarding flow                  | ⏳     | Society, flat no, block   |
| Home screen — service categories | ⏳     |                           |
| Browse providers by category     | ⏳     |                           |
| Filter (rating, time, price)     | ⏳     |                           |
| Provider detail page             | ⏳     |                           |
| Booking flow                     | ⏳     | Date, time, confirm       |
| My Bookings                      | ⏳     | Upcoming, active, history |
| Cancel booking                   | ⏳     |                           |
| Raise complaint                  | ⏳     |                           |
| Track complaint                  | ⏳     |                           |
| My profile                       | ⏳     |                           |

---

## Database Migrations Log

| Migration                    | Status | Description |
| ---------------------------- | ------ | ----------- |
| 001_create_societies         | ⏳     |             |
| 002_create_users             | ⏳     |             |
| 003_create_rwa_admins        | ⏳     |             |
| 004_create_service_providers | ⏳     |             |
| 005_create_kyc_documents     | ⏳     |             |
| 006_create_residents         | ⏳     |             |
| 007_create_bookings          | ⏳     |             |
| 008_create_complaints        | ⏳     |             |
| 009_create_notifications     | ⏳     |             |

---

## Known Decisions & Trade-offs

| Decision                     | Reason                                               |
| ---------------------------- | ---------------------------------------------------- |
| Supabase over custom backend | Zero infra cost for startup; easy migration later    |
| OTP bypass mode              | No SMS provider yet; will swap to MSG91/Fast2SMS     |
| No Redux — using Zustand     | Simpler, less boilerplate, same power for this scale |
| PWA first, native app later  | Faster to market; share codebase                     |
| Single Supabase project      | Cost; can shard later                                |

---

## How to Resume Development

1. Open `MASTER_PROMPT.md` — paste into new AI session
2. Check this file for `🔄 In Progress` items — that's where we left off
3. Look at the "Next Task" at the top of this file
4. Continue — AI will follow the architecture without you re-explaining

---

## Session Log

| Session   | Date       | What Was Done                                                                 |
| --------- | ---------- | ----------------------------------------------------------------------------- |
| Session 1 | 2026-05-27 | Full architecture, tech stack, schema design, MASTER_PROMPT + tracker created |
| Session 2 | 2026-05-27 | Phase 1 complete: Vite+React+TS scaffold, Tailwind SCSS, Router, Zustand, Supabase client, types |
