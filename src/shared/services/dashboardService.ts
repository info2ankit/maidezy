import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  societies: number
  rwaAdmins: number
  serviceProviders: number
  residents: number
}

export async function fetchSuperAdminStats(): Promise<DashboardStats> {
  const [societies, rwaAdmins, serviceProviders, residents] = await Promise.all([
    supabase.from('societies').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'rwa_admin'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'service_provider'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'resident'),
  ])

  return {
    societies: societies.count ?? 0,
    rwaAdmins: rwaAdmins.count ?? 0,
    serviceProviders: serviceProviders.count ?? 0,
    residents: residents.count ?? 0,
  }
}

export interface BookingTotals {
  total:     number
  pending:   number
  accepted:  number
  active:    number
  completed: number
  rejected:  number
  cancelled: number
}

export interface SocietyBreakdown {
  societyId:        string
  societyName:      string
  residents:        number
  serviceProviders: number
  openComplaints:   number
  pendingKyc:       number
}

export interface PlatformReports {
  bookingTotals:    BookingTotals
  bookingsLast7d:   number
  pendingKycTotal:  number
  openComplaints:   number
  societyBreakdown: SocietyBreakdown[]
}

export async function fetchPlatformReports(): Promise<PlatformReports> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    bookings,
    bookings7d,
    pendingProviderKyc,
    pendingResidentKyc,
    openComplaintsRes,
    societiesRes,
  ] = await Promise.all([
    supabase.from('bookings').select('status'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('service_providers').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
    supabase.from('residents').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('societies').select('id, name').order('name'),
  ])

  const totals: BookingTotals = {
    total:     0, pending:   0, accepted: 0, active: 0,
    completed: 0, rejected:  0, cancelled: 0,
  }
  for (const row of (bookings.data ?? []) as Array<{ status: string }>) {
    totals.total++
    if (row.status in totals) (totals as unknown as Record<string, number>)[row.status]++
  }

  const societies = (societiesRes.data ?? []) as Array<{ id: string; name: string }>

  const breakdown: SocietyBreakdown[] = await Promise.all(
    societies.map(async (s) => {
      const [residents, providers, complaints, kycResident, kycProvider] = await Promise.all([
        supabase.from('residents').select('*', { count: 'exact', head: true }).eq('society_id', s.id),
        supabase.from('service_providers').select('*', { count: 'exact', head: true }).eq('society_id', s.id),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('society_id', s.id).in('status', ['open', 'in_progress']),
        supabase.from('residents').select('*', { count: 'exact', head: true }).eq('society_id', s.id).eq('kyc_status', 'pending'),
        supabase.from('service_providers').select('*', { count: 'exact', head: true }).eq('society_id', s.id).eq('kyc_status', 'pending'),
      ])
      return {
        societyId:        s.id,
        societyName:      s.name,
        residents:        residents.count ?? 0,
        serviceProviders: providers.count ?? 0,
        openComplaints:   complaints.count ?? 0,
        pendingKyc:       (kycResident.count ?? 0) + (kycProvider.count ?? 0),
      }
    }),
  )

  return {
    bookingTotals:    totals,
    bookingsLast7d:   bookings7d.count ?? 0,
    pendingKycTotal:  (pendingProviderKyc.count ?? 0) + (pendingResidentKyc.count ?? 0),
    openComplaints:   openComplaintsRes.count ?? 0,
    societyBreakdown: breakdown,
  }
}
