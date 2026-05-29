import { useState, useEffect } from 'react'
import { X, SpinnerGap, Check, CheckCircle, ChatCircleDots, Clock, ArrowRight, CalendarBlank, CalendarDots } from '@phosphor-icons/react'
import { SERVICE_TYPES } from '@/shared/constants/serviceTypes'
import { WORKING_DAYS, DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { PricingMode } from '@/shared/types/worker.types'
import { createBookingRequest } from '@/shared/services/bookingService'
import { useResidentStore } from '../stores/residentStore'
import type { ResidentWorker } from '../services/residentPortalService'

const SERVICE_LABELS: Record<string, string> = {
  maid: 'Maid (Full)',
  jhadu_pocha: 'Jhadu Pocha',
  bartan: 'Bartan',
  cooking: 'Cooking',
  car_cleaning: 'Car Cleaning',
  laundry: 'Laundry',
  child_care: 'Child Care',
  elder_care: 'Elder Care',
  deep_cleaning: 'Deep Cleaning',
  full_time: 'Full Time',
}

const DAY_LABELS: Record<WorkingDayId, string> = {
  mon: 'M',
  tue: 'T',
  wed: 'W',
  thu: 'T',
  fri: 'F',
  sat: 'S',
  sun: 'S',
}

interface Props {
  worker: ResidentWorker
  onClose: () => void
  onBooked: () => void
}

function WorkerAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name} className="w-14 h-14 rounded-full object-cover shrink-0" />
    )
  }
  return (
    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="font-heading font-bold text-primary text-xl">
        {name[0]?.toUpperCase() ?? '?'}
      </span>
    </div>
  )
}

