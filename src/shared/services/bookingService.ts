import { supabase } from '@/lib/supabase'
import type { Booking, Resident, User } from '@/shared/types'
import type { BookingRequest, PricingMode } from '@/shared/types/worker.types'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import { createNotification } from './notificationService'

// ─── Legacy booking helpers (used by dashboard and booking history) ───────────

export type BookingWithResident = Booking & {
  resident: Resident & { user: User }
}

export async function fetchBookingsByProvider(providerId: string): Promise<BookingWithResident[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, resident:residents!bookings_resident_id_fkey(*, user:users!residents_user_id_fkey(*))')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

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
  residentId:       string
  workerId:         string   // users.id of the worker
  serviceTypeIds:   string[]
  arrivalTime:      string
  daysOfWeek:       WorkingDayId[]
  pricingMode:      PricingMode
  totalPrice:       number
  bookingSocietyId?: string  // override when booking from a browsed society
  bookingFlatNo?:   string
  bookingBlock?:    string
}): Promise<BookingRequest> {
  const otpCode = String(Math.floor(100000 + Math.random() * 900000))

  // bookings.provider_id FK → service_providers.id; look it up from users.id
  const { data: sp, error: spErr } = await supabase
    .from('service_providers')
    .select('id')
    .eq('user_id', data.workerId)
    .maybeSingle()
  if (spErr || !sp) throw new Error(spErr?.message ?? 'Worker profile not found')

  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      resident_id:        data.residentId,
      provider_id:        sp.id,
      service_type:       data.serviceTypeIds[0] ?? null,
      service_type_ids:   data.serviceTypeIds,
      start_date:         new Date().toISOString().slice(0, 10),
      arrival_time:       data.arrivalTime,
      days_of_week:       data.daysOfWeek,
      pricing_mode:       data.pricingMode,
      total_price:        data.totalPrice,
      status:             'pending',
      otp_code:           otpCode,
      booking_society_id: data.bookingSocietyId ?? null,
      booking_flat_no:    data.bookingFlatNo ?? null,
      booking_block:      data.bookingBlock ?? null,
    })
    .select()
    .single()

  if (error || !row) throw new Error(error?.message ?? 'Failed to create booking')

  // Fire-and-forget: notify worker of new booking request
  notifyWorkerOfNewBooking(data.workerId, data.residentId).catch((e) =>
    console.error('notifyWorkerOfNewBooking failed', e),
  )

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
    .eq('provider_id', workerId)
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

  notifyResidentOfBookingDecision(booking.resident_id, 'accepted').catch((e) =>
    console.error('notify resident accept failed', e),
  )

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
    .eq('provider_id', workerId)
    .select()
    .single()

  if (error || !updated) throw new Error(error?.message ?? 'Failed to reject booking')

  notifyResidentOfBookingDecision(updated.resident_id, 'rejected').catch((e) =>
    console.error('notify resident reject failed', e),
  )

  return mapBookingRow(updated)
}

