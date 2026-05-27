import { supabase } from '@/lib/supabase'
import type { ServiceProvider, User, KycStatus, ServiceType } from '@/shared/types'

export type ProviderWithUser = ServiceProvider & { user: User }

export interface ProviderFilters {
  serviceType?: ServiceType
  kycStatus?: KycStatus
}

export async function fetchProvidersBySociety(
  societyId: string,
  filters: ProviderFilters = {}
): Promise<ProviderWithUser[]> {
  let query = supabase
    .from('service_providers')
    .select('*, user:users!service_providers_user_id_fkey(*)')
    .eq('society_id', societyId)

  if (filters.serviceType) query = query.eq('service_type', filters.serviceType)
  if (filters.kycStatus)   query = query.eq('kyc_status', filters.kycStatus)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ProviderWithUser[]
}

export async function updateProviderKyc(id: string, status: KycStatus): Promise<void> {
  const { error } = await supabase
    .from('service_providers')
    .update({ kyc_status: status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function toggleProviderAvailability(
  id: string,
  current: boolean
): Promise<void> {
  const { error } = await supabase
    .from('service_providers')
    .update({ availability: !current })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
