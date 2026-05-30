import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  CheckCircle,
  BellSimple,
  CalendarCheck,
  IdentificationCard,
  ChatCircleDots,
  Info,
} from '@phosphor-icons/react'
import type { AppNotification, NotificationType } from '@/shared/services/notificationService'

interface Props {
  notifications: AppNotification[]
  unreadCount:   number
  isLoading:     boolean
  onClose:       () => void
  onMarkRead:    (id: string) => void
  onMarkAllRead: () => void
}

const ICONS: Record<NotificationType, typeof BellSimple> = {
  booking:   CalendarCheck,
  kyc:       IdentificationCard,
  complaint: ChatCircleDots,
  system:    Info,
}

const ICON_BG: Record<NotificationType, string> = {
  booking:   'bg-blue-50 text-blue-600',
  kyc:       'bg-amber-50 text-amber-600',
  complaint: 'bg-rose-50 text-rose-600',
  system:    'bg-gray-100 text-gray-500',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60_000)
  if (min < 1)    return 'just now'
  if (min < 60)   return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)    return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 7)      return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function NotificationsInbox({
  notifications,
  unreadCount,
  isLoading,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  function handleTap(n: AppNotification) {
    if (!n.is_read) onMarkRead(n.id)
    if (n.link) {
      handleClose()
      setTimeout(() => navigate(n.link!), 320)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0 border-b border-gray-100">
          <div>
            <h2 className="font-heading font-bold text-gray-900 text-lg">Notifications</h2>
            {unreadCount > 0 && (
              <p className="font-body text-xs text-gray-400">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-body font-semibold text-primary hover:underline px-2 py-1"
              >
                <CheckCircle size={13} weight="fill" />
                Mark all read
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Close notifications"
            >
              <X size={16} weight="bold" className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto overflow-x-hidden flex-1 py-1">
          {isLoading && notifications.length === 0 ? (
            <div className="px-5 py-12 text-center font-body text-sm text-gray-400">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <BellSimple size={24} weight="duotone" className="text-gray-400" />
              </div>
              <p className="font-body font-semibold text-gray-700">You're all caught up</p>
              <p className="font-body text-xs text-gray-400 mt-1">
                Updates about bookings and KYC will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const Icon = ICONS[n.type]
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleTap(n)}
                      className={`w-full text-left px-5 py-3 flex gap-3 items-start active:bg-gray-50 ${
                        !n.is_read ? 'bg-primary/[0.03]' : ''
                      }`}
                    >
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${ICON_BG[n.type]}`}>
                        <Icon size={16} weight="fill" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`font-body text-sm truncate ${n.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                            {n.title}
                          </p>
                          <span className="font-body text-[10px] text-gray-400 shrink-0">
                            {relativeTime(n.created_at)}
                          </span>
                        </div>
                        <p className="font-body text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-accent mt-1.5" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
