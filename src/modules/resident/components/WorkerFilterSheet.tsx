import { useState } from 'react'
import { X, ArrowCounterClockwise } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { backdropVariants, SPRING } from '@/shared/utils/motion'
import { SERVICE_TYPES } from '@/shared/constants/serviceTypes'
import {
  START_TIME_SLOTS,
  END_TIME_SLOTS,
  DISPLAY_TIMES,
  WORKING_DAYS,
} from '@/shared/constants/timeSlots'
import type { WorkingDayId } from '@/shared/constants/timeSlots'

export interface WorkerFilters {
  services: string[]
  gender: 'male' | 'female' | null
  workingDays: WorkingDayId[]
  timeStart: string | null
  timeEnd: string | null
  priceMin: number | null
  priceMax: number | null
  pricingMode: 'monthly' | 'per_visit' | null
  onlyAvailable: boolean
}

export const EMPTY_FILTERS: WorkerFilters = {
  services: [],
  gender: null,
  workingDays: [],
  timeStart: null,
  timeEnd: null,
  priceMin: null,
  priceMax: null,
  pricingMode: null,
  onlyAvailable: false,
}

export function countActiveFilters(f: WorkerFilters): number {
  let n = 0
  if (f.services.length) n++
  if (f.gender) n++
  if (f.workingDays.length) n++
  if (f.timeStart || f.timeEnd) n++
  if (f.priceMin !== null || f.priceMax !== null) n++
  if (f.pricingMode) n++
  if (f.onlyAvailable) n++
  return n
}

const DAY_LABELS: Record<WorkingDayId, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

const SERVICE_LABELS: Record<string, string> = {
  maid: 'Maid', jhadu_pocha: 'Jhadu Pocha', bartan: 'Bartan',
  cooking: 'Cooking', car_cleaning: 'Car Cleaning', laundry: 'Laundry',
  child_care: 'Child Care', elder_care: 'Elder Care',
  deep_cleaning: 'Deep Cleaning', full_time: 'Full Time',
}

interface Props {
  initial: WorkerFilters
  onClose: () => void
  onApply: (f: WorkerFilters) => void
}

const sheetVariants = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { type: 'spring' as const, stiffness: 360, damping: 36 } },
  exit:   { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
}

