import { useState, useEffect } from 'react'
import { X, Star, Buildings, CalendarDot, ClockAfternoon, ShieldCheck } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING, backdropVariants } from '@/shared/utils/motion'
import { SERVICE_TYPES } from '@/shared/constants/serviceTypes'
import { DISPLAY_TIMES } from '@/shared/constants/timeSlots'
import type { WorkingDayId } from '@/shared/constants/timeSlots'
import type { WorkerShift } from '@/shared/types/worker.types'
import { supabase } from '@/lib/supabase'
import type { ResidentWorker } from '../services/residentPortalService'

const SERVICE_LABELS: Record<string, string> = {
  maid: 'Maid', jhadu_pocha: 'Jhadu Pocha', bartan: 'Bartan',
  cooking: 'Cooking', car_cleaning: 'Car Cleaning', laundry: 'Laundry',
  child_care: 'Child Care', elder_care: 'Elder Care',
  deep_cleaning: 'Deep Cleaning', full_time: 'Full Time',
}

const SERVICE_COLORS: Record<string, { icon: string; bg: string }> = {
  maid:          { icon: 'text-purple-600', bg: 'bg-purple-50' },
  jhadu_pocha:   { icon: 'text-blue-600',   bg: 'bg-blue-50' },
  bartan:        { icon: 'text-teal-600',   bg: 'bg-teal-50' },
  cooking:       { icon: 'text-orange-600', bg: 'bg-orange-50' },
  car_cleaning:  { icon: 'text-slate-600',  bg: 'bg-slate-100' },
  laundry:       { icon: 'text-sky-600',    bg: 'bg-sky-50' },
  child_care:    { icon: 'text-pink-600',   bg: 'bg-pink-50' },
  elder_care:    { icon: 'text-rose-600',   bg: 'bg-rose-50' },
  deep_cleaning: { icon: 'text-green-600',  bg: 'bg-green-50' },
  full_time:     { icon: 'text-indigo-600', bg: 'bg-indigo-50' },
}

const DAY_INITIALS: { id: WorkingDayId; label: string }[] = [
  { id: 'mon', label: 'M' }, { id: 'tue', label: 'T' }, { id: 'wed', label: 'W' },
  { id: 'thu', label: 'T' }, { id: 'fri', label: 'F' }, { id: 'sat', label: 'S' }, { id: 'sun', label: 'S' },
]

function formatShift(s: WorkerShift) {
  return `${DISPLAY_TIMES[s.start] ?? s.start} – ${DISPLAY_TIMES[s.end] ?? s.end}`
}

const sheetVariants = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { type: 'spring' as const, stiffness: 360, damping: 36 } },
  exit:   { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
}

interface Props {
  worker: ResidentWorker
  onClose: () => void
  onBook: (serviceId?: string) => void
}

