import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, MapPin, IndianRupee } from 'lucide-react'
import { fetchBookingsByProvider, type BookingWithResident } from '@/shared/services/bookingService'
import { useProvider } from '../components/ProviderContext'
import { cn } from '@/shared/utils/cn'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import type { BookingStatus } from '@/shared/types'

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:   'badge-pending',
  confirmed: 'badge-pending',
  active:    'badge-success',
  completed: 'bg-gray-100 text-gray-600 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
  cancelled: 'badge-danger',
}

type Filter = 'all' | 'upcoming' | 'active' | 'history'
const FILTER_VALUES: Filter[] = ['all', 'upcoming', 'active', 'history']

export default function BookingsPage() {
  const { t } = useTranslation('worker')
  const { provider } = useProvider()
  const [bookings, setBookings] = useState<BookingWithResident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<Filter>('all')

  useEffect(() => {
    if (!provider) { setIsLoading(false); return }
    fetchBookingsByProvider(provider.id)
      .then(setBookings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [provider])

  const filtered = bookings.filter((b) => {
    if (filter === 'all')      return true
    if (filter === 'upcoming') return ['pending', 'confirmed'].includes(b.status)
    if (filter === 'active')   return b.status === 'active'
    if (filter === 'history')  return ['completed', 'cancelled'].includes(b.status)
    return true
  })

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-800">{t('bookings.title')}</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">{t('bookings.total', { count: bookings.length })}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-4">
        {FILTER_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-body transition-colors',
              filter === value
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 border border-gray-200',
            )}
          >
            {t(`bookings.filters.${value}`)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('bookings.no_bookings')}
          description={filter === 'all' ? t('bookings.empty_desc') : t('bookings.try_filter')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-body font-semibold text-gray-800">{b.resident.user.name ?? t('profile.resident')}</p>
                  <p className="font-body text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={11} />
                    {b.resident.block ? `${b.resident.block}-` : ''}{b.resident.flat_no}
                  </p>
                </div>
                <span className={STATUS_STYLES[b.status]}>
                  {t(`bookings.status.${b.status}`, { defaultValue: b.status })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-body pt-2 border-t border-gray-100 flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} />
                  {new Date(b.start_date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}
                  {b.end_date && ` – ${new Date(b.end_date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}`}
                </span>
                {b.amount && (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <IndianRupee size={11} />{b.amount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