function StepIndicator({ step }: { step: number }) {
  const labels = ['Services', 'Schedule', 'Confirm']
  return (
    <div className="flex items-center justify-center gap-1 py-2">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-heading font-bold transition-all ${
                i + 1 === step
                  ? 'bg-primary text-white'
                  : i + 1 < step
                  ? 'bg-primary/30 text-primary'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1 < step ? <Check size={10} weight="bold" /> : i + 1}
            </div>
            <span
              className={`font-body text-xs ${
                i + 1 === step ? 'text-primary font-semibold' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div
              className={`w-4 h-px mx-1 ${i + 1 < step ? 'bg-primary/40' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function BookingModal({ worker, onClose, onBooked }: Props) {
  const { resident, incPendingCount } = useResidentStore()

  const [isVisible, setIsVisible] = useState(false)
  const [step, setStep] = useState(1)

  // Step 1
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  // Step 2
  const [bookingType, setBookingType]   = useState<'one_time' | 'regular'>('regular')
  const [arrivalTime, setArrivalTime]   = useState<string>('')
  const [selectedDays, setSelectedDays] = useState<WorkingDayId[]>([])

  // Step 3
  const [pricingMode, setPricingMode] = useState<PricingMode>('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function toggleDay(day: WorkingDayId) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  function computeTotal(): number {
    return worker.pricing
      .filter((p) => selectedServices.includes(p.serviceTypeId))
      .reduce((sum, p) => sum + (pricingMode === 'monthly' ? p.monthlyRate : p.perVisitRate), 0)
  }

  async function handleConfirm() {
    if (!resident) return
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await createBookingRequest({
        residentId: resident.id,
        workerId: worker.userId,
        serviceTypeIds: selectedServices,
        arrivalTime,
        daysOfWeek: selectedDays,
        pricingMode,
        totalPrice: computeTotal(),
      })
      incPendingCount()
      setStep(4)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to send request. Try again.')
      setIsSubmitting(false)
    }
  }

  const total = computeTotal()

  // Time slots: 7 AM to 8 PM
  const timeEntries = Object.entries(DISPLAY_TIMES).filter(([key]) => {
    const h = parseInt(key.split(':')[0], 10)
    return h >= 7 && h <= 20
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <X size={16} weight="bold" className="text-gray-500" />
        </button>

        {/* Worker header */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-4">
          <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} />
          <div>
            <p className="font-heading font-bold text-gray-800 text-base">{worker.name}</p>
            {worker.gender && (
              <p className="font-body text-sm text-gray-400 capitalize">{worker.gender}</p>
            )}
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-5" />

        {/* Step indicator */}
        <div className="px-5 pt-3">
          <StepIndicator step={step} />
        </div>

        <div className="h-px bg-gray-100 mx-5 mt-3" />

        {/* ── Step 1: Services ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="px-5 py-4">
            <h3 className="font-heading font-bold text-gray-800 text-base mb-4">
              Select services
            </h3>
            <div className="space-y-2">
              {worker.pricing.map((pricing) => {
                const serviceType = SERVICE_TYPES.find((s) => s.id === pricing.serviceTypeId)
                const isSelected = selectedServices.includes(pricing.serviceTypeId)
                const IconComponent = serviceType?.icon

                return (
                  <button
                    key={pricing.serviceTypeId}
                    onClick={() => toggleService(pricing.serviceTypeId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary/10' : 'bg-gray-100'
                      }`}
                    >
                      {IconComponent && (
                        <IconComponent
                          size={20}
                          weight="duotone"
                          className={isSelected ? 'text-primary' : 'text-gray-400'}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-semibold text-gray-800 text-sm">
                        {SERVICE_LABELS[pricing.serviceTypeId] ?? pricing.serviceTypeId}
                      </p>
                      <p className="font-body text-xs text-gray-400 mt-0.5">
                        ₹{pricing.monthlyRate}/mo · ₹{pricing.perVisitRate}/visit
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check size={10} weight="bold" className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedServices.length === 0}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 2: Schedule ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="px-5 py-4">
            {/* Booking type toggle */}
            <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Booking type
            </p>
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => { setBookingType('one_time'); setSelectedDays([]); setPricingMode('per_visit') }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                  bookingType === 'one_time'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <CalendarBlank size={20} weight="duotone" className={bookingType === 'one_time' ? 'text-primary' : 'text-gray-400'} />
                <span className={`font-body text-xs font-semibold ${bookingType === 'one_time' ? 'text-primary' : 'text-gray-500'}`}>One-time Visit</span>
                <span className="font-body text-[10px] text-gray-400">Pay per visit</span>
              </button>
              <button
                onClick={() => { setBookingType('regular'); setPricingMode('monthly') }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                  bookingType === 'regular'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <CalendarDots size={20} weight="duotone" className={bookingType === 'regular' ? 'text-primary' : 'text-gray-400'} />
                <span className={`font-body text-xs font-semibold ${bookingType === 'regular' ? 'text-primary' : 'text-gray-500'}`}>Regular Schedule</span>
                <span className="font-body text-[10px] text-gray-400">Weekly recurring</span>
              </button>
            </div>

            <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Arrival time
            </p>
            <div className="overflow-x-auto pb-2 -mx-5 px-5">
              <div className="flex gap-2 w-max">
                {timeEntries.map(([time, label]) => (
                  <button
                    key={time}
                    onClick={() => setArrivalTime(time)}
                    className={`px-4 py-2 rounded-full font-body text-sm font-medium whitespace-nowrap transition-all ${
                      arrivalTime === time
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {bookingType === 'regular' && (
              <>
                <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-5 mb-2">
                  Which days?
                </p>
                <div className="flex gap-2 flex-wrap">
                  {WORKING_DAYS.map((day) => {
                    const isActive = selectedDays.includes(day.id)
                    return (
                      <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`w-10 h-10 rounded-full font-body font-semibold text-sm transition-all ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {DAY_LABELS[day.id]}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 font-heading font-semibold text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!arrivalTime || (bookingType === 'regular' && selectedDays.length === 0)}
                className="flex-1 btn-primary"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="px-5 py-4">
            <h3 className="font-heading font-bold text-gray-800 text-base mb-4">Pricing</h3>

            {/* Mode toggle — only for regular bookings */}
            {bookingType === 'regular' ? (
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
                {(['monthly', 'per_visit'] as PricingMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPricingMode(mode)}
                    className={`flex-1 py-2 rounded-xl font-body font-semibold text-sm transition-all ${
                      pricingMode === mode
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode === 'monthly' ? 'Monthly' : 'Per Visit'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5">
                <CalendarBlank size={15} weight="fill" className="text-blue-500 shrink-0" />
                <p className="font-body text-sm text-blue-700 font-medium">One-time visit — priced per visit</p>
              </div>
            )}

            {/* Price breakdown */}
            <div className="space-y-2 mb-4">
              {worker.pricing
                .filter((p) => selectedServices.includes(p.serviceTypeId))
                .map((p) => (
                  <div
                    key={p.serviceTypeId}
                    className="flex items-center justify-between py-2 border-b border-gray-50"
                  >
                    <span className="font-body text-sm text-gray-700">
                      {SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId}
                    </span>
                    <span className="font-body font-semibold text-gray-800 text-sm">
                      ₹{pricingMode === 'monthly' ? p.monthlyRate : p.perVisitRate}
                      {pricingMode === 'monthly' ? '/mo' : '/visit'}
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-between bg-primary/5 rounded-2xl px-4 py-3 mb-5">
              <span className="font-body font-semibold text-gray-600 text-sm">Total</span>
              <span className="font-heading font-bold text-primary text-2xl">₹{total}</span>
            </div>

            {/* Summary card */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-body text-xs text-gray-400 w-16 shrink-0 pt-0.5">Type</span>
                <span className="font-body text-xs font-medium text-gray-700">
                  {bookingType === 'one_time' ? 'One-time Visit' : 'Regular Schedule'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-body text-xs text-gray-400 w-16 shrink-0 pt-0.5">Time</span>
                <span className="font-body text-xs font-medium text-gray-700">
                  {DISPLAY_TIMES[arrivalTime] ?? arrivalTime}
                </span>
              </div>
              {bookingType === 'regular' && (
                <div className="flex items-start gap-2">
                  <span className="font-body text-xs text-gray-400 w-16 shrink-0 pt-0.5">Days</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedDays.map((d) => (
                      <span
                        key={d}
                        className="font-body text-xs font-medium text-gray-700 bg-white rounded-full px-2 py-0.5 border border-gray-200"
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="font-body text-xs text-gray-400 w-16 shrink-0 pt-0.5">Services</span>
                <span className="font-body text-xs font-medium text-gray-700">
                  {selectedServices.map((id) => SERVICE_LABELS[id] ?? id).join(', ')}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <p className="font-body text-red-700 text-sm">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 font-heading font-semibold text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap size={16} weight="bold" className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send Booking Request'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="px-5 py-8 flex flex-col items-center text-center">
            {/* Animated checkmark */}
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5 shadow-sm">
              <CheckCircle size={44} weight="fill" className="text-emerald-500" />
            </div>

            <h3 className="font-heading font-bold text-gray-900 text-xl mb-1">
              Request Sent!
            </h3>
            <p className="font-body text-gray-500 text-sm mb-6">
              Your request has been sent to <span className="font-semibold text-gray-700">{worker.name.split(' ')[0]}</span>.
            </p>

            {/* How it works */}
            <div className="w-full bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 text-left space-y-3">
              <p className="font-body text-xs font-bold text-amber-700 uppercase tracking-wider">How it works</p>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={14} weight="fill" className="text-amber-600" />
                </div>
                <p className="font-body text-sm text-gray-700">
                  <span className="font-semibold">Wait for response</span> — the worker will review your request and accept or suggest changes.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <ChatCircleDots size={14} weight="fill" className="text-amber-600" />
                </div>
                <p className="font-body text-sm text-gray-700">
                  <span className="font-semibold">Discuss &amp; finalize</span> — once accepted, you can discuss availability, timing, and final pricing directly.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={14} weight="bold" className="text-amber-600" />
                </div>
                <p className="font-body text-sm text-gray-700">
                  <span className="font-semibold">No instant booking</span> — this app helps you connect and agree, not auto-assign workers.
                </p>
              </div>
            </div>

            <button
              onClick={() => { setIsVisible(false); setTimeout(onBooked, 300) }}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              View My Bookings
              <ArrowRight size={16} weight="bold" />
            </button>
            <button
              onClick={handleClose}
              className="w-full mt-3 py-3 font-body font-semibold text-sm text-gray-500"
            >
              Back to Home
            </button>
          </div>
        )}

        {/* Safe area bottom padding */}
        <div className="h-4" />
      </div>
    </>
  )
}