export default function WorkerDetailModal({ worker, onClose, onBook }: Props) {
  const [open, setOpen] = useState(true)
  const [societyNames, setSocietyNames] = useState<string[]>([])

  useEffect(() => {
    if (!worker.societyIds?.length) return
    supabase
      .from('societies')
      .select('name')
      .in('id', worker.societyIds)
      .then(({ data }) => {
        if (data) setSocietyNames(data.map((s) => s.name as string))
      })
  }, [worker.societyIds])

  function handleClose() { setOpen(false) }
  function handleBook(serviceId?: string) { setOpen(false); setTimeout(() => onBook(serviceId), 280) }

  const hasRating = worker.rating > 0
  const roundedRating = Math.round(worker.rating)

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={onClose}>
        {open && (
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            variants={sheetVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Close button */}
            <motion.button
              onClick={handleClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur shadow-sm border border-gray-100 flex items-center justify-center z-10"
              whileTap={{ scale: 0.88, rotate: 90 }}
              transition={SPRING}
            >
              <X size={16} weight="bold" className="text-gray-500" />
            </motion.button>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div className="px-5 pt-3 pb-6 bg-gradient-to-b from-primary/[0.06] to-transparent">
              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 26, delay: 0.08 }}
                >
                  {worker.photoUrl ? (
                    <img
                      src={worker.photoUrl}
                      alt={worker.name}
                      className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-white"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg border-2 border-white">
                      <span className="font-heading font-bold text-primary text-3xl">
                        {worker.name[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  className="flex-1 pt-1 min-w-0"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING, delay: 0.12 }}
                >
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-heading font-bold text-gray-900 text-xl leading-tight">{worker.name}</h2>
                    {worker.kycStatus === 'approved' && (
                      <ShieldCheck size={17} weight="fill" className="text-emerald-500 shrink-0" />
                    )}
                  </div>
                  {worker.kycStatus === 'approved' && (
                    <p className="font-body text-xs text-emerald-600 font-semibold mt-0.5">KYC Verified</p>
                  )}

                  <div className="flex items-center gap-1 mt-1.5">
                    {hasRating ? (
                      <>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={14} weight={s <= roundedRating ? 'fill' : 'regular'}
                              className={s <= roundedRating ? 'text-amber-400' : 'text-gray-200'} />
                          ))}
                        </div>
                        <span className="font-body text-sm font-semibold text-gray-700 ml-0.5">
                          {worker.rating.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="font-body text-xs text-gray-400">No reviews yet</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {worker.gender && (
                      <span className="font-body text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-2.5 py-0.5 shadow-sm capitalize">
                        {worker.gender}
                      </span>
                    )}
                    <span className={`font-body text-xs rounded-full px-2.5 py-0.5 font-medium ${
                      worker.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {worker.isAvailable ? 'Available' : 'Busy'}
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ── Services & Pricing ────────────────────────────────────────── */}
            {worker.pricing.length > 0 && (
              <div className="px-5 py-5 border-t border-gray-100">
                <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Services & Pricing
                </p>
                <div className="space-y-2">
                  {worker.pricing.map((p, i) => {
                    const st = SERVICE_TYPES.find((s) => s.id === p.serviceTypeId)
                    const Icon = st?.icon
                    const colors = SERVICE_COLORS[p.serviceTypeId] ?? { icon: 'text-gray-500', bg: 'bg-gray-100' }
                    return (
                      <motion.button
                        key={p.serviceTypeId}
                        onClick={() => handleBook(p.serviceTypeId)}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors text-left"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...SPRING, delay: 0.1 + i * 0.05 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                          {Icon && <Icon size={20} weight="duotone" className={colors.icon} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-semibold text-gray-800 text-sm">
                            {SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId}
                          </p>
                          <p className="font-body text-xs text-gray-400 mt-0.5">
                            ₹{p.monthlyRate}/mo · ₹{p.perVisitRate}/visit
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Schedule ─────────────────────────────────────────────────── */}
            {(worker.shifts?.length > 0 || worker.workingDays.length > 0) && (
              <div className="px-5 py-5 border-t border-gray-100">
                <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Schedule</p>
                {worker.workingDays.length > 0 && (
                  <div className="flex items-center gap-2.5 mb-3">
                    <CalendarDot size={16} weight="fill" className="text-primary/50 shrink-0" />
                    <div className="flex gap-1">
                      {DAY_INITIALS.map((d) => (
                        <span key={d.id} className={`font-body text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          worker.workingDays.includes(d.id) ? 'bg-primary text-white shadow-sm' : 'text-gray-300'
                        }`}>{d.label}</span>
                      ))}
                    </div>
                  </div>
                )}
                {worker.shifts?.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <ClockAfternoon size={16} weight="fill" className="text-primary/50 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {worker.shifts.map((s, i) => (
                        <div key={i} className="inline-flex items-center bg-gray-50 rounded-xl px-3 py-1.5 mr-2">
                          <span className="font-body text-sm text-gray-700 font-medium">{formatShift(s)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Work Areas ───────────────────────────────────────────────── */}
            {societyNames.length > 0 && (
              <div className="px-5 py-5 border-t border-gray-100">
                <p className="font-body text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Work Areas</p>
                <div className="flex items-start gap-2.5">
                  <Buildings size={16} weight="fill" className="text-primary/50 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {societyNames.map((name) => (
                      <span key={name} className="font-body text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 font-medium">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Book CTA ─────────────────────────────────────────────────── */}
            <div className="px-5 pt-2 pb-8 border-t border-gray-100">
              {worker.isAvailable ? (
                <>
                  <motion.button
                    onClick={() => handleBook()}
                    className="btn-primary w-full text-base py-4 rounded-2xl mt-4"
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                  >
                    Next →
                  </motion.button>
                  <p className="font-body text-xs text-gray-400 text-center mt-2">Select services, time &amp; days</p>
                </>
              ) : (
                <>
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-3">
                    <p className="font-body text-sm font-semibold text-amber-800">Not accepting bookings right now</p>
                    <p className="font-body text-xs text-amber-600 mt-0.5">This worker has temporarily turned off new bookings. Check back later.</p>
                  </div>
                  <button disabled className="w-full text-base py-4 rounded-2xl mt-1 bg-gray-100 font-body font-semibold text-gray-400 cursor-not-allowed">
                    Booking Unavailable
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
