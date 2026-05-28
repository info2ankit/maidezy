import { supabase } from '@/lib/supabase'
import type { ProviderWithServices, User, KycStatus, ServiceType } from '@/shared/types'

export type ProviderRow = ProviderWithServices & { user: User }

export interface ProviderFilters {
  serviceType?: ServiceType
  kycStatus?:   KycStatus
}

export async function fetchProvidersBySociety(
  societyId: string,
  filters: ProviderFilters = {}
): Promise<ProviderRow[]> {
  // `!inner` makes provider_services an INNER JOIN so we can filter on it.
  // Without filter, use a LEFT JOIN to include providers with no services yet.
  const joinHint = filters.serviceType ? 'provider_services!inner' : 'provider_services'

  let query = supabase
    .from('service_providers')
    .select(`*, user:users!service_providers_user_id_fkey(*), services:${joinHint}(*)`)
    .eq('society_id', societyId)

  if (filters.serviceType) {
    query = query.eq('services.service_type', filters.serviceType)
  }
  if (filters.kycStatus) {
    query = query.eq('kyc_status', filters.kycStatus)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ProviderRow[]
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
