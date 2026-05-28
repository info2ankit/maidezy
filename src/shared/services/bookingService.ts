import { supabase } from '@/lib/supabase'
import type { Booking, Resident, User } from '@/shared/types'
import type { BookingRequest, PricingMode } from '@/shared/types/worker.types'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

// ─── Legacy booking helpers (used by dashboard and booking history) ───────────

export type BookingWithResident = Booking & {
  resident: Resident & { user: User }
}

export async function fetchBookingsByProvider(providerId: string): Promise<BookingWithResident[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, resident:residents!bookings_resident_id_fkey(*, user:users!residents_user_id_fkey(*))')
    .eq('provider_id', providerId)
    .order('start_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as BookingWithResident[]
}

export async function fetchTodayBookings(providerId: string): Promise<BookingWithResident[]> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('bookings')
    .select('*, resident:residents!bookings_resident_id_fkey(*, user:users!residents_user_id_fkey(*))')
    .eq('provider_id', providerId)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .in('status', ['confirmed', 'active'])

  if (error) throw new Error(error.message)
  return (data ?? []) as BookingWithResident[]
}

// ─── New booking request flow ─────────────────────────────────────────────────

export async function createBookingRequest(data: {
  residentId:     string
  workerId:       string
  serviceTypeIds: string[]
  arrivalTime:    string
  daysOfWeek:     WorkingDayId[]
  pricingMode:    PricingMode
  totalPrice:     number
}): Promise<BookingRequest> {
  const otpCode = String(Math.floor(100000 + Math.random() * 900000))

  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      resident_id:      data.residentId,
      worker_id:        data.workerId,
      service_type_ids: data.serviceTypeIds,
      arrival_time:     data.arrivalTime,
      days_of_week:     data.daysOfWeek,
      pricing_mode:     data.pricingMode,
      total_price:      data.totalPrice,
      status:           'pending',
      otp_code:         otpCode,
    })
    .select()
    .single()

  if (error || !row) throw new Error(error?.message ?? 'Failed to create booking')
  return mapBookingRow(row)
}

export async function acceptBooking(
  bookingId: string,
  workerId:  string,
): Promise<BookingRequest> {
  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('worker_id', workerId)
    .single()

  if (fetchErr || !booking) throw new Error('Booking not found')

  const { data: updated, error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'accepted' })
    .eq('id', bookingId)
    .select()
    .single()

  if (updateErr || !updated) throw new Error(updateErr?.message ?? 'Failed to accept booking')

  // Block the slot for each day
  const slotRows = (booking.days_of_week as WorkingDayId[]).map((day) => ({
    worker_id:   workerId,
    booking_id:  bookingId,
    slot_time:   booking.arrival_time,
    day_of_week: day,
    is_blocked:  true,
  }))

  if (slotRows.length > 0) {
    const { error: slotErr } = await supabase.from('booking_slots').insert(slotRows)
    if (slotErr) throw new Error(slotErr.message)
  }

  return mapBookingRow(updated)
}

export async function rejectBooking(
  bookingId: string,
  workerId:  string,
): Promise<BookingRequest> {
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'rejected' })
    .eq('id', bookingId)
    .eq('worker_id', workerId)
    .select()
    .single()

  if (error || !updated) throw new Error(error?.message ?? 'Failed to reject booking')
  return mapBookingRow(updated)
}

export async function getPendingBookingsForWorker(workerId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('worker_id', workerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapBookingRow)
}

export async function getActiveBookingsForWorker(workerId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('worker_id', workerId)
    .in('status', ['accepted', 'active'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapBookingRow)
}

export async function calculateBookingPrice(
  workerId:       string,
  serviceTypeIds: string[],
  pricingMode:    PricingMode,
): Promise<number> {
  const { data, error } = await supabase
    .from('worker_service_pricing')
    .select('service_type_id, monthly_rate, per_visit_rate')
    .eq('worker_id', workerId)
    .eq('is_active', true)
    .in('service_type_id', serviceTypeIds)

  if (error) throw new Error(error.message)

  return (data ?? []).reduce((sum, row) => {
    const rate = pricingMode === 'monthly' ? row.monthly_rate : row.per_visit_rate
    return sum + (rate ?? 0)
  }, 0)
}

// ─── Internal mapper ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBookingRow(row: any): BookingRequest {
  return {
    id:             row.id,
    residentId:     row.resident_id,
    residentName:   row.resident_name ?? '',
    residentFlatNo: row.resident_flat_no ?? '',
    workerId:       row.worker_id,
    serviceTypeIds: row.service_type_ids ?? [],
    arrivalTime:    row.arrival_time,
    daysOfWeek:     row.days_of_week ?? [],
    pricingMode:    row.pricing_mode,
    totalPrice:     row.total_price,
    status:         row.status,
    otpCode:        row.otp_code ?? '',
    createdAt:      row.created_at,
  }
}
