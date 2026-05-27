import { supabase } from '@/lib/supabase'
import type { Resident, User, KycStatus } from '@/shared/types'

export type ResidentWithUser = Resident & { user: User }

export async function fetchResidentsBySociety(societyId: string): Promise<ResidentWithUser[]> {
  const { data, error } = await supabase
    .from('residents')
    .select('*, user:users!residents_user_id_fkey(*)')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ResidentWithUser[]
}

export async function updateResidentKyc(id: string, status: KycStatus): Promise<void> {
  const { error } = await supabase
    .from('residents')
    .update({ kyc_status: status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
