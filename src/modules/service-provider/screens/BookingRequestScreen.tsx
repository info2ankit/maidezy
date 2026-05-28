import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BellRinging } from '@phosphor-icons/react'
import { useBookingStore } from '@/shared/stores/bookingStore'
import { useProvider } from '../components/ProviderContext'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import BookingRequestCard from '../components/BookingRequestCard'

export default function BookingRequestScreen() {
  const { t } = useTranslation('worker')
  const { provider } = useProvider()

  const pendingRequests    = useBookingStore((s) => s.pendingRequests)
  const isLoading          = useBookingStore((s) => s.isLoading)
  const error              = useBookingStore((s) => s.error)
  const fetchPendingRequests = useBookingStore((s) => s.fetchPendingRequests)
  const acceptBooking      = useBookingStore((s) => s.acceptBooking)
  const rejectBooking      = useBookingStore((s) => s.rejectBooking)

  useEffect(() => {
    if (provider?.id) fetchPendingRequests(provider.id)
  }, [provider?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 m-4">
        <p className="font-body text-sm text-danger-dark">{error}</p>
      </div>
    )
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <BellRinging size={32} weight="duotone" className="text-gray-300" />
        </div>
        <p className="font-heading font-bold text-gray-500 text-lg">{t('booking.no_pending')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingRequests.map((booking) => (
        <BookingRequestCard
          key={booking.id}
          booking={booking}
          onAccept={() => acceptBooking(booking.id, provider?.id ?? '')}
          onReject={() => rejectBooking(booking.id, provider?.id ?? '')}
        />
      ))}
    </div>
  )
}
