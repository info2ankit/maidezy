import { create } from 'zustand'
import type { BookingRequest } from '@/shared/types/worker.types'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import {
  getPendingBookingsForWorker,
  getActiveBookingsForWorker,
  acceptBooking as acceptBookingService,
  rejectBooking as rejectBookingService,
  proposeReschedule as proposeRescheduleService,
  withdrawReschedule as withdrawRescheduleService,
} from '@/shared/services/bookingService'

interface BookingStoreState {
  pendingRequests: BookingRequest[]
  activeBookings:  BookingRequest[]
  isLoading:       boolean
  error:           string | null
}

interface BookingStoreActions {
  fetchPendingRequests: (workerId: string) => Promise<void>
  fetchActiveBookings:  (workerId: string) => Promise<void>
  acceptBooking:        (bookingId: string, workerId: string) => Promise<void>
  rejectBooking:        (bookingId: string, workerId: string) => Promise<void>
  proposeReschedule:    (
    bookingId:        string,
    workerId:         string,
    proposedByUserId: string,
    proposedByRole:   'worker' | 'worker_admin' | 'resident',
    input:            { arrivalTime: string; daysOfWeek: WorkingDayId[]; note: string | null; price: number },
  ) => Promise<void>
  withdrawReschedule:   (bookingId: string) => Promise<void>
}

export const useBookingStore = create<BookingStoreState & BookingStoreActions>()((set) => ({
  pendingRequests: [],
  activeBookings:  [],
  isLoading:       false,
  error:           null,

  fetchPendingRequests: async (workerId) => {
    set({ isLoading: true, error: null })
    try {
      const data = await getPendingBookingsForWorker(workerId)
      set({ pendingRequests: data })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load requests' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchActiveBookings: async (workerId) => {
    set({ isLoading: true, error: null })
    try {
      const data = await getActiveBookingsForWorker(workerId)
      set({ activeBookings: data })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load bookings' })
    } finally {
      set({ isLoading: false })
    }
  },

  acceptBooking: async (bookingId, workerId) => {
    const updated = await acceptBookingService(bookingId, workerId)
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((r) => r.id !== bookingId),
      activeBookings:  [...s.activeBookings, updated],
    }))
  },

  rejectBooking: async (bookingId, workerId) => {
    await rejectBookingService(bookingId, workerId)
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((r) => r.id !== bookingId),
    }))
  },

  proposeReschedule: async (bookingId, workerId, proposedByUserId, proposedByRole, input) => {
    const updated = await proposeRescheduleService(bookingId, workerId, proposedByUserId, proposedByRole, input)
    set((s) => ({
      pendingRequests: s.pendingRequests.map((r) => r.id === bookingId ? updated : r),
    }))
  },

  withdrawReschedule: async (bookingId) => {
    const updated = await withdrawRescheduleService(bookingId)
    set((s) => ({
      pendingRequests: s.pendingRequests.map((r) => r.id === bookingId ? updated : r),
    }))
  },
}))
