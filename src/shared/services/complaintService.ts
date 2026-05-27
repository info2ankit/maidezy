import { supabase } from '@/lib/supabase'
import type { Complaint, ComplaintStatus, Resident, User } from '@/shared/types'

export type ComplaintWithResident = Complaint & {
  resident: Resident & { user: User }
}

export async function fetchComplaintsBySociety(
  societyId: string
): Promise<ComplaintWithResident[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*, resident:residents!complaints_resident_id_fkey(*, user:users!residents_user_id_fkey(*))')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ComplaintWithResident[]
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus
): Promise<void> {
  const { error } = await supabase
    .from('complaints')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
