import { supabase } from '@/lib/supabase'

export interface PushSubscriptionRow {
  id:         string
  user_id:    string
  token:      string
  platform:   'web' | 'android' | 'ios'
  user_agent: string | null
  last_seen:  string
}

export interface UpsertPushSubscriptionInput {
  userId:    string
  token:     string
  platform:  'web' | 'android' | 'ios'
  userAgent: string
}

/**
 * Upserts a push subscription. If the token already exists (same device,
 * permission re-granted, or a different user signed in on the same device),
 * we update `user_id`, `last_seen`, and `user_agent` rather than creating
 * a duplicate. The unique constraint on `token` enforces this at the DB
 * level too.
 *
 * Soft-deleted rows are revived on re-subscribe.
 */
export async function upsertPushSubscription(input: UpsertPushSubscriptionInput): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id:    input.userId,
        token:      input.token,
        platform:   input.platform,
        user_agent: input.userAgent,
        last_seen:  new Date().toISOString(),
        deleted_at: null,
      },
      { onConflict: 'token' },
    )
  if (error) throw new Error(error.message)
}

/**
 * Soft-deletes the subscription for a given FCM token (e.g. on logout).
 * Matches our project-wide soft-delete convention (migration 018/019).
 */
export async function deletePushSubscription(token: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('token', token)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
}

/**
 * Fetch all live subscriptions for a user. Used by the edge function via
 * the service role; with RLS, a regular client can only see their own rows.
 */
export async function fetchPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('last_seen', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PushSubscriptionRow[]
}
