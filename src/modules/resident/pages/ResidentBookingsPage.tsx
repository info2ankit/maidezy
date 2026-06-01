import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck, Clock, CurrencyInr, XCircle, SpinnerGap,
  User as UserIcon, CheckCircle, Hourglass, Prohibit,
} from '@phosphor-icons/react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { SPRING, SPRING_SNAPPY, staggerContainer, staggerItem } from '@/shared/utils/motion'
import { useResidentStore } from '../stores/residentStore'
import { useAuthStore } from '@/shared/stores/authStore'
import {
  fetchResidentBookings,
  cancelResidentBooking,
  residentAcceptReschedule,
  residentRejectReschedule,
  residentCounterReschedule,
  residentWithdrawReschedule,
} from '../services/residentPortalService'
import RescheduleProposalModal from '@/modules/service-provider/components/RescheduleProposalModal'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { ResidentBookingRow } from '../services/residentPortalService'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import BookingDetailModal from '../components/BookingDetailModal'

type Tab = 'pending' | 'active' | 'history'

const SERVICE_LABELS: Record<string, string> = {
  maid: 'Maid', jhadu_pocha: 'Jhadu Pocha', bartan: 'Bartan',
  cooking: 'Cooking', car_cleaning: 'Car Cleaning', laundry: 'Laundry',
  child_care: 'Child Care', elder_care: 'Elder Care', deep_cleaning: 'Deep Cleaning', full_time: 'Full Time',
}

const SERVICE_PILL_COLORS: Record<string, string> = {
  maid:          'bg-purple-100 text-purple-700',
  jhadu_pocha:   'bg-blue-100 text-blue-700',
  bartan:        'bg-teal-100 text-teal-700',
  cooking:       'bg-orange-100 text-orange-700',
  car_cleaning:  'bg-slate-100 text-slate-700',
  laundry:       'bg-sky-100 text-sky-700',
  child_care:    'bg-pink-100 text-pink-700',
  elder_care:    'bg-rose-100 text-rose-700',
  deep_cleaning: 'bg-green-100 text-green-700',
  full_time:     'bg-indigo-100 text-indigo-700',
}

const DAY_SHORT: Record<string, string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S',
}

const DISPLAY_TIMES: Record<string, string> = {
  '05:00': '5 AM', '06:00': '6 AM', '07:00': '7 AM', '08:00': '8 AM',
  '09:00': '9 AM', '10:00': '10 AM', '11:00': '11 AM', '12:00': '12 PM',
  '13:00': '1 PM', '14:00': '2 PM', '15:00': '3 PM', '16:00': '4 PM',
  '17:00': '5 PM', '18:00': '6 PM', '19:00': '7 PM', '20:00': '8 PM',
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Hourglass }> = {
  pending:              { label: 'Pending',           cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Hourglass },
  reschedule_requested: { label: 'Reschedule offer',  cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: Hourglass },
  accepted:             { label: 'Confirmed',         cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle },
  active:               { label: 'Active',            cls: 'bg-success-light text-success-dark border-success/30', icon: CheckCircle },
  completed:            { label: 'Completed',         cls: 'bg-gray-100 text-gray-600 border-gray-200',      icon: CheckCircle },
  cancelled:            { label: 'Cancelled',         cls: 'bg-danger-light text-danger-dark border-danger/20', icon: Prohibit },
  rejected:             { label: 'Rejected',          cls: 'bg-danger-light text-danger-dark border-danger/20', icon: XCircle },
}

const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

