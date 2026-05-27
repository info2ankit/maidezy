import { supabase } from '@/lib/supabase'

export interface RwaDashboardStats {
  residents: number
  providers: number
  pendingKyc: number
  openComplaints: number
}

export async function fetchRwaDashboardStats(societyId: string): Promise<RwaDashboardStats> {
  const [residents, providers, pendingResidentKyc, pendingProviderKyc, openComplaints] = await Promise.all([
    supabase.from('residents').select('*', { count: 'exact', head: true }).eq('society_id', societyId),
    supabase.from('service_providers').select('*', { count: 'exact', head: true }).eq('society_id', societyId),
    supabase.from('residents').select('*', { count: 'exact', head: true }).eq('society_id', societyId).eq('kyc_status', 'pending'),
    supabase.from('service_providers').select('*', { count: 'exact', head: true }).eq('society_id', societyId).eq('kyc_status', 'pending'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('society_id', societyId).in('status', ['open', 'in_progress']),
  ])

  return {
    residents: residents.count ?? 0,
    providers: providers.count ?? 0,
    pendingKyc: (pendingResidentKyc.count ?? 0) + (pendingProviderKyc.count ?? 0),
    openComplaints: openComplaints.count ?? 0,
  }
}
