import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarX, MapPin, ToggleLeft, ToggleRight, SpinnerGap, Clock, Star } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { fetchTodayBookings, type BookingWithResident } from '@/shared/services/bookingService'
import { setProviderAvailability } from '@/shared/services/serviceProviderService'
import { useProvider } from '../components/ProviderContext'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import KycBadge from '@/shared/components/KycBadge'
import KycNudgeBanner from '../components/KycNudgeBanner'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'
import { DISPLAY_TIMES } from '@/shared/constants/timeSlots'

export default function ProviderDashboardPage() {
  const { t } = useTranslation('worker')
  const { provider, setProvider } = useProvider()
  const [bookings, setBookings] = useState<BookingWithResident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!provider) { setIsLoading(false); return }
    fetchTodayBookings(provider.id)
      .then(setBookings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [provider])

  async function handleToggleAvailability() {
    if (!provider) return
    setToggling(true)
    try {
      await setProviderAvailability(provider.id, !provider.availability)
      setProvider({ ...provider, availability: !provider.availability })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setToggling(false)
    }
  }

  if (!provider) return <LoadingSpinner />

  return (
    <div>
      {/* Header card */}
      <div className="card mb-4 bg-primary text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-white/60 text-xs">{t('dashboard.today')}</p>
            <p className="font-heading text-lg font-bold mt-0.5">
              {new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <KycBadge status={provider.kyc_status} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="font-body text-white/60 text-xs">{t('dashboard.status')}</p>
            <p className="font-heading font-bold mt-0.5">
              {provider.availability ? t('dashboard.available') : t('dashboard.unavailable')}
            </p>
          </div>
          <button
            onClick={handleToggleAvailability}
            disabled={toggling}
            className="shrink-0 disabled:opacity-50"
          >
            {toggling ? (
              <SpinnerGap size={28} weight="bold" className="animate-spin" />
            ) : provider.availability ? (
              <ToggleRight size={40} weight="fill" className="text-accent" />
            ) : (
              <ToggleLeft size={40} weight="regular" className="text-white/40" />
            )}
          </button>
        </div>
      </div>

      {/* KYC nudge */}
      <KycNudgeBanner status={provider.kyc_status} />

      {/* Services & rates */}
      <div className="card mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <p className="font-body text-xs text-gray-400">{t('dashboard.services_rates')}</p>
          <Link to="/provider/profile" className="text-xs font-semibold text-accent font-body">{t('dashboard.edit')}</Link>
        </div>
        {provider.services.length === 0 ? (
          <Link to="/provider/profile" className="block py-3 text-center text-sm text-accent font-semibold font-body border-2 border-dashed border-accent/30 rounded-xl hover:bg-accent/5 transition-colors">
            {t('dashboard.setup_services')}
          </Link>
        ) : (
          <div className="divide-y divide-gray-100">
            {provider.services.map((s) => {
              const def = SERVICE_TYPE_BY_ID[s.service_type as keyof typeof SERVICE_TYPE_BY_ID]
              if (!def) return null
              return (
                <div key={s.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  <span className="text-xl shrink-0">{def.emoji}</span>
                  <span className="font-heading font-semibold text-gray-800 text-sm flex-1 truncate">
                    {t(def.labelKey)}
                  </span>
                  <div className="flex gap-2 text-sm font-heading font-semibold text-gray-800 tabular-nums shrink-0">
                    {(s.monthly_rate ?? 0) > 0 && (
                      <span>₹{s.monthly_rate}<span className="text-gray-400 font-body font-normal text-xs">{t('profile.rate_month')}</span></span>
                    )}
                    {(s.per_visit_rate ?? 0) > 0 && (
                      <span>₹{s.per_visit_rate}<span className="text-gray-400 font-body font-normal text-xs">{t('profile.rate_visit')}</span></span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-start justify-between gap-3">
          <p className="font-body text-xs text-gray-400 flex items-center gap-1 pt-0.5"><Clock size={12} weight="duotone" />{t('dashboard.slots')}</p>
          <div className="flex flex-wrap gap-1 justify-end">
            {provider.availability_slots.length === 0 ? (
              <span className="text-xs text-gray-400 font-body">{t('dashboard.none_set')}</span>
            ) : provider.availability_slots.map((s, i) => (
              <span key={i} className="text-xs font-semibold font-body bg-primary/5 text-primary px-2 py-0.5 rounded-full tabular-nums">
                {DISPLAY_TIMES[s.start] ?? s.start}–{DISPLAY_TIMES[s.end] ?? s.end}
              </span>
            ))}
          </div>
        </div>

        {provider.rating > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1">
            <Star size={14} weight="fill" className="text-accent" />
            <span className="font-body font-semibold text-sm">{provider.rating.toFixed(1)}</span>
            <span className="font-body text-xs text-gray-400">{t('dashboard.rating')}</span>
          </div>
        )}
      </div>

      {/* Today's bookings */}
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-heading font-bold text-gray-800">{t('dashboard.todays_bookings')}</h2>
        <Link to="/provider/bookings" className="text-xs font-semibold text-accent font-body">{t('dashboard.view_all')}</Link>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-3 text-sm font-body text-danger-dark">
          {error}
        </div>
      )}

      {isLoading ? <LoadingSpinner /> : bookings.length === 0 ? (
        <EmptyState icon={CalendarX} title={t('dashboard.no_bookings')} description={t('dashboard.day_off')} />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-body font-semibold text-gray-800">{b.resident.user.name ?? t('profile.resident')}</p>
                  <p className="font-body text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} weight="duotone" />
                    {b.resident.block ? `${b.resident.block}-` : ''}{b.resident.flat_no}
                  </p>
                </div>
                <span className={b.status === 'active' ? 'badge-success' : 'badge-pending'}>
                  {t(`bookings.status.${b.status}`, { defaultValue: b.status })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
