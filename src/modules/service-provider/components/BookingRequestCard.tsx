import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilSimple, Phone, User, Broom, Clock, CalendarBlank, CurrencyInr, ChatCircleText, Buildings, MapPin } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import { SERVICE_TYPE_BY_ID } from '@/shared/constants/serviceTypes'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { BookingRequest } from '@/shared/types/worker.types'
import ConfirmationSheet from './ConfirmationSheet'
import RescheduleProposalModal from './RescheduleProposalModal'

interface BookingRequestCardProps {
  booking:        BookingRequest
  /** Which side of the negotiation the viewer is on. Defaults to 'worker'. */
  viewerRole?:    'worker' | 'worker_admin'
  onAccept:       () => Promise<void>
  onReject:       () => Promise<void>
  onReschedule?:  (input: { arrivalTime: string; daysOfWeek: WorkingDayId[]; note: string | null; price: number }) => Promise<void>
  /** Pulls the proposal back to pending (only meaningful when this viewer is the proposer). */
  onWithdraw?:    () => Promise<void>
  /** Optional worker name/mobile strip — shown in worker-admin view. */
  workerStrip?:   { name: string; mobile: string } | null
}

type ConfirmAction = 'accept' | 'reject' | null

export default function BookingRequestCard({
  booking,
  viewerRole = 'worker',
  onAccept,
  onReject,
  onReschedule,
  onWithdraw,
  workerStrip,
}: BookingRequestCardProps) {
  const { t } = useTranslation('worker')
  const [confirming, setConfirming] = useState<ConfirmAction>(null)
  const [loading, setLoading] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)

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

  async function handleSubmitReschedule(input: { arrivalTime: string; daysOfWeek: WorkingDayId[]; note: string | null; price: number }) {
    if (!onReschedule) return
    setLoading(true)
    try {
      await onReschedule(input)
    } finally {
      setLoading(false)
      setShowReschedule(false)
    }
  }

  const serviceLabels = booking.serviceTypeIds
    .map((id) => {
      const def = SERVICE_TYPE_BY_ID[id as keyof typeof SERVICE_TYPE_BY_ID]
      return def ? t(def.labelKey) : id
    })
    .join(' + ')

  const dayLabels = booking.daysOfWeek.map((d) => t(`days.${d}`)).join(' ')
  const displayTime = DISPLAY_TIMES[booking.arrivalTime] ?? booking.arrivalTime
  const modeLabel = booking.pricingMode === 'monthly' ? t('profile.per_month') : t('profile.per_visit')

  const isReschedule = booking.status === 'reschedule_requested'

  const flatAddress = [booking.residentBlock, booking.residentFlatNo].filter(Boolean).join('-') || booking.residentFlatNo

  // Whose turn is it? When the latest proposer is on our side (worker side),
  // we're waiting for the resident. When the resident proposed, it's our turn
  // to accept / decline / counter.
  const proposerRole = booking.proposedByRole
  const isOurProposal = isReschedule && (proposerRole === 'worker' || proposerRole === 'worker_admin')
  const isResidentProposal = isReschedule && proposerRole === 'resident'
  // Always reachable for completeness — used by viewer-specific UI below
  void viewerRole

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Worker contact strip (worker-admin view) */}
        {workerStrip && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/10">
            <div className="min-w-0">
              <p className="font-body text-[10px] font-bold text-primary uppercase tracking-wider">Worker</p>
              <p className="font-body font-semibold text-sm text-gray-800 truncate">{workerStrip.name}</p>
            </div>
            {workerStrip.mobile && (
              <a
                href={`tel:${workerStrip.mobile}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 inline-flex items-center gap-1 bg-white border border-primary/20 text-primary font-body font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-primary/5"
              >
                <Phone size={12} weight="fill" />
                Call
              </a>
            )}
          </div>
        )}

        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          {/* Resident + status badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <User size={20} weight="fill" className="text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-bold text-gray-800 text-base truncate">
                  {booking.residentName || t('booking.wants')}
                </p>
                {booking.residentMobile && (
                  <p className="font-body text-xs text-gray-500 truncate">{booking.residentMobile}</p>
                )}
              </div>
            </div>
            <span className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-body font-semibold border whitespace-nowrap',
              isOurProposal
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : isResidentProposal
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200',
            )}>
              {isOurProposal
                ? t('booking.badge_awaiting')
                : isResidentProposal
                  ? t('booking.badge_resident_counter')
                  : t('booking.new_request')}
            </span>
          </div>

          {/* Address block — what worker actually needs to reach the home */}
          {(booking.societyName || flatAddress) && (
            <div className="mb-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 space-y-1.5">
              {booking.societyName && (
                <div className="flex items-center gap-2">
                  <Buildings size={14} weight="duotone" className="text-gray-500 shrink-0" />
                  <span className="font-body text-sm font-semibold text-gray-800 truncate">{booking.societyName}</span>
                </div>
              )}
              {flatAddress && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} weight="duotone" className="text-gray-500 shrink-0" />
                  <span className="font-body text-sm text-gray-700">{flatAddress}</span>
                </div>
              )}
              {booking.residentMobile && (
                <a
                  href={`tel:${booking.residentMobile}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 inline-flex items-center gap-1.5 bg-white border border-success/30 text-success font-body font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-success/5 active:scale-[0.98] transition-all"
                >
                  <Phone size={12} weight="fill" />
                  {t('booking.call_resident')}
                </a>
              )}
            </div>
          )}

          {/* Info rows */}
          <div className="space-y-1.5">
            {serviceLabels && (
              <div className="flex items-center gap-2">
                <Broom size={14} weight="duotone" className="text-gray-400 shrink-0" />
                <span className="font-body text-sm text-gray-700 truncate">{serviceLabels}</span>
              </div>
            )}
            {displayTime && (
              <div className="flex items-center gap-2">
                <Clock size={14} weight="duotone" className="text-gray-400 shrink-0" />
                <span className="font-body text-sm text-gray-600">{displayTime}</span>
              </div>
            )}
            {dayLabels && (
              <div className="flex items-center gap-2">
                <CalendarBlank size={14} weight="duotone" className="text-gray-400 shrink-0" />
                <span className="font-body text-sm text-gray-600">{dayLabels}</span>
              </div>
            )}
          </div>

          {/* Price callout */}
          <div className="mt-3 flex items-baseline gap-1.5 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2">
            <CurrencyInr size={16} weight="bold" className="text-primary self-center" />
            <span className="font-heading font-bold text-primary text-lg leading-none">
              {booking.totalPrice.toLocaleString('en-IN')}
            </span>
            <span className="font-body text-xs text-gray-500 ml-auto">{modeLabel}</span>
          </div>

          {/* Counter-offer block */}
          {isReschedule && booking.proposedArrivalTime && (
            <div className={cn(
              'mt-3 border rounded-xl px-3 py-2.5',
              isResidentProposal ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100',
            )}>
              <p className={cn(
                'font-body text-[10px] font-bold uppercase tracking-wider mb-2',
                isResidentProposal ? 'text-purple-700' : 'text-blue-700',
              )}>
                {isResidentProposal ? t('booking.label_resident_offer') : t('booking.label_your_offer')}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Clock size={14} weight="duotone" className="text-gray-500 shrink-0" />
                  <span className="font-body text-sm text-gray-700">
                    {DISPLAY_TIMES[booking.proposedArrivalTime] ?? booking.proposedArrivalTime}
                  </span>
                </div>
                {booking.proposedDaysOfWeek && booking.proposedDaysOfWeek.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CalendarBlank size={14} weight="duotone" className="text-gray-500 shrink-0" />
                    <span className="font-body text-sm text-gray-700">
                      {booking.proposedDaysOfWeek.map((d) => t(`days.${d}`)).join(' ')}
                    </span>
                  </div>
                )}
                {booking.proposedPrice !== null && booking.proposedPrice !== booking.totalPrice && (
                  <div className="flex items-center gap-2">
                    <CurrencyInr size={14} weight="bold" className="text-gray-500 shrink-0" />
                    <span className="font-body text-sm font-semibold text-gray-800">
                      {booking.proposedPrice.toLocaleString('en-IN')}
                    </span>
                    {booking.proposedPrice > booking.totalPrice && (
                      <span className="font-body text-[11px] font-semibold text-emerald-700">
                        +₹{(booking.proposedPrice - booking.totalPrice).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}
                {booking.proposedNote && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <ChatCircleText size={12} weight="duotone" className="text-gray-400 shrink-0 mt-1" />
                    <span className="font-body text-xs text-gray-500 italic">"{booking.proposedNote}"</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Withdraw link — only when we're waiting on the resident */}
        {isOurProposal && onWithdraw && (
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={async () => {
                setLoading(true)
                try { await onWithdraw() } finally { setLoading(false) }
              }}
              disabled={loading}
              className="font-body font-semibold text-xs text-gray-500 hover:text-danger transition-colors disabled:opacity-50"
            >
              {t('booking.withdraw')}
            </button>
          </div>
        )}

        {/* Action buttons — shown for fresh requests AND when resident has counter-proposed */}
        {(!isReschedule || isResidentProposal) && (
          <div className={cn('grid gap-px bg-gray-100', onReschedule ? 'grid-cols-3' : 'grid-cols-2')}>
            <button
              type="button"
              onClick={() => setConfirming('accept')}
              disabled={loading}
              className={cn(
                'min-h-[52px] bg-white font-heading font-bold text-xs text-success px-2',
                'hover:bg-success/5 transition-colors active:scale-[0.98]',
                loading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {t('booking.accept')}
            </button>
            {onReschedule && (
              <button
                type="button"
                onClick={() => setShowReschedule(true)}
                disabled={loading}
                className={cn(
                  'min-h-[52px] bg-white font-heading font-bold text-xs text-blue-700 px-2 inline-flex items-center justify-center gap-1',
                  'hover:bg-blue-50 transition-colors active:scale-[0.98]',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              >
                <PencilSimple size={14} weight="bold" />
                {t('booking.counter_button')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirming('reject')}
              disabled={loading}
              className={cn(
                'min-h-[52px] bg-white font-heading font-bold text-xs text-danger px-2',
                'hover:bg-danger-light transition-colors active:scale-[0.98]',
                loading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {t('booking.reject')}
            </button>
          </div>
        )}
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

      {showReschedule && (
        <RescheduleProposalModal
          initialArrivalTime={booking.proposedArrivalTime ?? booking.arrivalTime}
          initialDays={(booking.proposedDaysOfWeek ?? booking.daysOfWeek) as WorkingDayId[]}
          currentPrice={booking.proposedPrice ?? booking.totalPrice}
          isSubmitting={loading}
          onClose={() => setShowReschedule(false)}
          onSubmit={handleSubmitReschedule}
        />
      )}
    </>
  )
}
