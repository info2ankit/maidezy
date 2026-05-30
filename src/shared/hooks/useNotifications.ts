import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchInbox,
  fetchUnreadCount,
  markRead as markReadApi,
  markAllRead as markAllReadApi,
} from '@/shared/services/notificationService'
import type { AppNotification } from '@/shared/services/notificationService'

interface UseNotificationsResult {
  notifications: AppNotification[]
  unreadCount:   number
  isLoading:     boolean
  refresh:       () => Promise<void>
  markRead:      (id: string) => Promise<void>
  markAllRead:   () => Promise<void>
}

/**
 * Inbox + unread count for a single user, kept in sync via Supabase realtime.
 * Pass userId=null when the user isn't loaded yet; the hook idles.
 */
export function useNotifications(userId: string | null | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [isLoading,     setIsLoading]     = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [rows, count] = await Promise.all([
        fetchInbox(userId),
        fetchUnreadCount(userId),
      ])
      setNotifications(rows)
      setUnreadCount(count)
    } catch (e) {
      console.error('Failed to load notifications', e)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    refresh()

    // Random suffix avoids the StrictMode double-mount collision: if the
    // previous channel hasn't finished removing, supabase.channel(name)
    // returns the still-subscribed instance and the second .on() throws
    // "cannot add postgres_changes callbacks after subscribe()".
    const channelName = `notifications:${userId}:${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { refresh() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, refresh])

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
    try { await markReadApi(id) } catch (e) {
      console.error('markRead failed', e)
      refresh()
    }
  }, [refresh])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    try { await markAllReadApi(userId) } catch (e) {
      console.error('markAllRead failed', e)
      refresh()
    }
  }, [userId, refresh])

  return { notifications, unreadCount, isLoading, refresh, markRead, markAllRead }
}
