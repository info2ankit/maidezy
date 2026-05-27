import { supabase } from '@/lib/supabase'
import type { User, Role } from '@/shared/types'

export async function fetchUsersByRole(role: Role): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as User[]
}

export async function toggleUserActive(id: string, current: boolean): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: !current })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function findUserByMobile(mobile: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('mobile', mobile)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as User | null
}

export async function assignAsRwaAdmin(
  userId: string,
  societyId: string,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role: 'rwa_admin', society_id: societyId, name, is_active: true })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}
