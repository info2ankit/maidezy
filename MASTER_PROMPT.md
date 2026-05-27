# SocietyServe — Master AI Session Prompt

> **Copy this entire prompt at the start of every new AI session to restore full context.**

---

## Project Identity

**App Name**: MaidEsy  
**Tagline**: "Your Society. Simplified."  
**Type**: Mobile-first Progressive Web App (PWA)  
**Domain**: Residential Society Service Marketplace (India)  
**Stage**: Early Startup — Cost-optimized, performance-first

---

## What We Are Building

A multi-portal web application for residential housing societies (RWAs) in India that connects:

- **Super Admin** → manages all societies, admins, and platform operations
- **RWA Admin** → manages their society, members, service providers, KYC approvals
- **Service Providers** → maids, cooks, drivers, car cleaners, home cleaners, laundry workers
- **Residents** → browse, filter, book, and manage service providers

Services offered: Maid, Cook, Driver, Car Cleaner, Home Cleaner, Laundry, and extensible to more.

---

## Tech Stack (Final Decisions)

| Layer    | Technology                | Reason                                                           |
| -------- | ------------------------- | ---------------------------------------------------------------- |
| Frontend | React 18 + Vite           | Fast HMR, PWA support, ecosystem                                 |
| Styling  | Tailwind SCSS v3          | User preference, utility-first, mobile-first                     |
| State    | Zustand                   | Lightweight, no boilerplate                                      |
| Routing  | React Router v6           | Industry standard                                                |
| Backend  | Supabase (BaaS)           | Free tier, Postgres, Auth, Storage, Realtime — zero infra cost   |
| Auth     | Supabase Auth (Phone OTP) | Mobile number only login; **BYPASS MODE** active (enter any OTP) |
| Storage  | Supabase Storage          | KYC docs (Aadhaar, photos)                                       |
| Hosting  | Vercel (free tier)        | CDN, zero-config deploy                                          |
| Forms    | React Hook Form + Zod     | Validation, clean code                                           |
| Icons    | Lucide React              | Consistent, tree-shakable                                        |

**Future scale path**: When traffic grows → move to dedicated Postgres + Redis + Node microservices. Supabase makes migration easy.

---

## Architecture Overview

```
src/
├── app/                    # App entry, providers, router
├── modules/
│   ├── super-admin/        # Super admin portal
│   ├── rwa-admin/          # RWA admin portal (multi-tab)
│   ├── service-provider/   # Maid/Cook/Driver portal
│   └── resident/           # Resident booking portal
├── shared/
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Supabase API calls (data layer)
│   ├── stores/             # Zustand stores
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Pure helper functions
├── lib/
│   └── supabase.ts         # Supabase client singleton
└── styles/
    └── index.scss           # Tailwind directives + global styles
```

**Principles**:
**Core Development Principles** : DRY, KISS, YAGNI, SOLID, separation of concerns.
**Coding Standards and Readability**: Meaningful Naming:, Self-Documenting Code, Consistent Formatting.
**Maintainability and Testing**: Small Functions, Continuous Refactoring, Test-Driven Development.
**other**: Services layer is pure async functions — no business logic in components.

