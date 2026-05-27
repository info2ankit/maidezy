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
