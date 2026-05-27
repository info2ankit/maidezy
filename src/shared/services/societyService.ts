import { supabase } from '@/lib/supabase'
import type { Society } from '@/shared/types'

export interface CreateSocietyInput {
  name: string
  address: string
  city: string
  state: string
  pincode: string
}

export async function fetchSocieties(): Promise<Society[]> {
  const { data, error } = await supabase
    .from('societies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Society[]
}

export async function createSociety(
  input: CreateSocietyInput,
  createdBy: string
): Promise<Society> {
  const { data, error } = await supabase
    .from('societies')
    .insert({ ...input, created_by: createdBy, status: 'active' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Society
}

export async function toggleSocietyStatus(
  id: string,
  currentStatus: Society['status']
): Promise<void> {
  const next = currentStatus === 'active' ? 'inactive' : 'active'
  const { error } = await supabase
    .from('societies')
    .update({ status: next })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
