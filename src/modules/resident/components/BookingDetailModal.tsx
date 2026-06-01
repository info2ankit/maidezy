import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, User as UserIcon, Clock, CalendarDot, ClockAfternoon,
  CurrencyInr, Hourglass, CheckCircle, Prohibit, XCircle,
} from '@phosphor-icons/react'
import { DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { WorkerShift } from '@/shared/types/worker.types'
import {
  fetchBookingDetailExtras,
  type ResidentBookingRow,
  type WorkerPricing,
} from '../services/residentPortalService'

const SERVICE_LABELS: Record<string, string> = {
  maid: 'Maid', jhadu_pocha: 'Jhadu Pocha', bartan: 'Bartan',
  cooking: 'Cooking', car_cleaning: 'Car Cleaning', laundry: 'Laundry',
  child_care: 'Child Care', elder_care: 'Elder Care',
  deep_cleaning: 'Deep Cleaning', full_time: 'Full Time',
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

const DAY_INITIALS: { id: WorkingDayId; label: string }[] = [
  { id: 'mon', label: 'M' }, { id: 'tue', label: 'T' }, { id: 'wed', label: 'W' },
  { id: 'thu', label: 'T' }, { id: 'fri', label: 'F' }, { id: 'sat', label: 'S' },
  { id: 'sun', label: 'S' },
]

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Hourglass; desc: string }> = {
  pending:   {
    label: 'Pending', icon: Hourglass,
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    desc: 'Waiting for the worker to accept your request.',
  },
  accepted:  {
    label: 'Confirmed', icon: CheckCircle,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Worker has accepted. Discuss final details with them.',
  },
  active:    {
    label: 'Active', icon: CheckCircle,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Service is ongoing.',
  },
  completed: {
    label: 'Completed', icon: CheckCircle,
    cls: 'bg-gray-100 text-gray-600 border-gray-200',
    desc: 'This service has been completed.',
  },
  cancelled: {
    label: 'Cancelled', icon: Prohibit,
    cls: 'bg-red-50 text-red-700 border-red-200',
    desc: 'This booking was cancelled.',
  },
  rejected:  {
    label: 'Rejected', icon: XCircle,
    cls: 'bg-red-50 text-red-700 border-red-200',
    desc: 'The worker was unable to accept this request.',
  },
}

function formatShift(s: WorkerShift) {
  return `${DISPLAY_TIMES[s.start] ?? s.start} – ${DISPLAY_TIMES[s.end] ?? s.end}`
}

interface Props {
  booking: ResidentBookingRow
  onClose: () => void
  onCancelled: (bookingId: string) => void
  onCancelRequest: (booking: ResidentBookingRow) => void
}

export default function BookingDetailModal({ booking, onClose, onCancelRequest }: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [extras, setExtras] = useState<{ shifts: WorkerShift[]; workingDays: WorkingDayId[]; pricing: WorkerPricing[] } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (booking.workerId && booking.serviceTypeIds.length > 0) {
      fetchBookingDetailExtras(booking.workerId, booking.serviceTypeIds)
        .then(setExtras)
        .catch(() => setExtras(null))
    }
  }, [booking.workerId, booking.serviceTypeIds])

  function handleClose() {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const meta = STATUS_META[booking.status] ?? STATUS_META.pending
  const StatusIcon = meta.icon

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur shadow-sm border border-gray-100 flex items-center justify-center z-10"
        >
          <X size={16} weight="bold" className="text-gray-500" />
        </button>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-5 bg-gradient-to-b from-primary/[0.06] to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden shadow">
              {booking.workerPhoto ? (
                <img src={booking.workerPhoto} alt={booking.workerName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={28} weight="duotone" className="text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-bold text-gray-900 text-lg leading-tight truncate">
                {booking.workerName || 'Worker'}
              </h2>
              <span
                className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-body font-semibold border ${meta.cls}`}
              >
                <StatusIcon size={11} weight="fill" />
                {meta.label}
              </span>
            </div>
          </div>
          <p className="font-body text-xs text-gray-400 mt-3">{meta.desc}</p>
        </div>

        {/* ── Your Request ─────────────────────────────────────────────── */}
        <div className="px-5 py-5 border-t border-gray-100">
          <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Your Request
          </p>

          {/* Booking type */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-body text-xs text-gray-400 w-20 shrink-0">Type</span>
            <span className="font-body text-xs font-semibold text-gray-700">
              {booking.pricingMode === 'per_visit' ? 'One-time Visit' : 'Regular Schedule'}
            </span>
          </div>

          {/* Services */}
          <div className="flex items-start gap-2 mb-3">
            <span className="font-body text-xs text-gray-400 w-20 shrink-0 pt-0.5">Services</span>
            <div className="flex flex-wrap gap-1.5">
              {booking.serviceTypeIds.map((s) => (
                <span
                  key={s}
                  className={`text-xs font-body font-semibold px-2.5 py-1 rounded-full ${SERVICE_PILL_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {SERVICE_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </div>

          {/* Arrival time */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-body text-xs text-gray-400 w-20 shrink-0">Arrival</span>
            <div className="flex items-center gap-1.5">
              <Clock size={13} weight="duotone" className="text-primary/60" />
              <span className="font-body text-xs font-semibold text-gray-700">
                {DISPLAY_TIMES[booking.arrivalTime?.slice(0, 5)] ?? booking.arrivalTime ?? '—'}
              </span>
            </div>
          </div>

          {/* Days */}
          {booking.daysOfWeek.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-gray-400 w-20 shrink-0">Days</span>
              <div className="flex gap-1">
                {DAY_INITIALS.map((d) => (
                  <span
                    key={d.id}
                    className={`font-body text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      booking.daysOfWeek.includes(d.id)
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Pricing breakdown ────────────────────────────────────────── */}
        <div className="px-5 py-5 border-t border-gray-100">
          <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Pricing
          </p>

          {extras?.pricing && extras.pricing.length > 0 ? (
            <div className="space-y-2 mb-3">
              {extras.pricing.map((p) => (
                <div key={p.serviceTypeId} className="flex items-center justify-between">
                  <span className="font-body text-sm text-gray-600">
                    {SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId}
                  </span>
                  <span className="font-body text-sm font-semibold text-gray-800">
                    ₹{booking.pricingMode === 'monthly' ? p.monthlyRate : p.perVisitRate}
                    <span className="font-normal text-gray-400 text-xs ml-0.5">
                      /{booking.pricingMode === 'monthly' ? 'mo' : 'visit'}
                    </span>
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="font-body text-sm font-semibold text-gray-600">Total</span>
                <div className="flex items-center gap-0.5">
                  <CurrencyInr size={15} weight="bold" className="text-primary" />
                  <span className="font-heading font-bold text-primary text-xl">{booking.totalPrice}</span>
                  <span className="font-body text-xs text-gray-400 ml-0.5">
                    /{booking.pricingMode === 'monthly' ? 'mo' : 'visit'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-primary/5 rounded-2xl px-4 py-3">
              <span className="font-body text-sm font-semibold text-gray-600">Total</span>
              <div className="flex items-center gap-0.5">
                <CurrencyInr size={15} weight="bold" className="text-primary" />
                <span className="font-heading font-bold text-primary text-xl">{booking.totalPrice}</span>
                <span className="font-body text-xs text-gray-400 ml-0.5">
                  /{booking.pricingMode === 'monthly' ? 'mo' : 'visit'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Worker's Schedule ────────────────────────────────────────── */}
        {extras && (extras.shifts.length > 0 || extras.workingDays.length > 0) && (
          <div className="px-5 py-5 border-t border-gray-100">
            <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              Worker's Available Schedule
            </p>

            {extras.workingDays.length > 0 && (
              <div className="flex items-center gap-2.5 mb-3">
                <CalendarDot size={16} weight="fill" className="text-primary/50 shrink-0" />
                <div className="flex gap-1">
                  {DAY_INITIALS.map((d) => (
                    <span
                      key={d.id}
                      className={`font-body text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        extras.workingDays.includes(d.id)
                          ? 'bg-primary/20 text-primary'
                          : 'text-gray-300'
                      }`}
                    >
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {extras.shifts.length > 0 && (
              <div className="flex items-start gap-2.5">
                <ClockAfternoon size={16} weight="fill" className="text-primary/50 shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-2">
                  {extras.shifts.map((s, i) => (
                    <span
                      key={i}
                      className="font-body text-sm text-gray-700 font-medium bg-gray-50 rounded-xl px-3 py-1.5"
                    >
                      {formatShift(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="px-5 pt-2 pb-8 border-t border-gray-100">
          {booking.status === 'pending' && (
            <button
              onClick={() => { handleClose(); setTimeout(() => onCancelRequest(booking), 300) }}
              className="w-full mt-4 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 font-body font-semibold text-sm hover:bg-red-50 transition-colors"
            >
              Cancel Request
            </button>
          )}
          <button
            onClick={handleClose}
            className="w-full mt-3 py-3 font-body text-sm font-semibold text-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