export async function getPendingBookingsForWorker(workerId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', workerId)
    .in('status', ['pending', 'reschedule_requested'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return enrichWithResidentInfo((data ?? []).map(mapBookingRow))
}

// Backfills residentName/Flat/Block/Mobile + societyName from residents/users/societies.
// Soft-fails on lookup error so worker still sees the core booking.
async function enrichWithResidentInfo(bookings: BookingRequest[]): Promise<BookingRequest[]> {
  if (bookings.length === 0) return bookings
  const residentIds = [...new Set(bookings.map((b) => b.residentId))]

  const { data: residents, error } = await supabase
    .from('residents')
    .select('id, flat_no, block, society_id, user:users!residents_user_id_fkey(name, mobile), society:societies(name)')
    .in('id', residentIds)
  if (error) {
    console.error('[bookingService] enrichWithResidentInfo failed', error)
    return bookings
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, { name: string; flat: string; block: string; mobile: string; society: string }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (residents ?? []) as any[]) {
    map.set(r.id as string, {
      name:    r.user?.name ?? '',
      flat:    r.flat_no ?? '',
      block:   r.block ?? '',
      mobile:  r.user?.mobile ?? '',
      society: r.society?.name ?? '',
    })
  }

  return bookings.map((b) => {
    const info = map.get(b.residentId)
    if (!info) return b
    return {
      ...b,
      residentName:   info.name || b.residentName,
      residentFlatNo: info.flat || b.residentFlatNo,
      residentBlock:  info.block,
      residentMobile: info.mobile,
      societyName:    info.society,
    }
  })
}

// ─── Reschedule flow ──────────────────────────────────────────────────────────

export type ProposerRole = 'worker' | 'worker_admin' | 'resident'

export async function proposeReschedule(
  bookingId:           string,
  workerId:            string,                 // provider_id (matches accept/reject pattern)
  proposedByUserId:    string,                 // users.id of whoever proposed
  proposedByRole:      ProposerRole,
  input: {
    arrivalTime: string                        // 'HH:MM'
    daysOfWeek:  WorkingDayId[]
    note?:       string | null
    price:       number                        // proposed new total (must be > 0; UI enforces ≥ current)
  },
): Promise<BookingRequest> {
  if (!(input.price > 0)) throw new Error('Proposed price must be greater than zero')

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      status:                'reschedule_requested',
      proposed_arrival_time: input.arrivalTime,
      proposed_days_of_week: input.daysOfWeek,
      proposed_note:         input.note ?? null,
      proposed_price:        input.price,
      proposed_by:           proposedByUserId,
      proposed_by_role:      proposedByRole,
    })
    .eq('id', bookingId)
    .eq('provider_id', workerId)
    .select()
    .single()

  if (error || !updated) throw new Error(error?.message ?? 'Failed to propose reschedule')

  if (proposedByRole === 'resident') {
    notifyProviderUserOfReschedule(updated.provider_id, input.arrivalTime, input.daysOfWeek, input.note ?? null, 'counter', input.price)
      .catch((e) => console.error('notify worker counter failed', e))
  } else {
    notifyResidentOfReschedule(updated.resident_id, input.arrivalTime, input.daysOfWeek, input.note ?? null, input.price)
      .catch((e) => console.error('notify resident reschedule failed', e))
  }

  return mapBookingRow(updated)
}

/**
 * Whoever proposed the current reschedule can take it back, returning the
 * booking to pending. The other side is notified.
 */
export async function withdrawReschedule(bookingId: string): Promise<BookingRequest> {
  const { data: booking } = await supabase
    .from('bookings')
    .select('proposed_by_role, resident_id, provider_id')
    .eq('id', bookingId)
    .maybeSingle()

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      status:                'pending',
      proposed_arrival_time: null,
      proposed_days_of_week: null,
      proposed_note:         null,
      proposed_price:        null,
      proposed_by:           null,
      proposed_by_role:      null,
    })
    .eq('id', bookingId)
    .select()
    .single()
  if (error || !updated) throw new Error(error?.message ?? 'Failed to withdraw proposal')

  // Tell the other side the proposal is off the table
  if (booking?.proposed_by_role === 'resident' && booking.provider_id) {
    const { data: sp } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', booking.provider_id)
      .maybeSingle()
    if (sp?.user_id) {
      createNotification({
        userId: sp.user_id as string,
        type:   'booking',
        title:  'Offer withdrawn',
        body:   'The resident withdrew their counter-offer. Booking is pending again.',
        link:   '/provider/requests',
      }).catch(console.error)
    }
  } else if (booking?.resident_id) {
    const { data: resident } = await supabase
      .from('residents')
      .select('user_id')
      .eq('id', booking.resident_id)
      .maybeSingle()
    if (resident?.user_id) {
      createNotification({
        userId: resident.user_id as string,
        type:   'booking',
        title:  'Offer withdrawn',
        body:   'The worker withdrew their counter-offer. Booking is pending again.',
        link:   '/resident/bookings',
      }).catch(console.error)
    }
  }

  return mapBookingRow(updated)
}

