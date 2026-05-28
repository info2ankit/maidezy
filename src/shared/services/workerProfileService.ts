import { supabase } from '@/lib/supabase'
import { PRICING_DEFAULTS } from '@/shared/constants/pricingDefaults'
import { SLOT_DURATION_HOURS } from '@/shared/constants/timeSlots'
import type { ServiceTypeId } from '@/shared/constants/serviceTypes'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { WorkerShift, TimeSlot } from '@/shared/types/worker.types'

/**
 * Upsert a minimal service_providers row so the onboarding gate passes.
 * Preserves kyc_status and availability on re-runs.
 */
export async function saveWorkerName(workerId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ name: name.trim() })
    .eq('id', workerId)

  if (error) throw new Error(error.message)
}

export async function ensureServiceProviderRow(workerId: string, societyIds: string[]): Promise<void> {
  const primarySocietyId = societyIds[0] ?? null

  const { data: existing } = await supabase
    .from('service_providers')
    .select('id')
    .eq('user_id', workerId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('service_providers')
      .update({ society_id: primarySocietyId, society_ids: societyIds })
      .eq('user_id', workerId)
    return
  }

  const { error } = await supabase
    .from('service_providers')
    .insert({
      user_id:      workerId,
      society_id:   primarySocietyId,
      society_ids:  societyIds,
      kyc_status:   'pending',
      availability: true,
    })

  if (error) throw new Error(error.message)
}

export async function saveWorkerServices(
  workerId: string,
  services: ServiceTypeId[],
): Promise<void> {
  await supabase
    .from('worker_service_pricing')
    .update({ is_active: false })
    .eq('worker_id', workerId)

  if (services.length === 0) return

  const rows = services.map((id) => ({
    worker_id:       workerId,
    service_type_id: id,
    monthly_rate:    PRICING_DEFAULTS[id].monthly,
    per_visit_rate:  PRICING_DEFAULTS[id].perVisit,
    is_active:       true,
  }))

  const { error } = await supabase
    .from('worker_service_pricing')
    .upsert(rows, { onConflict: 'worker_id,service_type_id' })

  if (error) throw new Error(error.message)
}

export async function saveWorkerPricing(
  workerId: string,
  pricing:  Record<ServiceTypeId, { monthly: number; perVisit: number }>,
): Promise<void> {
  const updates = Object.entries(pricing).map(([serviceTypeId, rates]) =>
    supabase
      .from('worker_service_pricing')
      .update({ monthly_rate: rates.monthly, per_visit_rate: rates.perVisit })
      .eq('worker_id', workerId)
      .eq('service_type_id', serviceTypeId)
      .eq('is_active', true),
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
}

export async function saveWorkerAvailability(
  workerId: string,
  availability: { shifts: WorkerShift[]; workingDays: WorkingDayId[] },
): Promise<void> {
  const { error } = await supabase
    .from('worker_availability')
    .upsert(
      {
        worker_id:    workerId,
        shifts:       availability.shifts,
        working_days: availability.workingDays,
      },
      { onConflict: 'worker_id' },
    )

  if (error) throw new Error(error.message)
}

/**
 * Generate 1-hour slots across all shifts for a given day,
 * then mark each slot as available or blocked.
 */
export async function getAvailableSlots(
  workerId:  string,
  dayOfWeek: WorkingDayId,
): Promise<TimeSlot[]> {
  const { data: avail } = await supabase
    .from('worker_availability')
    .select('shifts')
    .eq('worker_id', workerId)
    .maybeSingle()

  if (!avail) return []

  const shifts: WorkerShift[] = avail.shifts ?? []
  const allSlots = shifts.flatMap((sh) => generateSlots(sh.start, sh.end))

  const { data: blocked } = await supabase
    .from('booking_slots')
    .select('slot_time, booking_id')
    .eq('worker_id', workerId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_blocked', true)

  const blockedMap = new Map((blocked ?? []).map((b) => [b.slot_time, b.booking_id]))

  return allSlots.map((time) => ({
    time,
    isAvailable: !blockedMap.has(time),
    bookingId:   blockedMap.get(time) ?? null,
  }))
}

function generateSlots(shiftStart: string, shiftEnd: string): string[] {
  const slots: string[] = []
  let hour = Number(shiftStart.split(':')[0])
  const endHour = Number(shiftEnd.split(':')[0])
  while (hour + SLOT_DURATION_HOURS <= endHour) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
    hour += SLOT_DURATION_HOURS
  }
  return slots
}
