import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/cn'
import { DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'
import type { BookingRequest } from '@/shared/types/worker.types'
import ConfirmationSheet from './ConfirmationSheet'

interface BookingRequestCardProps {
  booking:   BookingRequest
  onAccept:  () => Promise<void>
  onReject:  () => Promise<void>
}

type ConfirmAction = 'accept' | 'reject' | null

export default function BookingRequestCard({ booking, onAccept, onReject }: BookingRequestCardProps) {
  const { t } = useTranslation('worker')
  const [confirming, setConfirming] = useState<ConfirmAction>(null)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      if (confirming === 'accept') await onAccept()
      else if (confirming === 'reject') await onReject()
    } finally {
      setLoading(false)
      setConfirming(null)
    }
  }

  const serviceLabels = booking.serviceTypeIds
    .map((id) => {
      const def = SERVICE_TYPE_BY_ID[id as keyof typeof SERVICE_TYPE_BY_ID]
      return def ? `${def.emoji} ${t(def.labelKey)}` : id
    })
    .join(' + ')

  const dayLabels = booking.daysOfWeek.map((d) => t(`days.${d}`)).join(' ')
  const displayTime = DISPLAY_TIMES[booking.arrivalTime] ?? booking.arrivalTime
  const modeLabel = booking.pricingMode === 'monthly' ? t('profile.per_month') : t('profile.per_visit')

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-heading font-bold text-gray-800 text-base">
                👤 {booking.residentName || t('booking.wants')}
              </p>
              {booking.residentFlatNo && (
                <p className="font-body text-xs text-gray-400 mt-0.5">{booking.residentFlatNo}</p>
              )}
            </div>
            <span className="shrink-0 bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 text-[10px] font-body font-semibold">
              {t('booking.new_request')}
            </span>
          </div>

          <p className="font-body text-sm text-gray-700 mb-1">🧹 {serviceLabels}</p>
          <p className="font-body text-sm text-gray-500">⏰ {displayTime}</p>
          <p className="font-body text-sm text-gray-500">📅 {dayLabels}</p>
          <p className="font-heading font-bold text-primary text-base mt-2">
            💰 ₹{booking.totalPrice.toLocaleString('en-IN')}{' '}
            <span className="font-body text-xs text-gray-400 font-normal">{modeLabel}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-px bg-gray-100">
          <button
            type="button"
            onClick={() => setConfirming('accept')}
            disabled={loading}
            className={cn(
              'min-h-[56px] bg-white font-heading font-bold text-sm text-success',
              'hover:bg-success/5 transition-colors active:scale-[0.98]',
              loading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {t('booking.accept')}
          </button>
          <button
            type="button"
            onClick={() => setConfirming('reject')}
            disabled={loading}
            className={cn(
              'min-h-[56px] bg-white font-heading font-bold text-sm text-danger',
              'hover:bg-danger-light transition-colors active:scale-[0.98]',
              loading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {t('booking.reject')}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmationSheet
          title={confirming === 'accept' ? t('booking.accept') : t('booking.reject')}
          message={confirming === 'accept' ? t('booking.confirm_accept') : t('booking.confirm_reject')}
          confirmLabel={confirming === 'accept' ? t('booking.yes_accept') : t('booking.yes_reject')}
          cancelLabel={t('booking.cancel')}
          isDangerous={confirming === 'reject'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  )
}