export async function acceptReschedule(bookingId: string): Promise<BookingRequest> {
  // Need the proposal + provider_id to block the new slots
  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()
  if (fetchErr || !booking) throw new Error('Booking not found')
  if (booking.status !== 'reschedule_requested') throw new Error('No active reschedule to accept')

  const newTime  = booking.proposed_arrival_time as string
  const newDays  = (booking.proposed_days_of_week ?? []) as WorkingDayId[]
  const newPrice = booking.proposed_price !== null && booking.proposed_price !== undefined
    ? Number(booking.proposed_price)
    : null

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      status:                'accepted',
      arrival_time:          newTime,
      days_of_week:          newDays,
      ...(newPrice !== null ? { total_price: newPrice } : {}),
      proposed_arrival_time: null,
      proposed_days_of_week: null,
      proposed_note:         null,
      proposed_price:        null,
      proposed_by:           null,
      proposed_by_role:      null,
    })
    .eq('id', bookingId)
    .select()
    .single()
  if (error || !updated) throw new Error(error?.message ?? 'Failed to accept reschedule')

  // Block slots for new days
  const slotRows = newDays.map((day) => ({
    worker_id:   booking.provider_id,
    booking_id:  bookingId,
    slot_time:   newTime,
    day_of_week: day,
    is_blocked:  true,
  }))
  if (slotRows.length > 0) {
    await supabase.from('booking_slots').insert(slotRows)
  }

  if (booking.proposed_by) {
    notifyWorkerOfRescheduleDecision(booking.proposed_by as string, 'accepted')
      .catch((e) => console.error('notify worker reschedule accept failed', e))
  }

  return mapBookingRow(updated)
}

export async function rejectReschedule(bookingId: string): Promise<BookingRequest> {
  const { data: booking } = await supabase
    .from('bookings')
    .select('proposed_by')
    .eq('id', bookingId)
    .maybeSingle()

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      status:                'cancelled',
      proposed_arrival_time: null,
      proposed_days_of_week: null,
      proposed_note:         null,
      proposed_price:        null,
      proposed_by:           null,
      proposed_by_role:      null,
    })
    .eq('id', bookingId)
    .select()
    .single()
  if (error || !updated) throw new Error(error?.message ?? 'Failed to decline reschedule')

  if (booking?.proposed_by) {
    notifyWorkerOfRescheduleDecision(booking.proposed_by as string, 'declined')
      .catch((e) => console.error('notify worker reschedule decline failed', e))
  }

  return mapBookingRow(updated)
}

