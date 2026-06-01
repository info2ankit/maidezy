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
  /** A tag to collapse duplicate pushes on the device (e.g. booking id). */
  tag?:   string
  /**
   * If true (default), also fire a push notification via the send-push edge
   * function. Set to false for in-app-only notifications where you don't
   * want to wake the user's device.
   */
  push?:  boolean
}

/**
 * Records an in-app notification AND (by default) fires a push notification
 * to every device the recipient has opted into.
 *
 * The push fan-out is best-effort — failures are logged but don't surface
 * to the caller. This keeps booking/KYC flows reliable: even if the user
 * has no devices subscribed or FCM is down, the in-app record always lands.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    title:   input.title,
    body:    input.body,
    type:    input.type ?? 'system',
    link:    input.link ?? null,
  })
  if (error) throw new Error(error.message)

  // Best-effort push (don't block or fail the caller on errors)
  if (input.push !== false) {
    void sendPush({
      userId: input.userId,
      title:  input.title,
      body:   input.body,
      link:   input.link ?? undefined,
      tag:    input.tag,
    }).catch((e) => console.warn('[notify] push dispatch failed', e))
  }
}

export interface SendPushInput {
  userId: string
  title:  string
  body:   string
  link?:  string
  tag?:   string
}

/**
 * Direct push without writing an in-app record. Use for transient alerts
 * (e.g. "your booking is starting in 5 min") that don't belong in the
 * notification inbox. Most callers should prefer `createNotification`.
 */
export async function sendPush(input: SendPushInput): Promise<void> {
  const { error } = await supabase.functions.invoke('send-push', { body: input })
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
