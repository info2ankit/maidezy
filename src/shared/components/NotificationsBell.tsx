import { useState } from 'react'
import { Bell } from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { useNotifications } from '@/shared/hooks/useNotifications'
import NotificationsInbox from './NotificationsInbox'

type Variant = 'light' | 'dark'

interface Props {
  /**
   * "light" = bell shows on a dark/colored header (white icon, light bg).
   * "dark" = bell shows on a white header (gray icon, light hover).
   */
  variant?: Variant
  className?: string
}

export default function NotificationsBell({ variant = 'dark', className = '' }: Props) {
  const { user } = useAuthStore()
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications(user?.id)
  const [open, setOpen] = useState(false)

  const isLight = variant === 'light'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={[
          'relative w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isLight ? 'bg-white/10 hover:bg-white/20' : 'bg-white border border-gray-100 hover:bg-gray-50',
          className,
        ].join(' ')}
        aria-label="Notifications"
      >
        <Bell
          size={20}
          weight={unreadCount > 0 ? 'fill' : 'regular'}
          className={isLight ? 'text-white' : 'text-gray-600'}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationsInbox
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onClose={() => setOpen(false)}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      )}
    </>
  )
}
