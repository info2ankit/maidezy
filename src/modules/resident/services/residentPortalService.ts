import { supabase } from '@/lib/supabase'
import type { Resident } from '@/shared/types'
import type { WorkerShift } from '@/shared/types/worker.types'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

// ─── Exported interfaces ──────────────────────────────────────────────────────

export interface WorkerPricing {
  serviceTypeId: string
  monthlyRate: number
  perVisitRate: number
}

export interface ResidentWorker {
  providerId: string   // service_providers.id — used for bookings FK
  userId: string       // users.id — used for profile lookups
  name: string
  photoUrl: string | null
  gender: string | null
  isAvailable: boolean
  rating: number
  societyIds: string[]
  pricing: WorkerPricing[]
  shifts: WorkerShift[]
  workingDays: WorkingDayId[]
}

export interface ResidentBookingRow {
  id: string
  workerId: string
  workerName: string
  workerPhoto: string | null
  serviceTypeIds: string[]
  arrivalTime: string
  daysOfWeek: string[]
  pricingMode: string
  totalPrice: number
  status: string
  createdAt: string
}

// ─── Resident profile ─────────────────────────────────────────────────────────

export async function fetchResidentProfile(userId: string): Promise<Resident | null> {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Resident | null
}

export async function createResidentProfile(
  userId: string,
  societyId: string,
  flatNo: string,
  block: string | null,
): Promise<Resident> {
  const { data, error } = await supabase
    .from('residents')
    .insert({
      user_id: userId,
      society_id: societyId,
      flat_no: flatNo,
      block: block || null,
      kyc_status: 'pending',
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create resident profile')
  return data as Resident
}

// ─── Workers for resident ─────────────────────────────────────────────────────

export async function fetchWorkersForResident(
  societyId: string,
  serviceTypeId?: string,
): Promise<ResidentWorker[]> {
  // Two parallel queries: workers with society_id AND workers with society_ids overlapping
  const [byPrimary, byArray] = await Promise.all([
    supabase
      .from('service_providers')
      .select('id, user_id, availability, gender, rating, society_ids')
      .eq('society_id', societyId)
      .eq('kyc_status', 'approved'),
    supabase
      .from('service_providers')
      .select('id, user_id, availability, gender, rating, society_ids')
      .overlaps('society_ids', [societyId])
      .eq('kyc_status', 'approved'),
  ])

  if (byPrimary.error) throw new Error(byPrimary.error.message)
  if (byArray.error) throw new Error(byArray.error.message)

  // Deduplicate by user_id
  const seen = new Set<string>()
  const allProviders: { id: string; user_id: string; availability: boolean; gender: string | null; rating: number; society_ids: string[] }[] = []
  for (const row of [...(byPrimary.data ?? []), ...(byArray.data ?? [])]) {
    if (!seen.has(row.user_id)) {
      seen.add(row.user_id)
      allProviders.push(row as { id: string; user_id: string; availability: boolean; gender: string | null; rating: number; society_ids: string[] })
    }
  }

  if (allProviders.length === 0) return []

  const userIds = allProviders.map((p) => p.user_id)

  // Parallel: fetch users, kyc_documents, pricing, and availability
  const [usersRes, kycRes, pricingRes, availRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, avatar_url')
      .in('id', userIds),
    supabase
      .from('kyc_documents')
      .select('user_id, photo_url')
      .in('user_id', userIds),
    supabase
      .from('worker_service_pricing')
      .select('worker_id, service_type_id, monthly_rate, per_visit_rate')
      .in('worker_id', userIds)
      .eq('is_active', true),
    supabase
      .from('worker_availability')
      .select('worker_id, shifts, working_days')
      .in('worker_id', userIds),
  ])

  if (usersRes.error) throw new Error(usersRes.error.message)

  // Build lookup maps
  const userMap = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u]),
  )
  const kycMap = new Map(
    (kycRes.data ?? []).map((k) => [k.user_id, k.photo_url as string | null]),
  )
  const pricingMap = new Map<string, WorkerPricing[]>()
  for (const row of pricingRes.data ?? []) {
    const list = pricingMap.get(row.worker_id) ?? []
    list.push({
      serviceTypeId: row.service_type_id,
      monthlyRate: row.monthly_rate ?? 0,
      perVisitRate: row.per_visit_rate ?? 0,
    })
    pricingMap.set(row.worker_id, list)
  }
  const availMap = new Map(
    (availRes.data ?? []).map((a) => [a.worker_id, a]),
  )

  // Build result
  let workers: ResidentWorker[] = allProviders.map((provider) => {
    const user = userMap.get(provider.user_id)
    const photoFromKyc = kycMap.get(provider.user_id) ?? null
    const avatarUrl = user?.avatar_url ?? photoFromKyc
    const avail = availMap.get(provider.user_id)
    return {
      providerId: provider.id,
      userId: provider.user_id,
      name: user?.name ?? 'Worker',
      photoUrl: avatarUrl,
      gender: provider.gender,
      isAvailable: provider.availability,
      rating: provider.rating ?? 0,
      societyIds: provider.society_ids ?? [],
      pricing: pricingMap.get(provider.user_id) ?? [],
      shifts: (avail?.shifts ?? []) as WorkerShift[],
      workingDays: (avail?.working_days ?? []) as WorkingDayId[],
    }
  })

  // Filter by serviceTypeId if provided
  if (serviceTypeId) {
    workers = workers.filter((w) =>
      w.pricing.some((p) => p.serviceTypeId === serviceTypeId),
    )
  }

  return workers
}

// ─── Resident bookings ────────────────────────────────────────────────────────

export async function fetchResidentBookings(residentId: string): Promise<ResidentBookingRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<Record<string, unknown>>
  if (rows.length === 0) return []

  // provider_id in bookings → service_providers.id → user_id → users
  const providerIds = [...new Set(rows.map((r) => r.provider_id as string))]
  const providersRes = await supabase
    .from('service_providers')
    .select('id, user_id')
    .in('id', providerIds)

  const providerToUser = new Map(
    (providersRes.data ?? []).map((p) => [p.id as string, p.user_id as string]),
  )
  const userIds = [...new Set((providersRes.data ?? []).map((p) => p.user_id as string))]

  const [usersRes, kycRes] = await Promise.all([
    supabase.from('users').select('id, name, avatar_url').in('id', userIds),
    supabase.from('kyc_documents').select('user_id, photo_url').in('user_id', userIds),
  ])

  const workerNameMap = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u.name as string | null]),
  )
  const workerPhotoMap = new Map(
    (usersRes.data ?? []).map((u) => {
      const kyc = (kycRes.data ?? []).find((k) => k.user_id === u.id)
      return [u.id, u.avatar_url ?? kyc?.photo_url ?? null]
    }),
  )

  return rows.map((row) => {
    const uid = providerToUser.get(row.provider_id as string)
    return {
      id: row.id as string,
      workerId: row.provider_id as string,
      workerName: (uid ? workerNameMap.get(uid) : null) ?? 'Worker',
      workerPhoto: (uid ? workerPhotoMap.get(uid) : null) ?? null,
      serviceTypeIds: ((row.service_type_ids as string[] | null)?.length
        ? (row.service_type_ids as string[])
        : row.service_type ? [row.service_type as string] : []),
      arrivalTime: row.arrival_time as string,
      daysOfWeek: (row.days_of_week as string[]) ?? [],
      pricingMode: row.pricing_mode as string,
      totalPrice: row.total_price as number,
      status: row.status as string,
      createdAt: row.created_at as string,
    }
  })
}

export async function cancelResidentBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) throw new Error(error.message)
}