export default function ResidentBookingsPage() {
  const { t } = useTranslation('resident')
  const { resident, decPendingCount } = useResidentStore()
  const [bookings, setBookings]       = useState<ResidentBookingRow[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [tab, setTab]                 = useState<Tab>('pending')
  const [pendingCancel, setPendingCancel] = useState<ResidentBookingRow | null>(null)
  const [cancelling, setCancelling]   = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<ResidentBookingRow | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [counterBooking, setCounterBooking] = useState<ResidentBookingRow | null>(null)
  const [counterSubmitting, setCounterSubmitting] = useState(false)
  const residentUserId = useAuthStore((s) => s.user?.id)

  async function handleAcceptReschedule(b: ResidentBookingRow) {
    setReschedulingId(b.id)
    try {
      await residentAcceptReschedule(b.id)
      setBookings((prev) => prev.map((x) =>
        x.id === b.id
          ? {
              ...x,
              status: 'accepted',
              arrivalTime: x.proposedArrivalTime ?? x.arrivalTime,
              daysOfWeek: x.proposedDaysOfWeek ?? x.daysOfWeek,
              proposedArrivalTime: null,
              proposedDaysOfWeek: null,
              proposedNote: null,
            }
          : x,
      ))
      decPendingCount()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setReschedulingId(null)
    }
  }

  async function handleRejectReschedule(b: ResidentBookingRow) {
    setReschedulingId(b.id)
    try {
      await residentRejectReschedule(b.id)
      setBookings((prev) => prev.map((x) =>
        x.id === b.id
          ? { ...x, status: 'cancelled', proposedArrivalTime: null, proposedDaysOfWeek: null, proposedNote: null }
          : x,
      ))
      decPendingCount()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setReschedulingId(null)
    }
  }

  async function handleWithdrawCounter(b: ResidentBookingRow) {
    setReschedulingId(b.id)
    try {
      await residentWithdrawReschedule(b.id)
      setBookings((prev) => prev.map((x) =>
        x.id === b.id
          ? {
              ...x,
              status: 'pending',
              proposedArrivalTime: null,
              proposedDaysOfWeek: null,
              proposedNote: null,
              proposedByRole: null,
              proposedBy: null,
            }
          : x,
      ))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setReschedulingId(null)
    }
  }

  async function handleSubmitCounter(input: { arrivalTime: string; daysOfWeek: WorkingDayId[]; note: string | null; price: number }) {
    if (!counterBooking || !residentUserId) return
    setCounterSubmitting(true)
    try {
      await residentCounterReschedule(
        counterBooking.id,
        counterBooking.workerProviderId,
        residentUserId,
        input,
      )
      setBookings((prev) => prev.map((x) =>
        x.id === counterBooking.id
          ? {
              ...x,
              status: 'reschedule_requested',
              proposedArrivalTime: input.arrivalTime,
              proposedDaysOfWeek: input.daysOfWeek,
              proposedNote: input.note,
              proposedPrice: input.price,
              proposedByRole: 'resident',
              proposedBy: residentUserId,
            }
          : x,
      ))
      setCounterBooking(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCounterSubmitting(false)
    }
  }

  async function load() {
    if (!resident?.id) return
    setIsLoading(true)
    try {
      const rows = await fetchResidentBookings(resident.id)
      setBookings(rows)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [resident?.id])

  async function confirmCancel() {
    if (!pendingCancel) return
    setCancelling(true)
    try {
      await cancelResidentBooking(pendingCancel.id)
      setBookings((prev) =>
        prev.map((b) => b.id === pendingCancel.id ? { ...b, status: 'cancelled' } : b)
      )
      if (pendingCancel.status === 'pending') decPendingCount()
      setPendingCancel(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  const filtered = bookings.filter((b) => {
    if (tab === 'pending') return b.status === 'pending' || b.status === 'reschedule_requested'
    if (tab === 'active')  return b.status === 'accepted' || b.status === 'active'
    return ['completed', 'cancelled', 'rejected'].includes(b.status)
  })

  const tabCounts = {
    pending: bookings.filter((b) => b.status === 'pending' || b.status === 'reschedule_requested').length,
    active:  bookings.filter((b) => b.status === 'accepted' || b.status === 'active').length,
    history: bookings.filter((b) => ['completed', 'cancelled', 'rejected'].includes(b.status)).length,
  }

  return (
    <div className="px-4 pt-4">
      <motion.div
        className="mb-5"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        <h1 className="font-heading text-2xl font-bold text-gray-800">My Bookings</h1>
        <p className="font-body text-sm text-gray-400 mt-0.5">Track all your service requests</p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
            className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4 text-sm font-body text-danger-dark"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <motion.div
        className="flex gap-2 mb-5 overflow-x-auto pb-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.06 }}
      >
        <LayoutGroup id="bookings-tabs">
          {(['pending', 'active', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'relative px-4 py-2 rounded-full text-sm font-body font-semibold shrink-0 capitalize flex items-center gap-1.5 transition-colors',
                tab === t ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {tab === t && (
                <motion.span
                  layoutId="bookings-tab-pill"
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={SPRING_SNAPPY}
                />
              )}
              <span className="relative z-10">{t}</span>
              {tabCounts[t] > 0 && (
                <span className={[
                  'relative z-10 text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center',
                  tab === t ? 'bg-white/20' : 'bg-gray-200 text-gray-600',
                ].join(' ')}>
                  {tabCounts[t]}
                </span>
              )}
            </button>
          ))}
        </LayoutGroup>
      </motion.div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <motion.div
          key={`empty-${tab}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
        >
          <EmptyState
            icon={CalendarCheck}
            title={
              tab === 'pending' ? 'No pending requests'
              : tab === 'active' ? 'No active bookings'
              : 'No booking history yet'
            }
            description={
              tab === 'pending'
                ? 'Booking requests waiting for worker response will show up here.'
                : tab === 'active'
                ? 'Confirmed and ongoing bookings will appear here.'
                : 'Completed and cancelled bookings will appear here.'
            }
          />
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
          {filtered.map((b) => {
            const meta = STATUS_META[b.status] ?? STATUS_META.pending
            const StatusIcon = meta.icon
            const isReschedule = b.status === 'reschedule_requested'
            const isMyProposal = isReschedule && b.proposedByRole === 'resident'

            // Left-border accent + hint text per status
            const accentCls = {
              pending:              'border-l-amber-400',
              reschedule_requested: 'border-l-blue-400',
              accepted:             'border-l-primary',
              active:               'border-l-emerald-500',
              completed:            'border-l-gray-300',
              cancelled:            'border-l-red-300',
              rejected:             'border-l-red-300',
            }[b.status] ?? 'border-l-gray-200'

            const hintText = {
              pending:              'Waiting for worker response',
              reschedule_requested: isMyProposal ? 'You sent a counter-offer' : 'Worker proposed new schedule',
              accepted:             'Booking confirmed — worker is set',
              active:               'Service is currently ongoing',
              completed:            'Service completed',
              cancelled:            'This booking was cancelled',
              rejected:             'Worker was unable to accept',
            }[b.status] ?? ''

            return (
              <motion.div
                key={b.id}
                variants={staggerItem}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${accentCls} overflow-hidden cursor-pointer active:scale-[0.985] transition-transform`}
                whileTap={{ scale: 0.984 }}
                transition={SPRING}
                onClick={() => setSelectedBooking(b)}
              >
                {/* Main content */}
                <div className="px-4 pt-4 pb-3 space-y-3">

                  {/* Worker row */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      {b.workerPhoto ? (
                        <img src={b.workerPhoto} alt={b.workerName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={22} weight="duotone" className="text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-gray-900 text-base leading-tight truncate">
                        {b.workerName || 'Worker'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {b.serviceTypeIds.map((s) => (
                          <span key={s} className={`text-[11px] font-body font-semibold px-2 py-0.5 rounded-full ${SERVICE_PILL_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
                            {SERVICE_LABELS[s] ?? s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-body font-semibold border ${meta.cls}`}>
                      <StatusIcon size={10} weight="fill" />
                      {meta.label}
                    </span>
                  </div>

                  {/* Schedule strip */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock size={13} weight="duotone" className="text-primary/60" />
                      <span className="font-body text-xs font-semibold text-gray-700">
                        {DISPLAY_TIMES[b.arrivalTime?.slice(0, 5)] ?? b.arrivalTime}
                      </span>
                    </div>
                    <div className="w-px h-3 bg-gray-200" />
                    <div className="flex gap-1">
                      {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((d) => {
                        const active = b.daysOfWeek.includes(d)
                        return (
                          <span
                            key={d}
                            className={[
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                              active ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-300 border border-gray-100',
                            ].join(' ')}
                          >
                            {DAY_SHORT[d]}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Status hint */}
                  {hintText && (
                    <p className="font-body text-xs text-gray-400 leading-snug">{hintText}</p>
                  )}

                  {/* Reschedule proposal inline — only the action buttons, details open on tap */}
                  {isReschedule && b.proposedArrivalTime && !isMyProposal && (
                    <div
                      className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="font-body text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">
                        {t('counter.banner_worker')}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-body text-gray-700 mb-2.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={11} weight="duotone" className="text-blue-500" />
                          {DISPLAY_TIMES[b.proposedArrivalTime.slice(0, 5)] ?? b.proposedArrivalTime}
                        </span>
                        <span className="text-gray-400">·</span>
                        <span>{(b.proposedDaysOfWeek ?? []).map((d) => DAY_LABEL[d] ?? d).join(', ')}</span>
                        {b.proposedPrice !== null && b.proposedPrice !== b.totalPrice && (
                          <>
                            <span className="text-gray-400">·</span>
                            <span className="font-semibold">
                              ₹{b.proposedPrice.toLocaleString('en-IN')}
                              <span className={`ml-1 text-[10px] ${b.proposedPrice > b.totalPrice ? 'text-rose-600' : 'text-emerald-600'}`}>
                                ({b.proposedPrice > b.totalPrice ? '+' : '−'}₹{Math.abs(b.proposedPrice - b.totalPrice).toLocaleString('en-IN')})
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                      {b.proposedNote && (
                        <p className="font-body text-xs text-gray-500 italic mb-2">"{b.proposedNote}"</p>
                      )}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          disabled={reschedulingId === b.id}
                          onClick={() => handleAcceptReschedule(b)}
                          className="bg-success text-white font-body font-semibold text-xs py-2 rounded-lg active:scale-[0.97] disabled:opacity-50 transition-transform"
                        >
                          {t('counter.accept')}
                        </button>
                        <button
                          disabled={reschedulingId === b.id}
                          onClick={() => setCounterBooking(b)}
                          className="bg-white border border-primary/30 text-primary font-body font-semibold text-xs py-2 rounded-lg active:scale-[0.97] disabled:opacity-50 transition-transform"
                        >
                          {t('counter.counter')}
                        </button>
                        <button
                          disabled={reschedulingId === b.id}
                          onClick={() => handleRejectReschedule(b)}
                          className="bg-white border border-danger/20 text-danger font-body font-semibold text-xs py-2 rounded-lg active:scale-[0.97] disabled:opacity-50 transition-transform"
                        >
                          {t('counter.decline')}
                        </button>
                      </div>
                    </div>
                  )}

                  {isReschedule && isMyProposal && (
                    <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <p className="font-body text-xs text-purple-700 font-semibold">{t('counter.banner_mine')}</p>
                      <button
                        disabled={reschedulingId === b.id}
                        onClick={() => handleWithdrawCounter(b)}
                        className="font-body font-semibold text-xs text-gray-500 hover:text-danger transition-colors disabled:opacity-50"
                      >
                        {t('counter.withdraw')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/60 border-t border-gray-100">
                  <div className="flex items-baseline gap-0.5">
                    <CurrencyInr size={14} weight="bold" className="text-primary self-center" />
                    <span className="font-heading text-lg font-bold text-primary leading-none">
                      {b.totalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="font-body text-xs text-gray-400 ml-0.5">
                      /{b.pricingMode === 'monthly' ? 'mo' : 'visit'}
                    </span>
                  </div>
                  {b.status === 'pending' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingCancel(b) }}
                      className="text-xs font-body font-semibold text-danger flex items-center gap-1 py-1.5 px-3 rounded-lg bg-danger-light border border-danger/15 active:scale-[0.97] transition-transform"
                    >
                      <XCircle size={12} weight="fill" />
                      Cancel
                    </button>
                  ) : (
                    <span className="font-body text-xs text-gray-400">Tap for details</span>
                  )}
                </div>
              </motion.div>
            )
          })}
          </motion.div>
        </AnimatePresence>
      )}

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancelled={(id) => {
            const wasPending = bookings.find((b) => b.id === id)?.status === 'pending'
            setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b))
            if (wasPending) decPendingCount()
            setSelectedBooking(null)
          }}
          onCancelRequest={(b) => { setSelectedBooking(null); setPendingCancel(b) }}
        />
      )}

      {counterBooking && (
        <RescheduleProposalModal
          initialArrivalTime={counterBooking.proposedArrivalTime ?? counterBooking.arrivalTime}
          initialDays={(counterBooking.proposedDaysOfWeek ?? counterBooking.daysOfWeek) as WorkingDayId[]}
          currentPrice={counterBooking.proposedPrice ?? counterBooking.totalPrice}
          isSubmitting={counterSubmitting}
          onClose={() => setCounterBooking(null)}
          onSubmit={handleSubmitCounter}
        />
      )}

      {pendingCancel && (
        <ConfirmDialog
          title="Cancel booking?"
          message={`Cancel your booking request with ${pendingCancel.workerName || 'this worker'}? This action cannot be undone.`}
          confirmLabel="Yes, Cancel"
          cancelLabel="Keep Booking"
          variant="danger"
          isLoading={cancelling}
          onConfirm={confirmCancel}
          onCancel={() => setPendingCancel(null)}
        />
      )}
    </div>
  )
}

void SpinnerGap