export default function WorkerFilterSheet({ initial, onClose, onApply }: Props) {
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState<WorkerFilters>(initial)

  function handleClose() { setOpen(false) }

  function handleApply() {
    onApply(draft)
    setOpen(false)
  }

  function toggleService(id: string) {
    setDraft((d) => ({
      ...d,
      services: d.services.includes(id)
        ? d.services.filter((s) => s !== id)
        : [...d.services, id],
    }))
  }

  function toggleDay(id: WorkingDayId) {
    setDraft((d) => ({
      ...d,
      workingDays: d.workingDays.includes(id)
        ? d.workingDays.filter((x) => x !== id)
        : [...d.workingDays, id],
    }))
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="filter-backdrop"
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
            key="filter-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            variants={sheetVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0 border-b border-gray-100">
          <h2 className="font-heading font-bold text-gray-900 text-lg">Filters</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDraft(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1 text-xs font-body font-semibold text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              Reset
            </button>
            <motion.button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              whileTap={{ scale: 0.88, rotate: 90 }}
              transition={SPRING}
            >
              <X size={16} weight="bold" className="text-gray-500" />
            </motion.button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-4 space-y-5">
          {/* Services */}
          <Section title="Services" hint="Show workers who offer any selected">
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_TYPES.map((s) => {
                const active = draft.services.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`text-xs font-body font-medium rounded-full px-3 py-1.5 border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {SERVICE_LABELS[s.id] ?? s.id}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Gender */}
          <Section title="Gender">
            <div className="flex gap-1.5">
              {([
                ['Any', null],
                ['Female', 'female'],
                ['Male', 'male'],
              ] as const).map(([label, val]) => {
                const active = draft.gender === val
                return (
                  <button
                    key={label}
                    onClick={() =>
                      setDraft((d) => ({ ...d, gender: val as WorkerFilters['gender'] }))
                    }
                    className={`flex-1 text-xs font-body font-semibold rounded-xl py-2 border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Pricing mode */}
          <Section title="Pricing mode">
            <div className="flex gap-1.5">
              {([
                ['Any', null],
                ['Monthly', 'monthly'],
                ['Per visit', 'per_visit'],
              ] as const).map(([label, val]) => {
                const active = draft.pricingMode === val
                return (
                  <button
                    key={label}
                    onClick={() =>
                      setDraft((d) => ({ ...d, pricingMode: val as WorkerFilters['pricingMode'] }))
                    }
                    className={`flex-1 text-xs font-body font-semibold rounded-xl py-2 border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Price range */}
          <Section
            title="Price range"
            hint={
              draft.pricingMode === 'per_visit'
                ? '₹ per visit'
                : '₹ per month'
            }
          >
            <div className="flex items-center gap-2">
              <PriceInput
                value={draft.priceMin}
                placeholder="Min"
                onChange={(v) => setDraft((d) => ({ ...d, priceMin: v }))}
              />
              <span className="text-gray-300 text-sm">–</span>
              <PriceInput
                value={draft.priceMax}
                placeholder="Max"
                onChange={(v) => setDraft((d) => ({ ...d, priceMax: v }))}
              />
            </div>
          </Section>

          {/* Working days */}
          <Section title="Working days" hint="Worker must work on all selected">
            <div className="grid grid-cols-7 gap-1.5">
              {WORKING_DAYS.map((d) => {
                const active = draft.workingDays.includes(d.id)
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDay(d.id)}
                    className={`text-[11px] font-body font-semibold rounded-xl py-2 border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {DAY_LABELS[d.id]}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Time window */}
          <Section title="Time window" hint="Worker shift must cover this range">
            <div className="grid grid-cols-2 gap-2">
              <TimeSelect
                value={draft.timeStart}
                placeholder="Start"
                options={START_TIME_SLOTS as unknown as string[]}
                onChange={(v) => setDraft((d) => ({ ...d, timeStart: v }))}
              />
              <TimeSelect
                value={draft.timeEnd}
                placeholder="End"
                options={END_TIME_SLOTS as unknown as string[]}
                onChange={(v) => setDraft((d) => ({ ...d, timeEnd: v }))}
              />
            </div>
          </Section>

          {/* Availability */}
          <Section title="Availability">
            <label className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 cursor-pointer">
              <div>
                <p className="font-body font-semibold text-sm text-gray-800">
                  Only available now
                </p>
                <p className="font-body text-xs text-gray-400 mt-0.5">
                  Workers actively taking bookings
                </p>
              </div>
              <input
                type="checkbox"
                checked={draft.onlyAvailable}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, onlyAvailable: e.target.checked }))
                }
                className="w-5 h-5 accent-primary"
              />
            </label>
          </Section>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <motion.button
            onClick={handleApply}
            className="w-full bg-accent text-white font-body font-semibold py-3 rounded-2xl text-sm hover:bg-accent-600 transition-colors"
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
          >
            Apply filters
          </motion.button>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-body font-bold text-sm text-gray-800">{title}</h3>
        {hint && <p className="font-body text-[10px] text-gray-400">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function PriceInput({
  value,
  placeholder,
  onChange,
}: {
  value: number | null
  placeholder: string
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2.5">
      <span className="text-gray-400 text-sm mr-1">₹</span>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? null : Math.max(0, Number(v)))
        }}
        className="flex-1 min-w-0 font-body text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
      />
    </div>
  )
}

function TimeSelect({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string | null
  placeholder: string
  options: string[]
  onChange: (v: string | null) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      className="w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-body text-sm text-gray-700 outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {DISPLAY_TIMES[t] ?? t}
        </option>
      ))}
    </select>
  )
}
