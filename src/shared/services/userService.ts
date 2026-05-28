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

export async function createWorkerAdminInvite(
  name:       string,
  mobile:     string,
  gender:     string,
  societyIds: string[],
): Promise<void> {
  const existing = await findUserByMobile(mobile)
  if (existing) {
    if (existing.role === 'super_admin')  throw new Error('This mobile belongs to a Super Admin.')
    if (existing.role === 'worker_admin') throw new Error('A Worker Admin with this mobile already exists.')
  }

  const { error } = await supabase
    .from('worker_admin_invites')
    .upsert({ mobile, name, gender, society_ids: societyIds }, { onConflict: 'mobile' })

  if (error) throw new Error(error.message)
}

export interface WorkerAdminInvite {
  id:          string
  mobile:      string
  name:        string
  gender:      string
  society_ids: string[]
  created_at:  string
}

export async function fetchWorkerAdminInvites(): Promise<WorkerAdminInvite[]> {
  const { data, error } = await supabase
    .from('worker_admin_invites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as WorkerAdminInvite[]
}

export async function deleteWorkerAdminInvite(id: string): Promise<void> {
  const { error } = await supabase
    .from('worker_admin_invites')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function fetchWorkerAdmins(): Promise<(User & { gender: string | null; society_ids: string[] })[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'worker_admin')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!users || users.length === 0) return []

  const { data: waRows } = await supabase
    .from('worker_admins')
    .select('user_id, gender, society_ids')
    .in('user_id', users.map((u) => u.id))

  const waMap = new Map((waRows ?? []).map((r) => [r.user_id, r]))
  return users.map((u) => ({
    ...(u as User),
    gender:      waMap.get(u.id)?.gender     ?? null,
    society_ids: waMap.get(u.id)?.society_ids ?? [],
  }))
}

export async function updateWorkerAdminDetails(
  userId:     string,
  gender:     string,
  societyIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from('worker_admins')
    .upsert({ user_id: userId, gender, society_ids: societyIds }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)
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