export async function getActiveBookingsForWorker(workerId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', workerId)
    .in('status', ['accepted', 'active'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return enrichWithResidentInfo((data ?? []).map(mapBookingRow))
}

// ─── Worker-admin booking visibility ─────────────────────────────────────────

export interface BookingForWorkerAdmin extends BookingRequest {
  workerName:    string
  workerMobile:  string
  workerUserId:  string
}

export async function fetchBookingsForWorkerAdmin(
  adminUserId: string,
): Promise<BookingForWorkerAdmin[]> {
  // 1. Admin's societies
  const { data: admin } = await supabase
    .from('worker_admins')
    .select('society_ids')
    .eq('user_id', adminUserId)
    .maybeSingle()
  const societyIds = (admin?.society_ids ?? []) as string[]
  if (societyIds.length === 0) return []

  // 2. Workers serving any of those societies (covers society_id and society_ids)
  const [primary, byArray] = await Promise.all([
    supabase
      .from('service_providers')
      .select('id, user_id')
      .in('society_id', societyIds),
    supabase
      .from('service_providers')
      .select('id, user_id')
      .overlaps('society_ids', societyIds),
  ])

  const providerMap = new Map<string, string>() // provider_id → user_id
  for (const row of [...(primary.data ?? []), ...(byArray.data ?? [])]) {
    providerMap.set(row.id as string, row.user_id as string)
  }
  if (providerMap.size === 0) return []

  // 3. Bookings for those providers
  const providerIds = [...providerMap.keys()]
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .in('provider_id', providerIds)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  if (!bookings || bookings.length === 0) return []

  // 4. Worker contact + resident info enrichment
  const userIds = [...new Set([...providerMap.values()])]
  const residentIds = [...new Set(bookings.map((b) => b.resident_id as string))]

  const [workersRes, enrichedBase] = await Promise.all([
    supabase.from('users').select('id, name, mobile').in('id', userIds),
    enrichWithResidentInfo(bookings.map(mapBookingRow)),
  ])

  const workerInfoMap = new Map(
    (workersRes.data ?? []).map((u) => [u.id, { name: u.name as string | null, mobile: u.mobile as string }]),
  )

  void residentIds
  return enrichedBase.map((base) => {
    const workerUid = providerMap.get(base.workerId) ?? ''
    const workerInfo = workerInfoMap.get(workerUid)
    return {
      ...base,
      workerName:   workerInfo?.name ?? 'Worker',
      workerMobile: workerInfo?.mobile ?? '',
      workerUserId: workerUid,
    }
  })
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
    id:                  row.id,
    residentId:          row.resident_id,
    residentName:        row.resident_name ?? '',
    residentFlatNo:      row.resident_flat_no ?? '',
    residentBlock:       '',
    residentMobile:      '',
    societyName:         '',
    workerId:            row.provider_id,
    serviceTypeIds:      row.service_type_ids ?? [],
    arrivalTime:         row.arrival_time,
    daysOfWeek:          row.days_of_week ?? [],
    pricingMode:         row.pricing_mode,
    totalPrice:          row.total_price,
    status:              row.status,
    otpCode:             row.otp_code ?? '',
    proposedArrivalTime: row.proposed_arrival_time ?? null,
    proposedDaysOfWeek:  row.proposed_days_of_week ?? null,
    proposedNote:        row.proposed_note ?? null,
    proposedPrice:       row.proposed_price === null || row.proposed_price === undefined ? null : Number(row.proposed_price),
    proposedBy:          row.proposed_by ?? null,
    proposedByRole:      row.proposed_by_role ?? null,
    createdAt:           row.created_at,
  }
}

// ─── Notification helpers ─────────────────────────────────────────────────────

async function notifyWorkerOfNewBooking(workerUserId: string, residentId: string): Promise<void> {
  const { data: resident } = await supabase
    .from('residents')
    .select('flat_no, block, user_id, users:user_id(name)')
    .eq('id', residentId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const residentName = (resident as any)?.users?.name ?? 'A resident'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flat = (resident as any)?.flat_no
    ? `${(resident as any)?.block ? `${(resident as any).block}-` : ''}${(resident as any).flat_no}`
    : ''

  const body = flat
    ? `${residentName} (${flat}) sent a booking request. Tap to review.`
    : `${residentName} sent a booking request. Tap to review.`

  // Notify the worker themselves
  await createNotification({
    userId: workerUserId,
    type:   'booking',
    title:  'New booking request',
    body,
    link:   '/provider/bookings',
  })

  // Also notify every worker_admin whose societies overlap with this worker's
  // — so they can act on behalf of workers who aren't tech-savvy.
  notifyWorkerAdminsOfNewBooking(workerUserId, body).catch((e) =>
    console.error('notify worker_admins of new booking failed', e),
  )
}

async function notifyWorkerAdminsOfNewBooking(workerUserId: string, body: string): Promise<void> {
  const { data: sp } = await supabase
    .from('service_providers')
    .select('society_id, society_ids')
    .eq('user_id', workerUserId)
    .maybeSingle()
  if (!sp) return

  const societyIds = [
    ...(sp.society_ids ?? []),
    ...(sp.society_id ? [sp.society_id] : []),
  ].filter((v, i, a) => v && a.indexOf(v) === i)
  if (societyIds.length === 0) return

  const { data: admins } = await supabase
    .from('worker_admins')
    .select('user_id')
    .overlaps('society_ids', societyIds)

  await Promise.allSettled(
    (admins ?? []).map((a) =>
      createNotification({
        userId: a.user_id as string,
        type:   'booking',
        title:  'New booking for your worker',
        body,
        link:   '/worker-admin/bookings',
      }),
    ),
  )
}

async function notifyProviderUserOfReschedule(
  providerId:  string,
  arrivalTime: string,
  daysOfWeek:  string[],
  note:        string | null,
  flavor:      'counter' | 'initial',
  price:       number | null = null,
): Promise<void> {
  const { data: sp } = await supabase
    .from('service_providers')
    .select('user_id, society_id, society_ids')
    .eq('id', providerId)
    .maybeSingle()
  if (!sp?.user_id) return

  const title = flavor === 'counter' ? 'Resident counter-offered' : 'New offer to review'
  const bodyParts = [
    `Resident proposes: ${arrivalTime} on ${daysOfWeek.join(', ')}.`,
  ]
  if (price !== null) bodyParts.push(`Price: ₹${price}.`)
  if (note) bodyParts.push(`Note: ${note}`)
  bodyParts.push('Tap to accept, decline, or counter back.')
  const body = bodyParts.join(' ')

  // Notify worker
  createNotification({
    userId: sp.user_id as string,
    type:   'booking',
    title,
    body,
    link:   '/provider/requests',
  }).catch(console.error)

  // Also worker_admins (same pattern as new bookings)
  const societyIds = [
    ...((sp.society_ids ?? []) as string[]),
    ...(sp.society_id ? [sp.society_id as string] : []),
  ].filter((v, i, a) => v && a.indexOf(v) === i)
  if (societyIds.length === 0) return

  const { data: admins } = await supabase
    .from('worker_admins')
    .select('user_id')
    .overlaps('society_ids', societyIds)

  await Promise.allSettled(
    (admins ?? []).map((a) =>
      createNotification({
        userId: a.user_id as string,
        type:   'booking',
        title,
        body,
        link:   '/worker-admin/bookings',
      }),
    ),
  )
}

async function notifyResidentOfReschedule(
  residentId:  string,
  arrivalTime: string,
  daysOfWeek:  string[],
  note:        string | null,
  price:       number | null = null,
): Promise<void> {
  const { data: resident } = await supabase
    .from('residents')
    .select('user_id')
    .eq('id', residentId)
    .maybeSingle()
  if (!resident?.user_id) return

  const bodyParts = [
    `Worker proposed: ${arrivalTime} on ${daysOfWeek.join(', ')}.`,
  ]
  if (price !== null) bodyParts.push(`Price: ₹${price}.`)
  if (note) bodyParts.push(`Note: ${note}`)
  bodyParts.push('Tap to accept, decline, or counter back.')

  await createNotification({
    userId: resident.user_id as string,
    type:   'booking',
    title:  'Counter-offer from worker',
    body:   bodyParts.join(' '),
    link:   '/resident/bookings',
  })
}

async function notifyWorkerOfRescheduleDecision(
  workerUserId: string,
  decision:     'accepted' | 'declined',
): Promise<void> {
  await createNotification({
    userId: workerUserId,
    type:   'booking',
    title:  decision === 'accepted' ? 'Offer accepted' : 'Offer declined',
    body:   decision === 'accepted'
      ? 'The resident accepted your counter-offer. Booking is confirmed.'
      : 'The resident declined your counter-offer. Booking was cancelled.',
    link:   '/provider/bookings',
  })
}

async function notifyResidentOfBookingDecision(
  residentId: string,
  decision:   'accepted' | 'rejected' | 'cancelled',
): Promise<void> {
  const { data: resident } = await supabase
    .from('residents')
    .select('user_id')
    .eq('id', residentId)
    .maybeSingle()

  if (!resident?.user_id) return

  const titles = {
    accepted:  'Booking confirmed',
    rejected:  'Booking declined',
    cancelled: 'Booking cancelled',
  } as const
  const bodies = {
    accepted:  'A worker accepted your booking request. Tap to view details.',
    rejected:  'A worker declined your booking request. Try another worker.',
    cancelled: 'Your booking was cancelled.',
  } as const

  await createNotification({
    userId: resident.user_id as string,
    type:   'booking',
    title:  titles[decision],
    body:   bodies[decision],
    link:   '/resident/bookings',
  })
}

export async function notifyWorkerOfCancellation(
  providerId: string,
  residentName?: string,
): Promise<void> {
  const { data: sp } = await supabase
    .from('service_providers')
    .select('user_id')
    .eq('id', providerId)
    .maybeSingle()
  if (!sp?.user_id) return

  await createNotification({
    userId: sp.user_id as string,
    type:   'booking',
    title:  'Booking cancelled',
    body:   `${residentName ?? 'A resident'} cancelled a booking request.`,
    link:   '/provider/bookings',
  })
}