**1. Project Architecture and Folder Structure**:
**a. App Router Structure**: Place route segments inside src/app/. Keep reusable components, hooks, and types in src/components/, src/hooks/, and src/types/ outside the app directory to prevent routing conflicts.
**Colocation**: Keep page-specific components, styles, or tests inside the same folder as the corresponding page.tsx. This keeps features modular and easy to find.
**b. Absolute Imports**: Configure tsconfig.json paths to use @/\* for root imports. This eliminates messy relative paths like ../../components/Button.
**2. Next.js App Router & React Core Best Practices**:
**a .Server Components by Default**: Use React Server Components (RSC) to fetch data directly on the server. This reduces client-side JavaScript bundles and improves performance.
**b. Client Component Boundaries**: Push the 'use client' directive as far down the component tree as possible. Use client components only for interactivity, local state (useState), or browser APIs.
**c. Optimal Fetching & Caching**: Use the native fetch API inside Server Components. Next.js automatically deduplicates requests and provides built-in caching mechanisms.
**Streaming and Suspense**: Wrap slow data-fetching components in React <Suspense> blocks. Provide lightweight skeleton loading states using loading.tsx files.
**d. Image Optimization**: Always use the Next.js <Image /> component. It automatically serves responsive WebP images and prevents Layout Shift (CLS).
**3. Tailwind CSS & UI Efficiency**:
**a. Semantic Component Abstraction**: Avoid repeating long Tailwind class strings. Abstract repetitive patterns into UI components (e.g., <Button>, <Card>) instead of using Tailwind’s @apply in CSS files.
**b. Dynamic Classes**: Never construct partial utility class names like text-${color}-500. Tailwind's static analyzer will not compile them. Use full class names inside a lookup object instead.
**c. Dynamic Class Merging**: Use clsx or tailwind-merge to conditionally combine classes without syntax errors or formatting collisions.
**d. Design System Design**: Customise colors, spacing, and animations globally in the tailwind.config.ts file instead of relying on arbitrary values like bg-[#123456].

---

## Design System

**Aesthetic**: Clean, trustworthy, Indian-market warmth. Deep navy + saffron accent. Card-based mobile UI.  
**Font**: Sora (headings) + Nunito (body) — Google Fonts  
**Primary**: `#1E3A5F` (deep navy)  
**Accent**: `#F97316` (saffron/orange)  
**Success**: `#10B981`  
**Danger**: `#EF4444`  
**BG**: `#F8FAFC`  
**Mobile-first**: All layouts designed for 375px+, scale up to desktop

---

## Auth Flow (Current: Bypass Mode)

1. User enters mobile number → click Send OTP
2. App shows OTP field (any 6-digit number works — bypass)
3. On verify → Supabase creates/fetches user → redirect by role
4. Roles: `super_admin` | `rwa_admin` | `service_provider` | `resident`

**SMS OTP** will be enabled later when SMS provider (MSG91/Fast2SMS) is integrated.

---

## Database Schema (Supabase Postgres)

### Tables

- `societies` — id, name, address, city, state, pincode, created_by (super_admin), status
- `users` — id (auth uid), mobile, name, role, society_id, avatar_url, is_active
- `rwa_admins` — user_id, society_id, designation, kyc_status
- `service_providers` — id, user_id, society_id, service_type, kyc_status, availability, timing_start, timing_end, rate, rating
- `kyc_documents` — id, user_id, aadhaar_url, photo_url, status (pending/approved/rejected), reviewed_by, reviewed_at
- `residents` — id, user_id, society_id, flat_no, block, kyc_status
- `bookings` — id, resident_id, provider_id, service_type, start_date, end_date, status, amount
- `complaints` — id, resident_id, society_id, title, description, status, created_at
- `notifications` — id, user_id, title, body, is_read, created_at

---

## Modules & Features

### Module 1: Super Admin ✅ IN PROGRESS

- Login (mobile OTP bypass)
- Dashboard: total societies, admins, providers, residents stats
- Society Management: Register society, assign RWA admin
- Admin Management: View/activate/deactivate admins
- Platform Reports: Society-wise analytics

### Module 2: RWA Admin (Pending)

**Tabs in portal:**

- **Dashboard** — member count, pending KYC, active services, recent complaints
- **Residents Portal** — list of residents, their flat details, KYC status
- **Service Portal** — list of service providers, KYC approval, status management
- **Complaints** — view and manage resident complaints
- **Settings** — society profile, admin profile

### Module 3: Service Provider (Pending)

- Login → onboarding → KYC upload
- Dashboard: today's bookings, earnings
- Profile: edit timing, services offered, rate, availability toggle
- KYC: upload Aadhaar + photo, track approval status
- Booking history

### Module 4: Resident (Pending)

- Login → society selection → onboarding
- Browse services by category (Maid, Cook, Driver, etc.)
- Filter: rating, availability, timing, price
- View provider profile → Book
- My Bookings: upcoming, active, history, cancel
- Complaints: raise and track
- My Profile + KYC

---

## Development Rules (Non-negotiable)

1. **One module at a time** — complete, test, then move on
2. **One feature at a time within a module**
3. **Services layer** — all Supabase calls in `src/shared/services/`. Never call Supabase from components directly.
4. **Types first** — define TypeScript interfaces before writing logic
5. **Component size** — if a component exceeds ~150 lines, split it
6. **Naming** — descriptive camelCase variables, PascalCase components, kebab-case files
7. **No hardcoded strings** — use constants files
8. **Mobile first** — every component designed for mobile, enhanced for desktop
9. **Update PROJECT_TRACKER.md** after every completed feature

---

## How to Continue a Session

1. Read `PROJECT_TRACKER.md` to see what's done and what's next
2. Read this `MASTER_PROMPT.md` for full context
3. Continue from the **"Next Task"** listed in the tracker
4. Follow the architecture and conventions above — no deviations

---

## File Locations

- `MASTER_PROMPT.md` — this file (full project context)
- `PROJECT_TRACKER.md` — feature-by-feature progress log
- Source code lives in the project repo (to be set up)
