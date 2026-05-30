import { supabase } from '@/lib/supabase'

export type NotificationType = 'booking' | 'kyc' | 'complaint' | 'system'

export interface AppNotification {
  id:         string
  user_id:    string
  title:      string
  body:       string
  type:       NotificationType
  link:       string | null
  is_read:    boolean
  created_at: string
}

export interface CreateNotificationInput {
  userId: string
  title:  string
  body:   string
  type?:  NotificationType
  link?:  string | null
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    title:   input.title,
    body:    input.body,
    type:    input.type ?? 'system',
    link:    input.link ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function fetchInbox(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as AppNotification[]
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw new Error(error.message)
}
