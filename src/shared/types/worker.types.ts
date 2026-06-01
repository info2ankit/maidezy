import type { ServiceTypeId } from '@/shared/constants/serviceTypes'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

export type PricingMode = 'monthly' | 'per_visit'

export interface ServicePricing {
  serviceTypeId: ServiceTypeId
  monthlyRate:   number
  perVisitRate:  number
  isActive:      boolean
}

export interface WorkerShift {
  start: string  // '07:00'
  end:   string  // '12:00'
}

export interface WorkerAvailability {
  workerId:    string
  shifts:      WorkerShift[]
  workingDays: WorkingDayId[]
}

export interface WorkerProfile {
  id:            string
  userId:        string
  name:          string
  photoUrl:      string | null
  kycStatus:     'pending' | 'approved' | 'rejected'
  isActive:      boolean
  availability:  WorkerAvailability
  services:      ServicePricing[]
}

export interface TimeSlot {
  time:        string        // '07:00'
  isAvailable: boolean
  bookingId:   string | null
}

export interface BookingRequest {
  id:                  string
  residentId:          string
  residentName:        string
  residentFlatNo:      string
  residentBlock:       string
  residentMobile:      string
  societyName:         string
  /** The society this booking is FOR (booking_society_id ?? resident.society_id). */
  societyId:           string | null
  workerId:            string
  serviceTypeIds:      string[]
  arrivalTime:         string     // '07:00'
  daysOfWeek:          WorkingDayId[]
  pricingMode:         PricingMode
  totalPrice:          number
  status:              BookingStatus
  otpCode:             string
  proposedArrivalTime: string | null
  proposedDaysOfWeek:  WorkingDayId[] | null
  proposedNote:        string | null
  proposedPrice:       number | null
  proposedBy:          string | null
  proposedByRole:      'worker' | 'worker_admin' | 'resident' | null
  createdAt:           string
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'reschedule_requested'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'cancelled'
