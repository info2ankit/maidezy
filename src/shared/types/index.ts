export type Role = 'super_admin' | 'rwa_admin' | 'worker_admin' | 'service_provider' | 'resident'

/**
 * pending   — no documents uploaded yet (red — worker hasn't started)
 * submitted — documents uploaded, awaiting internal review (yellow)
 * approved  — verified (green)
 * rejected  — documents rejected, must re-upload (red)
 */
export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected'

export type ServiceType =
  | 'maid'              // Full package: jhadu + pocha + bartan
  | 'jhadu_pocha'
  | 'bartan'
  | 'cooking_1_meal'
  | 'cooking_2_meals'
  | 'car_cleaning'
  | 'laundry'
  | 'deep_cleaning'
  | 'child_care'
  | 'elder_care'
  | 'driver'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'accepted'
  | 'reschedule_requested'
  | 'active'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type SocietyStatus = 'active' | 'inactive'

// ─── Database row types ───────────────────────────────────────────────────────

/**
 * Universal audit fields applied to every user-data table by migration 019.
 *
 * - `created_at` / `updated_at` are NOT NULL with DB defaults (NOW()).
 * - `created_by` / `updated_by` / `deleted_by` are NULL when the actor was
 *   the system / service role (e.g. signups before any auth context exists).
 * - `deleted_at` is the soft-delete marker. NULL → live row. Application
 *   code reads only live rows by default; auditors can query deleted ones.
 *
 * Use intersection (`& AuditFields`) on row types to keep TS aligned with the
 * DB shape. Don't add these to insert/update DTOs — the trigger sets them.
 */
export interface AuditFields {
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export interface Society extends AuditFields {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  status: SocietyStatus
}

export interface User extends AuditFields {
  id: string
  /** Supabase auth.uid() for admin accounts (auth identity differs from public.users.id). */
  auth_id: string | null
  mobile: string
  name: string | null
  role: Role
  society_id: string | null
  avatar_url: string | null
  is_active: boolean
}

export interface RwaAdmin extends AuditFields {
  user_id: string
  society_id: string
  designation: string | null
  kyc_status: KycStatus
}

export interface AvailabilitySlot {
  start: string  // "HH:MM" 24-hour
  end:   string  // "HH:MM" 24-hour
}

export interface ProviderService extends AuditFields {
  id: string
  provider_id: string
  service_type: ServiceType
  per_visit_rate: number | null
  monthly_rate: number | null

  // ─── Wizard pricing dimensions (added in v0.4) ──────────────────────────────
  // Nullable so legacy rows (one-rate-per-service) keep working.
  // Wizard writes one row per (service, home_size) for regular services,
  // or one row per (service='cooking', family_size, meals_count) for cooking.
  home_size:    'small' | 'medium' | 'large' | null
  family_size:  'small' | 'medium' | 'large' | null
  meals_count:  1 | 2 | null
}

export interface ServiceProvider extends AuditFields {
  id: string
  user_id: string
  /** @deprecated kept for back-compat; new code uses society_ids */
  society_id: string | null
  /** Societies this worker serves. Wizard writes this; legacy code may still mirror society_id. */
  society_ids: string[]
  /** Societies the worker was removed from by a Worker Admin (restorable history). */
  removed_society_ids: string[]
  kyc_status: KycStatus
  availability: boolean
  availability_slots: AvailabilitySlot[]
  rating: number

  // ─── Worker onboarding wizard fields (added in v0.4) ────────────────────────
  // All nullable so existing rows created before the wizard remain valid.
  home_size_preference: ('small' | 'medium' | 'large')[] | null
  cooking_max_family:   'small' | 'medium' | 'large' | null
  cooking_max_meals:    1 | 2 | null
  buffer_minutes:       15 | 30 | 45 | null
  max_bookings_per_day: 2 | 3 | 4 | 5 | null
  gender:  'male' | 'female' | 'other' | null
  address: string | null
}

// Provider row joined with its services — what most UI consumes
export type ProviderWithServices = ServiceProvider & {
  services: ProviderService[]
}

export interface KycDocument extends AuditFields {
  id: string
  user_id: string
  aadhaar_url: string | null
  photo_url: string | null
  status: KycStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_notes: string | null
}

export interface Resident extends AuditFields {
  id: string
  user_id: string
  society_id: string
  flat_no: string
  block: string | null
  kyc_status: KycStatus
}

export interface Booking extends AuditFields {
  id: string
  resident_id: string
  provider_id: string
  service_type: ServiceType | null
  service_type_ids: string[]
  start_date: string | null
  end_date: string | null
  arrival_time: string | null
  days_of_week: string[]
  pricing_mode: 'monthly' | 'per_visit' | null
  total_price: number | null
  status: BookingStatus
  amount: number | null
  otp_code: string | null
}

export interface Complaint extends AuditFields {
  id: string
  resident_id: string
  society_id: string
  title: string
  description: string
  status: ComplaintStatus
}

export interface ResidentSavedAddress extends AuditFields {
  id: string
  resident_id: string
  label: string
  society_id: string | null
  society_name: string
  address_type: 'browse_visit' | 'previous_home'
  city: string
  pincode: string | null
  flat_no: string | null
  block: string | null
}

export interface Notification extends AuditFields {
  id: string
  user_id: string
  title: string
  body: string
  is_read: boolean
}

// ─── UI helper types ──────────────────────────────────────────────────────────

export interface SelectOption<T extends string = string> {
  label: string
  value: T
}

export interface ApiError {
  message: string
  code?: string
}
