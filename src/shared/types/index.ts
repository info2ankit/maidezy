export type Role = 'super_admin' | 'rwa_admin' | 'service_provider' | 'resident'

export type KycStatus = 'pending' | 'approved' | 'rejected'

export type ServiceType = 'maid' | 'cook' | 'driver' | 'car_cleaner' | 'home_cleaner' | 'laundry'

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type SocietyStatus = 'active' | 'inactive'

// ─── Database row types ───────────────────────────────────────────────────────

export interface Society {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  created_by: string
  status: SocietyStatus
  created_at: string
}

export interface User {
  id: string
  mobile: string
  name: string | null
  role: Role
  society_id: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface RwaAdmin {
  user_id: string
  society_id: string
  designation: string | null
  kyc_status: KycStatus
}

export interface ServiceProvider {
  id: string
  user_id: string
  society_id: string
  service_type: ServiceType
  kyc_status: KycStatus
  availability: boolean
  timing_start: string | null
  timing_end: string | null
  rate: number | null
  rating: number
}

export interface KycDocument {
  id: string
  user_id: string
  aadhaar_url: string | null
  photo_url: string | null
  status: KycStatus
  reviewed_by: string | null
  reviewed_at: string | null
}

export interface Resident {
  id: string
  user_id: string
  society_id: string
  flat_no: string
  block: string | null
  kyc_status: KycStatus
}

export interface Booking {
  id: string
  resident_id: string
  provider_id: string
  service_type: ServiceType
  start_date: string
  end_date: string | null
  status: BookingStatus
  amount: number | null
  created_at: string
}

export interface Complaint {
  id: string
  resident_id: string
  society_id: string
  title: string
  description: string
  status: ComplaintStatus
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  is_read: boolean
  created_at: string
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
